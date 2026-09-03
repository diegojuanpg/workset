import { describe, expect, it } from "vitest";
import { isoWeeksInYear, monthSpans, yearWeeks } from "@/lib/calendar/year";

describe("isoWeeksInYear", () => {
  it("gives 53 when Jan 1 is a Thursday", () => {
    expect(isoWeeksInYear(2026)).toBe(53);
  });

  it("gives 53 for a leap year starting on Wednesday", () => {
    expect(isoWeeksInYear(2020)).toBe(53);
  });

  it("gives 52 otherwise", () => {
    expect(isoWeeksInYear(2025)).toBe(52);
  });
});

describe("yearWeeks", () => {
  const weeks = yearWeeks(2026);

  it("keeps the December days of the previous year in the first week", () => {
    expect(weeks[0].days.slice(0, 3)).toEqual([
      new Date(2025, 11, 29),
      new Date(2025, 11, 30),
      new Date(2025, 11, 31),
    ]);
    expect(weeks[0].days[3].getDate()).toBe(1); // Jan 1 2026 is a Thursday
  });

  it("keeps the January days of the next year in the last week", () => {
    const last = weeks[weeks.length - 1];
    expect(last.week).toBe(53);
    expect(last.days[4]).toEqual(new Date(2027, 0, 1));
  });
});

describe("monthSpans", () => {
  it("covers every column once, one span per month", () => {
    const spans = monthSpans(yearWeeks(2026));
    expect(spans.map((s) => s.month)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    expect(spans.reduce((n, s) => n + s.span, 0)).toBe(53);
    expect(spans[0].span).toBe(5); // Jan 2026 owns weeks 1–5
  });
});
