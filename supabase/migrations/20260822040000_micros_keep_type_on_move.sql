-- Moving a block dropped its microcycles' types.
--
-- `microcycles_follow_block` carries the labels to the block's new weeks by reading them out,
-- deleting them and writing them back. It was written before microcycles had a type, so the
-- insert named only (block_id, starts_on, label): every move rebuilt the rows with type_id
-- null, and each week kept its letter but lost the type behind it — and with it the colour the
-- chip is drawn in. The letter surviving is what made it look like nothing had happened.
--
-- Same function, one more column on the way back in.

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
      insert into public.microcycles (block_id, starts_on, label, type_id)
      select new.id, h.starts_on + shift, h.label, h.type_id from unnest(held) h;
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
