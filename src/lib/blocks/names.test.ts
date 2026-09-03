import { describe, expect, it } from "vitest";
import { baseName, freeName, nameKey, numberedName } from "@/lib/blocks/names";

describe("nameKey", () => {
  it("folds case and trims the ends", () => {
    expect(nameKey("  Competition 1 ")).toBe("competition 1");
  });

  it("leaves a double space alone — it makes a different name", () => {
    expect(nameKey("Competition  1")).not.toBe(nameKey("Competition 1"));
  });
});

describe("baseName", () => {
  it("drops a trailing number", () => {
    expect(baseName("Competition 1")).toBe("Competition");
    expect(baseName("Competition 12")).toBe("Competition");
  });

  it("keeps a name that has none", () => {
    expect(baseName("Build")).toBe("Build");
  });

  it("keeps a number that is the whole name", () => {
    expect(baseName("1")).toBe("1");
  });

  it("leaves a number that isn't a suffix", () => {
    expect(baseName("Week 1 prep")).toBe("Week 1 prep");
  });
});

describe("numberedName", () => {
  it("starts at 1 in an empty group", () => {
    expect(numberedName("Volume", [])).toBe("Volume 1");
  });

  it("counts past the highest taken, without filling gaps", () => {
    expect(numberedName("Volume", ["Volume 1", "Volume 3"])).toBe("Volume 4");
  });

  it("counts past a number written in another case", () => {
    expect(numberedName("Volume", ["volume 2"])).toBe("Volume 3");
  });

  it("counts from the base when handed an already-numbered name", () => {
    expect(numberedName("Competition 1", ["Competition 1"])).toBe(
      "Competition 2",
    );
  });

  it("ignores a longer name that merely starts the same", () => {
    expect(numberedName("Build", ["Build up 9"])).toBe("Build 1");
  });
});

describe("freeName", () => {
  it("keeps the name when the group has room for it", () => {
    expect(freeName("Competition 1", ["Build 1"])).toBe("Competition 1");
  });

  it("numbers past a clash", () => {
    expect(freeName("Competition 1", ["Competition 1"])).toBe("Competition 2");
  });

  it("treats a differently-cased clash as a clash", () => {
    expect(freeName("Competition 1", ["competition 1"])).toBe("Competition 2");
  });

  it("numbers an unnumbered name that clashes", () => {
    expect(freeName("Build", ["Build"])).toBe("Build 1");
  });

  it("never returns a name the group already holds", () => {
    const taken = ["Build", "Build 1", "Build 2"];
    expect(taken.map(nameKey)).not.toContain(nameKey(freeName("Build", taken)));
  });
});
