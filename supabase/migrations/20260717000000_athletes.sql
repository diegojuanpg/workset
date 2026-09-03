-- Athletes: coach-owned roster rows. No linked account this phase —
-- invite flow (temp name → mail → athlete completes signup) comes with roles.

create table public.athletes (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 64),
  planned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index athletes_coach_id_idx on public.athletes (coach_id);

create trigger athletes_updated_at
  before update on public.athletes
  for each row execute function public.set_updated_at();

grant select, delete on public.athletes to authenticated;
grant insert (coach_id, name), update (name, planned) on public.athletes to authenticated;

alter table public.athletes enable row level security;

create policy "own athletes" on public.athletes
  for all using ((select auth.uid()) = coach_id)
  with check ((select auth.uid()) = coach_id);
