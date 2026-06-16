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

/** % de reseñas redirigidas a Google (0–100, redondeado). */
export function googlePct(m: Metrics): number {
  return m.total === 0 ? 0 : Math.round((m.redirected / m.total) * 100);
}

export type TimedReview = ReviewLike & { createdAt: Date };

/** Filtra reseñas en [start, end). */
export function inWindow<T extends { createdAt: Date }>(reviews: T[], start: Date, end?: Date): T[] {
  return reviews.filter((r) => r.createdAt >= start && (!end || r.createdAt < end));
}

/**
 * Promedio acumulado (hasta la fecha) en `weeks` cortes semanales que terminan en
 * `now`. Devuelve un punto por semana (más antiguo → más reciente), sin huecos.
 */
export function weeklyAverageTrend(reviews: TimedReview[], now: Date, weeks = 8): number[] {
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const out: number[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const cutoff = new Date(now.getTime() - i * weekMs);
    const upto = reviews.filter((r) => r.createdAt <= cutoff);
    const avg = upto.length ? upto.reduce((a, r) => a + r.starRating, 0) / upto.length : 0;
    out.push(Math.round(avg * 100) / 100);
  }
  return out;
}
