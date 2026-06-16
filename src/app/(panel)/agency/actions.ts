"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { hashPassword } from "@/lib/password";
import { slugify } from "@/lib/slug";

const schema = z.object({
  name: z.string().min(1),
  googleReviewUrl: z.string().url(),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(6),
});

export async function createBusiness(formData: FormData) {
  const user = await requireUser();
  if (user.role !== "AGENCY_ADMIN" || !user.agencyId) throw new Error("FORBIDDEN");
  const data = schema.parse({
    name: formData.get("name"),
    googleReviewUrl: formData.get("googleReviewUrl"),
    adminEmail: formData.get("adminEmail"),
    adminPassword: formData.get("adminPassword"),
  });
  const base = slugify(data.name);
  const existing = await prisma.business.count({ where: { slug: { startsWith: base } } });
  const slug = existing === 0 ? base : `${base}-${existing + 1}`;
  const business = await prisma.business.create({
    data: { name: data.name, slug, googleReviewUrl: data.googleReviewUrl, agencyId: user.agencyId },
  });
  await prisma.user.create({
    data: {
      email: data.adminEmail,
      passwordHash: await hashPassword(data.adminPassword),
      role: "BUSINESS_ADMIN",
      businessId: business.id,
    },
  });
  revalidatePath("/agency");
}
