import { decideOutcome } from "@/lib/review-logic";

export type BuildInput = {
  businessId: string;
  sellerId: string | null;
  starThreshold: number;
  starRating: number;
  answers: { questionId: string; value: string }[];
  comment?: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
};

/** Pure: builds the Prisma `data` for a Review.create call. */
export function buildReviewCreateData(input: BuildInput) {
  return {
    businessId: input.businessId,
    sellerId: input.sellerId ?? undefined,
    starRating: input.starRating,
    outcome: decideOutcome(input.starRating, input.starThreshold),
    comment: input.comment || null,
    contactName: input.contactName || null,
    contactPhone: input.contactPhone || null,
    contactEmail: input.contactEmail || null,
    answers: { create: input.answers.map((a) => ({ questionId: a.questionId, value: a.value })) },
  };
}
