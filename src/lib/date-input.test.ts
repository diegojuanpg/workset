import { describe, expect, it } from "vitest";
import { parseDayFirst } from "@/lib/date-input";

const today = new Date(2026, 7, 6); // 6 Aug 2026
const iso = (d: Date | null) =>
  d && `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

describe("parseDayFirst", () => {
  it("reads day first, not month first", () => {
    // The whole point: en-US would call this November 8th.
    expect(iso(parseDayFirst("11/08/2026", today))).toBe("2026-08-11");
  });

  it("fills in the current year when it's left out", () => {
    expect(iso(parseDayFirst("11/08", today))).toBe("2026-08-11");
  });

  it("expands a two-digit year", () => {
    expect(iso(parseDayFirst("11/8/27", today))).toBe("2027-08-11");
  });

  it("accepts dashes, dots and spaces as separators", () => {
    for (const text of ["11-08-2026", "11.08.2026", "11 08 2026"]) {
      expect(iso(parseDayFirst(text, today))).toBe("2026-08-11");
    }
  });

  it("rejects dates that don't exist", () => {
    // Date would roll this into March rather than refusing it.
    expect(parseDayFirst("31/02/2026", today)).toBeNull();
    expect(parseDayFirst("31/04/2026", today)).toBeNull();
    expect(parseDayFirst("00/08/2026", today)).toBeNull();
    expect(parseDayFirst("11/13/2026", today)).toBeNull();
  });

  it("keeps a real leap day", () => {
    expect(iso(parseDayFirst("29/02/2028", today))).toBe("2028-02-29");
    expect(parseDayFirst("29/02/2027", today)).toBeNull();
  });

  it("rejects junk", () => {
    for (const text of ["", "11", "abc", "11/ago/2026", "11/08/2026/1", "11/08/26026"]) {
      expect(parseDayFirst(text, today)).toBeNull();
    }
  });
});
