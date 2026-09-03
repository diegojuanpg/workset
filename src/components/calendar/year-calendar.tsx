"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Scroller } from "@/components/ui/scroller";
import {
  GripIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
} from "@/components/icons";
import { monthSpans, yearWeeks } from "@/lib/calendar/year";
import {
  blockSpan,
  fromISODate,
  mondayOf,
  overlaps,
  shiftWeeks,
  startsInPastWeek,
  sundayOf,
  toISODate,
  weekCount,
} from "@/lib/blocks/weeks";
import type {
  Macrocycle,
  Microcycle,
  TrainingBlock,
} from "@/lib/blocks/queries";
import type { AthleteCompetition } from "@/lib/competitions/queries";
import { weeksOutLabel } from "@/lib/competitions/dates";
import { BlockModal } from "@/components/calendar/block-modal";
import { ContextMenu } from "@/components/ui/context-menu";
import { DotsMenu } from "@/components/ui/dots-menu";
import {
  createMacrocycle,
  createTrainingBlock,
  deleteMacrocycle,
  deleteMicrocycle,
  deleteTrainingBlock,
  renameMacrocycle,
  setBlockMacrocycle,
  setMicrocycle,
  reorderTrainingBlocks,
  updateTrainingBlock,
} from "@/lib/blocks/actions";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { BLOCK_BAR, MICRO_CHIP } from "@/components/calendar/chips";
import {
  fillFor,
  microLabel,
  type CycleType,
  type CycleTier,
} from "@/lib/cycles/types";
import { Select } from "@/components/ui/select";
import { numberedName } from "@/lib/blocks/names";
import { macrosIntact, reordered, runAround } from "@/lib/blocks/order";
import { MicroPicker } from "@/components/calendar/micro-picker";

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];
/** What the single letters stand for. The axis has two Ts and two Ss, so the letter alone is
 *  not a name a screen reader can use. */
const WEEKDAY_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const monthFormat = new Intl.DateTimeFormat("en-US", { month: "long" });
const MONTHS = Array.from({ length: 12 }, (_, m) =>
  monthFormat.format(new Date(2000, m, 1)),
);

/** Geist column pitch: a 32px day chip with 2.43px of air, same as the picker's `td`. Kept as a
 *  number too: dragging a block reads the column delta straight off the pointer's travel, which
 *  only works because every column is the same fixed width. */
const COLUMN_PX = 34.43;
const COLUMN = `${COLUMN_PX}px`;

/** Left axis column: 40px, of which the trailing 16px is reserved as the gap to the day matrix.
 *  The M–S label centres in the remaining 24px, so it reads centred but sits left of the middle. */
const AXIS_COLUMN = "2.5rem";

/** Geist day cell: a 32px chip whose 30px leading centres the digit, boxed in a subtle fill. */
const DAY_CELL =
  "block size-8 justify-self-center rounded-[4px] border border-transparent text-center text-[14px] leading-[30px] font-normal transition-colors";

/** The grid's chrome: month captions and the M–S axis. Day size, semibold — it leads the eye
 *  without outgrowing the numbers it heads, and keeps the two axes on one voice. */
const GRID_TEXT = "text-[14px] font-semibold";

/** Week-number row: same rhythm, dialed back in weight so it reads as scaffolding. Tone stops
 *  at gray-900 — gray-700 is 3.2:1 on a light background, and this is 12px text carrying the
 *  unit the whole plan is measured in, not decoration. */
const WEEK_NUMBER =
  "text-xs leading-[18px] font-normal text-[var(--ds-gray-900)]";

/** The rules bracketing the day matrix, measured off the card's own top edge. The week row carries
 *  12px below itself, so the header closes at 57 and the first chip starts at 77; the rules sit 7px
 *  clear of the matrix on both sides. The card's padding is even again now that the block, micro
 *  and macro rows sit below the lower rule — it is no longer the last thing on the card. */
const MATRIX_TOP = 69;
const MATRIX_HEIGHT = 288;

/** The M–S axis is sticky while the week columns scroll under it, and nothing keeps the two in
 *  register: the gap between the letter and the nearest day cycles from a whole column down to
 *  zero every 34.43px of scroll, and at the bottom of that cycle the axis's own background slices
 *  a digit in half. Snapping parks the scroll on column boundaries, so that gap is always the
 *  chip's own leading air. The scroll-padding is what lands a column at the axis's right edge
 *  instead of underneath it — it reads `--axis` because Tailwind can't interpolate a JS constant
 *  into an arbitrary value. */
const SNAP_TO_WEEKS =
  "[&_[data-geist-scroller-container]]:snap-x [&_[data-geist-scroller-container]]:snap-proximity [&_[data-geist-scroller-container]]:[scroll-padding-left:var(--axis)]";

/** Snapping is switched off for the length of a drag. Mandatory snapping used to fight the
 *  gesture — the track kept pulling towards a column while the pointer was carrying a bar —
 *  and proximity still tugs at the end of a throw. */
const NO_SNAP = "[&_[data-geist-scroller-container]]:snap-none";

/** The Scroller ships a thin scrollbar. Hidden here — the year always overflows, so the bar would
 *  be permanent furniture; the right-edge fade already says there is more. Reached through the DS
 *  component's own data attribute rather than by editing the copied source. */
const NO_SCROLLBAR =
  "[&_[data-geist-scroller-container]]:[scrollbar-width:none] [&_[data-geist-scroller-container]::-webkit-scrollbar]:hidden";

/** Push past either end and the browser rubber-bands the whole track sideways — but the M–S
 *  axis is sticky, so it stays clamped to the viewport while the days slide out from under it,
 *  and the rule drawn on the card doesn't move either. Nothing is off the end of a year worth
 *  bouncing towards, so the bounce goes. */
const NO_BOUNCE =
  "[&_[data-geist-scroller-container]]:overscroll-x-none";

/** Which side of the blocks the bracket lives on: above them, or below them and their micros.
 *  One switch, because everything it decides has to agree — the grid rows reorder, the name
 *  moves with the rule, and the margin that clears the day matrix's lower rule goes to
 *  whichever row ends up directly under it. */
const MACRO_ABOVE = false;

/** A training block's bar. Rides the same week columns as the days, one grid row below the
 *  matrix, so it stays aligned and scrolls with them for free. 32px, the day chip's own size,
 *  and deliberately taller than today's 28px marker — that one earns its presence from the
 *  focus ring instead. mx-0.5 insets it 2px, so two blocks that share a boundary read as two
 *  bars with 4px between them instead of one long shape. The top margin clears the lower rule
 *  — only when the blocks are the row sitting under it; see MACRO_ABOVE. */
const BLOCK_SLOT = cn("mx-0.5", !MACRO_ABOVE && "mt-1.5");
/** A bar over a week it can't land on: outlined rather than tinted, so the name stays readable
 *  and the refusal reads as a rule about the position, not about the block. */
const REFUSED_BAR = "shadow-[0_0_0_1px_var(--ds-red-900)]";

/** How long the block offered beside an existing one is. A plan grows a mesocycle at a time,
 *  and four weeks is the one a coach reaches for — long enough to be the common case, short
 *  enough that correcting it in the modal is one field. */
const OFFER_WEEKS = 4;

/** Three rows under the day matrix. The blocks and their micros always travel together, in
 *  that order; the bracket takes whichever end MACRO_ABOVE points it at. */
const MACRO_ROW = MACRO_ABOVE ? 3 + 7 : 3 + 9;
const BLOCK_ROW = MACRO_ABOVE ? 3 + 8 : 3 + 7;
const MICRO_ROW = BLOCK_ROW + 1;
/** The offer, on an empty week. Invisible until the pointer is on that column — a row of
 *  dashed boxes under every block would be louder than the blocks themselves. */
/** What a new micro is labelled with. A placeholder until the kinds of week a coach works in
 *  are a thing the app knows about. */
const MICRO_DEFAULT = "A";
/** The look of an offer, shared by the empty micro week and the block offered beside a bar:
 *  dashed and unfilled, so it reads as somewhere something could go rather than something that
 *  is already there, and brightening under the pointer. Only the look is shared — a micro is
 *  summoned by hovering its column, a block offer by hovering itself, so each keeps its own
 *  reveal. */
const GHOST =
  "cursor-pointer rounded-md border border-dashed border-[var(--ds-gray-alpha-500)] text-label-12 text-[var(--ds-gray-900)] transition-colors hover:border-[var(--ds-gray-1000)] hover:text-[var(--ds-gray-1000)]";
const MICRO_GHOST = cn(
  GHOST,
  "h-8 w-full opacity-0 focus-visible:opacity-100 group-hover/micro:opacity-100",
);

/** The bracket: one rule across the macro's reach with a tick at each end — |‾‾‾| above its
 *  blocks, |___| below them — and its name centred on the rule, on a patch of card that hides
 *  the line behind it. */
/** How thick the bracket is drawn, rule and ticks alike. A number rather than four Tailwind
 *  arbitrary values, because they are one measurement wearing four hats and the scanner cannot
 *  build a class out of a variable: the rule was once 1.5px while the ticks used `w-0.5`, which
 *  is 2px, under a comment claiming 1.5 everywhere — and every later adjustment carried that
 *  mismatch forward until it showed.
 *
 *  1.5 matches Geist Bold's ~1.4px stem, so rule, ticks and the word between them all weigh the
 *  same and |—— Macro 1 ——| reads as one drawn mark rather than a label on a hairline. */
const BRACKET_STROKE = 1.5;
/** Where the rule's own box starts inside the slot. The tick is placed against the rule's
 *  centre line, which is half a stroke further down, so both follow from this one number. */
const BRACKET_TOP = MACRO_ABOVE ? 8 : 12;
const BRACKET_STYLE: React.CSSProperties = {
  top: BRACKET_TOP,
  height: BRACKET_STROKE,
};
/** The tick reaches 6px past the rule's centre line and stops flush with the far side of its
 *  stroke, so its height is that reach plus the half-rule it sits on — never a second number
 *  to keep in step by hand. */
const BRACKET_END_STYLE: React.CSSProperties = {
  // Above its blocks the tick hangs down from the rule's top edge; below them it rises to that
  // edge, so it starts a reach-and-a-half-rule higher up.
  top: MACRO_ABOVE
    ? BRACKET_TOP
    : BRACKET_TOP + BRACKET_STROKE / 2 - 6,
  height: 6 + BRACKET_STROKE / 2,
  width: BRACKET_STROKE,
};

/** Where one tick sits along the bracket. Both are the same 1.5px box, but the slot is as wide
 *  as its macro is long — a whole number of 34.43px columns, so a fraction — and pinning one to
 *  each edge lands them on different subpixel offsets. The browser then spreads one across three
 *  device pixels and the other across two, and the far tick reads visibly lighter than the near
 *  one, differently for every macro length.
 *
 *  So the far tick is placed a whole number of pixels from the near one instead of against the
 *  edge. Both then meet the pixel grid identically and rasterise the same. It costs up to half a
 *  pixel of alignment with the slot's true right edge, which nobody can see; a tick at half
 *  weight, as it turns out, they can. */
function bracketEndOffset(columns: number, side: "near" | "far"): number {
  if (side === "near") return 0;
  // The slot's own mx-0.5 takes 2px off each end of the grid area it spans.
  return Math.round(columns * COLUMN_PX - 4 - BRACKET_STROKE);
}
const BRACKET = cn(
  // Stops at the ticks' centre line rather than at the container's edge: the rule's end lands
  // on a fraction of a device pixel, and whatever that rounds outwards is hidden under the tick
  // instead of poking out past it.
  // A box, not a border: Chrome rounds border-width to whole device pixels, so a 1.5px rule
  // drew at 1px while the ticks — backgrounds, which antialias — drew at 1.5. Same painting
  // path for both is what makes them the same weight and share a centre line.
  // 14px under the micros: the slot's own -mt-1.5 against the grid's 8px gap puts its top 2px
  // below them, and the rule sits 12px into it (BRACKET_TOP). Moved inside the slot rather than
  // by pulling the slot up, which would slide its click target over the bottom of the micros.
  "pointer-events-none absolute inset-x-px bg-[var(--ds-gray-900)]",
);
/** The ticks rise from the rule towards the blocks they close around and stop flush with the far
 *  side of its stroke — ⌐———¬ rather than |———| : two ends marking where the macro starts and
 *  stops, without the halves that used to hang past it into open card.
 *
 *  Sized and placed by BRACKET_END_STYLE — see BRACKET_STROKE. */
const BRACKET_END = "pointer-events-none absolute bg-[var(--ds-gray-900)]";
/** The negative margin eats the grid's 8px row gap on the block side, so the bracket belongs
 *  to the bars rather than floating a row away from them. */
