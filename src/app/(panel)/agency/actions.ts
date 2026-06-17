"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { hashPassword } from "@/lib/password";
import { slugify } from "@/lib/slug";
import type { EntityFormState } from "../super/_components/CreateEntityForm";

const schema = z.object({
  name: z.string().trim().min(1, "Ingresa el nombre del negocio."),
  googleReviewUrl: z.string().trim().url("Ingresa una URL válida."),
  adminEmail: z.string().trim().email("Email inválido."),
  adminPassword: z.string().min(6, "Mínimo 6 caracteres."),
});

export async function createBusiness(
  _prev: EntityFormState,
  formData: FormData,
): Promise<EntityFormState> {
  const user = await requireUser();
  // Solo el AGENCY_ADMIN de su agencia puede crear negocios (scoping por rol).
  if (user.role !== "AGENCY_ADMIN" || !user.agencyId) return { ok: false, error: "No autorizado." };

  const parsed = schema.safeParse({
    name: formData.get("name"),
    googleReviewUrl: formData.get("googleReviewUrl"),
    adminEmail: formData.get("adminEmail"),
    adminPassword: formData.get("adminPassword"),
  });
  if (!parsed.success) {
    const f = parsed.error.flatten().fieldErrors;
    return {
      ok: false,
      error: "Revisa los campos marcados.",
      fieldErrors: {
        name: f.name?.[0] ?? "",
        googleReviewUrl: f.googleReviewUrl?.[0] ?? "",
        adminEmail: f.adminEmail?.[0] ?? "",
        adminPassword: f.adminPassword?.[0] ?? "",
      },
    };
  }
  const data = parsed.data;

  const base = slugify(data.name);
  const existing = await prisma.business.count({ where: { slug: { startsWith: base } } });
  const slug = existing === 0 ? base : `${base}-${existing + 1}`;

  try {
    const business = await prisma.business.create({
      data: {
        name: data.name,
        slug,
        googleReviewUrl: data.googleReviewUrl,
        agencyId: user.agencyId,
      },
    });
    await prisma.user.create({
      data: {
        email: data.adminEmail,
        passwordHash: await hashPassword(data.adminPassword),
        role: "BUSINESS_ADMIN",
        businessId: business.id,
      },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { ok: false, error: "Ese email ya está registrado.", fieldErrors: { adminEmail: "Email en uso." } };
    }
    throw e;
  }

  revalidatePath("/agency");
  return { ok: true, message: `Negocio “${data.name}” creado.` };
}
