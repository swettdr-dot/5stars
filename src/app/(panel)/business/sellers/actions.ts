"use server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { resolveManageableBusiness } from "@/lib/business-access";
import { slugify } from "@/lib/slug";
import { hashPassword } from "@/lib/password";

/** Estado del form de "Nuevo vendedor" para `useActionState`. */
export type CreateSellerState = { ok: boolean; error?: string };

const schema = z
  .object({
    name: z.string().trim().min(1, "El nombre es obligatorio."),
    email: z
      .string()
      .trim()
      .email("Email inválido.")
      .or(z.literal(""))
      .optional(),
    password: z
      .string()
      .min(6, "La contraseña debe tener al menos 6 caracteres.")
      .or(z.literal(""))
      .optional(),
  })
  // El login del vendedor es opcional, pero si se quiere, email y contraseña van juntos.
  .refine((d) => !!d.email === !!d.password, {
    message: "Para habilitar login, completa email y contraseña.",
    path: ["password"],
  });

export async function createSeller(
  _prev: CreateSellerState,
  formData: FormData,
): Promise<CreateSellerState> {
  const businessId = String(formData.get("businessId"));
  try {
    await resolveManageableBusiness(businessId);
  } catch {
    return { ok: false, error: "No autorizado." };
  }

  const parsed = schema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  const data = parsed.data;

  // Slug único dentro del negocio (Seller.@@unique([businessId, slug])).
  const base = slugify(data.name);
  const existing = await prisma.seller.count({
    where: { businessId, slug: { startsWith: base } },
  });
  const slug = existing === 0 ? base : `${base}-${existing + 1}`;

  try {
    const seller = await prisma.seller.create({
      data: { name: data.name, slug, businessId },
    });
    if (data.email && data.password) {
      const u = await prisma.user.create({
        data: {
          email: data.email,
          passwordHash: await hashPassword(data.password),
          role: "SELLER",
          businessId,
        },
      });
      await prisma.seller.update({ where: { id: seller.id }, data: { userId: u.id } });
    }
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { ok: false, error: "Ya existe un usuario con ese email." };
    }
    throw e;
  }

  revalidatePath(`/agency/${businessId}/sellers`);
  revalidatePath("/business/sellers");
  return { ok: true };
}