const BRACKET_SLOT = cn(
  "relative mx-0.5 h-6",
  MACRO_ABOVE ? "mt-1.5 -mb-2.5" : "-mt-1.5",
);
/** How far the bracket climbs when there are no micros to clear: the row's own 32px chip, plus
 *  the 4px of gap that separates it from the blocks above. The row is always in the grid, so
 *  the card keeps one height — closing it is a transform, not a reflow — and taking the gap
 *  along with the row is what leaves the bracket the same 14px under the blocks that it sits
 *  under the micros when they are there. */
const MICRO_ROW_HEIGHT = 36;

/** The bracket closing the gap when the micro row has nothing in it. transform, not margin:
 *  it moves the bracket without touching a single row's height, so the card cannot resize and
 *  the browser can run it on the compositor. The curve is a plain ease-out — the bracket is
 *  settling into place, not bouncing into it — and reduced motion collapses the duration
 *  globally in globals.css. */
const BRACKET_SLIDE =
  "transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]";
const BRACKET_HELD = "bg-[var(--ds-gray-1000)]";
/** Offered on hover over a block that has no macro yet. The button covers the whole row so it
 *  is something you can actually hit — the dashed bracket it draws is only 10px tall. */
const BRACKET_GHOST = "group absolute inset-0 cursor-pointer";
const BRACKET_GHOST_LINE = cn(
  // Starts where the ticks end, not at the container's edge: a dash is 3px and the ticks are
  // 2px, so a line drawn edge to edge lays its first and last dash straight over them.
  "pointer-events-none absolute inset-x-0.5 border-t border-dashed border-[var(--ds-gray-alpha-500)] group-hover:border-[var(--ds-gray-1000)]",
  MACRO_ABOVE ? "top-2" : "top-3",
);
/** The macro's name, sitting on the rule and cutting it — the middle of |—— Macro 1 ——|.
 *  Transparent to the pointer so the click lands on the button that covers the bracket. */
const MACRO_NAME = cn(
  // Never the full reach: a name that ran edge to edge covered the rule and both ticks, so a
  // long one read as a floating word with a stray mark next to it. 12px a side keeps the tick
  // and a bite of rule showing, which is what says the word is the label of a span.
  "pointer-events-none absolute inset-x-0 mx-auto w-max max-w-[calc(100%-24px)] truncate bg-[var(--ds-background-100)] px-1.5 text-label-12 leading-4 font-bold text-[var(--ds-gray-900)]",
  // Centred on the rule either way: the 16px line box straddles it.
  MACRO_ABOVE ? "top-0" : "top-1",
);

/** The whole bracket lifts to full contrast on hover, announcing it is one thing you can click. */
const MACRO_HOVER = {
  line: "group-hover:bg-[var(--ds-gray-1000)]",
  end: "group-hover:bg-[var(--ds-gray-1000)]",
  name: "group-hover:text-[var(--ds-gray-1000)]",
};

/** Left axis width in pixels — the same 2.5rem as AXIS_COLUMN, needed as a number to read a
 *  week column off the pointer's x during a bracket drag. */
const AXIS_PX = 40;
/** The card's own px-3, which anything measured from the card rather than from the grid has
 *  to start past. */
const CARD_PAD_X = 12;
/** How close to the card's bottom edge the pointer has to come before the scrollbar shows.
 *  Small on purpose: the bar is not a landmark, it is something you reach for. */
const BAR_REACH = 40;

/** How far each edge fade reaches in. Short and translucent on purpose: it is a hint that the
 *  year keeps going, and a heavier one reads as a column that failed to render. */
const EDGE_FADE = 72;
/** …and its pt-2.5 / pb-1.5, so an overlay can stop short of the card's own edges. */
const CARD_PAD_TOP = 10;
const CARD_PAD_BOTTOM = 6;

/** "Monday 4 May". No year: the calendar's own header already says which one. The comma the
 *  locale puts after the weekday is stripped — this format doesn't want it. */
const DAY_TITLE = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

function dayTitle(date: Date, meet?: string): string {
  const day = DAY_TITLE.format(date).replace(",", "");
  return meet ? `${day} · ${meet}` : day;
}

/** A selected cell fills its column and bridges the 8px row gaps, so the range reads as one
 *  block instead of a field of tiles. Geist's own range does the same: measured on
 *  vercel.com/geist/calendar, its cells sit flush at 34x32 with no padding or margin and the
 *  colour lives on the cell. The 40px box with -4px margins keeps a 32px margin box, so the
 *  track, the pitch and every digit stay exactly where they were.
 *
 *  The first and last rows give that reach back on their outer edge — otherwise the band
 *  overshoots the matrix by 4px at each end.
 *
 *  Every row pays for its reach in padding. `leading-[30px]` centres the digit by filling the
 *  content box exactly, and a block's line box sits at the *top* of that box — so a row that
 *  grows without padding drops its digit by however much it grew. The middle rows grow 4px at
 *  each end and take `py-1` back; the outer two grow at one end and pay on that side alone. */
function draftBox(d: number): string {
  const fill = "w-full max-w-none justify-self-stretch rounded-none";
  if (d === 0) return `${fill} h-9 -mb-1 pb-1`;
  if (d === WEEKDAYS.length - 1) return `${fill} h-9 -mt-1 pt-1`;
  return `${fill} h-10 -my-1 py-1`;
}

/** The two ends of the range go light with dark digits, the way Geist marks a range's first
 *  and last day; everything between is the flat band. */
const DRAFT_EDGE =
  "bg-[var(--ds-gray-1000)] font-medium text-[var(--ds-background-100)]";
const DRAFT_FILL = "bg-[var(--ds-gray-alpha-200)]";

/** Today and a meet day the band runs over. These replace the band's fill on that cell rather
 *  than being drawn inside it: the tint takes the box whole — full column width, the 8px row
 *  gap bridged, and whichever of the range's four outer corners the cell happens to be at — so
 *  a marked day reads as a coloured segment of the band and not as a chip floating in it. A
 *  32px square centred in the 34.43x40 box left the band's own fill showing around it, which
 *  is the halo this replaces.
 *
 *  Flat, with no ring: the ring is what made the marker read as a figure punched through the
 *  selection. Which end of the range the cell is at makes no difference to the colour — the
 *  tint answers "what day is this", and the corners already say where the range ends. */
const DRAFT_TODAY =
  "bg-[var(--ds-blue-900)] font-medium text-[var(--ds-background-100)]";
const DRAFT_MEET =
  "bg-[var(--ds-red-900)] font-medium text-[var(--ds-background-100)]";

/** The range being dragged out, shown in the bar row so you see the block you are about to
 *  get rather than a highlight over the days. */
/** The silhouette of the block a range would become. It is BLOCK_BAR, inside BLOCK_SLOT, the
 *  way a real bar is built — a preview that keeps its own height and margin drifts from the
 *  thing it is previewing the moment either is touched, and lands the block a few pixels from
 *  where it was drawn. Only the surface is its own: dashed and hollow, since nothing exists
 *  yet. BLOCK_BAR's overflow-hidden and the truncating child still matter — the band can be
 *  one column wide, and "1 week" is wider than the 34px that leaves. */
const BLOCK_DRAFT = cn(
  BLOCK_BAR,
  "border border-dashed border-[var(--ds-gray-alpha-600)] bg-[var(--ds-gray-alpha-100)] text-[var(--ds-gray-900)]",
);

/** How vercel.com typesets Geist: stylistic set 11, no contextual alternates, no synthesised weight. */
const GEIST_TYPE = {
  fontFeatureSettings: '"calt" 0, "rlig", "ss11"',
  fontSynthesis: "style small-caps",
  textRendering: "optimizeLegibility",
} as const;

/** Today, styled after the day the Geist picker highlights on open: the solid blue chip, plus the
 *  design system's focus ring — 2px of card background, then 2px of focus colour, which in dark
 *  mode is the chip's own blue. Its box is smaller than the cell's 32px so the ring has somewhere
 *  to go, and it centres its own digit with flex rather than a leading derived from that height,
 *  which would be a second number to keep in step. `self-center` holds it on the row's centre. */
const TODAY =
  "flex size-7 items-center justify-center self-center bg-[var(--ds-blue-900)] text-[var(--ds-background-100)] shadow-[var(--ds-focus-ring)]";

/** A meet day: today's marker in red, down to the shadow. One marker for every federation —
 *  the calendar is only answering "when do I compete", and a per-federation livery would mean
 *  inventing a palette for each new federation a coach types in. */
const MEET =
  "flex size-7 items-center justify-center self-center bg-[var(--ds-red-900)] text-[var(--ds-background-100)] shadow-[0_0_0_2px_var(--ds-background-100),0_0_0_4px_var(--ds-red-900)]";

/** Geist Calendar nav: circular, transparent, gray-700 until hover. */
const NAV =
  "rounded-full text-[var(--ds-gray-700)] hover:text-[var(--ds-gray-1000)]";
/** Left axis rides along on the horizontal scroll, so it needs the card's own background. */
const STICKY = "sticky left-0 z-10 bg-[var(--ds-background-100)]";

/** Days outside the year are the only ones dimmed, so next January's tail never reads as this
 *  one's. Every day inside it sits at full contrast — the month is the caption's job. */
function dayTone(date: Date, year: number): string {
  return date.getFullYear() === year
    ? "text-[var(--ds-gray-1000)]"
    : "text-[var(--ds-gray-700)]";
}

/** Whole weeks from one yyyy-mm-dd to another, signed. Both are Mondays, so rounding is what
 *  absorbs the hour a DST boundary takes out of the difference. */
