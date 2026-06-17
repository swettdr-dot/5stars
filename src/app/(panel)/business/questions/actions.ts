"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { parseQuestionInput } from "@/lib/question-input";

async function ownBusinessId() {
  const user = await requireUser();
  if (user.role !== "BUSINESS_ADMIN" || !user.businessId) throw new Error("FORBIDDEN");
  return user.businessId;
}

/** Estado devuelto a la UI (useActionState) para feedback/validación. */
export type QuestionFormState = { ok: boolean; error?: string };

export async function createQuestion(
  _prev: QuestionFormState,
  formData: FormData,
): Promise<QuestionFormState> {
  const businessId = await ownBusinessId();
  const parsed = parseQuestionInput({
    text: formData.get("text"),
    type: formData.get("type"),
    options: formData.get("options"),
  });
  if (!parsed.ok) return { ok: false, error: parsed.error };
  const count = await prisma.question.count({ where: { businessId } });
  await prisma.question.create({
    data: {
      businessId,
      text: parsed.data.text,
      type: parsed.data.type,
      options: parsed.data.options,
      order: count,
    },
  });
  revalidatePath("/business/questions");
  return { ok: true };
}

export async function deleteQuestion(formData: FormData) {
  const businessId = await ownBusinessId();
  const id = String(formData.get("id"));
  // Verifica pertenencia y borra primero las respuestas asociadas (FK Answer→Question).
  const q = await prisma.question.findFirst({ where: { id, businessId }, select: { id: true } });
  if (!q) return;
  await prisma.$transaction([
    prisma.answer.deleteMany({ where: { questionId: id } }),
    prisma.question.delete({ where: { id } }),
  ]);
  revalidatePath("/business/questions");
}

/** Persiste el nuevo orden (lista de ids en el orden deseado). */
export async function reorderQuestions(orderedIds: string[]) {
  const businessId = await ownBusinessId();
  const owned = await prisma.question.findMany({ where: { businessId }, select: { id: true } });
  const ownedSet = new Set(owned.map((o) => o.id));
  const ids = orderedIds.filter((id) => ownedSet.has(id));
  if (ids.length === 0) return;
  await prisma.$transaction(
    ids.map((id, i) => prisma.question.update({ where: { id }, data: { order: i } })),
  );
  revalidatePath("/business/questions");
}

export async function toggleQuestion(formData: FormData) {
  const businessId = await ownBusinessId();
  const id = String(formData.get("id"));
  const q = await prisma.question.findFirst({ where: { id, businessId } });
  if (q) await prisma.question.update({ where: { id }, data: { active: !q.active } });
  revalidatePath("/business/questions");
}

export async function updateQuestion(
  _prev: QuestionFormState,
  formData: FormData,
): Promise<QuestionFormState> {
  const businessId = await ownBusinessId();
  const id = String(formData.get("id"));
  // Verifica pertenencia al negocio (igual que delete/toggle).
  const owned = await prisma.question.findFirst({ where: { id, businessId }, select: { id: true } });
  if (!owned) return { ok: false, error: "Pregunta no encontrada." };
  const parsed = parseQuestionInput({
    text: formData.get("text"),
    type: formData.get("type"),
    options: formData.get("options"),
  });
  if (!parsed.ok) return { ok: false, error: parsed.error };
  // No toca order ni active.
  await prisma.question.update({
    where: { id },
    data: { text: parsed.data.text, type: parsed.data.type, options: parsed.data.options },
  });
  revalidatePath("/business/questions");
  return { ok: true };
}
