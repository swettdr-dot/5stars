import { describe, it, expect } from "vitest";
import { aggregateMetrics } from "@/lib/metrics";

const sample = [
  { starRating: 5, outcome: "REDIRECTED_GOOGLE" as const },
  { starRating: 5, outcome: "REDIRECTED_GOOGLE" as const },
  { starRating: 3, outcome: "INTERNAL" as const },
  { starRating: 1, outcome: "INTERNAL" as const },
];

describe("aggregateMetrics", () => {
  it("computes total, average, redirected count and distribution", () => {
    const m = aggregateMetrics(sample);
    expect(m.total).toBe(4);
    expect(m.average).toBe(3.5);
    expect(m.redirected).toBe(2);
    expect(m.distribution).toEqual({ 1: 1, 2: 0, 3: 1, 4: 0, 5: 2 });
  });
  it("handles empty input", () => {
    const m = aggregateMetrics([]);
    expect(m).toEqual({
      total: 0, average: 0, redirected: 0,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    });
  });
});