function weeksApart(from: string, to: string): number {
  return Math.round(
    (fromISODate(to).getTime() - fromISODate(from).getTime()) / 604_800_000,
  );
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

interface YearCalendarProps {
  athleteId: string;
  blocks: TrainingBlock[];
  competitions: AthleteCompetition[];
  macros: Macrocycle[];
  micros: Microcycle[];
  /** The coach's own vocabulary, as the settings page left it. Every picker on the calendar
   *  offers exactly these — the calendar never invents a name or a colour of its own. */
  types: Record<CycleTier, CycleType[]>;
}

/** Year at a glance: one column per ISO week, one row per weekday. */
export function YearCalendar({
  athleteId,
  blocks,
  competitions,
  macros,
  micros,
  types,
}: YearCalendarProps) {
  const [year, setYear] = React.useState(() => new Date().getFullYear());
  const [creating, setCreating] = React.useState<{
    startsOn?: string;
    endsOn?: string;
  } | null>(null);
  const [editing, setEditing] = React.useState<TrainingBlock | null>(null);
  /** A block being dragged: moved bodily, or resized from one of its edges. `delta` is in whole
   *  columns, read off the pointer's travel. */
  /** The micro being carried. A chip is grabbable on sight — the pointer shows an open hand
   *  over it and a closed one while it travels — so there is no arming step between wanting to
   *  move a week and moving it. */
  const [microGrab, setMicroGrab] = React.useState<{
    blockId: string;
    from: number;
    startX: number;
    delta: number;
  } | null>(null);
  const [gesture, setGesture] = React.useState<{
    id: string;
    mode: "move" | "start" | "end";
    startX: number;
    /** Raw pointer travel. A moved bar follows this 1:1 and snaps only on release — quantising
     *  it live made the drag jump a whole column at a time. */
    dx: number;
    /** …and the same travel in whole columns, which is what actually lands. */
    delta: number;
  } | null>(null);
  /** Dates a drag just wrote, held locally so the bar stays put until the server round-trips.
   *  Never cleared: once revalidation lands, every entry simply agrees with its block. */
  const [placed, setPlaced] = React.useState<
    Record<string, { startsOn: string; endsOn: string }>
  >({});
  // Column indices, in the order they were touched: `from` is where the gesture began, so it
  // can sit to the right of `to` when the drag runs backwards.
  const [drag, setDrag] = React.useState<{ from: number; to: number } | null>(
    null,
  );
  /** Every type the coach owns, by id. One map for all three tiers: a mark carries an id and
   *  wants a colour, and which tier it came from is already decided by where it sits. */
  const typeById = React.useMemo(
    () =>
      new Map(
        [...types.macro, ...types.meso, ...types.micro].map((t) => [t.id, t]),
      ),
    [types],
  );

  const [today, setToday] = React.useState<Date | null>(null);
  const todayRef = React.useRef<HTMLDivElement>(null);
  // Measured to turn a pointer x into a week column while a bracket is being dragged.
  const gridRef = React.useRef<HTMLDivElement>(null);
  /** The block the pointer is over, which is what offers the ghost bracket. Also set from the
   *  ghost itself: it lives a row below, so moving down to click it leaves the block. */
  const [hovered, setHovered] = React.useState<string | null>(null);
  /** Macro assignments a drag just wrote, held until the server round-trips. Same idea as
   *  `placed`, and read the same way: undefined means "no local opinion", null means "no macro". */
  const [assigned, setAssigned] = React.useState<
    Record<string, string | null>
  >({});
  const [renaming, setRenaming] = React.useState<Macrocycle | null>(null);
  /** Labels typed since the last server round-trip, keyed `blockId|monday`. An empty string
   *  is a week whose micro was just cleared, which is why this can't be a plain lookup miss. */
  /** Micros written since the last round-trip. The type rides with the label because the two
   *  are picked in one gesture, and a chip that got its letter before its colour would flash
   *  neutral for the length of a request. */
  const [labels, setLabels] = React.useState<
    Record<string, { label: string; typeId: string | null }>
  >({});
  /** A bracket edge being dragged. `first`/`last` are indices into `bars` — the unit is a
   *  whole meso, so the bracket steps block by block and never lands on an empty week. */
  const [macroDrag, setMacroDrag] = React.useState<{
    id: string;
    edge: "start" | "end";
    first: number;
    last: number;
    /** Why this reach can't be saved, or null when it can. The bracket still follows the
     *  pointer while it is set — refusing to move at all reads as a broken drag. */
    reason: string | null;
  } | null>(null);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read after hydration: the server and the browser can sit on different calendar days
    setToday(new Date());
  }, []);

  const weeks = React.useMemo(() => yearWeeks(year), [year]);
  const months = React.useMemo(() => monthSpans(weeks), [weeks]);

  // Blocks are stored once and clipped per year: one can start in December and run on.
  const bars = React.useMemo(
    () =>
      blocks.flatMap((b) => {
        const at = placed[b.id] ?? b;
        b = { ...b, startsOn: at.startsOn, endsOn: at.endsOn };
        const span = blockSpan(weeks, b.startsOn, b.endsOn);
        if (!span) return [];
        // A block can start in December and run into January; each year draws only its part.
        const whole = weekCount(fromISODate(b.startsOn), fromISODate(b.endsOn));
        const macroId = b.id in assigned ? assigned[b.id] : b.macroId;
        return [{ ...b, ...span, macroId, clipped: whole !== span.span }];
      }),
    [blocks, weeks, placed, assigned],
  );

  // Where each macro's bracket sits: from its first block to its last. A macro whose blocks
  // all fall outside the year on screen simply isn't drawn.
  const brackets = React.useMemo(
    () =>
      macros.flatMap((m) => {
        const held = bars
          .map((b, i) => (b.macroId === m.id ? i : -1))
          .filter((i) => i !== -1);
        if (held.length === 0) return [];
        return [{ macro: m, first: held[0], last: held[held.length - 1] }];
      }),
    [macros, bars],
  );

  /** The bracket as it stands, with a drag in progress applied over the stored one. */
  const shown = brackets.map((b) =>
    macroDrag?.id === b.macro.id
      ? { ...b, first: macroDrag.first, last: macroDrag.last }
      : b,
  );

  // yyyy-mm-dd -> the meet this athlete lifts at that day. One key per meet: they compete on a
  // single day of it, so there is no range to expand.
  const meetDays = React.useMemo(
    () => new Map(competitions.map((c) => [c.on, c])),
    [competitions],
  );

  // How far off the next meet is, counted from now and not from the year on screen: "weeks out"
  // is a fact about today, so paging to 2028 must not change it. Waits for `today` to land on
  // the client for the same reason the marker does — a count baked at build time would be wrong
  // by the time anyone read it. getAthleteCompetitions sorts by day, so the first hit is the
  // nearest one.
  const meetCountdown = React.useMemo(() => {
    if (!today) return null;
    const iso = toISODate(today);
    const next = competitions.find((c) => c.on >= iso);
    return next && weeksOutLabel(next.on, next.name, iso);
  }, [competitions, today]);

  const draft = React.useMemo(
    () =>
      drag && {
        start: Math.min(drag.from, drag.to),
        span: Math.abs(drag.to - drag.from) + 1,
      },
    [drag],
  );
  // Why the range being painted can't become a block, checked while it is still being painted.
  // The same two rules the drop and the server enforce — a coach shouldn't discover them by
  // reaching a modal whose Create button is already dead.
  const draftRefusal = React.useMemo(() => {
    if (!draft) return null;
    const from = toISODate(mondayOf(weeks[draft.start].monday));
    const to = toISODate(sundayOf(weeks[draft.start + draft.span - 1].monday));
    const clash = bars.find((b) => overlaps({ startsOn: from, endsOn: to }, b));
    if (clash) return `That would overlap ${clash.name}.`;
    return startsInPastWeek(from, new Date())
      ? "A block can't start in a week that has already passed."
      : null;
  }, [draft, bars, weeks]);
  /** Four free weeks on either side of every block, offered as the silhouette a drag would
   *  leave. Continuing a plan is the common next move, and drawing four weeks by hand for it
   *  is work the calendar already knows how to do.
   *
   *  An offer that couldn't become a block is worse than no offer, so one is dropped when it
   *  runs past the year, lands on another block, or starts in a week that has gone — the same
   *  three rules the drop enforces. `today` is null until hydration, which is also what keeps
   *  the server and the first client render agreeing on an empty list. */
  const offers = React.useMemo(() => {
    if (!today) return [];
    const free = (start: number) =>
      !bars.some(
        (b) => start <= b.start + b.span - 1 && b.start <= start + OFFER_WEEKS - 1,
      );
    const starts = new Set<number>();
    for (const b of bars) {
      for (const start of [b.start + b.span, b.start - OFFER_WEEKS]) {
        if (start < 0 || start + OFFER_WEEKS > weeks.length) continue;
        if (!free(start)) continue;
        if (startsInPastWeek(toISODate(mondayOf(weeks[start].monday)), today))
          continue;
        starts.add(start);
      }
    }
    // Two blocks six weeks apart offer overlapping stretches — one to the right of the first,
    // one to the left of the second. Keeping the earlier of any overlapping pair leaves one
    // hover target per gap instead of two stacked on each other.
    const kept: number[] = [];
    for (const start of [...starts].sort((a, b) => a - b)) {
      const last = kept[kept.length - 1];
      if (last !== undefined && start <= last + OFFER_WEEKS - 1) continue;
      kept.push(start);
    }
    return kept;
  }, [bars, weeks, today]);

  /** Where a column sits in the range: an end, the middle, or outside it. */
  function draftAt(week: number): "edge" | "fill" | null {
    if (draft === null) return null;
    const last = draft.start + draft.span - 1;
    if (week < draft.start || week > last) return null;
    return week === draft.start || week === last ? "edge" : "fill";
  }

  /** Writes one block's dates and answers whether it stuck. Held locally first so the bar
   *  doesn't wait for the round-trip, and rolled back to `from` when the server refuses —
   *  otherwise the bar keeps a position the database never accepted, and the next block a
   *  coach draws collides with a range that isn't where it looks. Undo is the same call with
   *  the two ends swapped. */
  const place = React.useCallback(
    (
      block: { id: string; name: string },
      to: { startsOn: string; endsOn: string },
      from: { startsOn: string; endsOn: string },
    ): Promise<boolean> => {
      setPlaced((p) => ({ ...p, [block.id]: to }));
      return updateTrainingBlock(block.id, {
        athleteId,
        name: block.name,
        ...to,
      }).then((r) => {
        if (!r.error) return true;
        setPlaced((p) => ({ ...p, [block.id]: from }));
        toast.error(r.error);
        return false;
      });
    },
    [athleteId],
  );

  /** Removes a block and hands back the way to bring it back. Undo re-creates it rather than
   *  resurrecting the row, so everything that hung off the old id has to be carried over by
   *  hand: the microcycles go with it through `on delete cascade`, and its place in a macro
   *  is a column on the row that no longer exists. Both are read before the delete, while
   *  they are still there to read. */
  function removeBlock(block: TrainingBlock) {
    const weeks = micros
      .filter((m) => m.blockId === block.id)
      .map((m) => {
        // A micro written since the last round-trip is the one the coach can see, so it wins.
        const local = labels[`${block.id}|${m.startsOn}`];
        return {
          startsOn: m.startsOn,
          label: local?.label ?? m.label,
          typeId: local ? local.typeId : m.typeId,
        };
      })
      .filter((m) => m.label);
    const macroId = block.macroId;

    void deleteTrainingBlock(block.id).then((r) => {
      if (r.error) {
        toast.error(r.error);
        return;
      }
      toast(`${block.name} deleted`, {
        action: {
          label: "Undo",
          onClick: () => {
            void createTrainingBlock({
              athleteId,
              // The app is writing this name back, not the coach: if something took it during
              // the eight seconds the toast was up, the block returns numbered rather than
              // not at all.
              autoRename: true,
              name: block.name,
              startsOn: block.startsOn,
              endsOn: block.endsOn,
              typeId: block.typeId,
            }).then((again) => {
              if (again.error || !again.id) {
                toast.error(again.error ?? "Could not restore the block.");
                return;
              }
              const id = again.id;
              void Promise.all([
                ...weeks.map((w) =>
                  setMicrocycle(id, w.startsOn, w.label, w.typeId),
                ),
                ...(macroId ? [setBlockMacrocycle(id, macroId)] : []),
              ]).then((results) => {
                const failed = results.find((x) => x.error);
                // The block is back either way; only what hung off it fell short.
                if (failed) toast.error(failed.error!);
              });
            });
          },
        },
      });
    });
  }

  // Where a dragged block currently sits, and whether it may land there. Clamped to the year,
  // refused on top of another block — the same rule the table's exclusion constraint enforces —
  // and refused in a week that has already closed.
  const drop = React.useMemo(() => {
    if (!gesture) return null;
    const bar = bars.find((b) => b.id === gesture.id);
    if (!bar) return null;

    let start = bar.start;
    let end = bar.start + bar.span - 1;
    if (gesture.mode === "move") {
      // Clamped as a unit so a move never changes how long the block is.
      const shift = Math.min(
        Math.max(gesture.delta, -bar.start),
        weeks.length - bar.span - bar.start,
      );
      start += shift;
      end += shift;
    } else if (gesture.mode === "start") {
      start = Math.min(Math.max(start + gesture.delta, 0), end);
    } else {
      end = Math.max(Math.min(end + gesture.delta, weeks.length - 1), start);
    }

    // Why it can't land here, in the words the coach needs — the same shape the bracket drag
    // uses. Both rules are invisible on the grid, so refusing in silence reads as a broken
    // drag and the answer is to try again harder rather than to drop somewhere else.
    const clash = bars.find(
      (o) => o.id !== bar.id && start <= o.start + o.span - 1 && o.start <= end,
    );
    const reason = clash
      ? `That would overlap ${clash.name}.`
      : startsInPastWeek(toISODate(weeks[start].monday), new Date())
        ? "A block can't start in a week that has already passed."
        : null;
    return {
      bar,
      start,
      span: end - start + 1,
      shift: start - bar.start,
      reason,
      valid: reason === null,
      // Only the edge that moved is rewritten. A move shifts the real dates rather than reading
      // them off the columns, so a block clipped by the year's edge keeps its hidden half.
      startsOn:
        gesture.mode === "end" ? bar.startsOn : toISODate(weeks[start].monday),
      endsOn:
        gesture.mode === "start"
          ? bar.endsOn
          : toISODate(sundayOf(weeks[end].monday)),
    };
  }, [gesture, bars, weeks]);

  /** Filled in below, once `reorderRun` has everything it reads in scope. Held in a ref for
   *  the same reason the rest of the drag's inputs are: the listeners are subscribed once for
   *  the whole gesture, so they cannot close over the copy that existed when it began. */
  const liveReorderRun = React.useRef<
    (bar: (typeof bars)[number], landingWeek: number) => boolean
  >(() => false);

  // What the drag listeners read. Kept in a ref so they can be subscribed once per gesture:
  // both `bars` and the drag itself change on every mousemove, and depending on them directly
  // would tear down and re-add the listeners with each pixel of travel.
  const live = React.useRef({
    bars,
    assigned,
    microGrab,
    macroDrag,
    macros,
    gesture,
    drop,
    drag,
    draftRefusal,
  });
  // No dependency list: it has to land after every render, which is exactly what keeps the
  // listeners reading current values without being re-subscribed.
  React.useEffect(() => {
    live.current = {
      bars,
      assigned,
      microGrab,
      macroDrag,
      macros,
      gesture,
      drop,
      drag,
      draftRefusal,
    };
  });

  /** Assigns a set of blocks to a macro — or back to where they were — as one gesture, holding
   *  the result locally until the server agrees. `to` maps block id to the macro it should end
   *  up in, null meaning none, which is what makes it its own inverse. Stable: everything it
   *  reads comes off `live`, so the drag effect can depend on it without re-subscribing. */
  const assign = React.useCallback(
    (to: Record<string, string | null>): Promise<boolean> => {
      const before = { ...live.current.assigned };
      setAssigned((a) => ({ ...a, ...to }));
      // One at a time, not Promise.all: each block is renamed against what its new group
      // already holds, and two running together would both read the group before either had
      // landed — and both come out "Competition 2".
      return (async () => {
        const renamed: string[] = [];
        for (const [id, macroId] of Object.entries(to)) {
          const result = await setBlockMacrocycle(id, macroId);
          if (result.error) {
            // Put it back: leaving the bracket where the server refused it would have the
            // next drag computing its diff against a reach that doesn't exist.
            setAssigned(before);
            toast.error(result.error);
            return false;
          }
          if (result.renamedTo) renamed.push(result.renamedTo);
        }
        // A rename is a change to the plan the coach never asked for by name, so it is said
        // out loud rather than discovered later on the bar.
        if (renamed.length === 1) toast(`Renamed ${renamed[0]}`);
        else if (renamed.length > 1)
          toast(`${renamed.length} blocks renamed to keep names apart`);
        return true;
      })();
    },
    [],
  );

  // Subscribed once per gesture, not once per pointermove: the drag reads `drop` and its own
  // mode off `live`, so neither has to be a dependency. Naming them tore the listeners down and
  // rebuilt them — and rewrote document.body.style.cursor — with every pixel of travel.
  const dragging = gesture !== null;
  React.useEffect(() => {
    if (!dragging) return;
    const onMove = (e: PointerEvent) =>
      setGesture((g) =>
        g
          ? {
              ...g,
              dx: e.clientX - g.startX,
              delta: Math.round((e.clientX - g.startX) / COLUMN_PX),
            }
          : g,
      );
    const onUp = () => {
      const { drop: d, gesture: g } = live.current;
      if (!g) return;
      const mode = g.mode;
      setGesture(null);
      if (!d) return;
      // A refused drop is where a reorder lives: landing a bar on top of one of its neighbours
      // used to be the one thing the drag could not do, and it is exactly the gesture that
      // means "put this one there". Anything reorderRun turns down still refuses out loud —
      // the bar has already snapped back by now, so the toast is the only thing that says why.
      if (d.reason) {
        if (!(mode === "move" && liveReorderRun.current(d.bar, d.start))) {
          toast.error(d.reason);
        }
        return;
      }
      const moved =
        mode === "move"
          ? {
              startsOn: shiftWeeks(d.bar.startsOn, d.shift),
              endsOn: shiftWeeks(d.bar.endsOn, d.shift),
            }
          : { startsOn: d.startsOn, endsOn: d.endsOn };
      if (moved.startsOn === d.bar.startsOn && moved.endsOn === d.bar.endsOn)
        return;
      const before = { startsOn: d.bar.startsOn, endsOn: d.bar.endsOn };
      void place(d.bar, moved, before).then((ok) => {
        if (!ok) return;
        // The toast carries the way back rather than confirming what the coach just watched
        // happen: landing a bar within a week of where it was is easy, landing it exactly
        // where it started is not.
        toast(`${d.bar.name} ${mode === "move" ? "moved" : "resized"}`, {
          action: { label: "Undo", onClick: () => void place(d.bar, before, moved) },
        });
      });
    };
    // The pointer spends the drag away from the handle, so `active:` on the button can't hold
    // the cursor. Owning it at the document level is the only thing that survives the trip.
    const previous = document.body.style.cursor;
    document.body.style.cursor =
      live.current.gesture?.mode === "move" ? "grabbing" : "ew-resize";
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      document.body.style.cursor = previous;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [dragging, place]);

  /** Where the keyboard is in the matrix. The arrows move it, Enter starts a block on that
   *  week — the same thing double-clicking a cell does, reachable without a pointer. */
  const [cursor, setCursor] = React.useState({ d: 0, wi: 0 });
  const moved = React.useRef(false);
  React.useEffect(() => {
    // Only ever chases the keyboard: pulling focus on mount would steal it from the page.
    if (!moved.current) return;
    gridRef.current
      ?.querySelector<HTMLElement>(`[data-cell="${cursor.d}-${cursor.wi}"]`)
      ?.focus();
  }, [cursor]);

  function onCellKey(e: React.KeyboardEvent, d: number, wi: number) {
    const step: Record<string, [number, number]> = {
      ArrowLeft: [0, -1],
      ArrowRight: [0, 1],
      ArrowUp: [-1, 0],
      ArrowDown: [1, 0],
    };
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      // A week and a sensible length, then the modal — which is fully keyboard-operable —
      // owns the rest. The pointer's range drag has no keyboard equivalent by design: two
      // corners is what a dialog is for.
      setCreating({ startsOn: toISODate(mondayOf(weeks[wi].monday)) });
      return;
    }
    const delta = step[e.key];
    if (!delta) return;
    e.preventDefault();
    moved.current = true;
    setCursor({
      d: Math.min(Math.max(d + delta[0], 0), WEEKDAYS.length - 1),
      wi: Math.min(Math.max(wi + delta[1], 0), weeks.length - 1),
    });
  }

  // Double click arms the range; from there the pointer extends it with no button held, and
  // the next click closes it. The earlier version asked you to hold the second click down,
  // which meant an ordinary double click released immediately and shipped a one-week block.
  function arm(e: React.SyntheticEvent, week: number) {
    e.preventDefault();
    setDrag({ from: week, to: week });
  }

  // The commit handler needs the range as it stands when you click, not the one the gesture
  // started with — but it reads that off `live` rather than by re-subscribing on every
  // pointermove, which is what naming `drag` as a dependency used to cost.
  const arming = drag !== null;
  React.useEffect(() => {
    if (!arming) return;
    const onMove = (e: PointerEvent) => {
      const cell = (e.target as HTMLElement | null)?.closest?.("[data-week]");
      const week = cell?.getAttribute("data-week");
      if (week != null) setDrag((d) => (d ? { ...d, to: Number(week) } : d));
    };
    const onCommit = (e: PointerEvent) => {
      if (e.button !== 0) return;
      e.preventDefault();
      const { drag: range, draftRefusal: refusal } = live.current;
      setDrag(null);
      if (!range) return;
      // Stopped here rather than in the modal: opening a form whose Create button is already
      // disabled makes the coach hunt for what they did wrong.
      if (refusal) {
        toast.error(refusal);
        return;
      }
      const from = Math.min(range.from, range.to);
      const to = Math.max(range.from, range.to);
      setCreating({
        startsOn: toISODate(mondayOf(weeks[from].monday)),
        endsOn: toISODate(sundayOf(weeks[to].monday)),
      });
    };
    // Nothing is held down, so there is no release to bail out with — Escape is the way out.
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrag(null);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerdown", onCommit);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onCommit);
      window.removeEventListener("keydown", onKey);
    };
  }, [arming, weeks]);

  const landed = React.useRef(false);
  React.useEffect(() => {
    // Centres this year's current week; a year without a today cell keeps its offset. The
    // first pass is instant — the calendar should open already in the right place — and every
    // one after it glides, so paging a year reads as travel rather than as a cut.
    todayRef.current?.scrollIntoView({
      block: "nearest",
      inline: "center",
      behavior: landed.current ? "smooth" : "instant",
    });
    landed.current = true;
  }, [today, year]);


  // Writes a bracket's new reach: the blocks it gained join the macro, the ones it gave up
  // leave it. One drag can do both to several blocks at once, which is why it is the gesture
  // that most needs a way back — reconstructing it by hand means dragging the edge again and
  // landing on exactly the right block.
  const applyBracket = React.useCallback(
    (macroId: string, first: number, last: number) => {
      const { bars, macros } = live.current;
      const held = bars.filter((b) => b.macroId === macroId).map((b) => b.id);
      const want = bars.slice(first, last + 1).map((b) => b.id);
      const added = want.filter((id) => !held.includes(id));
      const removed = held.filter((id) => !want.includes(id));
      if (added.length === 0 && removed.length === 0) return;

      const to = {
        ...Object.fromEntries(added.map((id) => [id, macroId])),
        ...Object.fromEntries(removed.map((id) => [id, null])),
      };
      // Where each of those blocks sat before, which is the undo of `to` block for block.
      const back = Object.fromEntries(
        [...added, ...removed].map((id) => [
          id,
          bars.find((b) => b.id === id)?.macroId ?? null,
        ]),
      );
      const name = macros.find((m) => m.id === macroId)?.name ?? "Macrocycle";
      void assign(to).then((ok) => {
        if (!ok) return;
        toast(
          `${name} now holds ${want.length} ${want.length === 1 ? "block" : "blocks"}`,
          { action: { label: "Undo", onClick: () => void assign(back) } },
        );
      });
    },
    [assign],
  );

  const draggingBracket = macroDrag !== null;
  React.useEffect(() => {
    if (!draggingBracket) return;
    const onMove = (e: PointerEvent) => {
      const rect = gridRef.current?.getBoundingClientRect();
      if (!rect) return;
      const { bars, macros } = live.current;
      /** The two rules a reach can break, said in words the coach can act on. */
      const refuses = (
        reach: (typeof bars)[number][],
        macroId: string,
      ): string | null => {
        const owned = reach.find(
          (b) => b.macroId !== null && b.macroId !== macroId,
        );
        if (owned) {
          const other = macros.find((m) => m.id === owned.macroId);
          return `${owned.name} is already in ${other?.name ?? "another macrocycle"}.`;
        }
        const twice = reach.find(
          (b, i) => reach.findIndex((o) => o.name === b.name) !== i,
        );
        return twice
          ? `A macrocycle can't hold two blocks called ${twice.name}.`
          : null;
      };
      const column = Math.floor((e.clientX - rect.left - AXIS_PX) / COLUMN_PX);
      const i = bars.findIndex(
        (b) => column >= b.start && column < b.start + b.span,
      );
      // Off any block: empty weeks can't be in a macro, so the edge just stays put.
      if (i === -1) return;
      setMacroDrag((g) => {
        if (!g) return g;
        const first = g.edge === "start" ? i : g.first;
        const last = g.edge === "end" ? i : g.last;
        // The edges may not cross: a macro always holds at least the block it started on.
        if (first > last) return g;
        return { ...g, first, last, reason: refuses(bars.slice(first, last + 1), g.id) };
      });
    };
    const onUp = () => {
      const g = live.current.macroDrag;
      if (g?.reason) toast.error(g.reason);
      else if (g) applyBracket(g.id, g.first, g.last);
      setMacroDrag(null);
    };
    const previous = document.body.style.cursor;
    document.body.style.cursor = "ew-resize";
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      document.body.style.cursor = previous;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [draggingBracket, applyBracket]);

  // yyyy-mm-dd of a week column, which is how a micro names the week it covers.
  const microKey = (blockId: string, week: number): string =>
    `${blockId}|${toISODate(weeks[week].monday)}`;
  // A micro names its week by date, so a block that has been dragged but not yet confirmed by
  // the server carries its labels along here too — otherwise they sit on the weeks the block
  // just left until the revalidate lands, which is the detached picture the move is supposed
  // to avoid. Same rule as the trigger that makes it permanent: only a move takes them, a
  // resize leaves every remaining week where it was.
  const microAt = new Map(
    micros.map((m) => {
      const to = placed[m.blockId];
      const from = to && blocks.find((b) => b.id === m.blockId);
      const shift = from ? weeksApart(from.startsOn, to.startsOn) : 0;
      const moved =
        shift !== 0 && from && weeksApart(from.endsOn, to.endsOn) === shift;
      return [
        `${m.blockId}|${moved ? shiftWeeks(m.startsOn, shift) : m.startsOn}` as string,
        m,
      ] as const;
    }),
  );
  /** Whether the micro row is drawn at all: only once a block on screen has one, or while a
   *  block is hovered and the offers are showing. Otherwise the bracket sits straight under
   *  the bars instead of a row away from them. */
  const microRowOpen =
    hovered !== null || micros.some((m) => bars.some((b) => b.id === m.blockId));
  /** Whether the year has been scrolled off its own start, which is when the left edge needs
   *  telling apart from the beginning of January. */
  const [edges, setEdges] = React.useState({ start: false, end: true });
  /** The overlay scrollbar's thumb, as fractions of the visible track. Derived from the same
   *  scroll listener the fades use, so it costs nothing extra. */
  const [thumb, setThumb] = React.useState({ left: 0, width: 1 });
  /** Whether the pointer has come down to where the scrollbar lives. State rather than a CSS
   *  `group-hover`: the bar also has to stay up while a block is being carried, and the reveal
   *  is a distance, not a boundary — the bar is 2px of furniture and should only surface for
   *  someone reaching for it. */
  const [nearBar, setNearBar] = React.useState(false);
  const [barDrag, setBarDrag] = React.useState(false);
  React.useEffect(() => {
    const track = gridRef.current?.closest<HTMLElement>(
      "[data-geist-scroller-container]",
    );
    if (!track) return;
    const onScroll = () => {
      const start = track.scrollLeft > 4;
      const end = track.scrollLeft + track.clientWidth < track.scrollWidth - 4;
      setEdges((prev) =>
        prev.start === start && prev.end === end ? prev : { start, end },
      );
      setThumb({
        left: track.scrollLeft / track.scrollWidth,
        width: track.clientWidth / track.scrollWidth,
      });
    };
    onScroll();
    track.addEventListener("scroll", onScroll, { passive: true });
    const observer = new ResizeObserver(onScroll);
    observer.observe(track);
    return () => {
      track.removeEventListener("scroll", onScroll);
      observer.disconnect();
    };
  }, []);

  // A wheel is vertical and this calendar is not. A trackpad sends deltaX and already works;
  // a mouse sends deltaY and used to do nothing at all unless you knew to hold Shift. Passing
  // the larger of the two through as horizontal scroll is what every timeline does, and the
  // guard on deltaX keeps a genuinely sideways gesture from being doubled.
  React.useEffect(() => {
    const track = gridRef.current?.closest<HTMLElement>(
      "[data-geist-scroller-container]",
    );
    if (!track) return;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      // Only claim the gesture while there is somewhere to go, so the page can still scroll
      // once the year runs out on the side the wheel is pushing towards.
      const room =
        e.deltaY > 0
          ? track.scrollLeft + track.clientWidth < track.scrollWidth - 1
          : track.scrollLeft > 1;
      if (!room) return;
      e.preventDefault();
      track.scrollLeft += e.deltaY;
    };
    track.addEventListener("wheel", onWheel, { passive: false });
    return () => track.removeEventListener("wheel", onWheel);
  }, []);

  /** How close to an edge the pointer has to be before the year starts moving under it, and
   *  how fast it goes when it is right up against it. */
  /** Something is being carried across the year: snapping steps aside for all of it. */
  const carrying =
    gesture !== null || macroDrag !== null || drag !== null || barDrag;
  /** …but only a gesture over the grid itself asks the year to run at the edges. Dragging the
   *  scrollbar already moves it, and adding the edge scroll on top would double the speed the
   *  moment the thumb reached the end of its rail. */
  const draggingContent =
    gesture !== null || macroDrag !== null || drag !== null;
  React.useEffect(() => {
    if (!draggingContent) return;
    const track = gridRef.current?.closest<HTMLElement>(
      "[data-geist-scroller-container]",
    );
    if (!track) return;
    const EDGE = 64;
    const MAX_SPEED = 18;
    // Null until the pointer has actually moved. Seeding it at 0 read as "pinned against the
    // left edge", so a gesture that started and ended without travel — grabbing a grip, or
    // double-clicking one — ran the year backwards for as long as the button was held.
    let x: number | null = null;
    let frame = 0;
    const onMove = (e: PointerEvent) => {
      x = e.clientX;
    };
    const tick = () => {
      if (x === null) {
        frame = requestAnimationFrame(tick);
        return;
      }
      const box = track.getBoundingClientRect();
      // Ramps from nothing at EDGE px out to full speed against the edge, so nudging the
      // pointer towards the border creeps and pinning it against it runs.
      const past =
        x < box.left + EDGE
          ? -(box.left + EDGE - x) / EDGE
          : x > box.right - EDGE
            ? (x - (box.right - EDGE)) / EDGE
            : 0;
      if (past !== 0) {
        track.scrollLeft += Math.max(-1, Math.min(1, past)) * MAX_SPEED;
      }
      frame = requestAnimationFrame(tick);
    };
    window.addEventListener("pointermove", onMove);
    frame = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(frame);
    };
  }, [draggingContent]);

  /** Dragging the overlay bar. The track moves by the same fraction of its own width that the
   *  pointer covers of the bar's, which is what makes the thumb stay under the finger. */
  function grabBar(e: React.PointerEvent) {
    e.preventDefault();
    const track = gridRef.current?.closest<HTMLElement>(
      "[data-geist-scroller-container]",
    );
    const rail = e.currentTarget as HTMLElement;
    if (!track) return;
    const width = rail.getBoundingClientRect().width;
    const startX = e.clientX;
    const startLeft = track.scrollLeft;
    setBarDrag(true);

    // The pointer can report several times between two frames. Writing scrollLeft on each of
    // them makes the year stutter — the browser paints once but the value has already jumped
    // twice. Landing the newest position once per frame is what makes the drag feel attached
    // to the pointer instead of stepped.
    let wanted = startLeft;
    let frame = 0;
    const apply = () => {
      frame = 0;
      track.scrollLeft = wanted;
    };
    const onMove = (m: PointerEvent) => {
      wanted = startLeft + ((m.clientX - startX) / width) * track.scrollWidth;
      if (!frame) frame = requestAnimationFrame(apply);
    };
    const onUp = () => {
      if (frame) cancelAnimationFrame(frame);
      track.scrollLeft = wanted;
      setBarDrag(false);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  /** How far the bracket rides up over an empty micro row. Applied to all three bracket slots
   *  — the real ones, their spacer and the ghost — so they travel together. */
  const lift = microRowOpen
    ? undefined
    : `translateY(-${MICRO_ROW_HEIGHT}px)`;

  /** Writes one week's label, or clears the week when the box is emptied. Held locally first:
   *  typing a letter shouldn't wait for a round-trip to show up. */
  function writeMicro(
    blockId: string,
    week: number,
    typed: string,
    typeId: string | null = null,
  ) {
    const key = microKey(blockId, week);
    // Only the last character survives — the box holds one, and typing over a full box should
    // replace what is there rather than being ignored.
    const label = [...typed].slice(-1).join("");
    setLabels((l) => ({ ...l, [key]: { label, typeId } }));

    const existing = microAt.get(key);
    const done = label
      ? setMicrocycle(blockId, toISODate(weeks[week].monday), label, typeId)
      : existing
        ? deleteMicrocycle(existing.id)
        : null;
    void done?.then((r) => {
      if (r.error) {
        setLabels((l) => ({
          ...l,
          [key]: {
            label: existing?.label ?? "",
            typeId: existing?.typeId ?? null,
          },
        }));
        toast.error(r.error);
      }
    });
  }

  /** Drops a block into another block's place and relays the whole run around it: 1, 2, 3 with
   *  the third dragged onto the first becomes 3, 1, 2 over exactly the same weeks. Answers
   *  whether it took the gesture, so the caller can fall back to refusing the drop.
   *
   *  Only inside one run of touching blocks. A gap between blocks is a decision the coach made,
   *  and closing it to make room would be a second edit they did not ask for. */
  function reorderRun(bar: (typeof bars)[number], landingWeek: number): boolean {
    const index = bars.findIndex((b) => b.id === bar.id);
    if (index === -1) return false;
    const { first, last } = runAround(bars, index);
    if (first === last) return false;
    const run = bars.slice(first, last + 1);
    // A block the year cuts in half has weeks that aren't on screen to be laid out, and its
    // `span` is only the visible part — relaying the run off that would shorten it.
    if (run.some((b) => b.clipped)) return false;

    // Which slot the bar was dropped on. A landing inside its own weeks is not a reorder, and
    // one that falls in no block of the run is a move the drag should keep refusing.
    const target = run.findIndex(
      (b) => landingWeek >= b.start && landingWeek < b.start + b.span,
    );
    if (target === -1 || run[target].id === bar.id) return false;

    const order = reordered(run, index - first, target);
    if (!macrosIntact(order)) {
      toast.error("That would split a macrocycle.");
      return true;
    }

    // Laid out locally against the same anchor the server uses, so the bars land before the
    // round trip rather than snapping back and then jumping.
    const before = Object.fromEntries(
      run.map((b) => [b.id, { startsOn: b.startsOn, endsOn: b.endsOn }]),
    );
    let week = Math.min(...run.map((b) => b.start));
    const after = Object.fromEntries(
      order.map((b) => {
        const at = {
          startsOn: toISODate(mondayOf(weeks[week].monday)),
          endsOn: toISODate(sundayOf(weeks[week + b.span - 1].monday)),
        };
        week += b.span;
        return [b.id, at];
      }),
    );
    setPlaced((p) => ({ ...p, ...after }));

    void reorderTrainingBlocks(order.map((b) => b.id)).then((r) => {
      if (r.error) {
        setPlaced((p) => ({ ...p, ...before }));
        toast.error(r.error);
        return;
      }
      toast(`${bar.name} moved to ${target + 1} of ${run.length}`, {
        action: {
          label: "Undo",
          onClick: () => {
            setPlaced((p) => ({ ...p, ...before }));
            void reorderTrainingBlocks(run.map((b) => b.id)).then((again) => {
              if (again.error) toast.error(again.error);
            });
          },
        },
      });
    });
    return true;
  }

  React.useEffect(() => {
    liveReorderRun.current = reorderRun;
  });

  /** Reorders one block's weeks: the micro on `from` is lifted out and put back down at `to`,
   *  and everything between them shifts one place to close the gap and open the new one. The
   *  same thing dragging a row in a list does — I B C A, with A dropped second, is I A B C and
   *  not the I A C B a swap would leave.
   *
   *  Empty weeks are places in that list, not gaps to skip: a week with nothing on it is still
   *  a week of the block, and dropping a micro past one should push it along rather than
   *  swallow it.
   *
   *  A micro is addressed by the week it sits on, so this rewrites contents in place and never
   *  moves a row — which is why it needs no transaction, unlike reordering the blocks
   *  themselves. Only the weeks that actually changed are written. */
  function reorderMicros(
    bar: (typeof bars)[number],
    from: number,
    to: number,
  ) {
    if (from === to) return;
    const at = (week: number) => {
      const key = microKey(bar.id, week);
      const local = labels[key];
      const stored = microAt.get(key);
      return {
        label: local?.label ?? stored?.label ?? "",
        typeId: local ? local.typeId : (stored?.typeId ?? null),
      };
    };
    const weeksOf = Array.from({ length: bar.span }, (_, i) => bar.start + i);
    const before = weeksOf.map(at);
    // The same shift the blocks use, over slots instead of blocks.
    const after = reordered(before, from - bar.start, to - bar.start);

    weeksOf.forEach((week, i) => {
      if (
        before[i].label === after[i].label &&
        before[i].typeId === after[i].typeId
      ) {
        return;
      }
      // An empty slot writes "", which is how writeMicro says delete.
      writeMicro(bar.id, week, after[i].label, after[i].typeId);
    });
  }

  // reorderMicros closes over this render's labels and micros, and the drag listeners below are
  // subscribed once for the whole gesture — so they reach it through a ref rather than
  // capturing the copy that existed when the pointer went down.
  const liveReorder = React.useRef(reorderMicros);
  React.useEffect(() => {
    liveReorder.current = reorderMicros;
  });

  /** The drag itself. Snapped to whole columns rather than following the pointer freely: the
   *  chip is one column wide, so landing it on a week is the whole gesture, and a chip sitting
   *  squarely on its target says where it will go without a second marker to draw. */
  const microDragging = microGrab !== null;
  React.useEffect(() => {
    if (!microDragging) return;
    const onMove = (e: PointerEvent) => {
      setMicroGrab((g) => {
        if (!g) return g;
        // Clamped to the block's own weeks: a micro belongs to the block it was stamped on,
        // and the row beyond it belongs to a different one.
        const bar = live.current.bars.find((b) => b.id === g.blockId);
        if (!bar) return g;
        const steps = Math.round((e.clientX - g.startX) / COLUMN_PX);
        const target = Math.min(
          bar.start + bar.span - 1,
          Math.max(bar.start, g.from + steps),
        );
        const delta = target - g.from;
        return delta === g.delta ? g : { ...g, delta };
      });
    };
    const onUp = () => {
      const g = live.current.microGrab;
      setMicroGrab(null);
      const bar = g && live.current.bars.find((b) => b.id === g.blockId);
      if (g && bar && g.delta !== 0) {
        liveReorder.current(bar, g.from, g.from + g.delta);
      }
    };
    // Escape drops the chip where it came from — a gesture this small should be abandonable
    // without having to steer it back.
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMicroGrab(null);
    };
    const previous = document.body.style.cursor;
    document.body.style.cursor = "grabbing";
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.cursor = previous;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("keydown", onKey);
    };
  }, [microDragging]);

  /** What you can do to a block, offered on a right-click. No type-to-confirm gate on Delete:
   *  the block comes straight off the plan and the toast hands it back. A modal that asks you
   *  to type the name and then offers Undo anyway is two ceremonies for one reversible
   *  action. */
  const blockMenu = (block: TrainingBlock) => [
    { label: "Edit", onSelect: () => setEditing(block) },
    { separator: true },
    {
      label: "Delete",
      destructive: true,
      onSelect: () => removeBlock(block),
    },
  ];

  /** Drops a macro. Its blocks keep their training — only the grouping goes — and Undo builds
   *  the macro again from the ids we still hold, since nothing references a macro by id. */
  function removeMacro(macro: Macrocycle) {
    const members = bars.filter((b) => b.macroId === macro.id).map((b) => b.id);
    void deleteMacrocycle(macro.id).then((r) => {
      if (r.error) {
        toast.error(r.error);
        return;
      }
      setAssigned((a) => ({
        ...a,
        ...Object.fromEntries(members.map((id) => [id, null])),
      }));
      toast(`${macro.name} deleted`, {
        action: {
          label: "Undo",
          onClick: () => {
            const [first, ...rest] = members;
            if (!first) return;
            void createMacrocycle(
              athleteId,
              first,
              macro.name,
              macro.typeId,
              true,
            ).then((again) => {
              if (again.error || !again.id) {
                toast.error(again.error ?? "Could not restore the macrocycle.");
                return;
              }
              const id = again.id;
              setAssigned((a) => ({
                ...a,
                ...Object.fromEntries(members.map((m) => [m, id])),
              }));
              void assign(Object.fromEntries(rest.map((m) => [m, id])));
            });
          },
        },
      });
    });
  }

  /** The block a new macro is being named for. A macro is a coach's own vocabulary — the app
   *  inventing "Macro 3" and making them rename it afterwards is one step too many, and the
   *  name it picks is wrong every time. */
  const [naming, setNaming] = React.useState<string | null>(null);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex h-8 items-center gap-1">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Go to ${year - 1}`}
          className={NAV}
          onClick={() => setYear((y) => y - 1)}
        >
          <ChevronLeftIcon className="size-4" />
        </Button>
        <span className="text-sm font-medium text-[var(--ds-gray-1000)]">
          {year}
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Go to ${year + 1}`}
          className={NAV}
          onClick={() => setYear((y) => y + 1)}
        >
          <ChevronRightIcon className="size-4" />
        </Button>
        {meetCountdown && (
          <>
            <span className="mr-3 h-4 w-px shrink-0 bg-[var(--ds-gray-alpha-400)]" />
            <span className="min-w-0 truncate">
              <span className="text-label-14 text-[var(--ds-gray-1000)]">
                {meetCountdown.count}
              </span>{" "}
              {/* Only the joining word steps back — the meet's name is half of what this
                  line is telling the coach. */}
              <span className="text-copy-14 text-[var(--ds-gray-900)]">
                {meetCountdown.joiner}
              </span>{" "}
              <span className="text-copy-14 text-[var(--ds-gray-1000)]">
                {meetCountdown.name}
              </span>
            </span>
          </>
        )}
        <Button
          className="ml-auto shrink-0"
          prefix={<PlusIcon />}
          onClick={() => setCreating({})}
        >
          New block
        </Button>
      </div>

      <div
        className={cn(
          // pb closes the card 14px under the macro rule — the same 14px the rule keeps from
          // the micros above it. The slot already leaves 10.5px of its own below the stroke,
          // so the padding is what is left of the pair.
          "material-menu relative px-3 pt-2.5 pb-[3.5px]",
          NO_SCROLLBAR,
          NO_BOUNCE,
          SNAP_TO_WEEKS,
          // Any gesture that carries something across the year owns the track while it lasts.
          carrying && NO_SNAP,
        )}
        style={{ "--axis": AXIS_COLUMN } as React.CSSProperties}
        onPointerMove={(e) => {
          const bottom = e.currentTarget.getBoundingClientRect().bottom;
          setNearBar(e.clientY > bottom - BAR_REACH);
        }}
        onPointerLeave={() => setNearBar(false)}
      >
        {/* Neither edge is left to the Scroller: its fade is a mask over the whole track, so
            the leading one would take the sticky M–S axis with it and both would erase the
            two rules drawn across the matrix. The card paints them instead, below the rules
            and past the axis. */}
        <Scroller
          axis="x"
          fadeStart={false}
          fadeEnd={false}
          className="w-full min-w-0"
        >
          <div
            ref={gridRef}
            role="grid"
            aria-label={`${year} training plan`}
            aria-rowcount={WEEKDAYS.length + 2}
            aria-colcount={weeks.length + 1}
            // The only place the hover is dropped. Clearing it on the block's own mouseleave
            // read as a flicker: the grid's 8px row gap sits between a block and the ghost it
            // offers, so crossing it took the offer away before the pointer could reach it.
            onPointerLeave={() => setHovered(null)}
            className={cn(
              "relative isolate grid w-max gap-y-2",
              drag && "select-none",
            )}
            style={{
              gridTemplateColumns: `var(--axis) repeat(${weeks.length}, ${COLUMN})`,
              ...GEIST_TYPE,
            }}
          >
            {/* `contents` rows: the roles land on real elements without any of them becoming a
                grid item, so the single 53-column track keeps placing the cells itself. */}
            <div role="row" className="contents">
              <div className={cn(STICKY, "h-[21px]")} aria-hidden />
              {months.map(({ month, span }) => (
              <div
                key={month}
                role="columnheader"
                style={{ gridColumn: `span ${span}` }}
                className={cn(
                  "flex h-[21px] items-center justify-center text-[var(--ds-gray-1000)]",
                  GRID_TEXT,
                )}
              >
                {MONTHS[month]}
              </div>
              ))}
            </div>

            <div role="row" className="contents">
              <div className={cn(STICKY, "mb-3 h-[18px]")} aria-hidden />
              {weeks.map((w, wi) => (
              <div
                key={w.week}
                role="columnheader"
                aria-label={`Week ${w.week}`}
                className={cn(
                  WEEK_NUMBER,
                  draftAt(wi) && "text-[var(--ds-gray-1000)]",
                  // One snap target per column — the day cells below share its x.
                  "mb-3 flex h-[18px] snap-start items-center justify-center",
                )}
              >
                {w.week}
              </div>
              ))}
            </div>

            {WEEKDAYS.map((label, d) => (
              <div role="row" className="contents" key={d}>
                <div
                  role="rowheader"
                  // "M T W T F S S" has two Ts and two Ss; the full name is what a screen
                  // reader should hear, and the letter is what the grid has room for.
                  aria-label={WEEKDAY_NAMES[d]}
                  className={cn(
                    STICKY,
                    GRID_TEXT,
                    "flex h-8 items-center justify-center pr-4 text-[var(--ds-gray-1000)]",
                  )}
                >
                  {label}
                </div>
                {weeks.map((w, wi) => {
                  const date = w.days[d];
                  const isToday = today !== null && isSameDay(date, today);
                  const meet = meetDays.get(toISODate(date));
                  return (
                    <div
                      key={w.week}
                      ref={isToday ? todayRef : undefined}
                      data-week={wi}
                      data-cell={`${d}-${wi}`}
                      role="gridcell"
                      // One tab stop for the whole matrix, then the arrows walk it — 371
                      // separate stops would be a trap rather than access.
                      tabIndex={cursor.d === d && cursor.wi === wi ? 0 : -1}
                      aria-label={dayTitle(date, meet?.name)}
                      aria-current={isToday ? "date" : undefined}
                      onKeyDown={(e) => onCellKey(e, d, wi)}
                      onDoubleClick={(e) => arm(e, wi)}
                      className={cn(
                        DAY_CELL,
                        // Today outranks a meet on the day they coincide: it is the only
                        // anchor in 53 columns, and the meet still has its title on hover.
                        // Both are drawn as their own chip only outside the band — inside it
                        // the band's box carries their colour instead, so the marker never
                        // sits on top of the selection as a separate figure.
                        !draftAt(wi) &&
                          (isToday
                            ? TODAY
                            : meet
                              ? MEET
                              : cn(
                                  dayTone(date, year),
                                  "hover:bg-[var(--ds-gray-alpha-200)]",
                                )),
                        // The band wins over hover, tone, today and a meet alike: one box per
                        // column, tinted by whatever the day is.
                        draftAt(wi) &&
                          cn(
                            draftBox(d),
                            isToday
                              ? DRAFT_TODAY
                              : meet
                                ? DRAFT_MEET
                                : draftAt(wi) === "edge"
                                  ? DRAFT_EDGE
                                  : DRAFT_FILL,
                            d === 0 && wi === draft!.start && "rounded-tl-md",
                            d === 0 &&
                              wi === draft!.start + draft!.span - 1 &&
                              "rounded-tr-md",
                            d === WEEKDAYS.length - 1 &&
                              wi === draft!.start &&
                              "rounded-bl-md",
                            d === WEEKDAYS.length - 1 &&
                              wi === draft!.start + draft!.span - 1 &&
                              "rounded-br-md",
                          ),
                      )}
                      title={dayTitle(date, meet?.name)}
                    >
                      {date.getDate()}
                    </div>
                  );
                })}
              </div>
            ))}

            {/* Everything below the day matrix — bars, micro chips and brackets — is one row
                of the grid as far as assistive tech is concerned. Splitting it into three
                would mean reordering the JSX, and the visual rows are already carried by the
                grid-row placement each item sets for itself. */}
            <div role="row" aria-label="Plan" className="contents">
            {/* Holds the block row open when nothing is in it. Grid rows only exist where
                something is placed, so the first block used to grow the card by its own height
                — the calendar jumping under the pointer at the exact moment of the drop. */}
            <div
              aria-hidden
              style={{ gridRow: BLOCK_ROW, gridColumn: 1 }}
              className={cn(BLOCK_SLOT, "pointer-events-none h-8")}
            />

            {/* Every bar carries an explicit row as well as its columns. With only a column
                the auto-placement algorithm places it before the auto items and it lands in
                row 1, on top of the month captions. */}
            {/* Hidden while a range is being drawn: the drag has its own silhouette, and a
                second one under the pointer would be two answers to the same question. */}
            {!draft &&
              offers.map((start) => (
                <button
                  key={`offer-${start}`}
                  type="button"
                  aria-label={`New ${OFFER_WEEKS}-week block`}
                  style={{
                    gridRow: BLOCK_ROW,
                    gridColumn: `${2 + start} / span ${OFFER_WEEKS}`,
                  }}
                  // Keeps the press off the window listener that closes an armed range.
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() =>
                    setCreating({
                      startsOn: toISODate(mondayOf(weeks[start].monday)),
                      endsOn: toISODate(
                        sundayOf(weeks[start + OFFER_WEEKS - 1].monday),
                      ),
                    })
                  }
                  className={cn(
                    BLOCK_SLOT,
                    "min-w-0 cursor-pointer opacity-0 transition-opacity hover:opacity-100 focus-visible:opacity-100",
                  )}
                >
                  {/* The empty micro week's own surface, on a block-sized bar: the two are the
                      same offer a tier apart, and a filled preview would read as a block that
                      is already there. justify-center, not BLOCK_BAR's left alignment — the
                      label names the action rather than measuring the range, and "press here"
                      belongs on the middle of what you press. */}
                  <span className={cn(BLOCK_BAR, GHOST, "w-full justify-center")}>
                    <span className="min-w-0 truncate">New block</span>
                  </span>
                </button>
              ))}

            {/* Nothing to preview when the range can't become a block: the silhouette answers
                "here is the bar you are about to get", and drawing one for a range that will be
                turned away promises a block twice — once in outline, once in the toast that
                takes it back. The refusal itself is unchanged; it lands on release. */}
            {draft && !draftRefusal && (
              <div
                aria-hidden
                style={{
                  gridRow: BLOCK_ROW,
                  gridColumn: `${2 + draft.start} / span ${draft.span}`,
                }}
                className={cn(BLOCK_SLOT, "min-w-0")}
              >
                <div className={BLOCK_DRAFT}>
                  <span className="min-w-0 truncate">
                    {draft.span} {draft.span === 1 ? "week" : "weeks"}
                  </span>
                </div>
              </div>
            )}

            {bars.map((b) => {
              const held = drop?.bar.id === b.id;
              const edge =
                held && gesture && gesture.mode !== "move"
                  ? gesture.mode
                  : null;
              // Both gestures follow the pointer in pixels and snap only on release; quantising
              // live made the bar jump a whole column at a time. So the grid keeps placing it
              // where it still is, and the offset is drawn: a move slides the whole bar, a
              // resize pushes one edge with a margin, clamped to what could actually land.
              const last = b.start + b.span - 1;
              const dx = !gesture
                ? 0
                : Math.min(
                    Math.max(
                      gesture.dx,
                      (edge === "start" ? -b.start : b.start - last) *
                        COLUMN_PX,
                    ),
                    (edge === "start"
                      ? last - b.start
                      : weeks.length - 1 - last) * COLUMN_PX,
                  );
              // The count is the one thing that reads better snapped: it is a number of weeks.
              const span = held ? drop.span : b.span;
              const grab =
                (mode: "move" | "start" | "end") => (e: React.PointerEvent) => {
                  if (e.button !== 0 || drag) return;
                  e.preventDefault();
                  // Keeps the press off the window listener that closes an armed range.
                  e.stopPropagation();
                  setGesture({
                    id: b.id,
                    mode,
                    startX: e.clientX,
                    dx: 0,
                    delta: 0,
                  });
                };
              return (
                // The grid placement has to live on the outermost element: ContextMenu wraps
                // its children in a div of its own, so anything inside is no longer a grid item
                // and gridColumn on it is silently ignored.
                <div
                  key={b.id}
                  onPointerEnter={() => setHovered(b.id)}
                  style={{
                    gridRow: BLOCK_ROW,
                    gridColumn: `${2 + b.start} / span ${b.span}`,
                    transform:
                      held && !edge ? `translateX(${dx}px)` : undefined,
                    // 2px is BLOCK_SLOT's own mx-0.5, kept so the gap to a neighbour survives.
                    marginLeft: edge === "start" ? 2 + dx : undefined,
                    marginRight: edge === "end" ? 2 - dx : undefined,
                  }}
                  className={cn(
                    BLOCK_SLOT,
                    "min-w-0",
                    held && "relative z-20",
                    held && !drop.valid && "opacity-70",
                  )}
                >
                  <ContextMenu items={blockMenu(b)}>
                    <div
                      // The bar is the keyboard's way in: Enter opens the same dialog the
                      // right-click Edit does, and that dialog can already do everything the
                      // drag gestures can — move the start, change the length, delete.
                      role="button"
                      tabIndex={0}
                      aria-label={`${b.name}, ${b.span} ${b.span === 1 ? "week" : "weeks"} from ${b.startsOn}`}
                      onKeyDown={(e) => {
                        if (e.key !== "Enter" && e.key !== " ") return;
                        e.preventDefault();
                        setEditing(b);
                      }}
                      className={cn(
                        BLOCK_BAR,
                        // Its type's colour, or the neutral fill when the coach named it in
                        // free text. A type deleted in settings sets this back to null, so
                        // the bar keeps its name and quietly loses its tint.
                        fillFor(typeById.get(b.typeId ?? "")),
                        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ds-gray-1000)]",
                        // Lifted while it is being carried, outlined in red the moment it is
                        // over a week it can't have — the same answer-during-the-gesture the
                        // macro bracket gives, so the toast on release only confirms it.
                        held &&
                          (drop.valid
                            ? "shadow-[var(--ds-shadow-menu)]"
                            : REFUSED_BAR),
                      )}
                    >
                      <button
                        type="button"
                        aria-label={`Move ${b.name}`}
                        onPointerDown={grab("move")}
                        // touch-none stops the browser panning the year while the bar is being
                        // carried. z-10 keeps it out from under the start grip, which is
                        // absolute and comes later in the row — without it the 24px resize box
                        // covered the dots, so the one control that says "carry me" answered
                        // with an ew-resize cursor and resized the block instead.
                        //
                        // Pulled left and trimmed until what it takes off the row matches what
                        // the week count takes off the other end: the name is centred in the
                        // space between them, so two ornaments of different widths pushed it
                        // off the bar's own centre. Colour comes from the bar, so the mark
                        // reads as part of the same object on all eight fills — a fixed grey
                        // that worked on the neutral one disappeared into a solid green.
                        // The document-level `grabbing` set for the gesture only shows once
                        // the pointer is off this button — an element's own cursor wins over
                        // the body's while it is over it, so the hand stayed open for exactly
                        // the moment the press happens. `active:` closes it right there.
                        className="relative z-10 -ml-1.5 shrink-0 cursor-grab touch-none px-0.5 active:cursor-grabbing"
                      >
                        <GripIcon className="size-3" />
                      </button>
                      <span
                        className="min-w-0 flex-1 truncate text-center font-bold"
                        title={b.name}
                      >
                        {b.name}
                      </span>
                      {/* The same menu the right-click opens, on a control that says it is
                          there — the count that used to sit here was information the bar's
                          own width already gave, and the actions had no visible way in on a
                          trackpad. The length is still spelled out in the bar's aria-label.

                          Mirrors the grip: same 12px glyph, pulled the same 6px into the
                          bar's padding, so the two ornaments take about the same width off
                          their ends and the name stays centred between them.

                          A 20px grey disc on hover, and the same disc held while the menu is
                          open. The fill is `gray-alpha`, not a solid grey: it is a wash over
                          whatever colour the bar is, so it darkens the light fills and
                          lightens the dark ones instead of vanishing into one of the eight. */}
                      <DotsMenu
                        align="end"
                        items={blockMenu(b)}
                        label={`Options for ${b.name}`}
                        size="md"
                        triggerClassName="relative z-10 -mr-1.5 size-5 shrink-0 rounded-full text-current"
                      />

                      {/* Edge grips. Withheld on a block the year cuts in half: its hidden weeks
                          aren't on screen to drag, so resizing from the visible part would
                          quietly shorten it to that part. */}
                      {!b.clipped &&
                        (["start", "end"] as const).map((edge) => (
                          <span
                            key={edge}
                            // Hidden from assistive tech rather than mislabelled: `separator`
                            // is a static divider, and announcing a control that only answers
                            // to a mouse promises something it can't do. The block's dates
                            // stay reachable through Edit, which is a real dialog.
                            aria-hidden
                            onPointerDown={grab(edge)}
                            className={cn(
                              // 8px was below any reasonable target size. The grip is invisible
                              // either way, so the box grows to 24px where the bar can spare it
                              // and stays narrow on a two-week bar, where two of them would
                              // otherwise meet in the middle and swallow the move handle.
                              "absolute inset-y-0 cursor-ew-resize touch-none",
                              span >= 3 ? "w-6" : "w-3",
                              edge === "start" ? "left-0" : "right-0",
                            )}
                          />
                        ))}
                    </div>
                  </ContextMenu>
                </div>
              );
            })}

            {/* Holds the macro row open, for the same reason the block row has one: the first
                bracket would otherwise grow the card the moment a hover offered it. */}
            <div
              aria-hidden
              className={cn(
                BRACKET_SLOT,
                BRACKET_SLIDE,
                "pointer-events-none",
              )}
              style={{ gridRow: MACRO_ROW, gridColumn: 1, transform: lift }}
            />

            {shown.map(({ macro, first, last }) => {
              const from = bars[first];
              const to = bars[last];
              const dragging = macroDrag?.id === macro.id;
              // Follows the pointer in red rather than refusing to move: a bracket that
              // ignores the drag reads as broken, one that turns red reads as "not there".
              const refused = dragging && macroDrag.reason !== null;
              return (
                <div
                  key={macro.id}
                  style={{
                    gridRow: MACRO_ROW,
                    gridColumn: `${2 + from.start} / span ${to.start + to.span - from.start}`,
                    transform: lift,
                  }}
                  className={cn(BRACKET_SLOT, BRACKET_SLIDE)}
                >
                  <ContextMenu
                    items={[
                      { label: "Rename", onSelect: () => setRenaming(macro) },
                      { separator: true },
                      {
                        label: "Delete",
                        destructive: true,
                        onSelect: () => removeMacro(macro),
                      },
                    ]}
                  >
                    <div className="group relative h-6">
                      {/* Takes the click for the whole bracket. A sibling of the grips rather
                          than their parent: a resize ends with a mouseup out in the window,
                          and the click the browser then fires would land on their common
                          ancestor — opening the rename modal after every drag. */}
                      <button
                        type="button"
                        aria-label={`Rename ${macro.name}`}
                        onClick={() => setRenaming(macro)}
                        className="absolute inset-0 cursor-pointer"
                      />
                      <div
                        style={BRACKET_STYLE}
                        className={cn(
                          BRACKET,
                          MACRO_HOVER.line,
                          dragging && BRACKET_HELD,
                          refused && "bg-[var(--ds-red-900)]",
                        )}
                      />
                      {(["near", "far"] as const).map((side) => (
                        <span
                          key={side}
                          style={{
                            ...BRACKET_END_STYLE,
                            left: bracketEndOffset(
                              to.start + to.span - from.start,
                              side,
                            ),
                          }}
                          className={cn(
                            BRACKET_END,
                            MACRO_HOVER.end,
                            dragging && "bg-[var(--ds-gray-1000)]",
                            refused && "bg-[var(--ds-red-900)]",
                          )}
                        />
                      ))}
                      <span
                        className={cn(
                          MACRO_NAME,
                          MACRO_HOVER.name,
                          refused && "text-[var(--ds-red-900)]",
                        )}
                        title={macro.name}
                      >
                        {macro.name}
                      </span>
                      {/* One grip per end. Dragging steps by whole mesos: the edge lands on
                          the block under the pointer, or stays where it is. */}
                      {(["start", "end"] as const).map((edge) => (
                        <span
                          key={edge}
                          aria-hidden
                          onPointerDown={(e) => {
                            if (e.button !== 0 || drag) return;
                            e.preventDefault();
                            e.stopPropagation();
                            setMacroDrag({
                              id: macro.id,
                              edge,
                              first,
                              last,
                              reason: null,
                            });
                          }}
                          className={cn(
                            // Above the rename button so a grip is never swallowed by it, and
                            // 24x24 rather than 16x8 — nothing clips this row, so the target
                            // can grow past the bracket without the tick moving.
                            "absolute -top-1 z-10 size-6 cursor-ew-resize touch-none",
                            edge === "start" ? "-left-3" : "-right-3",
                          )}
                        />
                      ))}
                    </div>
                  </ContextMenu>
                </div>
              );
            })}

            {/* One cell per week of every block: the micro that week has, or the offer of one.
                Each keeps its own hover group, so only the column under the pointer lights up.
                The row is always in the grid — that is what keeps the card one fixed height —
                and the bracket slides over it when there is nothing to show. */}
            {bars.flatMap((b) =>
              Array.from({ length: b.span }, (_, i) => {
                const week = b.start + i;
                const key = microKey(b.id, week);
                const stored = microAt.get(key);
                const local = labels[key];
                const label = local?.label ?? stored?.label ?? "";
                const typeId = local ? local.typeId : (stored?.typeId ?? null);
                const fill = fillFor(typeById.get(typeId ?? ""));
                const carried =
                  microGrab?.blockId === b.id && microGrab.from === week;
                /** The coach's microcycle vocabulary, as menu rows. Picking one stamps the
                 *  week with its initial and its colour in a single write — the same two
                 *  things the settings preview showed. */
                const typeItems = types.micro.map((t) => ({
                  label: t.name,
                  onSelect: () =>
                    writeMicro(b.id, week, microLabel(t.name), t.id),
                }));
                return (
                  <div
                    key={key}
                    style={{ gridRow: MICRO_ROW, gridColumn: 2 + week }}
                    // Being under the block counts as being on it, so the macro's own offer
                    // shows up alongside this one instead of only over the bar itself.
                    onPointerEnter={() => setHovered(b.id)}
                    // mx-0.5 is BLOCK_SLOT's own inset, so two micros side by side end up with
                    // the same 4px between them as two blocks do; -mt-1 halves the grid's 8px
                    // row gap so the rows are spaced the same 4px as the columns.
                    className="group/micro mx-0.5 -mt-1 flex h-8 justify-center"
                  >
                    {label ? (
                      // Right-click offers what typing can't: the coach's own microcycle
                      // types, which carry a colour a letter can't, and emptying the box,
                      // which is how a micro is deleted — a 34px chip holding a letter has no
                      // room for a control that says either.
                      <ContextMenu
                        className="w-full"
                        items={[
                          ...(typeItems.length
                            ? [...typeItems, { separator: true }]
                            : []),
                          {
                            label: "Delete microcycle",
                            destructive: true,
                            onSelect: () => writeMicro(b.id, week, ""),
                          },
                        ]}
                      >
                        {/* Not an input any more. A letter typed by hand stood for none of
                            the coach's microcycles, so the chip could end up reading X in
                            Intro's colour, a lie stored in the row. The vocabulary is the
                            only way in, and the menu is where it lives.

                            Still a tab stop: ContextMenu only answers a right-click, so
                            leaving this as dead text would take changing and deleting a micro
                            away from the keyboard entirely. Enter opens the very same menu,
                            aimed at the chip, by raising the event it already listens for. */}
                        <span
                          aria-haspopup="menu"
                          aria-label={`Microcycle ${label}, week ${weeks[week].week}`}
                          role="button"
                          tabIndex={0}
                          // Grabbable on sight: the press picks the chip up, the release drops
                          // it on whatever week it is over, and the weeks in between shift to
                          // make room. A press that never travels lands back where it started.
                          onPointerDown={(e) => {
                            if (e.button !== 0) return;
                            e.preventDefault();
                            setMicroGrab({
                              blockId: b.id,
                              from: week,
                              startX: e.clientX,
                              delta: 0,
                            });
                          }}
                          style={
                            carried
                              ? {
                                  transform: `translateX(${microGrab.delta * COLUMN_PX}px)`,
                                }
                              : undefined
                          }
                          onKeyDown={(e) => {
                            if (e.key !== "Enter" && e.key !== " ") return;
                            e.preventDefault();
                            const box = e.currentTarget.getBoundingClientRect();
                            e.currentTarget.dispatchEvent(
                              new MouseEvent("contextmenu", {
                                bubbles: true,
                                clientX: box.left + box.width / 2,
                                clientY: box.bottom,
                              }),
                            );
                          }}
                          className={cn(
                            MICRO_CHIP,
                            fill,
                            // The chip was an input, which honoured h-8 on its own; a span has
                            // to be told to be a box before it can centre anything in one.
                            "flex items-center justify-center",
                            // An open hand on hover says the chip can be picked up; touch-none
                            // so a drag on a phone carries it instead of panning the year.
                            "cursor-grab touch-none",
                            // Carried: over its neighbours, and closed-handed. The document
                            // owns the cursor for the rest of the gesture, but this is what
                            // answers the press itself, before the pointer has left the chip.
                            carried &&
                              "relative z-20 cursor-grabbing shadow-[var(--ds-shadow-menu)]",
                          )}
                        >
                          {label}
                        </span>
                      </ContextMenu>
                    ) : types.micro.length > 0 ? (
                      // The coach's own list, searchable, opened by the same click that used
                      // to stamp a placeholder letter. Typing the first letter and pressing
                      // Enter is one week planned, which is what makes a year's worth of them
                      // bearable.
                      <MicroPicker
                        aria-label={`Add a microcycle to week ${weeks[week].week}`}
                        className={cn(
                          MICRO_GHOST,
                          "flex items-center justify-center",
                        )}
                        onPick={(t) =>
                          writeMicro(b.id, week, microLabel(t.name), t.id)
                        }
                        // Out of the tab order while the row is dark: forty invisible stops
                        // between the calendar and whatever follows it is a trap, not access.
                        tabIndex={microRowOpen ? 0 : -1}
                        types={types.micro}
                      >
                        +
                      </MicroPicker>
                    ) : (
                      // Nothing configured yet: the old one-press placeholder, so a coach who
                      // has never opened settings can still label a week.
                      <button
                        type="button"
                        aria-label={`Add a microcycle to week ${weeks[week].week}`}
                        // Out of the tab order while the row is dark: forty invisible stops
                        // between the calendar and whatever follows it is a trap, not access.
                        tabIndex={microRowOpen ? 0 : -1}
                        onClick={() => writeMicro(b.id, week, MICRO_DEFAULT)}
                        className={MICRO_GHOST}
                      >
                        +
                      </button>
                    )}
                  </div>
                );
              }),
            )}

            {/* Holds the row at its full height whether or not anything is in it. */}
            <div
              aria-hidden
              style={{ gridRow: MICRO_ROW, gridColumn: 1 }}
              className="pointer-events-none -mt-1 h-8"
            />

            {/* The offer, for every block with no macro. Always mounted and merely invisible:
                as a conditional it could never be pointed at, since the macro row holds
                nothing else and the hover that was meant to summon it had nowhere to land. */}
            {!macroDrag &&
              bars.map((b) =>
                b.macroId !== null ? null : (
                  <div
                    key={`ghost-${b.id}`}
                    style={{
                      gridRow: MACRO_ROW,
                      gridColumn: `${2 + b.start} / span ${b.span}`,
                      transform: lift,
                    }}
                    className={cn(
                      BRACKET_SLOT,
                      BRACKET_SLIDE,
                      "opacity-0 transition-opacity hover:opacity-100 focus-within:opacity-100",
                      // Also shown from the block itself and from its micros: the offer
                      // belongs to the whole meso, not just to this row.
                      hovered === b.id && "opacity-100",
                    )}
                    onPointerEnter={() => setHovered(b.id)}
                  >
                    <button
                      type="button"
                      aria-label={`Start a macrocycle at ${b.name}`}
                      className={BRACKET_GHOST}
                      onClick={() => setNaming(b.id)}
                    >
                      <span className={BRACKET_GHOST_LINE} />
                      {(["near", "far"] as const).map((side) => (
                        <span
                          key={side}
                          style={{
                            ...BRACKET_END_STYLE,
                            left: bracketEndOffset(b.span, side),
                          }}
                          className={cn(
                            BRACKET_END,
                            "bg-[var(--ds-gray-alpha-500)] group-hover:bg-[var(--ds-gray-1000)]",
                          )}
                        />
                      ))}
                      {/* Says what the dashed line is for. Dropped under three weeks, where
                          the bar is ~65px and the words would outgrow the bracket. */}
                      {b.span >= 3 && (
                        <span
                          className={cn(
                            MACRO_NAME,
                            "text-[var(--ds-gray-700)] group-hover:text-[var(--ds-gray-1000)]",
                          )}
                        >
                          Macro
                        </span>
                      )}
                    </button>
                  </div>
                ),
              )}
            </div>
          </div>
        </Scroller>

        {/* Both edges, drawn on the card. Placed before the two rules so those stay on top,
            and the leading one starts where the axis ends — the weekday column is permanent,
            so what softens is the week sliding under it. Kept gentle: the edge should suggest
            more calendar, not wipe a column out. */}
        {(["start", "end"] as const).map((edge) => (
          <div
            key={edge}
            aria-hidden
            style={{
              [edge === "start" ? "left" : "right"]:
                edge === "start" ? CARD_PAD_X + AXIS_PX : CARD_PAD_X,
              top: CARD_PAD_TOP,
              bottom: CARD_PAD_BOTTOM,
              width: EDGE_FADE,
              background: `linear-gradient(to ${edge === "start" ? "right" : "left"}, color-mix(in srgb, var(--ds-background-100) 82%, transparent) 0%, transparent 100%)`,
            }}
            className={cn(
              "pointer-events-none absolute transition-opacity duration-200",
              edges[edge] ? "opacity-100" : "opacity-0",
            )}
          />
        ))}

        {/* An overlay scrollbar, not the native one: `scrollbar-width` takes real space, so
            revealing it on hover would push the calendar up by its own height. This one is
            painted over the card, appears with the pointer and can be dragged. It starts past
            the axis, which does not scroll. */}
        <div
          style={{ left: CARD_PAD_X + AXIS_PX, right: CARD_PAD_X }}
          onPointerDown={grabBar}
          className={cn(
            "group/bar absolute bottom-0.5 h-2 cursor-pointer transition-opacity duration-200",
            nearBar || carrying ? "opacity-100" : "opacity-0 pointer-events-none",
          )}
        >
          <div
            style={{
              left: `${thumb.left * 100}%`,
              width: `${Math.max(thumb.width, 0.04) * 100}%`,
            }}
            className="absolute bottom-0 h-0.5 rounded-full bg-[var(--ds-gray-alpha-500)] transition-colors group-hover/bar:bg-[var(--ds-gray-alpha-700)]"
          />
        </div>

        {/* The two rules bracketing the day matrix. They hang off the card rather than the grid so
            they reach both edges — inside the Scroller they would be cut to the 1825px year and
            scroll away with it. After the Scroller so scrolling chips can't paint over them. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 border-y border-[var(--ds-gray-alpha-400)]"
          style={{ top: MATRIX_TOP, height: MATRIX_HEIGHT }}
        />

        {/* Closes the M–S axis on its right. Drawn on the card for the same reason and in the
            same place every time: the axis is sticky, so its edge never moves as the year
            scrolls under it. A border on the seven cells would come out in pieces — the grid
            puts 8px of gap between them. */}
        <div
          aria-hidden
          className="pointer-events-none absolute w-px bg-[var(--ds-gray-alpha-400)]"
          // Between the two rules, not across them: the border box draws them on its own first
          // and last pixel, and every colour here is an alpha, so a crossing stacked two of
          // them and lit a brighter dot at each end of the line.
          style={{
            left: CARD_PAD_X + AXIS_PX,
            top: MATRIX_TOP + 1,
            height: MATRIX_HEIGHT - 2,
          }}
        />
      </div>

      {creating && (
        <BlockModal
          athleteId={athleteId}
          taken={blocks}
          types={types.meso}
          defaultStartsOn={creating.startsOn}
          defaultEndsOn={creating.endsOn}
          onClose={() => setCreating(null)}
        />
      )}

      {editing && (
        <BlockModal
          athleteId={athleteId}
          block={editing}
          taken={blocks}
          types={types.meso}
          onClose={() => setEditing(null)}
        />
      )}

      {renaming && (
        <MacroNameModal
          title="Rename macrocycle"
          initial={renaming.name}
          initialTypeId={renaming.typeId}
          taken={macros.filter((m) => m.id !== renaming.id).map((m) => m.name)}
          types={types.macro}
          submitLabel="Save"
          onSubmit={(name, typeId) =>
            renameMacrocycle(renaming.id, name, typeId)
          }
          onClose={() => setRenaming(null)}
        />
      )}

      {naming && (
        <MacroNameModal
          title="New macrocycle"
          taken={macros.map((m) => m.name)}
          types={types.macro}
          submitLabel="Create"
          onSubmit={(name, typeId) =>
            createMacrocycle(athleteId, naming, name, typeId).then((r) => {
              // Held locally so the bracket is there the moment the modal closes, rather than
              // after the revalidation catches up.
              if (r.id) setAssigned((a) => ({ ...a, [naming]: r.id! }));
              return r;
            })
          }
          onClose={() => setNaming(null)}
        />
      )}
    </div>
  );
}

/** The macro's only field. Its span comes from the blocks it holds, so a name is all there is
 *  to edit — which is why this is a one-input modal rather than a form like BlockModal. */
function MacroNameModal({
  title,
  initial = "",
  initialTypeId = null,
  taken = [],
  types = [],
  submitLabel,
  onSubmit,
  onClose,
}: {
  title: string;
  initial?: string;
  initialTypeId?: string | null;
  /** The athlete's other macro names, so picking a type numbers past them instead of
   *  proposing one the athlete already has. */
  taken?: readonly string[];
  /** The coach's macrocycle vocabulary. Macros have no colour — they are drawn as a bracket —
   *  so picking one only names the thing. */
  types?: CycleType[];
  submitLabel: string;
  onSubmit: (
    name: string,
    typeId: string | null,
  ) => Promise<{ error?: string }>;
  onClose: () => void;
}) {
  const [name, setName] = React.useState(initial);
  const [typeId, setTypeId] = React.useState<string>(initialTypeId ?? "");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();
  const inputRef = React.useRef<HTMLInputElement>(null);

  function submit() {
    if (!name.trim() || pending) return;
    startTransition(async () => {
      const result = await onSubmit(name.trim(), typeId || null);
      if (result.error) {
        setError(result.error);
        return;
      }
      onClose();
    });
  }

  return (
    <Modal
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={title}
      initialFocusRef={inputRef}
      footer={
        <>
          <Button variant="secondary" size="md" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="md"
            disabled={!name.trim()}
            loading={pending}
            onClick={submit}
          >
            {submitLabel}
          </Button>
        </>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        {types.length > 0 && (
          <Select
            className="mb-5"
            label="Macrocycle"
            placeholder="No type"
            value={typeId}
            onChange={(e) => {
              const picked = types.find((t) => t.id === e.target.value);
              setTypeId(picked?.id ?? "");
              setError(null);
              // Copied, not linked — same rule as a block, and numbered against the macros
              // the athlete already has, since two of them can't share a name either.
              if (picked) setName(numberedName(picked.name, taken));
            }}
          >
            {types.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
        )}
        <Input
          ref={inputRef}
          label="Name"
          placeholder="e.g. General preparation"
          value={name}
          maxLength={80}
          error={error ?? undefined}
          onChange={(e) => {
            setName(e.target.value);
            setError(null);
          }}
        />
      </form>
    </Modal>
  );
}
