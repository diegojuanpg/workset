/** Day-first date parsing for typed input. Fixed to dd/mm/yyyy rather than the browser's
 *  locale: the app renders dates in en-US ("Aug 10, 2026"), so reading a typed "11/08" the
 *  same way would silently mean November 8th. One format, stated in the placeholder. */

const SEPARATORS = /[\s/.-]+/;

/** Parses "11/08", "11/8/26", "11-08-2026". Returns null for anything it can't read, and
 *  for dates that don't exist — "31/02" rolls over to March 3rd if you let Date do it. */
export function parseDayFirst(text: string, today = new Date()): Date | null {
  const parts = text.trim().split(SEPARATORS).filter(Boolean);
  if (parts.length < 2 || parts.length > 3) return null;
  if (!parts.every((p) => /^\d{1,4}$/.test(p))) return null;

  const [day, month] = parts.map(Number);
  const year = resolveYear(parts[2], today);
  if (year === null) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const date = new Date(year, month - 1, day);
  // Rejects the 31st of a 30-day month, which Date would happily roll into the next one.
  return date.getMonth() === month - 1 && date.getDate() === day ? date : null;
}

function resolveYear(part: string | undefined, today: Date): number | null {
  if (part === undefined) return today.getFullYear();
  const n = Number(part);
  if (part.length <= 2) return 2000 + n;
  if (part.length === 4) return n;
  return null;
}
