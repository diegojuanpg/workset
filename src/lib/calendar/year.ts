/** ISO weeks of a year, shaped as calendar columns: Monday first, week 1 is the one holding Jan 4. */

/** Monday of ISO week 1 of `year`. */
function isoWeek1Monday(year: number): Date {
  const jan4 = new Date(year, 0, 4);
  const mondayOffset = (jan4.getDay() + 6) % 7; // getDay: 0 = Sunday
  return new Date(year, 0, 4 - mondayOffset);
}

/** 52, or 53 when the year fits an extra Thursday. */
export function isoWeeksInYear(year: number): number {
  const span = isoWeek1Monday(year + 1).getTime() - isoWeek1Monday(year).getTime();
  // Round: a DST shift leaves the span an hour short or long of whole weeks.
  return Math.round(span / 604_800_000);
}

export interface WeekColumn {
  /** ISO week number, 1-based. */
  week: number;
  /** Month of the week's Thursday — the month the column belongs to. */
  month: number;
  /** The column's Monday. */
  monday: Date;
  /** Monday..Sunday, every one a real date. An ISO week is whole, so the first and last columns
   *  reach into the neighbouring years; the grid greys those days rather than leaving holes. */
  days: Date[];
}

export function yearWeeks(year: number): WeekColumn[] {
  const monday = isoWeek1Monday(year);
  const dayAt = (offset: number) =>
    new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + offset);

  return Array.from({ length: isoWeeksInYear(year) }, (_, w) => ({
    week: w + 1,
    // Every ISO week has its Thursday inside the year, so the month is always this year's.
    month: dayAt(w * 7 + 3).getMonth(),
    monday: dayAt(w * 7),
    days: Array.from({ length: 7 }, (_, d) => dayAt(w * 7 + d)),
  }));
}

/** Month header spans: consecutive columns sharing a month, in order. */
export function monthSpans(weeks: WeekColumn[]): { month: number; span: number }[] {
  const spans: { month: number; span: number }[] = [];
  for (const { month } of weeks) {
    const last = spans.at(-1);
    if (last?.month === month) last.span += 1;
    else spans.push({ month, span: 1 });
  }
  return spans;
}
