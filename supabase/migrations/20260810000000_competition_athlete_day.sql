-- A lifter takes the platform on one day of a meet, not across its whole run. Nullable, and
-- null reads as the meet's first day: that is the right answer for every single-day meet, it
-- needs no backfill, and it follows along if the meet's dates are later moved. The "inside the
-- meet" rule can't be a CHECK — it spans two tables — so createCompetition/updateCompetition
-- enforce it and the picker only ever offers days the meet actually runs.
alter table public.competition_athletes
  add column competes_on date;

-- Writes on this table are granted column by column, so a new column is unwritable until named.
grant insert (competes_on), update (competes_on)
  on public.competition_athletes to authenticated;
