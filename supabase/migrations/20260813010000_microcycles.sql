-- Microcycles: the tier under the training block. One microcycle covers one week of a block,
-- so it is keyed by the Monday it starts on rather than by a range of its own — a block is
-- whole ISO weeks, and every week of it can hold at most one micro.
--
-- The label is a single character for now: the calendar only needs to show what kind of week
-- it is, and the vocabulary of kinds is a coach-facing thing that doesn't exist yet.

create table public.microcycles (
  id uuid primary key default gen_random_uuid(),
  block_id uuid not null references public.training_blocks (id) on delete cascade,
  starts_on date not null,
  label text not null check (char_length(label) = 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint microcycles_starts_monday check (extract(isodow from starts_on) = 1),
  -- One micro per week of a block. Also the conflict target the upsert writes against.
  constraint microcycles_week_key unique (block_id, starts_on)
);

create index microcycles_block_idx on public.microcycles (block_id, starts_on);

create trigger microcycles_updated_at
  before update on public.microcycles
  for each row execute function public.set_updated_at();

grant select, delete on public.microcycles to authenticated;
-- update covers every column the insert does, not just label: supabase-js writes a micro with
-- upsert, and PostgREST puts the whole payload in the ON CONFLICT SET. Moving a row to another
-- block is still the policy's business, and it checks the destination the same way.
grant insert (block_id, starts_on, label), update (block_id, starts_on, label)
  on public.microcycles to authenticated;

alter table public.microcycles enable row level security;

-- One hop further out than the other policies: a micro is reachable through its block, and
-- the block is already limited to athletes the coach owns.
create policy "own microcycles" on public.microcycles
  for all using (
    exists (
      select 1
      from public.training_blocks b
      join public.athletes a on a.id = b.athlete_id
      where b.id = microcycles.block_id
        and a.coach_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.training_blocks b
      join public.athletes a on a.id = b.athlete_id
      where b.id = microcycles.block_id
        and a.coach_id = (select auth.uid())
    )
  );
