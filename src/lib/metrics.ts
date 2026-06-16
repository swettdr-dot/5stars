export type ReviewLike = {
  starRating: number;
  outcome: "REDIRECTED_GOOGLE" | "INTERNAL";
};
export type Metrics = {
  total: number;
  average: number;
  redirected: number;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
};

export function aggregateMetrics(reviews: ReviewLike[]): Metrics {
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Metrics["distribution"];
  let sum = 0;
  let redirected = 0;
  for (const r of reviews) {
    distribution[r.starRating as 1 | 2 | 3 | 4 | 5]++;
    sum += r.starRating;
    if (r.outcome === "REDIRECTED_GOOGLE") redirected++;
  }
  const total = reviews.length;
  const average = total === 0 ? 0 : Math.round((sum / total) * 100) / 100;
  return { total, average, redirected, distribution };
}
