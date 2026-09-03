-- Wires the coach's vocabulary into the plan. A macro, a block and a week can each point at
-- one of the coach's cycle types, which is what gives the calendar a name to offer and a
-- colour to paint.
--
-- Nullable everywhere and staying that way: picking a type is a convenience, never a
-- requirement. A block typed in free text is still a block, which is what every row already
-- on the plan is.

alter table public.training_blocks
  -- `set null`, not `cascade`: deleting the "Volume" type must not delete the training. The
  -- block keeps its name — the name was copied into it when the type was picked, not read
  -- back through this column — and loses only its tint.
  add column type_id uuid references public.cycle_types (id) on delete set null;

alter table public.macrocycles
  add column type_id uuid references public.cycle_types (id) on delete set null;

alter table public.microcycles
  add column type_id uuid references public.cycle_types (id) on delete set null;

-- Read on every calendar load to resolve a tint, and touched again whenever a type is
-- deleted, which has to find every row pointing at it.
create index training_blocks_type_idx on public.training_blocks (type_id);
create index macrocycles_type_idx on public.macrocycles (type_id);
create index microcycles_type_idx on public.microcycles (type_id);

-- Column-level grants, so each table needs the new column adding to both lists. The row
-- policies already decide which rows a coach may touch; these decide which columns.
grant insert (type_id), update (type_id) on public.training_blocks to authenticated;
grant insert (type_id), update (type_id) on public.macrocycles to authenticated;
grant insert (type_id), update (type_id) on public.microcycles to authenticated;
