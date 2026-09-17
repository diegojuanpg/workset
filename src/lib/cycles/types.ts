/** The palette a coach picks from. Geist scale names rather than hex values: the app resolves
 *  each to `--ds-<name>-*` tokens, which is what makes one stored colour read correctly in
 *  both themes. Kept in step with the CHECK constraint on `cycle_types.color`. */
export const CYCLE_COLORS = [
  "gray",
  "blue",
  "purple",
  "pink",
  "red",
  "amber",
  "green",
  "teal",
] as const;

export type CycleColor = (typeof CYCLE_COLORS)[number];

export const CYCLE_TIERS = ["macro", "meso", "micro"] as const;
export type CycleTier = (typeof CYCLE_TIERS)[number];

export const NAME_MAX = 40;
export const DESCRIPTION_MAX = 120;

export interface CycleType {
  id: string;
  tier: CycleTier;
  name: string;
  description: string;
  color: CycleColor;
}

/** Tailwind can't build a class from a runtime string, so every colour's classes are written
 *  out. These are Geist's solid Badge variants copied value for value — the solid set, not the
 *  `-subtle` one: a typed week is a decision the coach made, and it should read from across
 *  the year at a glance rather than as a tinted whisper.
 *
 *  The `dark:` steps come with them. They are the one place the project's no-`dark:` rule does
 *  not apply, because they are not a theme override bolted on: a solid 900 fill is legible on
 *  a white card and vanishes into a dark one, so the design system itself picks a different
 *  step per theme. `--ds-contrast-fg` flips with it, white over the light fills and black over
 *  the dark ones. */
export const CHIP_CLASS: Record<CycleColor, string> = {
  gray: "bg-[var(--ds-gray-900)] dark:bg-[var(--ds-gray-500)] text-[var(--ds-contrast-fg)]",
  blue: "bg-[var(--ds-blue-800)] text-white",
  purple:
    "bg-[var(--ds-purple-900)] dark:bg-[var(--ds-purple-500)] text-[var(--ds-contrast-fg)]",
  pink: "bg-[var(--ds-pink-900)] dark:bg-[var(--ds-pink-600)] text-[var(--ds-contrast-fg)]",
  red: "bg-[var(--ds-red-900)] dark:bg-[var(--ds-red-800)] text-[var(--ds-contrast-fg)]",
  amber: "bg-[var(--ds-amber-700)] text-black",
  green: "bg-[var(--ds-green-900)] dark:bg-[var(--ds-green-600)] text-[var(--ds-contrast-fg)]",
  teal: "bg-[var(--ds-teal-900)] dark:bg-[var(--ds-teal-600)] text-[var(--ds-contrast-fg)]",
};

/** A block or a week with no type behind it. Not `CHIP_CLASS.gray`, which the two shared until
 *  the fills went solid: grey chosen from the palette is a decision and looks like one, while
 *  this is the absence of a decision and stays the quiet alpha fill the calendar was built on.
 *  Painting every untyped bar solid grey would make an empty plan the loudest thing on it.
 *
 *  What it does carry is a 1px edge. The fill alone is 1.19:1 against the card, so a bar with
 *  no type read as a gap in the surface rather than as the object the whole row is about —
 *  quietest of the three marks, but still a thing with a shape. */
const NEUTRAL_CHIP =
  "bg-[var(--ds-gray-alpha-200)] text-[var(--ds-gray-1000)] shadow-[inset_0_0_0_1px_var(--ds-gray-alpha-500)]";

/** The fill a mark on the plan carries: its type's colour, or the neutral one when the coach
 *  never picked a type for it. One place, so a block, a week and a settings preview can never
 *  disagree about what "no type" looks like. Macrocycles never call this: they are drawn as a
 *  grey band and carry no colour. */
export function fillFor(type: CycleType | undefined): string {
  return type ? CHIP_CLASS[type.color] : NEUTRAL_CHIP;
}

/** What a microcycle of this type is stamped with on the calendar. The chip is one column
 *  wide — 34px — so the label has always been a single character, and the initial is the one
 *  character a coach doesn't have to be asked for. Two types can share an initial; the
 *  settings preview shows the letter, so a clash is visible where it is created. */
export function microLabel(name: string): string {
  // Array spread, not [0]: an emoji or an accented letter outside the BMP is two code units,
  // and the column's CHECK counts characters.
  return ([...name.trim()][0] ?? "?").toUpperCase();
}

