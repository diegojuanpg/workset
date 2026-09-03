-- Macrocycles: the tier above the training block. A macro groups consecutive blocks —
-- mesocycles — under one name, and assigning one is optional.
--
-- The macro carries no dates of its own. Its span is whatever its blocks span, which is what
-- makes the two rules free: a macro can never cover empty weeks, because there is nothing to
-- cover but blocks, and a block belongs to at most one macro because it holds a single
-- macro_id. Contiguity is the calendar's business — the drag only ever offers the block next
-- to the bracket's edge.

create table public.macrocycles (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.athletes (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Target for the composite foreign key below, which is what keeps a block and its macro on
  -- the same athlete. Redundant on its own — id is already unique.
  constraint macrocycles_id_athlete_key unique (id, athlete_id)
);

create index macrocycles_athlete_idx on public.macrocycles (athlete_id);

create trigger macrocycles_updated_at
  before update on public.macrocycles
  for each row execute function public.set_updated_at();

-- Dropping a macro releases its blocks rather than deleting a coach's training. The column
-- list on SET NULL is not optional here: the key is composite, and a bare SET NULL would
-- null athlete_id along with macro_id and trip its own not-null constraint.
alter table public.training_blocks
  add column macro_id uuid,
  add constraint training_blocks_macro_fkey
    foreign key (macro_id, athlete_id)
    references public.macrocycles (id, athlete_id)
    on delete set null (macro_id);

create index training_blocks_macro_idx on public.training_blocks (macro_id);

-- Two blocks in one macro may not share a name: inside a macro the name is how a coach tells
-- one meso from another. The same name in a different macro is fine, and so is the same name
-- twice outside any macro — hence the partial index.
create unique index training_blocks_macro_name_key
  on public.training_blocks (macro_id, name)
  where macro_id is not null;

grant select, delete on public.macrocycles to authenticated;
grant insert (athlete_id, name), update (name) on public.macrocycles to authenticated;
-- The block's own grants predate this column, so the assignment needs adding to both.
grant insert (macro_id), update (macro_id) on public.training_blocks to authenticated;

alter table public.macrocycles enable row level security;

-- Same shape as training_blocks: reachable only through an athlete the coach owns.
create policy "own macrocycles" on public.macrocycles
  for all using (
    exists (
      select 1
      from public.athletes a
      where a.id = macrocycles.athlete_id
        and a.coach_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.athletes a
      where a.id = macrocycles.athlete_id
        and a.coach_id = (select auth.uid())
    )
  );
