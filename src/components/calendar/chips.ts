/** The two marks a plan is drawn with, without their colour. The calendar and the cycle-type
 *  settings both paint them, and the settings preview is only honest if it is the same classes
 *  rather than a lookalike — so the shape lives here and each caller adds a `CHIP_CLASS` fill. */

/** A training block: one bar across the weeks it covers. */
export const BLOCK_BAR =
  "relative flex h-8 items-center gap-1 overflow-hidden rounded-md px-2 text-label-12 whitespace-nowrap";

/** One week of a block: a chip on the week's own column, sized off the day chip so the two
 *  read as the same grid. The letter is typed straight into it — there is only one.
 *
 *  Width comes from the column and the 2px inset, not from a size: that is what gives a run of
 *  micros the same 4px between them as a run of blocks. The border is kept transparent rather
 *  than dropped — it is what focus paints on, and removing the box entirely would make the chip
 *  jump a pixel the moment it is clicked. */
export const MICRO_CHIP =
  "h-8 w-full rounded-md border border-transparent text-center text-label-12 font-bold outline-none focus:border-[var(--ds-gray-1000)]";
