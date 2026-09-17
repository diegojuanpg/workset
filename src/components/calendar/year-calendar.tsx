"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Scroller } from "@/components/ui/scroller";
import {
  BoxIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  GripIcon,
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
import { toast, UNDO_DURATION } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import {
  BLOCK_BAR,
  DashedBox,
  MACRO_CAPTION,
  MacroBracket,
  MICRO_CHIP,
} from "@/components/calendar/chips";
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
import {
  clipName,
  readClip,
  writeClip,
  type Clip,
  type ClipMicro,
} from "@/lib/blocks/clipboard";

/** A block as drawn this year: its row plus where it sits in the week columns. */
type Bar = TrainingBlock & { start: number; span: number; clipped: boolean };

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];
/** What the single letters stand for. The axis has two Ts and two Ss, so the letter alone is
 *  not a name a screen reader can use. */
export const WEEKDAY_NAMES = [
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

/** The cursor's ring on every cell of the card: hugging the shape, following its radius,
 *  not floating 2px off it as a halo, and in the design system's own foreground rather than
 *  the browser's two-tone blue.
 *
 *  Drawn on :focus rather than :focus-visible. The browser's heuristic withholds the ring
 *  from a cell the pointer just pressed, which is the one moment a coach most needs to see
 *  where the arrow keys will start from: a press on the plan is how the keyboard is picked
 *  up here. The ring leaves with the focus, so it is never on screen unasked.
 *
 *  No outline-none/outline-hidden alongside: in Tailwind v4 both blank the style variable
 *  that focus:outline-2 draws with, and the ring never appears. */
const FOCUS_RING =
  "focus:outline-2 focus:outline-offset-0 focus:outline-[var(--ds-gray-1000)]";

/** The block the planner below is showing. A hairline drawn inside the bar's own edge, not a
 *  halo around it: the focus ring is 2px of outline sitting outside the shape, so when both
 *  this is the one being edited. Geist marks a selected day the same way, a 1px line against
 *  the 2px its focus ring spends.
 *
 *  It steps aside while the bar holds the focus. Both marks are --ds-gray-1000, so a pressed
 *  bar wore 1px inside and 2px outside at once and read as a single fat 3px border — the ring
 *  says everything the hairline would while the focus is there, and the hairline comes back
 *  the moment it leaves. */
const SELECTED_BAR =
  "shadow-[inset_0_0_0_1px_var(--ds-gray-1000)] focus:shadow-none";

/** Geist day cell: a 32px chip whose 30px leading centres the digit, boxed in a subtle fill. */
const DAY_CELL = cn(
  "block size-8 justify-self-center rounded-[4px] border border-transparent text-center text-copy-14 leading-[30px] transition-colors",
  FOCUS_RING,
);

/** Month captions: day size, medium. They lead the eye without outgrowing the numbers they
 *  head, and leave bold to the one thing on the card that earns it — the block bar. */
const MONTH_CAPTION = "text-label-14 font-medium text-[var(--ds-gray-1000)]";

/** Week-number row and the M–S axis: the same 12px scaffolding Geist's own calendar uses for
 *  its weekday header. Tone stops at gray-900 — gray-700 is 3.2:1 on a light background, and
 *  this is 12px text carrying the unit the whole plan is measured in, not decoration. */
const AXIS_TEXT = "text-label-12 leading-[18px] text-[var(--ds-gray-900)]";

/** The rules bracketing the day matrix, measured off the card's own top edge. The week row carries
 *  12px below itself, so the header closes at 57 and the first chip starts at 77; the rules sit 7px
 *  clear of the matrix on both sides. The card closes on the macro caption, whose own box carries
 *  the last 2px of the line's leading — so pb-1.5 is what leaves the name the same 8px off the card's
 *  lower edge that the first block sits off the rule above it. */
const MATRIX_TOP = 69;
const MATRIX_HEIGHT = 288;

/** Push past either end and the browser rubber-bands the whole track sideways — but the M–S
 *  axis is sticky, so it stays clamped to the viewport while the days slide out from under it,
 *  and the rule drawn on the card doesn't move either. Nothing is off the end of a year worth
 *  bouncing towards, so the bounce goes. */
const NO_BOUNCE =
  "[&_[data-geist-scroller-container]]:overscroll-x-none";

/** The Scroller ships a thin scrollbar. Hidden here: the year always overflows, so the bar
 *  would be permanent furniture — and on Windows a 12px one with arrow buttons — under a
 *  surface that already moves with the wheel, the trackpad and any drag. The edge fades say
 *  where the rest of the year is, and the view opens on today's week without being asked. */
const NO_SCROLLBAR =
  "[&_[data-geist-scroller-container]]:[scrollbar-width:none] [&_[data-geist-scroller-container]::-webkit-scrollbar]:hidden";

/** The plan under the day matrix: block bars, their micro chips directly under them, and the
 *  macrocycle caption closing the group below those. Each is a row of the same grid the days
 *  use, so everything rides the same week columns and scrolls together for free. The 3 is the
 *  two header rows the grid opens with, counted from 1. */
const BLOCK_ROW = 3 + WEEKDAYS.length;
const MICRO_ROW = BLOCK_ROW + 1;
const MACRO_ROW = MICRO_ROW + 1;

/** What those three rows come to on screen: the bar (32) and the micro chip (24) and the
 *  macro caption (24), the grid's two 8px row gaps and the block slot's own mt-2. The empty
 *  year starts where they do and takes at least as much room.
 *  ponytail: one number derived by hand; if a row changes height, this follows it. */
const PLAN_ROWS = 104;

/** The plan's rows in the order the keyboard walks them, under the seven day rows. */
type PlanKind = "block" | "micro" | "macro";
const PLAN_ORDER: readonly PlanKind[] = ["block", "micro", "macro"];
const rowOf = (kind: PlanKind): number => WEEKDAYS.length + PLAN_ORDER.indexOf(kind);
const kindOf = (row: number): PlanKind | undefined => PLAN_ORDER[row - WEEKDAYS.length];
const LAST_ROW = WEEKDAYS.length + PLAN_ORDER.length - 1;

/** What a key press knows about the cell it landed on. */
interface KeyContext {
  row: number;
  wi: number;
  bar?: Bar;
  micro?: { bar: Bar; week: number; label: string; typeId: string | null };
  macro?: { macro: Macrocycle; first: number; last: number };
}

/** An empty week in the block row: nothing to see, but somewhere the cursor can stand to
 *  start a block or paste one. Transparent to the pointer — the offers live on this row. */
const EMPTY_SLOT = cn("pointer-events-none h-8 w-full rounded-md", FOCUS_RING);

/** The grid's own vertical gap (gap-y-2), as a number: the month bands close half of it on
 *  each side, so a month's edge lands midway between the last day it owns and the first day
 *  it does not. */
const ROW_GAP = 8;
/** The air between the last day chip and the rule that closes the matrix. A band that reaches
 *  the end of a column takes all of it, so the stripe meets the rule instead of stopping a
 *  chip short of it — MATRIX_TOP is the same clearance on the other side. */
const MATRIX_CLEAR = 8;

/** mx-0.5 insets every mark 2px, so two that share a boundary read as two shapes with 4px
 *  between them instead of one long one. The block row sits directly under the matrix's lower
 *  rule, so it is the one that carries the margin clearing it. */
const MACRO_SLOT = "mx-0.5";
const BLOCK_SLOT = "mx-0.5 mt-2";
/** -mt-1 halves the grid's 8px row gap, so the chips sit the same 4px under their bar as they
 *  sit from each other. */
const MICRO_SLOT = "mx-0.5 -mt-1";
/** A bar over a week it can't land on: outlined rather than tinted, so the name stays readable
 *  and the refusal reads as a rule about the position, not about the block. */
const REFUSED_BAR = "shadow-[0_0_0_1px_var(--ds-red-900)]";

/** How long the block offered beside an existing one is. A plan grows a mesocycle at a time,
 *  and four weeks is the one a coach reaches for — long enough to be the common case, short
 *  enough that correcting it in the modal is one field. */
const OFFER_WEEKS = 4;

/** What a new micro is labelled with when the coach has no microcycle types yet. */
const MICRO_DEFAULT = "A";
/** The look of an offer — an empty micro week, the block offered beside a bar, the macro
 *  offered over a block: dashed and unfilled, so it reads as somewhere something could go
 *  rather than something that is already there, and brightening under the pointer. */
/** The dashes themselves are a `DashedBox` child — one continuous path round the silhouette,
 *  see chips.tsx — so the element only sets the colour, through the `--dash` variable the
 *  box reads, and lifts it with its text on hover. */
const GHOST =
  "relative cursor-pointer rounded-md text-label-12 text-[var(--ds-gray-900)] transition-colors [--dash:var(--ds-gray-alpha-500)] hover:text-[var(--ds-gray-1000)] hover:[--dash:var(--ds-gray-1000)]";
/** Invisible until the pointer is on that column: a row of dashed boxes under every block
 *  would be louder than the blocks themselves. */
const MICRO_GHOST = cn(
  GHOST,
  // The keyboard lights the offer the way the pointer does — the dashes and the plus go to
  // full contrast — and nothing else: the browser's own ring around a dashed box was two
  // outlines fighting over one 24px square.
  "h-6 w-full opacity-0 outline-none focus-visible:opacity-100 focus-visible:text-[var(--ds-gray-1000)] focus-visible:[--dash:var(--ds-gray-1000)] group-hover/micro:opacity-100",
);
/** The micro ghost's box: one column less the slot's 2px inset each side, the chip's height. */
const MICRO_GHOST_BOX = { width: COLUMN_PX - 4, height: 24 };
/** The block offered beside a bar. Faint while the pointer is near it, full under it. Near,
 *  not anywhere: revealing every offer on the year the moment the pointer touched the card put
 *  dashed boxes 30 columns from the hand that would never be pressed, and a plan a coach is
 *  reading came with a row of invitations it never asked for. */
const OFFER_REVEAL =
  "opacity-0 transition-opacity hover:opacity-100! focus-visible:opacity-100!";
/** How many columns past an offer still count as near it. Two weeks of travel either side —
 *  far enough that the offer is already there when the pointer arrives, close enough that it
 *  belongs to the block the coach is looking at. */
const OFFER_REACH = 2;

/** The macrocycle's caption, as drawn in chips.tsx, plus how it answers the pointer. The
 *  whole caption is the rename control: name and bracket lift to full contrast together under
 *  hover and while an edge is being dragged, and turn red the moment the reach it is showing
 *  can't be saved. `group` on the button is what lets the bracket, a child, follow. */
const MACRO_HOVER =
  "group cursor-pointer outline-none hover:text-[var(--ds-gray-1000)] focus-visible:text-[var(--ds-gray-1000)]";
const MACRO_BRACKET_HOVER =
  "group-hover:border-[var(--ds-gray-alpha-600)] group-focus-visible:border-[var(--ds-gray-alpha-600)]";
const MACRO_HELD = "text-[var(--ds-gray-1000)]";
const MACRO_BRACKET_HELD = "border-[var(--ds-gray-1000)]";
const MACRO_REFUSED = "text-[var(--ds-red-900)]";
const MACRO_BRACKET_REFUSED = "border-[var(--ds-red-900)]";
/** Offered over a block that has no macro yet: the caption's own silhouette, dashed. Shown
 *  from the block and its micros as well as from itself, since the offer belongs to the whole
 *  meso and the pointer has to cross a row gap to reach it. */
const MACRO_GHOST = cn(
  MACRO_CAPTION,
  "group w-full cursor-pointer text-[var(--ds-gray-700)] opacity-0 outline-none [--dash:var(--ds-gray-alpha-500)] hover:text-[var(--ds-gray-1000)] hover:[--dash:var(--ds-gray-1000)] focus-visible:opacity-100 focus-visible:text-[var(--ds-gray-1000)] focus-visible:[--dash:var(--ds-gray-1000)]",
);

/** A silhouette's width in px from the columns it spans. The slot's own mx-0.5 takes 2px off
 *  each end. The dashed shapes are fitted to this, so their dashes come out whole. */
function silhouetteWidth(columns: number): number {
  return columns * COLUMN_PX - 4;
}

/** Left axis width in pixels — the same 2.5rem as AXIS_COLUMN, needed as a number to read a
 *  week column off the pointer's x during a bracket drag. */
const AXIS_PX = 40;
/** The card's own px-3, which anything measured from the card rather than from the grid has
 *  to start past. */
const CARD_PAD_X = 12;
/** How far each edge fade reaches in. Short and translucent on purpose: it is a hint that the
 *  year keeps going, and a heavier one reads as a column that failed to render. */
const EDGE_FADE = 56;
/** …and its pt-2.5, so an overlay can start clear of the card's own edge. */
const CARD_PAD_TOP = 10;

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

/** The same band while the range can't become a block. The refusal is answered where the coach
 *  is looking, during the gesture, the way a refused *move* already outlines its bar in red —
 *  not only on release, in a toast at the far corner of the screen.
 *
 *  The band recolours; no silhouette appears. Drawing the bar in red would promise a block and
 *  take it back in the same gesture, which is what the plan row deliberately refuses to do. */
const DRAFT_EDGE_REFUSED =
  "bg-[var(--ds-red-900)] font-medium text-[var(--ds-contrast-fg)]";
const DRAFT_FILL_REFUSED = "bg-[var(--ds-red-300)]";

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
  "bg-[var(--ds-gray-alpha-100)] text-[var(--ds-gray-900)] [--dash:var(--ds-gray-alpha-600)]",
);

