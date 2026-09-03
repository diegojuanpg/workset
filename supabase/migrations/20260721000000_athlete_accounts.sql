-- Athlete accounts: same passwordless auth as coaches, but reached through a
-- coach's single-use invite link. A user can be coach and/or athlete at once —
-- capabilities are data-derived (is_coach flag + athlete_profiles row), not a role.

-- 1. profiles: structured name for everyone, coach flag, unit preference.
alter table public.profiles
  add column first_name text
    check (first_name is null or char_length(first_name) between 1 and 64),
  add column last_name text
    check (last_name is null or char_length(last_name) between 1 and 64),
  add column is_coach boolean not null default false,
  add column unit_preference text not null default 'metric'
    check (unit_preference in ('metric', 'imperial'));

-- Existing onboarded users are coaches.
update public.profiles set is_coach = true where username is not null;

grant update (first_name, last_name, is_coach, unit_preference) on public.profiles to authenticated;
grant insert (first_name, last_name, is_coach, unit_preference) on public.profiles to authenticated;
-- "coach reads linked athlete profile" policy is created after athletes.athlete_id exists (step 3).

-- 2. athlete_profiles: sport data, owned by the athlete (1:1 with profiles).
create table public.athlete_profiles (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  birth_date date not null,
  sex text not null check (sex in ('male', 'female')),
  height_cm smallint not null check (height_cm between 60 and 260),
  phone text check (phone is null or char_length(phone) between 3 and 32),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger athlete_profiles_updated_at
  before update on public.athlete_profiles
  for each row execute function public.set_updated_at();

alter table public.athlete_profiles enable row level security;

create policy "own athlete profile read" on public.athlete_profiles
  for select using ((select auth.uid()) = profile_id);
create policy "own athlete profile insert" on public.athlete_profiles
  for insert with check ((select auth.uid()) = profile_id);
create policy "own athlete profile update" on public.athlete_profiles
  for update using ((select auth.uid()) = profile_id)
  with check ((select auth.uid()) = profile_id);
-- "coach reads athlete profile" policy is created after athletes.athlete_id exists (step 3).

grant select,
      insert (profile_id, birth_date, sex, height_cm, phone),
      update (birth_date, sex, height_cm, phone)
  on public.athlete_profiles to authenticated;

-- 3. athletes: now a coach<->athlete membership + the pending invitation, in one row.
--    athlete_id NULL = invitation pending; set = claimed account. Many-to-many:
--    an athlete_id can appear under several coaches (one row per coach).
alter table public.athletes
  add column athlete_id uuid references public.profiles (id) on delete cascade,
  add column first_name text,
  add column last_name text
    check (last_name is null or char_length(last_name) between 1 and 64),
  add column label text
    check (label is null or char_length(label) between 1 and 64),
  add column invite_token uuid not null default gen_random_uuid(),
  add column invite_status text not null default 'pending'
    check (invite_status in ('pending', 'claimed', 'revoked', 'expired')),
  add column invite_expires_at timestamptz not null default (now() + interval '7 days'),
  add column claimed_at timestamptz;

-- Migrate the old single name into first_name, then drop it.
update public.athletes set first_name = name;
alter table public.athletes
  drop column name,
  alter column first_name set not null,
  add constraint athletes_first_name_len check (char_length(first_name) between 1 and 64);

create unique index athletes_coach_athlete_uniq
  on public.athletes (coach_id, athlete_id) where athlete_id is not null;
create unique index athletes_invite_token_uniq on public.athletes (invite_token);
create index athletes_athlete_id_idx on public.athletes (athlete_id);

-- Coach owns the roster row (insert/update names + invite lifecycle + planned).
-- claim_invitation (below) sets athlete_id via security definer — the claiming
-- athlete is not the coach, so RLS "own athletes" would block that write.
grant insert (coach_id, first_name, last_name) on public.athletes to authenticated;
grant update (first_name, last_name, label, planned, invite_token, invite_expires_at, invite_status)
  on public.athletes to authenticated;

-- Athlete can see the memberships that point at them (their coaches).
create policy "athlete reads own memberships" on public.athletes
  for select using ((select auth.uid()) = athlete_id);

-- Coaches can read the profiles of athletes linked to them (name/avatar for the roster + athlete page).
create policy "coach reads linked athlete profile" on public.profiles
  for select using (
    exists (
      select 1 from public.athletes a
      where a.athlete_id = profiles.id and a.coach_id = (select auth.uid())
    )
  );

-- Coach read-only over their athletes' sport data.
create policy "coach reads athlete profile" on public.athlete_profiles
  for select using (
    exists (
      select 1 from public.athletes a
      where a.athlete_id = athlete_profiles.profile_id
        and a.coach_id = (select auth.uid())
    )
  );

-- 4. claim_invitation: the athlete redeems a token, linking their account.
--    Security definer so it can write athlete_id on a row owned by the coach.
create or replace function public.claim_invitation(p_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_row public.athletes%rowtype;
  v_has_profile boolean;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  select * into v_row from public.athletes
    where invite_token = p_token
    for update;

  if not found then
    raise exception 'invite_not_found';
  end if;

  if v_row.coach_id = v_uid then
    raise exception 'self_coach';
  end if;

  select exists (select 1 from public.athlete_profiles ap where ap.profile_id = v_uid)
    into v_has_profile;

  -- Already this coach's athlete (any prior membership) → idempotent success.
  if exists (
    select 1 from public.athletes a
    where a.coach_id = v_row.coach_id and a.athlete_id = v_uid
  ) then
    return jsonb_build_object('coach_id', v_row.coach_id, 'needs_onboarding', not v_has_profile);
  end if;

  if v_row.invite_status <> 'pending' then
    raise exception 'invite_used';
  end if;

  if v_row.invite_expires_at <= now() then
    raise exception 'invite_expired';
  end if;

  update public.athletes
    set athlete_id = v_uid,
        invite_status = 'claimed',
        claimed_at = now()
    where id = v_row.id;

  return jsonb_build_object('coach_id', v_row.coach_id, 'needs_onboarding', not v_has_profile);
end;
$$;

grant execute on function public.claim_invitation(uuid) to authenticated;
