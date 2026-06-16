"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

async function ownBusinessId() {
  const user = await requireUser();
  if (user.role !== "BUSINESS_ADMIN" || !user.businessId) throw new Error("FORBIDDEN");
  return user.businessId;
}

const createSchema = z.object({
  text: z.string().min(1),
  type: z.enum(["TEXT", "MULTIPLE_CHOICE"]),
  options: z.string().optional(),
});

export async function createQuestion(formData: FormData) {
  const businessId = await ownBusinessId();
  const data = createSchema.parse({
    text: formData.get("text"),
    type: formData.get("type"),
    options: formData.get("options"),
  });
  const options =
    data.type === "MULTIPLE_CHOICE" && data.options
      ? data.options.split(",").map((o) => o.trim()).filter(Boolean)
      : [];
  const count = await prisma.question.count({ where: { businessId } });
  await prisma.question.create({
    data: { businessId, text: data.text, type: data.type, options, order: count },
  });
  revalidatePath("/business/questions");
}

export async function deleteQuestion(formData: FormData) {
  const businessId = await ownBusinessId();
  const id = String(formData.get("id"));
  await prisma.question.deleteMany({ where: { id, businessId } });
  revalidatePath("/business/questions");
}

export async function toggleQuestion(formData: FormData) {
  const businessId = await ownBusinessId();
  const id = String(formData.get("id"));
  const q = await prisma.question.findFirst({ where: { id, businessId } });
  if (q) await prisma.question.update({ where: { id }, data: { active: !q.active } });
  revalidatePath("/business/questions");
}
