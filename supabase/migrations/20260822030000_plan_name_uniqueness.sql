-- A name identifies one thing inside the group it belongs to. For a block that group is its
-- macrocycle; for a block with no macrocycle it is every other loose block of the same
-- athlete; for a macrocycle it is the athlete. "Competition 1" can therefore sit in two
-- different macros at once, and never twice in one.
--
-- Case-folded, because two blocks called "Competition 1" and "competition 1" are the same
-- name to everyone reading the plan. Only the ends of a name are trimmed — that happens in
-- the action, before the write — so "Competition  1" with a double space stays a name of its
-- own, which is the coach's business rather than the database's.

-- Names already on the plan that the new rule would refuse. A unique index cannot be created
-- over data that violates it, so the duplicates are numbered apart first, by the same rule the
-- app uses: oldest keeps the name, the rest count up past whatever is taken. Both loops walk
-- one row at a time because each rename changes what the next candidate has to avoid.
do $$
declare
  dup record;
  candidate text;
  n int;
begin
  loop
    -- The namespace, spelled out: a block's macro, or the athlete's loose group. Written as
    -- one key so a single pass covers both, since they are the same rule over different rows.
    select id, athlete_id, macro_id, name into dup
    from (
      select id, athlete_id, macro_id, name,
             row_number() over (
               partition by coalesce(macro_id::text, 'loose:' || athlete_id::text),
                            lower(name)
               order by created_at, id
             ) as r
      from public.training_blocks
    ) ranked
    where r > 1
    limit 1;
    exit when not found;

    n := 1;
    loop
      -- The base is the name without a numeric suffix, so "Competition 1" retries as
      -- "Competition 2" rather than "Competition 1 1".
      candidate := regexp_replace(dup.name, '\s+\d+$', '') || ' ' || n;
      exit when not exists (
        select 1 from public.training_blocks b
        where lower(b.name) = lower(candidate)
          and coalesce(b.macro_id::text, 'loose:' || b.athlete_id::text)
            = coalesce(dup.macro_id::text, 'loose:' || dup.athlete_id::text)
      );
      n := n + 1;
    end loop;

    update public.training_blocks set name = candidate where id = dup.id;
  end loop;

  loop
    select id, athlete_id, name into dup
    from (
      select id, athlete_id, name,
             row_number() over (
               partition by athlete_id, lower(name) order by created_at, id
             ) as r
      from public.macrocycles
    ) ranked
    where r > 1
    limit 1;
    exit when not found;

    n := 1;
    loop
      candidate := regexp_replace(dup.name, '\s+\d+$', '') || ' ' || n;
      exit when not exists (
        select 1 from public.macrocycles m
        where m.athlete_id = dup.athlete_id and lower(m.name) = lower(candidate)
      );
      n := n + 1;
    end loop;

    update public.macrocycles set name = candidate where id = dup.id;
  end loop;
end $$;

-- The old index was case-sensitive, so it let "Competition 1" and "competition 1" through.
drop index if exists public.training_blocks_macro_name_key;

create unique index training_blocks_macro_name_key
  on public.training_blocks (macro_id, lower(name))
  where macro_id is not null;

-- The loose group, which nothing covered before: a partial index rather than widening the one
-- above, because in a unique index every NULL macro_id is distinct from every other, so
-- (null, 'competition 1') never collides with itself however the columns are arranged.
-- Scoped by athlete: one lifter's unfiled blocks are not another's.
create unique index training_blocks_loose_name_key
  on public.training_blocks (athlete_id, lower(name))
  where macro_id is null;

-- A macro's group is the athlete. Two macros sharing a name would make "the macro Competition
-- 1 belongs to" identify nothing, which is the same failure one level up.
create unique index macrocycles_name_key
  on public.macrocycles (athlete_id, lower(name));
