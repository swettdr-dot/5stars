export type Outcome = "REDIRECTED_GOOGLE" | "INTERNAL";

export function decideOutcome(starRating: number, threshold: number): Outcome {
  return starRating >= threshold ? "REDIRECTED_GOOGLE" : "INTERNAL";
}
