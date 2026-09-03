import { describe, expect, it } from "vitest";
import { microLabel } from "@/lib/cycles/types";

describe("microLabel", () => {
  it("takes the initial, uppercased", () => {
    expect(microLabel("deload")).toBe("D");
    expect(microLabel("  volume ")).toBe("V");
  });

  it("counts characters, not code units", () => {
    // The column's CHECK is char_length = 1, which an astral pair would fail.
    expect([...microLabel("🔥 week")]).toHaveLength(1);
  });

  it("falls back rather than returning an empty label", () => {
    expect(microLabel("   ")).toBe("?");
  });
});