/** How vercel.com typesets Geist: stylistic set 11, no contextual alternates, no synthesised weight. */
const GEIST_TYPE = {
  fontFeatureSettings: '"calt" 0, "rlig", "ss11"',
  fontSynthesis: "style small-caps",
  textRendering: "optimizeLegibility",
} as const;

/** Today: Geist's own "today" chip — the solid blue day, nothing else. No ring: a ring is
 *  what focus looks like, and a day that is permanently ringed reads as permanently focused. */
const TODAY =
  "bg-[var(--ds-blue-900)] font-medium text-[var(--ds-background-100)]";

/** A meet day: the same chip in red. One marker for every federation — the calendar is only
 *  answering "when do I compete", and a per-federation livery would mean inventing a palette
 *  for each new federation a coach types in. */
const MEET =
  "bg-[var(--ds-red-900)] font-medium text-[var(--ds-background-100)]";

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
  /** The block whose weeks the planner under the calendar is showing, if any. The calendar
   *  doesn't own it — it only draws which one it is and reports the presses that change it. */
  onSelectBlock: (id: string) => void;
  competitions: AthleteCompetition[];
  macros: Macrocycle[];
  /** The block the planner under the calendar is showing, marked on its bar. */
  selectedBlockId: string | null;
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
  selectedBlockId,
  micros,
  types,
  onSelectBlock,
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
    /** Raw pointer travel, clamped to the block. The carried chip follows this. */
    dx: number;
    /** …and the same travel in whole columns: the slot it will land on. The chips between
     *  step aside towards the week it left, so the row previews the shift it is about to
     *  make — a lift-and-drop, not a swap. */
    delta: number;
  } | null>(null);
  /** Set by a micro drag that travelled, read by the click that follows it: a chip is both a
   *  drag handle and the button that opens its picker, and a release after a drag is not a
   *  request to open anything. */
  const microDragged = React.useRef(false);
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
  /** The week column under the pointer, or null when the pointer is off the grid. Only what
   *  the offers need to know how close the hand is; a column index, so it changes once per
   *  34px of travel rather than once per pixel. */
  const [nearWeek, setNearWeek] = React.useState<number | null>(null);
  /** Macro assignments a drag just wrote, held until the server round-trips. Same idea as
   *  `placed`, and read the same way: undefined means "no local opinion", null means "no macro". */
  const [assigned, setAssigned] = React.useState<
    Record<string, string | null>
  >({});
  const [renaming, setRenaming] = React.useState<Macrocycle | null>(null);
  /** The block a new macro is being named for. A macro is a coach's own vocabulary — the app
   *  inventing "Macro 3" and making them rename it afterwards is one step too many, and the
   *  name it picks is wrong every time. */
  const [naming, setNaming] = React.useState<string | null>(null);
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
  const bars = React.useMemo<Bar[]>(
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
    // Offers sit beside a block that already exists. An empty year gets none: the empty state
    // under the matrix is what tells a coach how to draw the first one, and a dashed silhouette
    // appearing under the pointer would be a second answer to the same question.
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
  /** The offers actually on screen: none while a range is being drawn, since the drag has
   *  its own silhouette. Read by the offers themselves and by the empty slots they replace. */
  const shownOffers = draft ? [] : offers;

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
        duration: UNDO_DURATION,
        action: {
          label: "Undo",
          onClick: () => {
            void createTrainingBlock({
              athleteId,
              // The app is writing this name back, not the coach: if something took it
              // while the Undo toast was up, the block returns numbered rather than not at
              // all.
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
  /** The Mondays a block currently carries a microcycle on: the rows the server holds, with
   *  whatever has been typed since laid over them. Absolute dates rather than offsets, so a
   *  block the year cuts in half is read the same as any other. */
  const microDatesOf = React.useCallback(
    (bar: { id: string }): string[] => {
      const on = new Set<string>();
      for (const m of micros) if (m.blockId === bar.id && m.label) on.add(m.startsOn);
      for (const [key, local] of Object.entries(labels)) {
        const cut = key.indexOf("|");
        if (key.slice(0, cut) !== bar.id) continue;
        const week = key.slice(cut + 1);
        if (local.label) on.add(week);
        else on.delete(week);
      }
      return [...on];
    },
    [micros, labels],
  );

  /** Why a block can't be resized to these weeks: shrinking past a labelled week deletes it,
   *  since the table's trigger drops any microcycle the block no longer covers. Refused
   *  rather than performed — an edge dragged one column too far shouldn't cost a week of
   *  planning. The same sentence the server answers with, so the drag and the dialog agree. */
  const dropRefusal = React.useCallback(
    (bar: { id: string }, startsOn: string, endsOn: string): string | null => {
      const n = microDatesOf(bar).filter((on) => on < startsOn || on > endsOn).length;
      if (n === 0) return null;
      return `That would drop ${n} planned ${n === 1 ? "week" : "weeks"}. Clear ${
        n === 1 ? "it" : "them"
      } first.`;
    },
    [microDatesOf],
  );

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
    // Only the edge that moved is rewritten. A move shifts the real dates rather than reading
    // them off the columns, so a block clipped by the year's edge keeps its hidden half.
    const startsOn =
      gesture.mode === "end" ? bar.startsOn : toISODate(weeks[start].monday);
    const endsOn =
      gesture.mode === "start"
        ? bar.endsOn
        : toISODate(sundayOf(weeks[end].monday));
    const reason = clash
      ? `That would overlap ${clash.name}.`
      : startsInPastWeek(toISODate(weeks[start].monday), new Date())
        ? "A block can't start in a week that has already passed."
        : // A move carries its weeks along, so only an edge can leave one behind.
          gesture.mode === "move"
          ? null
          : dropRefusal(bar, startsOn, endsOn);
    return {
      bar,
      start,
      span: end - start + 1,
      shift: start - bar.start,
      reason,
      valid: reason === null,
      startsOn,
      endsOn,
    };
  }, [gesture, bars, weeks, dropRefusal]);

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
      // No toast. Sliding a bar a week and pulling its edge out are the two things a coach
      // does over and over while planning a year, both undone by the same gesture the other
      // way, and a receipt for each buried the calendar under its own confirmations. What
      // still speaks up is a refusal, and anything that can't be reversed by hand — a delete,
      // a reorder that rearranged a run.
      void place(d.bar, moved, { startsOn: d.bar.startsOn, endsOn: d.bar.endsOn });
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

  /** Where the keyboard is on the calendar: a row and a week. Rows 0–6 are the days; the
   *  three under them are the plan, in the order they are drawn. One cursor for the whole
   *  card, so the arrows walk from a day down into its block, its week's micro and its macro
   *  without the focus ever leaving the grid — and one tab stop, wherever the cursor is. */
  const [cursor, setCursor] = React.useState({ row: 0, wi: 0 });
  const moved = React.useRef(false);

  /** The element the cursor is on, if it is drawn. Days carry a data-cell; the plan's marks
   *  carry the row they belong to and the weeks they cover, since a bar is one cell however
   *  many weeks long it is. */
  const cursorElement = React.useCallback(
    (row: number, wi: number): HTMLElement | null => {
      const grid = gridRef.current;
      if (!grid) return null;
      const kind = kindOf(row);
      if (!kind) return grid.querySelector(`[data-cell="${row}-${wi}"]`);
      return (
        Array.from(grid.querySelectorAll<HTMLElement>(`[data-plan="${kind}"]`)).find(
          (el) => Number(el.dataset.from) <= wi && wi <= Number(el.dataset.to),
        ) ?? null
      );
    },
    [],
  );

  // The cursor starts on today, so Tab into the calendar lands where the plan is being
  // written rather than on the first of January, off the left edge of the scroll. Only until
  // the coach has moved it themselves.
  React.useEffect(() => {
    if (!today || moved.current) return;
    const wi = weeks.findIndex((w) => w.days.some((d) => isSameDay(d, today)));
    if (wi === -1) return;
    const row = weeks[wi].days.findIndex((d) => isSameDay(d, today));
    // eslint-disable-next-line react-hooks/set-state-in-effect -- today is only known after hydration
    setCursor({ row, wi });
  }, [today, weeks]);

  React.useEffect(() => {
    // Only ever chases the keyboard: pulling focus on mount would steal it from the page.
    if (!moved.current) return;
    // …and only when the focus is free to take. A picker open over the calendar has it, and
    // so does whatever the pointer is on; the one case worth catching is the mark under the
    // cursor having just been deleted, which drops the focus on the body.
    const active = document.activeElement;
    if (active && active !== document.body && !gridRef.current?.contains(active)) return;
    const target = cursorElement(cursor.row, cursor.wi);
    if (target && target !== active) target.focus();
  }, [cursor, bars, micros, cursorElement]);

  /** The cells of one row as week ranges, in order. Days are one week each; the plan's rows
   *  are read off what is drawn, so a bar is one cell and a week with nothing under it in the
   *  micro or macro row is no cell at all. */
  function cellsOf(row: number): { from: number; to: number }[] {
    const kind = kindOf(row);
    if (!kind) return weeks.map((_, wi) => ({ from: wi, to: wi }));
    const grid = gridRef.current;
    if (!grid) return [];
    return Array.from(grid.querySelectorAll<HTMLElement>(`[data-plan="${kind}"]`))
      .map((el) => ({ from: Number(el.dataset.from), to: Number(el.dataset.to) }))
      .sort((a, b) => a.from - b.from);
  }

  /** Moves the cursor one cell. Sideways, a bar counts as one step however long it is;
   *  up and down, the cursor lands on whatever covers its week in the next row that has
   *  anything there, or stays put. */
  function moveCursor(row: number, wi: number, dRow: number, dWi: number) {
    moved.current = true;
    if (dWi !== 0) {
      const cells = cellsOf(row);
      const at = cells.findIndex((c) => c.from <= wi && wi <= c.to);
      const next = cells[(at === -1 ? cells.findIndex((c) => c.from > wi) - (dWi > 0 ? 1 : 0) : at) + dWi];
      if (!next) return;
      setCursor({ row, wi: dWi > 0 ? next.from : next.to });
      return;
    }
    for (let r = row + dRow; r >= 0 && r <= LAST_ROW; r += dRow) {
      const cells = cellsOf(r);
      if (cells.some((c) => c.from <= wi && wi <= c.to)) {
        setCursor({ row: r, wi });
        return;
      }
    }
  }

  /** The two rules a macro's reach can break, said in words the coach can act on. Shared by
   *  the bracket drag and Shift+arrow on the caption. */
  function reachRefusal(reach: (typeof bars)[number][], macroId: string): string | null {
    const owned = reach.find((b) => b.macroId !== null && b.macroId !== macroId);
    if (owned) {
      const other = macros.find((m) => m.id === owned.macroId);
      return `${owned.name} is already in ${other?.name ?? "another macrocycle"}.`;
    }
    const twice = reach.find(
      (b, i) => reach.findIndex((o) => o.name === b.name) !== i,
    );
    return twice ? `A macrocycle can't hold two blocks called ${twice.name}.` : null;
  }
  const liveReachRefusal = React.useRef(reachRefusal);
  React.useEffect(() => {
    liveReachRefusal.current = reachRefusal;
  });

  /** Why a block can't sit on these weeks, or null when it can — the same two rules the drag
   *  and the dialog enforce, for the keyboard's moves, resizes and pastes. */
  function placeRefusal(
    range: { startsOn: string; endsOn: string },
    except: string | null = null,
  ): string | null {
    const clash = bars.find((b) => b.id !== except && overlaps(range, b));
    if (clash) return `That would overlap ${clash.name}.`;
    return startsInPastWeek(range.startsOn, new Date())
      ? "A block can't start in a week that has already passed."
      : null;
  }

  /** The micros a block carries right now, as offsets from its start — local edits first,
   *  since those are what the coach can see. */
  function microsOf(bar: (typeof bars)[number]): ClipMicro[] {
    return Array.from({ length: bar.span }, (_, i) => {
      const week = bar.start + i;
      const key = microKey(bar.id, week);
      const local = labels[key];
      const stored = microAt.get(key);
      const label = local?.label ?? stored?.label ?? "";
      const typeId = local ? local.typeId : (stored?.typeId ?? null);
      return { offset: i, label, typeId };
    }).filter((m) => m.label);
  }

  /** Nudges a block one week either way, refusing the same things a drop refuses. */
  function nudgeBlock(bar: (typeof bars)[number], d: number) {
    const to = { startsOn: shiftWeeks(bar.startsOn, d), endsOn: shiftWeeks(bar.endsOn, d) };
    const why = placeRefusal(to, bar.id);
    if (why) {
      toast.error(why);
      return;
    }
    // Silent, like the drag it mirrors: the opposite arrow is the undo.
    setCursor((c) => ({ ...c, wi: c.wi + d }));
    void place(bar, to, { startsOn: bar.startsOn, endsOn: bar.endsOn });
  }

  /** Grows or shrinks a block by one week at its end. Only the end: one edge per gesture,
   *  and the start moves with Ctrl+arrow instead. */
  function resizeBlock(bar: (typeof bars)[number], d: number) {
    if (d < 0 && bar.span <= 1) return;
    const to = { startsOn: bar.startsOn, endsOn: shiftWeeks(bar.endsOn, d) };
    const why =
      placeRefusal(to, bar.id) ?? dropRefusal(bar, to.startsOn, to.endsOn);
    if (why) {
      toast.error(why);
      return;
    }
    void place(bar, to, { startsOn: bar.startsOn, endsOn: bar.endsOn });
  }

  /** Copies what is under the cursor. A block goes with its micros, a macro with every
   *  block it holds — copying a phase is the point. */
  function copyAt(ctx: KeyContext) {
    let clip: Clip | null = null;
    if (ctx.micro?.label) {
      clip = { kind: "micro", label: ctx.micro.label, typeId: ctx.micro.typeId };
    } else if (ctx.bar) {
      clip = {
        kind: "block",
        name: ctx.bar.name,
        typeId: ctx.bar.typeId,
        span: ctx.bar.span,
        micros: microsOf(ctx.bar),
      };
    } else if (ctx.macro) {
      const held = bars.slice(ctx.macro.first, ctx.macro.last + 1);
      clip = {
        kind: "macro",
        name: ctx.macro.macro.name,
        typeId: ctx.macro.macro.typeId,
        blocks: held.map((b) => ({
          name: b.name,
          typeId: b.typeId,
          span: b.span,
          offset: b.start - held[0].start,
          micros: microsOf(b),
        })),
      };
    }
    if (!clip) return;
    writeClip(clip);
    toast(`Copied ${clipName(clip)}`);
  }

  /** Pastes at the cursor's week. A block lands with its start on that week; a macro's first
   *  block does, and the rest follow at the spacing they were copied with. Nothing lands
   *  unless all of it can — a half-pasted phase is worse than none. */
  function pasteAt(ctx: KeyContext) {
    const clip = readClip();
    if (!clip) {
      toast("Nothing to paste");
      return;
    }
    if (clip.kind === "micro") {
      if (!ctx.micro) {
        toast.error("Move to a week inside a block to paste a microcycle.");
        return;
      }
      writeMicro(ctx.micro.bar.id, ctx.micro.week, clip.label, clip.typeId);
      return;
    }
    const anchor = toISODate(mondayOf(weeks[ctx.wi].monday));
    const blocks = clip.kind === "block" ? [{ ...clip, offset: 0 }] : clip.blocks;
    const placed = blocks.map((b) => {
      const startsOn = shiftWeeks(anchor, b.offset);
      return {
        ...b,
        startsOn,
        endsOn: toISODate(sundayOf(fromISODate(shiftWeeks(startsOn, b.span - 1)))),
      };
    });
    for (const b of placed) {
      const why = placeRefusal(b);
      if (why) {
        toast.error(why);
        return;
      }
    }
    void (async () => {
      const ids: string[] = [];
      for (const b of placed) {
        const made = await createTrainingBlock({
          athleteId,
          autoRename: true,
          name: b.name,
          startsOn: b.startsOn,
          endsOn: b.endsOn,
          typeId: b.typeId,
        });
        if (made.error || !made.id) {
          toast.error(made.error ?? "Could not paste the block.");
          return;
        }
        ids.push(made.id);
        const results = await Promise.all(
          b.micros.map((m) =>
            setMicrocycle(made.id!, shiftWeeks(b.startsOn, m.offset), m.label, m.typeId),
          ),
        );
        const failed = results.find((r) => r.error);
        if (failed) toast.error(failed.error!);
      }
      if (clip.kind === "macro") {
        const [first, ...rest] = ids;
        const macro = await createMacrocycle(athleteId, first, clip.name, clip.typeId, true);
        if (macro.error || !macro.id) {
          toast.error(macro.error ?? "Could not paste the macrocycle.");
          return;
        }
        for (const id of rest) {
          const r = await setBlockMacrocycle(id, macro.id);
          if (r.error) {
            toast.error(r.error);
            return;
          }
        }
      }
      toast(`Pasted ${clipName(clip)}`);
    })();
  }

  /** Every key the calendar answers, on any cell. Enter is left to the buttons that already
   *  answer it — a chip opens its picker, a caption its rename — and handled here only where
   *  the cell is not a button. */
  function onKey(e: React.KeyboardEvent, ctx: KeyContext) {
    const { row, wi } = ctx;
    const mod = e.ctrlKey || e.metaKey;
    const step: Record<string, [number, number]> = {
      ArrowLeft: [0, -1],
      ArrowRight: [0, 1],
      ArrowUp: [-1, 0],
      ArrowDown: [1, 0],
    };
    const delta = step[e.key];

    if (delta && !mod && !e.shiftKey) {
      e.preventDefault();
      moveCursor(row, wi, delta[0], delta[1]);
      return;
    }
    if (delta && delta[1] !== 0 && e.shiftKey && !mod) {
      e.preventDefault();
      if (ctx.bar) resizeBlock(ctx.bar, delta[1]);
      else if (ctx.macro) {
        const { macro, first, last } = ctx.macro;
        const next = last + delta[1];
        if (next < first || next >= bars.length) return;
        const why = reachRefusal(bars.slice(first, next + 1), macro.id);
        if (why) toast.error(why);
        else applyBracket(macro.id, first, next);
      }
      return;
    }
    if (delta && delta[1] !== 0 && mod) {
      e.preventDefault();
      if (ctx.bar) nudgeBlock(ctx.bar, delta[1]);
      else if (ctx.micro?.label) {
        const { bar, week } = ctx.micro;
        const to = week + delta[1];
        if (to < bar.start || to > bar.start + bar.span - 1) return;
        reorderMicros(bar, week, to);
        moved.current = true;
        setCursor({ row, wi: to });
      }
      return;
    }
    if (mod && (e.key === "c" || e.key === "x")) {
      e.preventDefault();
      copyAt(ctx);
      if (e.key === "x") removeAt(ctx);
      return;
    }
    if (mod && e.key === "v") {
      e.preventDefault();
      pasteAt(ctx);
      return;
    }
    if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      removeAt(ctx);
      return;
    }
    if ((e.key === "Enter" || e.key === " ") && !ctx.micro && !ctx.macro) {
      e.preventDefault();
      // A bar opens its own weeks in the planner below, the same thing a press on it does —
      // activating a block means working on it, not editing its dates. Those stay one step
      // away, on the ⋯ menu and the right-click, both of which the keyboard reaches. A day or
      // an empty week starts a block there: a week and a sensible length, then the modal,
      // which is fully keyboard-operable, owns the rest.
      if (ctx.bar) onSelectBlock(ctx.bar.id);
      else setCreating({ startsOn: toISODate(mondayOf(weeks[wi].monday)) });
    }
  }

  /** Deletes what is under the cursor, each with the Undo its pointer path already has. */
  function removeAt(ctx: KeyContext) {
    if (ctx.micro?.label) writeMicro(ctx.micro.bar.id, ctx.micro.week, "");
    else if (ctx.bar) removeBlock(ctx.bar);
    else if (ctx.macro) removeMacro(ctx.macro.macro);
  }

  /** One tab stop for the whole card: the cell the cursor is on. */
  const tab = (row: number, from: number, to = from) =>
    cursor.row === row && cursor.wi >= from && cursor.wi <= to ? 0 : -1;
  /** Clicking a cell moves the cursor to it, so the arrows carry on from where the pointer
   *  left off. A bar keeps the week the cursor already had if it is one of its own. */
  const land = (row: number, from: number, to = from) => () =>
    setCursor((c) =>
      c.row === row && c.wi >= from && c.wi <= to ? c : { row, wi: from },
    );

  /** A press on a day that hasn't become a drag yet: where it started, so the range can open
   *  from that week once the pointer has travelled far enough to mean it. */
  /** Whether a range is being drawn with the pointer up. Held as a ref beside the `drag` state
   *  the rest of the calendar already paints from: the band, the week numbers and the refusal
   *  all read `drag`, so the gesture changed and nothing downstream had to. */
  const drawing = React.useRef(false);

  // Double-click a week, move across the ones you want, click: the range follows the pointer
  // with nothing held down. Holding a button across 20 columns of a year is a long way to ask
  // a hand to stay clenched, and a slip mid-way ends the gesture where the hand gave out.
  function startDraw(week: number) {
    drawing.current = true;
    setDrag({ from: week, to: week });
  }

  React.useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!drawing.current) return;
      const cell = (e.target as HTMLElement | null)?.closest?.("[data-week]");
      const week = cell?.getAttribute("data-week");
      if (week == null) return;
      const to = Number(week);
      setDrag((d) => (d && d.to !== to ? { ...d, to } : d));
    };
    // The click that closes the range. Bound while drawing only, so the second click of the
    // double-click that opened it — which has already fired by the time this listener exists —
    // can't close the range on the week it just started.
    const onClick = () => {
      if (!drawing.current) return;
      drawing.current = false;
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
    // Escape drops the range mid-draw, the same way it drops a carried bar or chip.
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      drawing.current = false;
      setDrag(null);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("click", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("click", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [weeks]);

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
      const { bars } = live.current;
      const held = bars.filter((b) => b.macroId === macroId).map((b) => b.id);
      const want = bars.slice(first, last + 1).map((b) => b.id);
      const added = want.filter((id) => !held.includes(id));
      const removed = held.filter((id) => !want.includes(id));
      if (added.length === 0 && removed.length === 0) return;

      const to = {
        ...Object.fromEntries(added.map((id) => [id, macroId])),
        ...Object.fromEntries(removed.map((id) => [id, null])),
      };
      // Silent, like a block's own move and resize: the bracket already shows its new reach,
      // and dragging the edge back one block is the undo. A refusal still speaks.
      void assign(to);
    },
    [assign],
  );

  const draggingBracket = macroDrag !== null;
  React.useEffect(() => {
    if (!draggingBracket) return;
    const onMove = (e: PointerEvent) => {
      const rect = gridRef.current?.getBoundingClientRect();
      if (!rect) return;
      const { bars } = live.current;
      const column = Math.floor((e.clientX - rect.left - AXIS_PX) / COLUMN_PX);
      const i = bars.findIndex(
        (b) => column >= b.start && column < b.start + b.span,
      );
      // Off any block: empty weeks can't be in a macro, so the edge just stays put.
      if (i === -1) return;
      const g = live.current.macroDrag;
      if (!g) return;
      const first = g.edge === "start" ? i : g.first;
      const last = g.edge === "end" ? i : g.last;
      // The edges may not cross: a macro always holds at least the block it started on.
      if (first > last) return;
      const reason = liveReachRefusal.current(bars.slice(first, last + 1), g.id);
      setMacroDrag((d) => (d ? { ...d, first, last, reason } : d));
    };
    const onUp = () => {
      const g = live.current.macroDrag;
      if (g?.reason) toast.error(g.reason);
      else if (g) applyBracket(g.id, g.first, g.last);
      setMacroDrag(null);
    };
    // setProperty rather than assignment: the compiler's lint reads a property write on a
    // global inside this particular effect as a render-time mutation, and a method call
    // says the same thing without tripping it.
    const previous = document.body.style.cursor;
    document.body.style.setProperty("cursor", "ew-resize");
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      document.body.style.setProperty("cursor", previous);
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
  /** Whether the year has been scrolled off its own start, which is when the left edge needs
   *  telling apart from the beginning of January. */
  const [edges, setEdges] = React.useState({ start: false, end: true });
  /** Whether today's week is on screen, read back after a resize to decide whether recentring
   *  would be putting the view back or taking it away. */
  const onToday = React.useRef(true);
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
      const cell = todayRef.current?.getBoundingClientRect();
      const box = track.getBoundingClientRect();
      onToday.current =
        !!cell && cell.left >= box.left + AXIS_PX && cell.right <= box.right;
    };
    onScroll();
    track.addEventListener("scroll", onScroll, { passive: true });
    // A resize keeps the scroll offset in pixels, which is not where the coach was looking:
    // a narrower window slides this week off the right edge and leaves the view on a stretch
    // of the year nobody asked for. Only for someone who was on today's week — anyone who
    // had scrolled away to March is left in March, which is where they put themselves.
    const observer = new ResizeObserver(() => {
      if (onToday.current)
        todayRef.current?.scrollIntoView({
          block: "nearest",
          inline: "center",
          behavior: "instant",
        });
      onScroll();
    });
    observer.observe(track);
    return () => {
      track.removeEventListener("scroll", onScroll);
      observer.disconnect();
    };
  }, [today, year]);

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

  /** Something is being carried across the year, which asks the year to run at the edges. */
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
        duration: UNDO_DURATION,
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
        const last = bar.start + bar.span - 1;
        // The chip follows the pointer 1:1 and only the slot it will land on is quantised —
        // a chip that jumped a column at a time read as stuck between steps.
        const dx = Math.min(
          Math.max(e.clientX - g.startX, (bar.start - g.from) * COLUMN_PX),
          (last - g.from) * COLUMN_PX,
        );
        const delta = Math.round(dx / COLUMN_PX);
        return dx === g.dx && delta === g.delta ? g : { ...g, dx, delta };
      });
    };
    const onUp = () => {
      const g = live.current.microGrab;
      setMicroGrab(null);
      const bar = g && live.current.bars.find((b) => b.id === g.blockId);
      if (g && bar && g.delta !== 0) {
        // The click the browser fires after this release would open the picker on the chip
        // that was just carried; the capture handler on the chip's cell swallows it.
        microDragged.current = true;
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
    // The same offer the dashed band over the bar makes, for a keyboard or a trackpad that
    // never hovers.
    ...(block.macroId === null
      ? [{ label: "Start macrocycle", onSelect: () => setNaming(block.id) }]
      : []),
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
        duration: UNDO_DURATION,
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
        <span className="text-label-14 font-medium text-[var(--ds-gray-1000)]">
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
          // A bordered card, not a floating menu: this is content on the page, and a popover's
          // shadow under it said "this will close".
          "relative rounded-xl border border-[var(--ds-gray-alpha-400)] bg-[var(--ds-background-100)] px-3 pt-2.5 pb-1.5",
          NO_BOUNCE,
          NO_SCROLLBAR,
        )}
        style={{ "--axis": AXIS_COLUMN } as React.CSSProperties}
        // A press on bare card — the margins, the axis, the space under the plan — hands the
        // keyboard the calendar, on whatever cell the cursor was left at. Pressing a day, a
        // bar or a chip already focuses it; this is the rest of the surface, which otherwise
        // took the focus away and left the arrows scrolling the page. preventDefault is what
        // keeps the browser from blurring what we just focused.
        onPointerDown={(e) => {
          const el = e.target as HTMLElement | null;
          if (el?.closest("[tabindex], button, a, input, [role='button']")) return;
          e.preventDefault();
          moved.current = true;
          cursorElement(cursor.row, cursor.wi)?.focus();
        }}
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
            // Nine: the month captions, the week numbers and the seven weekday rows. The plan
            // below them is a group, not a row, so it is not counted here either.
            aria-rowcount={WEEKDAYS.length + 2}
            aria-colcount={weeks.length + 1}
            // The only place the hover is dropped. Clearing it on the block's own mouseleave
            // read as a flicker: the grid's 8px row gap sits between a block and the ghost it
            // offers, so crossing it took the offer away before the pointer could reach it.
            onPointerLeave={() => {
              setHovered(null);
              setNearWeek(null);
            }}
            onPointerMove={(e) => {
              const rect = gridRef.current?.getBoundingClientRect();
              if (!rect) return;
              const column = Math.floor(
                (e.clientX - rect.left - AXIS_PX) / COLUMN_PX,
              );
              setNearWeek((prev) => (prev === column ? prev : column));
            }}
            className={cn(
              "group/grid relative isolate grid w-max gap-y-2 select-none",
            )}
            style={{
              gridTemplateColumns: `var(--axis) repeat(${weeks.length}, ${COLUMN})`,
              ...GEIST_TYPE,
            }}
          >
            {/* `contents` rows: the roles land on real elements without any of them becoming a
                grid item, so the single 53-column track keeps placing the cells itself.
                Every cell names its own row and column rather than being auto-placed — one
                item with a definite position anywhere in the matrix (the blocks' light) would
                otherwise be an obstacle the auto-placer flows the whole year around. */}
            <div role="row" className="contents">
              <div
                className={cn(STICKY, "h-[21px]")}
                style={{ gridRow: 1, gridColumn: 1 }}
                aria-hidden
              />
              {months.map(({ month, span }, mi) => (
              <div
                key={month}
                role="columnheader"
                style={{
                  gridRow: 1,
                  gridColumn: `${2 + months.slice(0, mi).reduce((n, m) => n + m.span, 0)} / span ${span}`,
                }}
                className={cn(
                  "flex h-[21px] items-center justify-center",
                  MONTH_CAPTION,
                )}
              >
                {MONTHS[month]}
              </div>
              ))}
            </div>

            <div role="row" className="contents">
              <div
                className={cn(STICKY, "mb-3 h-[18px]")}
                style={{ gridRow: 2, gridColumn: 1 }}
                aria-hidden
              />
              {weeks.map((w, wi) => (
              <div
                key={w.week}
                role="columnheader"
                aria-label={`Week ${w.week}`}
                style={{ gridRow: 2, gridColumn: 2 + wi }}
                className={cn(
                  AXIS_TEXT,
                  // Lit for a range that can still become a block, left alone for one that
                  // can't: the axis is what confirms the reach, and confirming a refused one
                  // would be the calendar agreeing with a gesture it is about to turn away.
                  draftAt(wi) && !draftRefusal && "text-[var(--ds-gray-1000)]",
                  "mb-3 flex h-[18px] items-center justify-center",
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
                  style={{ gridRow: 3 + d, gridColumn: 1 }}
                  className={cn(
                    STICKY,
                    // Read as the other caption over the matrix, not as week-number
                    // scaffolding: the same size, weight and tone the months are set in.
                    MONTH_CAPTION,
                    "flex h-8 items-center justify-center pr-4",
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
                      style={{ gridRow: 3 + d, gridColumn: 2 + wi }}
                      data-week={wi}
                      data-cell={`${d}-${wi}`}
                      role="gridcell"
                      // One tab stop for the whole card, then the arrows walk it — 371
                      // separate stops would be a trap rather than access.
                      tabIndex={tab(d, wi)}
                      aria-label={dayTitle(date, meet?.name)}
                      aria-current={isToday ? "date" : undefined}
                      onKeyDown={(e) => onKey(e, { row: d, wi })}
                      onFocus={land(d, wi)}
                      onDoubleClick={() => startDraw(wi)}
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
                        // No keyboard cursor while a range is being painted. The ring is
                        // --ds-gray-1000 and so is the band's own end cap, so the cell the
                        // gesture started on came out as a wider, whiter square rather than
                        // as a ring — and nothing is being driven by the arrows mid-drag.
                        draft && "focus:outline-none",
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
                                  ? draftRefusal
                                    ? DRAFT_EDGE_REFUSED
                                    : DRAFT_EDGE
                                  : draftRefusal
                                    ? DRAFT_FILL_REFUSED
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
                      // Only a meet day carries a native tooltip: the digit says what day
                      // it is, and 371 tooltips saying it again were noise under every hover.
                      title={meet ? dayTitle(date, meet.name) : undefined}
                    >
                      {date.getDate()}
                    </div>
                  );
                })}
              </div>
            ))}

            {/* Everything below the day matrix — bars, micro chips and brackets — as a group,
                not a row. It was a `row` for a while, which made the grid promise something it
                can't keep: a row's children have to be cells, and three tiers stacked on the
                same columns (the bar, its weeks under it, the macro caption under those) are
                not one row of them. The day matrix is the table — nine rows of real cells —
                and this is the plan drawn against it, reached by the same arrow keys either
                way, since the cursor is the roving tabindex and not the ARIA structure. */}
            <div role="group" aria-label="Plan" className="contents">
            {/* Holds each of the three rows open when nothing is in it. Grid rows only exist
                where something is placed, so the first mark in a row used to grow the card by
                its own height — the calendar jumping under the pointer at the exact moment of
                the drop. */}
            <div
              aria-hidden
              style={{ gridRow: MACRO_ROW, gridColumn: 1 }}
              className={cn(MACRO_SLOT, "pointer-events-none h-6")}
            />
            <div
              aria-hidden
              style={{ gridRow: BLOCK_ROW, gridColumn: 1 }}
              className={cn(BLOCK_SLOT, "pointer-events-none h-8")}
            />
            <div
              aria-hidden
              style={{ gridRow: MICRO_ROW, gridColumn: 1 }}
              className={cn(MICRO_SLOT, "pointer-events-none h-6")}
            />

            {/* Every week no bar and no offer covers, as a cell the cursor can stand on: Enter
                starts a block there, Ctrl+V pastes one. Nothing to see until it has the
                focus. The offers are cells of their own, so the cursor lands on the whole
                silhouette rather than on one week of it. */}
            {weeks.map((w, wi) =>
              bars.some((b) => b.start <= wi && wi < b.start + b.span) ||
              shownOffers.some((s) => s <= wi && wi < s + OFFER_WEEKS) ? null : (
                <button
                  key={`slot-${wi}`}
                  type="button"
                  aria-label={`Week ${w.week}, no block`}
                  data-plan="block"
                  data-from={wi}
                  data-to={wi}
                  tabIndex={tab(rowOf("block"), wi)}
                  onKeyDown={(e) => onKey(e, { row: rowOf("block"), wi })}
                  onFocus={land(rowOf("block"), wi)}
                  style={{ gridRow: BLOCK_ROW, gridColumn: 2 + wi }}
                  className={cn(BLOCK_SLOT, EMPTY_SLOT)}
                />
              ),
            )}

            {/* Every mark carries an explicit row as well as its columns. With only a column
                the auto-placement algorithm places it before the auto items and it lands in
                row 1, on top of the month captions. */}
            {/* Hidden while a range is being drawn: the drag has its own silhouette, and a
                second one under the pointer would be two answers to the same question. */}
            {shownOffers.map((start) => (
                <button
                  key={`offer-${start}`}
                  type="button"
                  aria-label={`New ${OFFER_WEEKS}-week block`}
                  data-plan="block"
                  data-from={start}
                  data-to={start + OFFER_WEEKS - 1}
                  tabIndex={tab(rowOf("block"), start, start + OFFER_WEEKS - 1)}
                  onKeyDown={(e) => onKey(e, { row: rowOf("block"), wi: start })}
                  onFocus={land(rowOf("block"), start, start + OFFER_WEEKS - 1)}
                  style={{
                    gridRow: BLOCK_ROW,
                    gridColumn: `${2 + start} / span ${OFFER_WEEKS}`,
                  }}
                  onClick={() =>
                    setCreating({
                      startsOn: toISODate(mondayOf(weeks[start].monday)),
                      endsOn: toISODate(
                        sundayOf(weeks[start + OFFER_WEEKS - 1].monday),
                      ),
                    })
                  }
                  // The keyboard lights the silhouette the way the pointer does — no ring
                  // around it, the dashes and the label themselves go to full contrast.
                  className={cn(
                    BLOCK_SLOT,
                    "group/offer min-w-0 cursor-pointer outline-none",
                    OFFER_REVEAL,
                    nearWeek !== null &&
                      nearWeek >= start - OFFER_REACH &&
                      nearWeek <= start + OFFER_WEEKS - 1 + OFFER_REACH &&
                      "opacity-60",
                  )}
                >
                  {/* The empty micro week's own surface, on a block-sized bar: the two are the
                      same offer a tier apart, and a filled preview would read as a block that
                      is already there. */}
                  <span
                    className={cn(
                      BLOCK_BAR,
                      GHOST,
                      "w-full justify-center group-focus-visible/offer:text-[var(--ds-gray-1000)] group-focus-visible/offer:[--dash:var(--ds-gray-1000)]",
                    )}
                  >
                    <DashedBox width={silhouetteWidth(OFFER_WEEKS)} height={32} />
                    <PlusIcon className="size-3.5 shrink-0" />
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
                  <DashedBox width={silhouetteWidth(draft.span)} height={32} />
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
                      // drag gestures can — move the start, change the length.
                      role="button"
                      data-plan="block"
                      data-from={b.start}
                      data-to={last}
                      tabIndex={tab(rowOf("block"), b.start, last)}
                      aria-label={`${b.name}, ${b.span} ${b.span === 1 ? "week" : "weeks"} from ${b.startsOn}`}
                      onKeyDown={(e) =>
                        onKey(e, { row: rowOf("block"), wi: cursor.wi, bar: b })
                      }
                      onFocus={land(rowOf("block"), b.start, last)}
                      // Pressing the bar opens its weeks in the planner below; carrying it
                      // lives on the grip, so a press meant to pick a block can no longer
                      // nudge it a week by accident. Two presses open the dates dialog, the
                      // same one the ⋯ and the right-click offer.
                      // The pairing said out loud as well as drawn: without it the bar
                      // announces as a plain button and its link to the planner below is
                      // unreachable from here.
                      aria-current={b.id === selectedBlockId || undefined}
                      onClick={() => onSelectBlock(b.id)}
                      onDoubleClick={() => setEditing(b)}
                      className={cn(
                        BLOCK_BAR,
                        // Its type's colour, or the neutral fill when the coach named it in
                        // free text. A type deleted in settings sets this back to null, so
                        // the bar keeps its name and quietly loses its tint.
                        fillFor(typeById.get(b.typeId ?? "")),
                        "group/bar cursor-pointer touch-none pl-1.5",
                        FOCUS_RING,
                        b.id === selectedBlockId && SELECTED_BAR,
                        // Lifted while it is being carried, outlined in red the moment it is
                        // over a week it can't have — the same answer-during-the-gesture the
                        // macro band gives, so the toast on release only confirms it.
                        held &&
                          (drop.valid
                            ? "cursor-grabbing shadow-[var(--ds-shadow-menu)]"
                            : REFUSED_BAR),
                      )}
                    >
                      {/* The handle, ahead of the name and always on the bar: what can be
                          dragged says so before the pointer arrives. It stacks over the start
                          resize grip it sits inside — that grip keeps the 6px left of the dots
                          and the dots own their own width, which is the trade for a move
                          handle that is visible at rest. touch-none stops the browser panning
                          the year instead of moving the block. */}
                      <span
                        aria-hidden
                        title="Drag to move"
                        onPointerDown={grab("move")}
                        className="relative z-10 shrink-0 cursor-grab touch-none opacity-60 transition-opacity group-hover/bar:opacity-100"
                      >
                        <GripIcon className="size-3.5" />
                      </span>
                      <span
                        className="min-w-0 flex-1 truncate font-medium"
                        title={b.name}
                      >
                        {b.name}
                      </span>
                      {/* The same menu the right-click opens, on a control that shows itself
                          only when the bar is hovered or focused: a bar wears its name and
                          nothing else until it is asked. The wrapper keeps the press off the
                          bar's own drag. */}
                      <span
                        onPointerDown={(e) => e.stopPropagation()}
                        className="-mr-1.5 shrink-0 opacity-0 transition-opacity group-hover/bar:opacity-100 focus-within:opacity-100"
                      >
                        <DotsMenu
                          align="end"
                          items={blockMenu(b)}
                          label={`Options for ${b.name}`}
                          size="md"
                          triggerClassName="relative z-10 size-5 shrink-0 rounded-full text-current"
                        />
                      </span>

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

            {shown.map(({ macro, first, last }) => {
              const from = bars[first];
              const to = bars[last];
              const dragging = macroDrag?.id === macro.id;
              // Follows the pointer in red rather than refusing to move: a caption that
              // ignores the drag reads as broken, one that turns red reads as "not there".
              const refused = dragging && macroDrag.reason !== null;
              return (
                <div
                  key={macro.id}
                  style={{
                    gridRow: MACRO_ROW,
                    gridColumn: `${2 + from.start} / span ${to.start + to.span - from.start}`,
                  }}
                  className={cn(MACRO_SLOT, "min-w-0")}
                >
                  <ContextMenu
                    className="relative"
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
                    {/* The caption is the rename control. A sibling of the grips rather than
                        their parent: a resize ends with a mouseup out in the window, and the
                        click the browser then fires would land on their common ancestor —
                        opening the rename modal after every drag. */}
                    <button
                      type="button"
                      aria-label={`Rename ${macro.name}`}
                      data-plan="macro"
                      data-from={from.start}
                      data-to={to.start + to.span - 1}
                      tabIndex={tab(rowOf("macro"), from.start, to.start + to.span - 1)}
                      onKeyDown={(e) =>
                        onKey(e, {
                          row: rowOf("macro"),
                          wi: cursor.wi,
                          macro: { macro, first, last },
                        })
                      }
                      onFocus={land(rowOf("macro"), from.start, to.start + to.span - 1)}
                      onClick={() => setRenaming(macro)}
                      className={cn(
                        MACRO_CAPTION,
                        MACRO_HOVER,
                        "w-full",
                        dragging && MACRO_HELD,
                        refused && MACRO_REFUSED,
                      )}
                    >
                      <span className="min-w-0 flex-1 truncate text-left" title={macro.name}>
                        {macro.name}
                      </span>
                      <MacroBracket
                        className={cn(
                          MACRO_BRACKET_HOVER,
                          dragging && MACRO_BRACKET_HELD,
                          refused && MACRO_BRACKET_REFUSED,
                        )}
                      />
                    </button>
                    {/* One grip per end. Dragging steps by whole mesos: the edge lands on the
                        block under the pointer, or stays where it is. */}
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
                          "absolute inset-y-0 z-10 w-3 cursor-ew-resize touch-none",
                          edge === "start" ? "left-0" : "right-0",
                        )}
                      />
                    ))}
                  </ContextMenu>
                </div>
              );
            })}

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
                    }}
                    className={cn(MACRO_SLOT, "min-w-0")}
                    onPointerEnter={() => setHovered(b.id)}
                  >
                    <button
                      type="button"
                      aria-label={`Start a macrocycle at ${b.name}`}
                      data-plan="macro"
                      data-from={b.start}
                      data-to={b.start + b.span - 1}
                      tabIndex={tab(rowOf("macro"), b.start, b.start + b.span - 1)}
                      onKeyDown={(e) =>
                        onKey(e, { row: rowOf("macro"), wi: cursor.wi })
                      }
                      onFocus={land(rowOf("macro"), b.start, b.start + b.span - 1)}
                      onClick={() => setNaming(b.id)}
                      className={cn(
                        MACRO_GHOST,
                        // Also shown from the block itself and from its micros: the offer
                        // belongs to the whole meso, not just to this row.
                        hovered === b.id && "opacity-100",
                      )}
                    >
                      {/* Says what the dashed bracket is for. Dropped under three weeks,
                          where the bar is ~65px and the word would outgrow it. */}
                      <span className="min-w-0 truncate">
                        {b.span >= 3 ? (
                          "Macrocycle"
                        ) : (
                          <PlusIcon className="size-3.5" />
                        )}
                      </span>
                      <MacroBracket dashed width={silhouetteWidth(b.span)} />
                    </button>
                  </div>
                ),
              )}

            {/* One cell per week of every block: the micro that week has, or the offer of one.
                Each keeps its own hover group, so only the column under the pointer lights up. */}
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
                // A week the carried chip is passing over steps one column towards the slot
                // it vacated. Every week counts, empty ones too: they are places in the
                // block's list, and the drop will shift them the same way.
                const displaced =
                  microGrab?.blockId === b.id &&
                  !carried &&
                  (microGrab.delta > 0
                    ? week > microGrab.from && week <= microGrab.from + microGrab.delta
                    : week < microGrab.from && week >= microGrab.from + microGrab.delta)
                    ? -Math.sign(microGrab.delta) * COLUMN_PX
                    : 0;
                return (
                  <div
                    key={key}
                    style={{
                      gridRow: MICRO_ROW,
                      gridColumn: 2 + week,
                      transform: displaced ? `translateX(${displaced}px)` : undefined,
                    }}
                    // Being under the block counts as being on it, so the macro's own offer
                    // shows up alongside this one instead of only over the bar itself.
                    onPointerEnter={() => setHovered(b.id)}
                    // A chip is both a drag handle and the button that opens its picker. The
                    // click the browser fires after a drag is swallowed here, on the way down,
                    // before it can reach the button and open a menu nobody asked for.
                    onClickCapture={(e) => {
                      if (!microDragged.current) return;
                      microDragged.current = false;
                      e.stopPropagation();
                    }}
                    className={cn(
                      MICRO_SLOT,
                      "group/micro flex h-6 justify-center",
                      // Only while a chip is being carried: the slide is what makes the
                      // neighbours read as making room, and the same transition on the
                      // drop would have them slide back over the write.
                      microGrab?.blockId === b.id &&
                        !carried &&
                        "transition-transform duration-150 ease-out",
                    )}
                  >
                    {label ? (
                      // The chip is the picker's own trigger: click it and the coach's
                      // vocabulary opens as a palette, with a clear swatch at the end — one
                      // control for setting, changing and clearing a week, and the same one
                      // the keyboard reaches. Press and move instead, and the chip is carried
                      // to another week of its block.
                      <MicroPicker
                        aria-label={`Microcycle ${label}, week ${weeks[week].week}`}
                        types={types.micro}
                        currentId={typeId}
                        data-plan="micro"
                        data-from={week}
                        data-to={week}
                        tabIndex={tab(rowOf("micro"), week)}
                        onKeyDown={(e) =>
                          onKey(e, {
                            row: rowOf("micro"),
                            wi: week,
                            micro: { bar: b, week, label, typeId },
                          })
                        }
                        onFocus={land(rowOf("micro"), week)}
                        onPick={(t) =>
                          writeMicro(b.id, week, microLabel(t.name), t.id)
                        }
                        onClear={() => writeMicro(b.id, week, "")}
                        onPointerDown={(e) => {
                          if (e.button !== 0) return;
                          e.preventDefault();
                          setMicroGrab({
                            blockId: b.id,
                            from: week,
                            startX: e.clientX,
                            dx: 0,
                            delta: 0,
                          });
                        }}
                        style={
                          carried
                            ? { transform: `translateX(${microGrab.dx}px)` }
                            : undefined
                        }
                        className={cn(
                          MICRO_CHIP,
                          fill,
                          "flex items-center justify-center",
                          // An open hand on hover says the chip can be picked up; touch-none
                          // so a drag on a phone carries it instead of panning the year.
                          "cursor-grab touch-none",
                          // Carried: over its neighbours, and closed-handed.
                          carried &&
                            "relative z-20 cursor-grabbing shadow-[var(--ds-shadow-menu)]",
                        )}
                      >
                        {label}
                      </MicroPicker>
                    ) : types.micro.length > 0 ? (
                      // The coach's own palette. Typing the first letter is one week planned,
                      // which is what makes a year's worth of them bearable.
                      <MicroPicker
                        aria-label={`Add a microcycle to week ${weeks[week].week}`}
                        className={cn(
                          MICRO_GHOST,
                          "flex items-center justify-center",
                        )}
                        onPick={(t) =>
                          writeMicro(b.id, week, microLabel(t.name), t.id)
                        }
                        data-plan="micro"
                        data-from={week}
                        data-to={week}
                        tabIndex={tab(rowOf("micro"), week)}
                        onKeyDown={(e) =>
                          onKey(e, {
                            row: rowOf("micro"),
                            wi: week,
                            micro: { bar: b, week, label: "", typeId: null },
                          })
                        }
                        onFocus={land(rowOf("micro"), week)}
                        types={types.micro}
                      >
                        <DashedBox {...MICRO_GHOST_BOX} />
                        <PlusIcon className="size-3.5" />
                      </MicroPicker>
                    ) : (
                      // Nothing configured yet: the old one-press placeholder, so a coach who
                      // has never opened settings can still label a week.
                      <button
                        type="button"
                        aria-label={`Add a microcycle to week ${weeks[week].week}`}
                        data-plan="micro"
                        data-from={week}
                        data-to={week}
                        tabIndex={tab(rowOf("micro"), week)}
                        onKeyDown={(e) =>
                          onKey(e, {
                            row: rowOf("micro"),
                            wi: week,
                            micro: { bar: b, week, label: "", typeId: null },
                          })
                        }
                        onFocus={land(rowOf("micro"), week)}
                        onClick={() => writeMicro(b.id, week, MICRO_DEFAULT)}
                        className={MICRO_GHOST}
                      >
                        <DashedBox {...MICRO_GHOST_BOX} />
                        <PlusIcon className="size-3.5" />
                      </button>
                    )}
                  </div>
                );
              }),
            )}
            {/* The axis column's own ground, from rule to rule. Each M–S header is only as
                tall as its row, so the 8px between rows left a gap the striped months showed
                through as the year scrolled under the sticky axis. One opaque band behind all
                seven closes every gap at once; the headers keep their own z-10 and stay on
                top of it. */}
            <div
              aria-hidden
              style={{
                gridRow: `3 / span ${WEEKDAYS.length}`,
                gridColumn: 1,
                marginBlock: -MATRIX_CLEAR,
              }}
              className="pointer-events-none sticky left-0 bg-[var(--ds-background-100)]"
            />

            {/* The months, striped. Every other calendar month carries a faint band behind its
                days so a column reads as belonging to a month without the eye going up to the
                caption. Grey alpha, no hue: this is grouping, not data — the colour on the plan
                belongs to the blocks under the matrix.

                Drawn per column and per run of days rather than per month, because a month
                starts and ends mid-column: the band steps down where October hands over to
                November, on the day itself. A run always spans contiguous rows, so one grid
                item covers it and the row gaps inside it. Last in the grid and behind the
                digits, which have to stay on top of their own band. */}
            {weeks.flatMap((w, wi) => {
              const runs: { month: number; first: number; last: number }[] = [];
              w.days.forEach((date, d) => {
                const month = date.getMonth();
                const open = runs.at(-1);
                if (open?.month === month) open.last = d;
                else runs.push({ month, first: d, last: d });
              });
              return runs
                .filter((run) => run.month % 2 === 1)
                .map((run) => (
                  <div
                    key={`month-band-${wi}-${run.month}`}
                    aria-hidden
                    style={{
                      gridRow: `${3 + run.first} / span ${run.last - run.first + 1}`,
                      gridColumn: 2 + wi,
                      // Out to the rule at the ends of the column, to the middle of the gap
                      // anywhere else: a stripe that stopped at the chip would read as a row
                      // of boxes rather than as one month.
                      marginTop: -(run.first === 0 ? MATRIX_CLEAR : ROW_GAP / 2),
                      marginBottom: -(
                        run.last === WEEKDAYS.length - 1 ? MATRIX_CLEAR : ROW_GAP / 2
                      ),
                      zIndex: -1,
                    }}
                    className="pointer-events-none bg-[var(--ds-gray-alpha-100)]"
                  />
                ));
            })}
            </div>
          </div>
        </Scroller>

        {/* An empty year, explained where its blocks would be. Held to the exact height of
            the plan rows it covers, so the card is the same size whether the year has blocks
            or not, and centred in what is on screen: the row it replaces is empty across the
            whole year, so there is no column for it to line up with.

            Outside the Scroller so it stays put as the year scrolls under it, and pulled up
            over the plan rows, which keep their height and their keyboard cursor even with
            nothing in them.

            No action here: New block sits at the top of the screen and is never more than a
            glance away. Two buttons for one job would only ask which of them is the real one. */}
        {bars.length === 0 && !draft && (
          <div
            // The plan rows are the floor, not the ceiling: it starts where they start, and
            // the card grows by whatever air the state needs beyond them rather than packing
            // it into 104px.
            style={{ minHeight: PLAN_ROWS, marginTop: -PLAN_ROWS }}
            className="flex flex-col items-center justify-center gap-3 py-7 text-center"
          >
            <div className="flex size-9 items-center justify-center rounded-md border border-[var(--ds-gray-alpha-400)] text-[var(--ds-gray-900)]">
              <BoxIcon className="size-4" />
            </div>
            <div>
              <p className="text-heading-14 text-[var(--ds-gray-1000)]">
                No blocks in {year}
              </p>
              <p className="mt-1 text-copy-13 text-[var(--ds-gray-900)]">
                Double-click a week above, then click to set how long it runs.
              </p>
            </div>
          </div>
        )}

        {/* Both edges, drawn on the card. Placed before the two rules so those stay on top,
            and the leading one starts where the axis ends — the weekday column is permanent,
            so what softens is the week sliding under it. Kept gentle: the edge should suggest
            more calendar, not wipe a column out.

            It stops at the matrix's lower rule. Running the full height of the card washed the
            last bar's 12px name along with the digits, and a half-faded name reads as a render
            that failed rather than as a year that continues; the bars end at the card's own
            edge instead, which is a clean cut. */}
        {(["start", "end"] as const).map((edge) => (
          <div
            key={edge}
            aria-hidden
            style={{
              [edge === "start" ? "left" : "right"]:
                edge === "start" ? CARD_PAD_X + AXIS_PX : CARD_PAD_X,
              top: CARD_PAD_TOP,
              height: MATRIX_TOP + MATRIX_HEIGHT - CARD_PAD_TOP,
              width: EDGE_FADE,
              background: `linear-gradient(to ${edge === "start" ? "right" : "left"}, color-mix(in srgb, var(--ds-background-100) 70%, transparent) 0%, transparent 100%)`,
            }}
            className={cn(
              "pointer-events-none absolute transition-opacity duration-200",
              edges[edge] ? "opacity-100" : "opacity-0",
            )}
          />
        ))}

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
        // The gap spaces the fields, the way BlockModal's does. A margin on the Select
        // instead lands on the control itself and drags its chevron off centre.
        className="flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        {types.length > 0 && (
          <Select
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
