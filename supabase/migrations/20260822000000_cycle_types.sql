-- Cycle types: the coach's own vocabulary for the three tiers of a plan. A type is a name a
-- coach reuses — "Volume", "Peaking", "Deload" — that the calendar offers when creating a
-- macro, a block or a microcycle. Picking one is never required: the calendar keeps its free
-- text field, and a block with no type behind it is still a block.
--
-- One table rather than three. The three tiers differ only in which columns they show —
-- a macro is drawn as a grey bracket and has nowhere to put a colour — and splitting them
-- would triple the policies, the grants and the actions to save one unused column.

create table public.cycle_types (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles (id) on delete cascade,
  tier text not null check (tier in ('macro', 'meso', 'micro')),
  -- Shorter than a block's 80: a type name is copied into a block and then numbered
  -- ("Volume" becomes "Volume 1"), so it has to leave room for the suffix.
  name text not null check (char_length(name) between 1 and 40),
  -- One line of help under the name in a picker, not a notes field. Never null, so the
  -- reader never has to tell "" apart from absent.
  description text not null default '' check (char_length(description) <= 120),
  -- A Geist scale name, not a hex value: the app resolves it to --ds-<colour>-* tokens, which
  -- is what lets one stored colour render correctly in both light and dark mode. Macros
  -- ignore it — they are drawn as a grey bracket, with nothing to tint.
  color text not null default 'gray'
    check (color in ('gray', 'blue', 'purple', 'pink', 'red', 'amber', 'green', 'teal')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Two types of the same tier can't share a name: the name is the whole identity of a type,
  -- and the calendar's picker would show the same row twice. The same name in another tier is
  -- fine — a "Deload" meso and a "Deload" micro are different things.
  constraint cycle_types_name_key unique (coach_id, tier, name)
);

create index cycle_types_coach_idx on public.cycle_types (coach_id, tier, name);

create trigger cycle_types_updated_at
  before update on public.cycle_types
  for each row execute function public.set_updated_at();

grant select, delete on public.cycle_types to authenticated;
grant insert (coach_id, tier, name, description, color),
      update (name, description, color)
  on public.cycle_types to authenticated;

alter table public.cycle_types enable row level security;

-- Coach-owned outright: unlike blocks and macros there is no athlete in between, so the
-- policy is the plain ownership test.
create policy "own cycle types" on public.cycle_types
  for all using (coach_id = (select auth.uid()))
  with check (coach_id = (select auth.uid()));
