-- Training blocks: named stretches of an athlete's plan, one lane, no overlap.
-- A block is always whole ISO weeks — Monday through Sunday — so it lines up with the
-- year calendar's week columns and can never be 3.5 weeks long.

-- Needed by the exclusion constraint below: it mixes an equality test on athlete_id with
-- an overlap test on a range, and only gist can index both in one constraint.
create extension if not exists btree_gist;

create table public.training_blocks (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.athletes (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  starts_on date not null,
  ends_on date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- The three halves of "exactly N weeks". Enforced here and not only in the form, so a
  -- direct write can't leave the calendar with a block that doesn't fit its columns.
  constraint training_blocks_starts_monday check (extract(isodow from starts_on) = 1),
  constraint training_blocks_ends_sunday check (extract(isodow from ends_on) = 7),
  constraint training_blocks_whole_weeks check ((ends_on - starts_on + 1) % 7 = 0)
);

create index training_blocks_athlete_idx on public.training_blocks (athlete_id, starts_on);

-- One lane: two blocks of the same athlete may not share a day. '[]' because both ends
-- are inclusive — ends_on is the block's last day, not the day after it.
alter table public.training_blocks
  add constraint training_blocks_no_overlap
  exclude using gist (
    athlete_id with =,
    daterange(starts_on, ends_on, '[]') with &&
  );

create trigger training_blocks_updated_at
  before update on public.training_blocks
  for each row execute function public.set_updated_at();

grant select, delete on public.training_blocks to authenticated;
grant insert (athlete_id, name, starts_on, ends_on),
      update (name, starts_on, ends_on)
  on public.training_blocks to authenticated;

alter table public.training_blocks enable row level security;

-- Reachable only through an athlete the coach owns. Same shape as competition_athletes:
-- the athletes row is already coach-scoped by its own policy, so an insert can't smuggle
-- a block onto someone else's lifter.
create policy "own training blocks" on public.training_blocks
  for all using (
    exists (
      select 1
      from public.athletes a
      where a.id = training_blocks.athlete_id
        and a.coach_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.athletes a
      where a.id = training_blocks.athlete_id
        and a.coach_id = (select auth.uid())
    )
  );
