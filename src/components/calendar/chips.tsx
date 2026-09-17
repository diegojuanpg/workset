import type * as React from "react";
import { cn } from "@/lib/utils";

/** The three marks a plan is drawn with, without their colour. The calendar and the cycle-type
 *  settings both paint them, and the settings preview is only honest if it is the same classes
 *  rather than a lookalike — so the shape lives here and each caller adds its fill.
 *
 *  Three weights: the macro is a quiet caption, the block is the solid bar, the micro is a
 *  small chip. The bar is the loudest thing on the plan; the other two sit either side of it
 *  in height and in contrast. */

/** A macrocycle: a group caption. Its name in the quiet grey, and a hairline bracket running
 *  the exact reach of the blocks it holds — a rule with a short tick at each end, turned
 *  towards the blocks, the way a dimension line says "this far". No box: a box the same shape
 *  as the bar read as a paler sibling, not as the thing that contains it. Grey for every
 *  macro — the colour on the plan belongs to the blocks and weeks under it. */
export const MACRO_CAPTION = cn(
  // overflow stays visible: the bracket's ticks reach 4px past the caption's own box.
  "relative flex h-6 items-start px-1 pt-1.5 text-label-12 leading-4 whitespace-nowrap text-[var(--ds-gray-900)] transition-colors",
);

/** How far a tick rises from the rule towards the blocks. Half the 8px between them, so the
 *  bracket points at the blocks without touching them. */
const TICK = 4;

/** How thick the bracket is drawn, rule and ticks alike. One number, because they are one
 *  mark: the box's height, the dashed path's inset and its own stroke all follow from it. */
const STROKE = 1;

/** A dash and the gap after it, in px. */
const DASH = 2;

/** The stroke of every dashed silhouette on the plan. A CSS variable, so the element that
 *  owns the silhouette recolours it on hover and focus with a class, the way it recolours
 *  its text. */
const DASH_STROKE = "var(--dash, var(--ds-gray-alpha-500))";

/** A `pathLength` for a path `length` px long that makes the 2-on-2-off pattern come out in
 *  whole dashes: one unit is a hair under a pixel and the total is a multiple of a dash plus a
 *  gap, so the pattern closes on itself around a box and ends on a dash along an open path. */
function dashUnits(length: number, closed: boolean): number {
  const cycles = Math.max(1, Math.round(length / (2 * DASH)));
  // An open path ends on a dash, so its tip is drawn: one extra dash without its gap.
  return cycles * 2 * DASH + (closed ? 0 : DASH);
}

/** A dashed rounded box, drawn as one continuous path around the silhouette. `border-dashed`
 *  draws each side on its own, so the four patterns meet at the corners however they fall;
 *  one path with a pathLength that fits the dashes exactly runs round the corners and back
 *  to its own start without a seam. Sized by its caller, which knows how many columns the
 *  silhouette spans — the size is what the dash count is fitted to. */
export function DashedBox({
  width,
  height,
  radius = 6,
  className,
}: {
  width: number;
  height: number;
  radius?: number;
  className?: string;
}) {
  // The stroke is centred on the path, so the path sits half a pixel in from every edge.
  const w = width - 1;
  const h = height - 1;
  const perimeter = 2 * (w + h) - 8 * radius + 2 * Math.PI * radius;
  return (
    <svg
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 size-full overflow-visible",
        className,
      )}
    >
      <rect
        x="0.5"
        y="0.5"
        width={w}
        height={h}
        rx={radius}
        fill="none"
        stroke={DASH_STROKE}
        strokeWidth="1"
        strokeDasharray={`${DASH} ${DASH}`}
        pathLength={dashUnits(perimeter, true)}
        className="transition-[stroke] duration-150"
      />
    </svg>
  );
}

/** The caption's bracket: the rule along the caption's edge and a tick at each end reaching
 *  towards the blocks, as one shape — either a box with three borders (the browser's own
 *  border joins make the corners) or, for the offer, one dashed path, so the dashes run up a
 *  tick, along the rule and up the other tick without a seam. Colour is overridden per state
 *  by the caller: a border colour on the solid one, `--dash` on the dashed one. */
export function MacroBracket({
  dashed = false,
  width,
  className,
}: {
  dashed?: boolean;
  /** The caption's width in px — needed by the dashed one to fit its dashes. */
  width?: number;
  className?: string;
}) {
  // The box straddles the caption's upper edge: the rule is its top border, sitting on the
  // caption's first pixel, and the ticks are its sides running TICK px up past it.
  const box: React.CSSProperties = {
    height: TICK + STROKE,
    top: -TICK,
  };
  if (dashed && width !== undefined) {
    // The stroke is centred on the path, so the path runs half a stroke in from every edge.
    const half = STROKE / 2;
    const w = width - STROKE;
    const reach = TICK + half;
    // Down the near tick, along the rule, back up the far tick.
    const d = `M${half},0 V${reach} H${w + half} V0`;
    return (
      <svg
        aria-hidden
        style={box}
        className={cn("pointer-events-none absolute inset-x-0 overflow-visible", className)}
      >
        <path
          d={d}
          fill="none"
          stroke={DASH_STROKE}
          strokeWidth={STROKE}
          strokeDasharray={`${DASH} ${DASH}`}
          pathLength={dashUnits(2 * reach + w, false)}
          className="transition-[stroke] duration-150"
        />
      </svg>
    );
  }
  return (
    <span
      aria-hidden
      style={box}
      className={cn(
        "absolute inset-x-0 border-x border-b border-[var(--ds-gray-alpha-400)] transition-colors",
        className,
      )}
    />
  );
}

/** A training block: one bar across the weeks it covers. */
export const BLOCK_BAR =
  "relative flex h-8 items-center gap-1 overflow-hidden rounded-md px-2 text-label-12 whitespace-nowrap";

/** One week of a block: a chip on the week's own column, shorter than the bar above it so the
 *  row reads as its detail. The letter is typed straight into it — there is only one.
 *
 *  Width comes from the column and the 2px inset, not from a size: that is what gives a run of
 *  micros the same 4px between them as a run of blocks. The border is kept transparent rather
 *  than dropped — it is what focus paints on, and removing the box entirely would make the chip
 *  jump a pixel the moment it is clicked. */
export const MICRO_CHIP =
  "h-6 w-full rounded-md border border-transparent text-center text-label-12 font-medium outline-none focus-visible:border-[var(--ds-gray-1000)]";
