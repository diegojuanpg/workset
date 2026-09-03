/** Date helpers for competitions. Dates are plain `yyyy-mm-dd` — no time, no timezone. */

/** Parse as local midnight. `new Date("2026-03-14")` would be UTC and shift a day west of GMT. */
export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function todayISO(): string {
  return iso(new Date());
}

/** Every day a meet runs, inclusive — the days an athlete can be entered on. Capped at 31: a
 *  half-typed end date in the picker would otherwise ask for a list without an end. */
export function meetDays(startsOn: string, endsOn: string): string[] {
  const days: string[] = [];
  const d = parseISODate(startsOn);
  while (iso(d) <= endsOn && days.length < 31) {
    days.push(iso(d));
    d.setDate(d.getDate() + 1);
  }
  return days;
}

export type Phase = "upcoming" | "ongoing" | "past";

export function phaseOf(startsOn: string, endsOn: string, today = todayISO()): Phase {
  if (endsOn < today) return "past";
  if (startsOn <= today) return "ongoing";
  return "upcoming";
}

/**
 * Whole weeks until the meet starts, rounded up — meet week reads as 1, not 0.
 * Null once it has started: "weeks out" no longer means anything.
 */
export function weeksOut(startsOn: string, today = todayISO()): number | null {
  if (startsOn <= today) return null;
  // Round first: a DST shift makes the span 23h or 25h short/long of a whole day.
  const days = Math.round((parseISODate(startsOn).getTime() - parseISODate(today).getTime()) / 864e5);
  return Math.ceil(days / 7);
}

/**
 * "4 weeks out" / "from IPF NATS", down to "1 week out", then "Meet week" on the day itself.
 * Null once the day is behind us, so a caller can fall through to the next meet.
 *
 * Split in two because the two halves are read differently: the count is what a coach scans a
 * header for, the meet name is only there to say which one. Joining them here would leave the
 * caller slicing a sentence back apart to weight them.
 */
export function weeksOutLabel(
  on: string,
  name: string,
  today = todayISO(),
): { count: string; joiner: string; name: string } | null {
  if (on < today) return null;
  const weeks = weeksOut(on, today);
  // Three parts rather than a sentence: the count and the meet's own name are what a coach
  // reads, and the word between them is only grammar — the calendar tones it down.
  if (weeks === null) return { count: "Meet week", joiner: "—", name };
  return {
    count: `${weeks} ${weeks === 1 ? "week" : "weeks"} out`,
    joiner: "from",
    name,
  };
}

const month = new Intl.DateTimeFormat("en-US", { month: "short" });

/** "Mar 14, 2026" · "Mar 14–16, 2026" · "Mar 30 – Apr 2, 2026" · full both sides across years. */
export function formatRange(startsOn: string, endsOn: string): string {
  const a = parseISODate(startsOn);
  const b = parseISODate(endsOn);
  const head = `${month.format(a)} ${a.getDate()}`;
  if (startsOn === endsOn) return `${head}, ${a.getFullYear()}`;
  if (a.getFullYear() !== b.getFullYear())
    return `${head}, ${a.getFullYear()} – ${month.format(b)} ${b.getDate()}, ${b.getFullYear()}`;
  if (a.getMonth() === b.getMonth()) return `${head}–${b.getDate()}, ${b.getFullYear()}`;
  return `${head} – ${month.format(b)} ${b.getDate()}, ${b.getFullYear()}`;
}
