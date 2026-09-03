-- A microcycle names a week by its Monday, not by an offset into its block, so moving a block
-- used to leave its labels behind on the weeks it no longer covers — they vanished from the
-- calendar and stayed in the table pointing at nothing. The weeks travel with the block here
-- rather than in the server action: the drag and the Edit dialog both write through one UPDATE,
-- and this is the only place both of them pass.

create or replace function public.microcycles_follow_block()
returns trigger
language plpgsql
as $$
declare
  shift integer := new.starts_on - old.starts_on;
  held public.microcycles[];
begin
  -- A move, not a resize: both ends travelled the same distance, so the block holds the same
  -- run of weeks somewhere else and every label goes with it.
  --
  -- Read out, delete, write back — three statements rather than one UPDATE, because a shift
  -- shorter than the block's span walks rows onto weeks the block still holds and
  -- (block_id, starts_on) is unique. Deferring that check isn't an option: setMicrocycle
  -- upserts against the same constraint, and Postgres won't take a deferrable unique index as
  -- an ON CONFLICT arbiter. A data-modifying CTE doesn't work either — its DELETE and INSERT
  -- share one snapshot, so the insert still collides with rows the delete just removed.
  if shift <> 0 and shift = new.ends_on - old.ends_on then
    select array_agg(m) into held
      from public.microcycles m
     where m.block_id = new.id;

    if held is not null then
      delete from public.microcycles where block_id = new.id;
      insert into public.microcycles (block_id, starts_on, label)
      select new.id, h.starts_on + shift, h.label from unnest(held) h;
    end if;
  end if;

  -- A resize can cut weeks off either end. A label whose week is no longer part of the block
  -- has nowhere to be drawn, so it goes rather than lingering as a row nothing can reach.
  delete from public.microcycles
   where block_id = new.id
     and (starts_on < new.starts_on or starts_on > new.ends_on);

  return null;
end;
$$;

-- Security invoker on purpose: the coach who just passed the block's own policy also passes the
-- micros' policy, which reaches them through that same block.
create or replace trigger training_blocks_microcycles_follow
  after update of starts_on, ends_on on public.training_blocks
  for each row
  when (
    old.starts_on is distinct from new.starts_on
    or old.ends_on is distinct from new.ends_on
  )
  execute function public.microcycles_follow_block();
