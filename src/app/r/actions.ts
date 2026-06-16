"use server";
import { z } from "zod";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { buildReviewCreateData } from "@/lib/review-build";

const payloadSchema = z.object({
  businessId: z.string(),
  sellerId: z.string().nullable(),
  starRating: z.coerce.number().int().min(1).max(5),
  answers: z.array(z.object({ questionId: z.string(), value: z.string() })),
  comment: z.string().optional(),
  contactName: z.string().optional(),
  contactPhone: z.string().optional(),
  contactEmail: z.string().optional(),
});

export async function submitReview(raw: unknown) {
  const p = payloadSchema.parse(raw);
  const business = await prisma.business.findUnique({ where: { id: p.businessId } });
  if (!business) throw new Error("BUSINESS_NOT_FOUND");
  const data = buildReviewCreateData({ ...p, starThreshold: business.starThreshold });
  await prisma.review.create({ data });
  if (data.outcome === "REDIRECTED_GOOGLE") redirect(business.googleReviewUrl);
  redirect(`/r/${business.slug}/gracias`);
}
