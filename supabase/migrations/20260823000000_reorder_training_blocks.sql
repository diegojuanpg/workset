-- Reordering a run of blocks: same weeks, new order.
--
-- Dragging block 3 onto block 1 should leave 3, 1, 2 — which means every block in the run gets
-- new dates, not just the one that was dragged. They keep their own lengths and are laid end to
-- end from wherever the run already started, so a reorder never moves the plan in time; it only
-- changes what happens when.
--
-- It cannot be written as a series of updates from the app. The blocks pass through each other's
-- weeks on the way to their new places, and `training_blocks_no_overlap` rejects the first step
-- even though the final arrangement is legal. So the constraint becomes deferrable and the whole
-- run is rewritten inside one transaction, with the check taken at the end.
--
-- INITIALLY IMMEDIATE, not INITIALLY DEFERRED: every other write — the drag, the Edit dialog,
-- a plain insert — should still be refused the moment it overlaps, not at commit. Only this
-- function asks for the check to wait.

alter table public.training_blocks
  drop constraint training_blocks_no_overlap;

alter table public.training_blocks
  add constraint training_blocks_no_overlap
  exclude using gist (
    athlete_id with =,
    daterange(starts_on, ends_on, '[]') with &&
  )
  deferrable initially immediate;

/**
 * Lays the given blocks end to end, in the order given, starting where the earliest of them
 * already starts. Security invoker on purpose: the coach's own policy is what decides which
 * blocks this can touch, so ids belonging to someone else simply match nothing.
 */
create or replace function public.reorder_training_blocks(ids uuid[])
returns void
language plpgsql
security invoker
as $$
declare
  anchor date;
  day date;
  item record;
begin
  if coalesce(array_length(ids, 1), 0) < 2 then
    return;
  end if;

  -- The run keeps its place on the calendar: the first slot is wherever the earliest of these
  -- blocks already began, so nothing is pushed into or out of a week the run didn't hold.
  select min(starts_on) into anchor
    from public.training_blocks
   where id = any (ids);
  if anchor is null then
    return;
  end if;

  set constraints training_blocks_no_overlap deferred;

  day := anchor;
  for item in
    select b.id, b.ends_on - b.starts_on as length
      from unnest(ids) with ordinality as o (id, ord)
      join public.training_blocks b on b.id = o.id
     order by o.ord
  loop
    -- Whole weeks in, whole weeks out: each block keeps the length it had, so the Monday and
    -- Sunday checks hold without being restated here. Moving both ends by the same distance is
    -- also what microcycles_follow_block reads as a move, so every week's label travels along.
    update public.training_blocks
       set starts_on = day,
           ends_on = day + item.length
     where id = item.id;
    day := day + item.length + 1;
  end loop;
end;
$$;

grant execute on function public.reorder_training_blocks(uuid[]) to authenticated;
