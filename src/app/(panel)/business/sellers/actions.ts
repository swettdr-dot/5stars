"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { slugify } from "@/lib/slug";

const schema = z.object({ name: z.string().min(1) });

export async function createSeller(formData: FormData) {
  const user = await requireUser();
  if (user.role !== "BUSINESS_ADMIN" || !user.businessId) throw new Error("FORBIDDEN");
  const { name } = schema.parse({ name: formData.get("name") });
  const base = slugify(name);
  const existing = await prisma.seller.count({
    where: { businessId: user.businessId, slug: { startsWith: base } },
  });
  const slug = existing === 0 ? base : `${base}-${existing + 1}`;
  await prisma.seller.create({ data: { name, slug, businessId: user.businessId } });
  revalidatePath("/business/sellers");
}
