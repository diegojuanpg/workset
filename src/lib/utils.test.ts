import { describe, expect, it } from "vitest";
import { cn } from "@/lib/utils";

describe("cn", () => {
  it("merges tailwind classes", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });

  it("keeps Geist typography next to a color class", () => {
    // Regression: tailwind-merge used to read text-label-14 as a color and
    // drop it against text-foreground, silently killing the type scale.
    expect(cn("text-label-14", "text-foreground")).toBe("text-label-14 text-foreground");
    expect(cn("text-copy-13", "text-muted-foreground")).toBe(
      "text-copy-13 text-muted-foreground"
    );
  });

  it("still collapses conflicting font sizes", () => {
    expect(cn("text-copy-14", "text-copy-16")).toBe("text-copy-16");
  });
});
