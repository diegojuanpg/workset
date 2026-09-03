-- Which age categories a meet runs (Junior-only, Open-only, or several). Empty = all.
-- Free text array like the other federation fields, so the Settings tab can edit the
-- source lists without a migration.
alter table public.competitions
  add column age_categories text[] not null default '{}';

-- Column-level grants must name the new column or inserts/updates can't touch it.
grant insert (coach_id, name, location, starts_on, ends_on, type, federation, age_categories),
      update (name, location, starts_on, ends_on, type, federation, age_categories)
  on public.competitions to authenticated;
