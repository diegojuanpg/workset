-- Competitions: meets owned by a coach, plus the roster athletes entered in each
-- one. Private per coach — no shared catalogue this phase.

create table public.competitions (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  location text check (location is null or char_length(location) between 1 and 120),
  starts_on date not null,
  ends_on date not null,
  -- Free text so a coach can outgrow the seeded lists (see src/lib/competitions/federations.ts).
  -- A Settings tab will make these editable per coach; no enum to migrate when it lands.
  type text not null check (char_length(type) between 1 and 48),
  federation text not null check (char_length(federation) between 1 and 48),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint competitions_dates check (ends_on >= starts_on)
);

create index competitions_coach_id_idx on public.competitions (coach_id, starts_on);

create trigger competitions_updated_at
  before update on public.competitions
  for each row execute function public.set_updated_at();

grant select, delete on public.competitions to authenticated;
grant insert (coach_id, name, location, starts_on, ends_on, type, federation),
      update (name, location, starts_on, ends_on, type, federation)
  on public.competitions to authenticated;

alter table public.competitions enable row level security;

create policy "own competitions" on public.competitions
  for all using ((select auth.uid()) = coach_id)
  with check ((select auth.uid()) = coach_id);

-- Entry: which athlete competes in which category. Category lives here, not on the
-- athlete — the same lifter enters different weight/age classes across meets.
create table public.competition_athletes (
  competition_id uuid not null references public.competitions (id) on delete cascade,
  athlete_id uuid not null references public.athletes (id) on delete cascade,
  age_category text check (age_category is null or char_length(age_category) between 1 and 48),
  weight_class text check (weight_class is null or char_length(weight_class) between 1 and 48),
  created_at timestamptz not null default now(),
  primary key (competition_id, athlete_id)
);

create index competition_athletes_athlete_idx on public.competition_athletes (athlete_id);

grant select, delete on public.competition_athletes to authenticated;
grant insert (competition_id, athlete_id, age_category, weight_class),
      update (age_category, weight_class)
  on public.competition_athletes to authenticated;

alter table public.competition_athletes enable row level security;

-- Reachable only through a competition the coach owns. The athletes row is already
-- coach-scoped by its own RLS, so the insert can't smuggle in another coach's lifter.
create policy "own competition entries" on public.competition_athletes
  for all using (
    exists (
      select 1 from public.competitions c
      where c.id = competition_athletes.competition_id
        and c.coach_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.competitions c
      where c.id = competition_athletes.competition_id
        and c.coach_id = (select auth.uid())
    )
    and exists (
      select 1 from public.athletes a
      where a.id = competition_athletes.athlete_id
        and a.coach_id = (select auth.uid())
    )
  );
