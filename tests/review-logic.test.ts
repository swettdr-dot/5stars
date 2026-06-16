import { describe, it, expect } from "vitest";
import { decideOutcome } from "@/lib/review-logic";

describe("decideOutcome", () => {
  it("redirects at or above threshold", () => {
    expect(decideOutcome(5, 5)).toBe("REDIRECTED_GOOGLE");
  });
  it("keeps internal below threshold", () => {
    expect(decideOutcome(4, 5)).toBe("INTERNAL");
    expect(decideOutcome(1, 5)).toBe("INTERNAL");
  });
  it("respects a custom threshold", () => {
    expect(decideOutcome(4, 4)).toBe("REDIRECTED_GOOGLE");
  });
});
