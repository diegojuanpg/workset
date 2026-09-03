import { describe, expect, it } from "vitest";
import { yearWeeks } from "@/lib/calendar/year";
import {
  blockSpan,
  endOfWeeks,
  fromISODate,
  mondayOf,
  overlaps,
  shiftWeeks,
  startsInPastWeek,
  sundayOf,
  toISODate,
  weekCount,
} from "@/lib/blocks/weeks";

describe("weekCount", () => {
  it("counts a Monday→Sunday span in whole weeks", () => {
    // 2026-01-05 is a Monday, 2026-01-25 the Sunday three weeks later.
    expect(
      weekCount(fromISODate("2026-01-05"), fromISODate("2026-01-25")),
    ).toBe(3);
    expect(
      weekCount(fromISODate("2026-01-05"), fromISODate("2026-01-11")),
    ).toBe(1);
  });

  it("rejects spans that aren't Monday→Sunday", () => {
    expect(
      weekCount(fromISODate("2026-01-06"), fromISODate("2026-01-25")),
    ).toBeNull();
    expect(
      weekCount(fromISODate("2026-01-05"), fromISODate("2026-01-24")),
    ).toBeNull();
    expect(
      weekCount(fromISODate("2026-01-25"), fromISODate("2026-01-05")),
    ).toBeNull();
  });

  it("survives a DST boundary", () => {
    // Argentina has no DST, but CI may not: the span is still whole weeks either way.
    const start = fromISODate("2026-03-02");
    expect(weekCount(start, endOfWeeks(start, 6))).toBe(6);
  });
});

describe("endOfWeeks", () => {
  it("closes on the Sunday of the last week", () => {
    expect(toISODate(endOfWeeks(fromISODate("2026-01-05"), 1))).toBe(
      "2026-01-11",
    );
    expect(toISODate(endOfWeeks(fromISODate("2026-01-05"), 4))).toBe(
      "2026-02-01",
    );
  });
});

describe("blockSpan", () => {
  const weeks = yearWeeks(2026);

  it("maps a block onto its week columns", () => {
    // ISO week 1 of 2026 starts Mon 2025-12-29, so week 2 starts 2026-01-05.
    expect(blockSpan(weeks, "2026-01-05", "2026-01-25")).toEqual({
      start: 1,
      span: 3,
    });
  });

  it("covers a single week", () => {
    expect(blockSpan(weeks, "2026-01-05", "2026-01-11")).toEqual({
      start: 1,
      span: 1,
    });
  });

  it("clips a block that runs past the end of the year", () => {
    const span = blockSpan(weeks, "2026-12-21", "2027-01-17");
    expect(span).not.toBeNull();
    // Stops at the last column the year renders instead of overflowing the grid.
    expect(span!.start + span!.span).toBe(weeks.length);
  });

  it("returns null for a block outside the year", () => {
    expect(blockSpan(weeks, "2024-01-01", "2024-01-28")).toBeNull();
    expect(blockSpan(weeks, "2028-01-03", "2028-01-30")).toBeNull();
  });
});

describe("snapping to the week", () => {
  // 2026-08-10 is a Monday, 2026-08-16 the Sunday closing that week.
  it("snaps a start back to its Monday", () => {
    expect(toISODate(mondayOf(fromISODate("2026-08-11")))).toBe("2026-08-10");
    expect(toISODate(mondayOf(fromISODate("2026-08-16")))).toBe("2026-08-10");
  });

  it("snaps an end forward to its Sunday", () => {
    expect(toISODate(sundayOf(fromISODate("2026-08-11")))).toBe("2026-08-16");
    expect(toISODate(sundayOf(fromISODate("2026-08-10")))).toBe("2026-08-16");
  });

  it("leaves a date that already sits on the boundary alone", () => {
    expect(toISODate(mondayOf(fromISODate("2026-08-10")))).toBe("2026-08-10");
    expect(toISODate(sundayOf(fromISODate("2026-08-16")))).toBe("2026-08-16");
  });

  it("snapping either end of one week gives a one-week block", () => {
    const start = mondayOf(fromISODate("2026-08-11"));
    const end = sundayOf(fromISODate("2026-08-13"));
    expect(weekCount(start, end)).toBe(1);
  });
});

describe("startsInPastWeek", () => {
  // Thursday 6 Aug 2026; the Monday of its week is the 3rd.
  const thursday = fromISODate("2026-08-06");

  it("lets the current week through, even from midweek", () => {
    expect(startsInPastWeek("2026-08-03", thursday)).toBe(false);
  });

  it("lets future weeks through", () => {
    expect(startsInPastWeek("2026-08-10", thursday)).toBe(false);
    expect(startsInPastWeek("2027-01-04", thursday)).toBe(false);
  });

  it("rejects a week that has already closed", () => {
    expect(startsInPastWeek("2026-07-27", thursday)).toBe(true);
    expect(startsInPastWeek("2025-01-06", thursday)).toBe(true);
  });

  it("treats Monday itself as the boundary", () => {
    const monday = fromISODate("2026-08-03");
    expect(startsInPastWeek("2026-08-03", monday)).toBe(false);
    expect(startsInPastWeek("2026-07-27", monday)).toBe(true);
  });
});

describe("overlaps", () => {
  const block = { startsOn: "2026-01-05", endsOn: "2026-01-25" };

  it("catches a span sharing any week", () => {
    // Starts inside it, ends inside it, and swallows it whole.
    expect(overlaps({ startsOn: "2026-01-19", endsOn: "2026-02-08" }, block)).toBe(true);
    expect(overlaps({ startsOn: "2025-12-29", endsOn: "2026-01-11" }, block)).toBe(true);
    expect(overlaps({ startsOn: "2025-12-29", endsOn: "2026-02-08" }, block)).toBe(true);
  });

  it("lets the weeks either side through", () => {
    expect(overlaps({ startsOn: "2026-01-26", endsOn: "2026-02-08" }, block)).toBe(false);
    expect(overlaps({ startsOn: "2025-12-22", endsOn: "2026-01-04" }, block)).toBe(false);
  });

  it("counts a shared boundary week as an overlap", () => {
    expect(overlaps({ startsOn: "2026-01-25", endsOn: "2026-02-01" }, block)).toBe(true);
  });
});

describe("shiftWeeks", () => {
  it("moves a date by whole weeks in both directions", () => {
    expect(shiftWeeks("2026-08-10", 3)).toBe("2026-08-31");
    expect(shiftWeeks("2026-08-10", -2)).toBe("2026-07-27");
    expect(shiftWeeks("2026-08-10", 0)).toBe("2026-08-10");
  });

  it("keeps a block's length when both ends move together", () => {
    const start = shiftWeeks("2026-08-10", 5);
    const end = shiftWeeks("2026-08-30", 5);
    expect(weekCount(fromISODate(start), fromISODate(end))).toBe(3);
  });

  it("crosses a year boundary", () => {
    expect(shiftWeeks("2026-12-28", 2)).toBe("2027-01-11");
  });
});
