import { describe, expect, it } from "vitest";
import { macrosIntact, reordered, runAround } from "@/lib/blocks/order";

describe("reordered", () => {
  it("shifts the items between, rather than swapping the ends", () => {
    expect(reordered([1, 2, 3, 4], 3, 1)).toEqual([1, 4, 2, 3]);
  });

  it("moves an item forward", () => {
    expect(reordered(["a", "b", "c"], 0, 2)).toEqual(["b", "c", "a"]);
  });

  it("is the identity when it lands where it started", () => {
    expect(reordered([1, 2, 3], 1, 1)).toEqual([1, 2, 3]);
  });

  it("clamps a target past the end instead of leaving a hole", () => {
    expect(reordered([1, 2, 3], 0, 99)).toEqual([2, 3, 1]);
  });

  it("leaves the source alone", () => {
    const items = [1, 2, 3];
    reordered(items, 0, 2);
    expect(items).toEqual([1, 2, 3]);
  });
});

describe("runAround", () => {
  // 4w at 0, 3w at 4, then a one-week gap, then 2w at 8.
  const blocks = [
    { start: 0, span: 4 },
    { start: 4, span: 3 },
    { start: 8, span: 2 },
  ];

  it("spans the blocks that touch", () => {
    expect(runAround(blocks, 0)).toEqual({ first: 0, last: 1 });
    expect(runAround(blocks, 1)).toEqual({ first: 0, last: 1 });
  });

  it("stops at an empty week", () => {
    expect(runAround(blocks, 2)).toEqual({ first: 2, last: 2 });
  });

  it("handles a single block", () => {
    expect(runAround([{ start: 3, span: 1 }], 0)).toEqual({ first: 0, last: 0 });
  });
});

describe("macrosIntact", () => {
  const of = (...ids: (string | null)[]) => ids.map((macroId) => ({ macroId }));

  it("accepts one unbroken stretch per macro", () => {
    expect(macrosIntact(of("m", "m", null, "n", "n"))).toBe(true);
  });

  it("accepts blocks with no macro at all", () => {
    expect(macrosIntact(of(null, null, null))).toBe(true);
  });

  it("rejects a macro split by a loose block", () => {
    expect(macrosIntact(of("m", null, "m"))).toBe(false);
  });

  it("rejects a macro split by another macro", () => {
    expect(macrosIntact(of("m", "n", "m"))).toBe(false);
  });

  it("rejects a split even when the halves are adjacent to their own kind", () => {
    expect(macrosIntact(of("m", "m", "n", "m"))).toBe(false);
  });
});
