"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

const schema = z.object({
  googleReviewUrl: z.string().url(),
  logoUrl: z.string().url().or(z.literal("")).optional(),
  starThreshold: z.coerce.number().int().min(1).max(5),
});

export async function updateSettings(formData: FormData) {
  const user = await requireUser();
  if (user.role !== "BUSINESS_ADMIN" || !user.businessId) throw new Error("FORBIDDEN");
  const data = schema.parse({
    googleReviewUrl: formData.get("googleReviewUrl"),
    logoUrl: formData.get("logoUrl"),
    starThreshold: formData.get("starThreshold"),
  });
  await prisma.business.update({
    where: { id: user.businessId },
    data: {
      googleReviewUrl: data.googleReviewUrl,
      logoUrl: data.logoUrl || null,
      starThreshold: data.starThreshold,
    },
  });
  revalidatePath("/business/settings");
}
