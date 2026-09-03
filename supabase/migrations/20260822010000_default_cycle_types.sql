-- The vocabulary a coach starts with: The Strength Guys' three tiers, so the calendar's
-- pickers have something in them on day one. Every row is an ordinary cycle type — a coach
-- renames, recolours or deletes any of them, and nothing here comes back.
--
-- One function holding the list, called from two places: the signup trigger for coaches who
-- arrive from here on, and once at the bottom for the ones already in the table.

create or replace function public.seed_default_cycle_types(coach uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.cycle_types (coach_id, tier, name, description, color)
  values
    -- Macros are drawn as a grey bracket, with nothing to tint: the colour column is stored
    -- but never read for this tier, so both take the default.
    (coach, 'macro', 'Competitive',
     'Season built around one meet: demands and intensity climb aggressively towards peak day.',
     'gray'),
    (coach, 'macro', 'Non-Competitive',
     'Off-season base: volume tolerance and work capacity to support the next competitive macro.',
     'gray'),

    -- Mesos split two ways rather than five: amber is overload, green is recovery. The three
    -- amber phases are meant to share a colour — what separates them is where they sit in the
    -- macro, which the calendar already shows.
    (coach, 'meso', 'Preparatory',
     'Opens the macro. Muscle, work capacity and technique — 75% general factors, 25% specific.',
     'amber'),
    (coach, 'meso', 'Development',
     'Shifts towards specific work. Bar weight climbs and hard microcycles come round more often.',
     'amber'),
    (coach, 'meso', 'Competition',
     'Realisation and neural peak. Volume drops; intensity, specificity and RPE reach their highest.',
     'amber'),
    (coach, 'meso', 'Deload',
     'Short break between overload blocks to shed accumulated fatigue.',
     'green'),
    (coach, 'meso', 'Transition',
     'One to three weeks of active rest after a meet, injury or illness. General work over specific.',
     'green'),

    -- Micros carry a stress ramp that the palette can only half draw: TSG shades one blue and
    -- one grey from light to dark, and a cycle type stores a hue, not a shade. Grey is the
    -- easy weeks, blue is the hard ones; the name on the chip separates the rest.
    (coach, 'micro', 'Intro',
     'Settles into the block without early fatigue or heavy DOMS. Kept at @6 or below, never past @7.',
     'gray'),
    (coach, 'micro', 'Build',
     'Carries the intro''s technique into harder work. Efforts stay distinctly under @7.',
     'blue'),
    (coach, 'micro', 'Attack',
     'The hardest week of the block. Progressive overload and technique under fatigue at @7 and up.',
     'blue'),
    (coach, 'micro', 'Recover',
     'Volume cut 30-50% with bar weight kept high, so the block is absorbed. Often ends in a retest.',
     'gray'),
    (coach, 'micro', 'Seline',
     'The week before the meet. Volume cut hard, opener intensity kept so neural adaptations hold.',
     'gray')
  -- A coach who already made a "Deload" keeps theirs: the unique key is what decides, and a
  -- default has no claim on a name the coach has already used.
  on conflict (coach_id, tier, name) do nothing;
$$;

-- Signup already creates the profile here; the defaults ride the same transaction, so a coach
-- never sees an account that exists but has empty pickers.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id);
  perform public.seed_default_cycle_types(new.id);
  return new;
end;
$$;

-- Coaches who signed up before this migration. `on conflict do nothing` inside the function
-- makes it safe whatever they have already created.
select public.seed_default_cycle_types(p.id) from public.profiles p;
