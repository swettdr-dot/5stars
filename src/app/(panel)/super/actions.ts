"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { hashPassword } from "@/lib/password";
import type { EntityFormState } from "./_components/CreateEntityForm";

const schema = z.object({
  agencyName: z.string().trim().min(1, "Ingresá el nombre de la agencia."),
  adminEmail: z.string().trim().email("Email inválido."),
  adminPassword: z.string().min(6, "Mínimo 6 caracteres."),
});

export async function createAgency(
  _prev: EntityFormState,
  formData: FormData,
): Promise<EntityFormState> {
  const user = await requireUser();
  // Solo el SUPER_ADMIN puede crear agencias.
  if (user.role !== "SUPER_ADMIN") return { ok: false, error: "No autorizado." };

  const parsed = schema.safeParse({
    agencyName: formData.get("agencyName"),
    adminEmail: formData.get("adminEmail"),
    adminPassword: formData.get("adminPassword"),
  });
  if (!parsed.success) {
    const f = parsed.error.flatten().fieldErrors;
    return {
      ok: false,
      error: "Revisá los campos marcados.",
      fieldErrors: {
        agencyName: f.agencyName?.[0] ?? "",
        adminEmail: f.adminEmail?.[0] ?? "",
        adminPassword: f.adminPassword?.[0] ?? "",
      },
    };
  }
  const data = parsed.data;

  try {
    const agency = await prisma.agency.create({ data: { name: data.agencyName } });
    await prisma.user.create({
      data: {
        email: data.adminEmail,
        passwordHash: await hashPassword(data.adminPassword),
        role: "AGENCY_ADMIN",
        agencyId: agency.id,
      },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { ok: false, error: "Ese email ya está registrado.", fieldErrors: { adminEmail: "Email en uso." } };
    }
    throw e;
  }

  revalidatePath("/super");
  return { ok: true, message: `Agencia “${data.agencyName}” creada.` };
}
