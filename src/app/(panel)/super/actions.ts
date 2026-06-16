"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { hashPassword } from "@/lib/password";

const schema = z.object({
  agencyName: z.string().min(1),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(6),
});

export async function createAgency(formData: FormData) {
  const user = await requireUser();
  if (user.role !== "SUPER_ADMIN") throw new Error("FORBIDDEN");
  const data = schema.parse({
    agencyName: formData.get("agencyName"),
    adminEmail: formData.get("adminEmail"),
    adminPassword: formData.get("adminPassword"),
  });
  const agency = await prisma.agency.create({ data: { name: data.agencyName } });
  await prisma.user.create({
    data: {
      email: data.adminEmail,
      passwordHash: await hashPassword(data.adminPassword),
      role: "AGENCY_ADMIN",
      agencyId: agency.id,
    },
  });
  revalidatePath("/super");
}
