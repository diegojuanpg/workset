/** Whole-ISO-week arithmetic for training blocks, and where one lands in the year grid. */

import type { WeekColumn } from "@/lib/calendar/year";

/** Local yyyy-mm-dd. `toISOString` would shift the day for anyone west of UTC. */
export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Parses yyyy-mm-dd as a local date. `new Date("2026-01-05")` would parse as UTC midnight. */
export function fromISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function isMonday(d: Date): boolean {
  return d.getDay() === 1;
}

function isSunday(d: Date): boolean {
  return d.getDay() === 0;
}

/** Sunday closing the `count`-th week that starts on `monday`. */
export function endOfWeeks(monday: Date, count: number): Date {
  return new Date(
    monday.getFullYear(),
    monday.getMonth(),
    monday.getDate() + count * 7 - 1,
  );
}

/** Whole weeks a Monday→Sunday span covers, or null when it isn't one. */
export function weekCount(start: Date, end: Date): number | null {
  if (!isMonday(start) || !isSunday(end) || end < start) return null;
  // Both at local midnight, so DST can leave the difference an hour short of whole days.
  const days = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
  return days % 7 === 0 ? days / 7 : null;
}

export interface BlockSpan {
  /** Index into `weeks` of the block's first visible column. */
  start: number;
  /** How many columns it covers, clipped to the year. */
  span: number;
}

/** Where a block sits among a year's week columns, clipped to what that year shows. Returns
 *  null when the block falls entirely outside — a block can start in December and run into
 *  the next year, and each year renders only its own part. */
export function blockSpan(
  weeks: WeekColumn[],
  startsOn: string,
  endsOn: string,
): BlockSpan | null {
  if (weeks.length === 0) return null;
  const from = fromISODate(startsOn);
  const to = fromISODate(endsOn);

  const first = weeks.findIndex((w) => w.monday >= from);
  // No column starts on or after the block: it ended before this year's grid.
  if (first === -1) return null;
  // Blocks are whole weeks, so the last covered column is the last Monday at or before `to`.
  let last = first;
  while (last + 1 < weeks.length && weeks[last + 1].monday <= to) last += 1;
  // The block ends before the first column starts.
  if (weeks[first].monday > to) return null;

  return { start: first, span: last - first + 1 };
}

/** Monday of the week holding `d` — where a block snaps its start. */
export function mondayOf(d: Date): Date {
  return new Date(
    d.getFullYear(),
    d.getMonth(),
    d.getDate() - ((d.getDay() + 6) % 7),
  );
}

/** Sunday of the week holding `d` — where a block snaps its end. */
export function sundayOf(d: Date): Date {
  return new Date(
    d.getFullYear(),
    d.getMonth(),
    d.getDate() + ((7 - d.getDay()) % 7),
  );
}

/** Whether a block starting on `startsOn` would sit in a week that has already closed. The
 *  current week counts as open: a coach planning on Thursday still starts "this week", and
 *  the snap to Monday would otherwise read as three days in the past. */
export function startsInPastWeek(startsOn: string, today: Date): boolean {
  return startsOn < toISODate(mondayOf(today));
}

/** Whether two blocks share a week. Inclusive on both ends, like the daterange the table's
 *  exclusion constraint compares — the form uses it to refuse an overlap while you pick,
 *  rather than bouncing off that constraint after you press Create. */
export function overlaps(
  a: { startsOn: string; endsOn: string },
  b: { startsOn: string; endsOn: string },
): boolean {
  return a.startsOn <= b.endsOn && b.startsOn <= a.endsOn;
}

/** Moves a yyyy-mm-dd date by whole weeks. Used when a block is dragged along the year: the
 *  span keeps its length, so both ends shift by the same number of columns. */
export function shiftWeeks(iso: string, weeks: number): string {
  const d = fromISODate(iso);
  return toISODate(
    new Date(d.getFullYear(), d.getMonth(), d.getDate() + weeks * 7),
  );
}
