"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { slugify } from "@/lib/slug";
import { hashPassword } from "@/lib/password";

const schema = z.object({
  name: z.string().min(1),
  email: z.string().email().or(z.literal("")).optional(),
  password: z.string().min(6).or(z.literal("")).optional(),
});

export async function createSeller(formData: FormData) {
  const user = await requireUser();
  if (user.role !== "BUSINESS_ADMIN" || !user.businessId) throw new Error("FORBIDDEN");
  const data = schema.parse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  const base = slugify(data.name);
  const existing = await prisma.seller.count({
    where: { businessId: user.businessId, slug: { startsWith: base } },
  });
  const slug = existing === 0 ? base : `${base}-${existing + 1}`;
  const seller = await prisma.seller.create({
    data: { name: data.name, slug, businessId: user.businessId },
  });
  if (data.email && data.password) {
    const u = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash: await hashPassword(data.password),
        role: "SELLER",
        businessId: user.businessId,
      },
    });
    await prisma.seller.update({ where: { id: seller.id }, data: { userId: u.id } });
  }
  revalidatePath("/business/sellers");
}
