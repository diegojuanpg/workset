import { describe, expect, it } from "vitest";
import {
  formatRange,
  meetDays,
  phaseOf,
  weeksOut,
  weeksOutLabel,
} from "@/lib/competitions/dates";

const TODAY = "2026-03-01";

describe("phaseOf", () => {
  it("classifies against today, inclusive on both ends", () => {
    expect(phaseOf("2026-04-01", "2026-04-02", TODAY)).toBe("upcoming");
    expect(phaseOf("2026-02-28", "2026-03-02", TODAY)).toBe("ongoing");
    expect(phaseOf("2026-03-01", "2026-03-01", TODAY)).toBe("ongoing");
    expect(phaseOf("2026-02-20", "2026-02-28", TODAY)).toBe("past");
  });
});

describe("weeksOut", () => {
  it("rounds up so meet week is 1", () => {
    expect(weeksOut("2026-03-03", TODAY)).toBe(1);
    expect(weeksOut("2026-03-08", TODAY)).toBe(1);
    expect(weeksOut("2026-03-09", TODAY)).toBe(2);
    expect(weeksOut("2026-04-26", TODAY)).toBe(8);
  });

  it("is null once started", () => {
    expect(weeksOut(TODAY, TODAY)).toBeNull();
    expect(weeksOut("2026-02-01", TODAY)).toBeNull();
  });

  it("survives a DST jump (March 8 2026, US)", () => {
    expect(weeksOut("2026-03-15", "2026-03-08")).toBe(1);
  });
});

describe("formatRange", () => {
  it("collapses to the shortest unambiguous form", () => {
    expect(formatRange("2026-03-14", "2026-03-14")).toBe("Mar 14, 2026");
    expect(formatRange("2026-03-14", "2026-03-16")).toBe("Mar 14–16, 2026");
    expect(formatRange("2026-03-30", "2026-04-02")).toBe("Mar 30 – Apr 2, 2026");
    expect(formatRange("2026-12-30", "2027-01-02")).toBe("Dec 30, 2026 – Jan 2, 2027");
  });
});

describe("meetDays", () => {
  it("lists every day of the meet, inclusive", () => {
    expect(meetDays("2026-03-14", "2026-03-14")).toEqual(["2026-03-14"]);
    expect(meetDays("2026-03-14", "2026-03-16")).toEqual([
      "2026-03-14",
      "2026-03-15",
      "2026-03-16",
    ]);
  });

  it("crosses month and year ends", () => {
    expect(meetDays("2026-03-30", "2026-04-01")).toEqual([
      "2026-03-30",
      "2026-03-31",
      "2026-04-01",
    ]);
    expect(meetDays("2026-12-31", "2027-01-01")).toEqual(["2026-12-31", "2027-01-01"]);
  });

  it("is empty when the end precedes the start, and never unbounded", () => {
    expect(meetDays("2026-03-14", "2026-03-13")).toEqual([]);
    expect(meetDays("2026-03-14", "9999-01-01")).toHaveLength(31);
  });
});

describe("weeksOutLabel", () => {
  it("counts whole weeks and pluralises", () => {
    expect(weeksOutLabel("2026-03-29", "IPF NATS", TODAY)).toEqual({
      count: "4 weeks out",
      joiner: "from",
      name: "IPF NATS",
    });
    expect(weeksOutLabel("2026-03-08", "IPF NATS", TODAY)).toEqual({
      count: "1 week out",
      joiner: "from",
      name: "IPF NATS",
    });
  });

  it("switches to meet week on the day itself, then goes quiet", () => {
    expect(weeksOutLabel(TODAY, "IPF NATS", TODAY)).toEqual({
      count: "Meet week",
      joiner: "\u2014",
      name: "IPF NATS",
    });
    expect(weeksOutLabel("2026-02-28", "IPF NATS", TODAY)).toBeNull();
  });
});
