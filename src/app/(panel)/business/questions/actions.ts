"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { parseQuestionInput } from "@/lib/question-input";
import { resolveManageableBusiness } from "@/lib/business-access";

/** Revalida la vista de edición (agencia) y la de lectura (negocio). */
function revalidateQuestions(businessId: string) {
  revalidatePath(`/agency/${businessId}/questions`);
  revalidatePath("/business/questions");
}

/** Estado devuelto a la UI (useActionState) para feedback/validación. */
export type QuestionFormState = { ok: boolean; error?: string };

export async function createQuestion(
  _prev: QuestionFormState,
  formData: FormData,
): Promise<QuestionFormState> {
  const businessId = String(formData.get("businessId"));
  await resolveManageableBusiness(businessId);
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
  revalidateQuestions(businessId);
  return { ok: true };
}

export async function deleteQuestion(formData: FormData) {
  const businessId = String(formData.get("businessId"));
  await resolveManageableBusiness(businessId);
  const id = String(formData.get("id"));
  const q = await prisma.question.findFirst({ where: { id, businessId }, select: { id: true } });
  if (!q) return;
  await prisma.$transaction([
    prisma.answer.deleteMany({ where: { questionId: id } }),
    prisma.question.delete({ where: { id } }),
  ]);
  revalidateQuestions(businessId);
}

/** Persiste el nuevo orden (lista de ids en el orden deseado). */
export async function reorderQuestions(businessId: string, orderedIds: string[]) {
  await resolveManageableBusiness(businessId);
  const owned = await prisma.question.findMany({ where: { businessId }, select: { id: true } });
  const ownedSet = new Set(owned.map((o) => o.id));
  const ids = orderedIds.filter((id) => ownedSet.has(id));
  if (ids.length === 0) return;
  await prisma.$transaction(
    ids.map((id, i) => prisma.question.update({ where: { id }, data: { order: i } })),
  );
  revalidateQuestions(businessId);
}

export async function toggleQuestion(formData: FormData) {
  const businessId = String(formData.get("businessId"));
  await resolveManageableBusiness(businessId);
  const id = String(formData.get("id"));
  const q = await prisma.question.findFirst({ where: { id, businessId } });
  if (q) await prisma.question.update({ where: { id }, data: { active: !q.active } });
  revalidateQuestions(businessId);
}

export async function updateQuestion(
  _prev: QuestionFormState,
  formData: FormData,
): Promise<QuestionFormState> {
  const businessId = String(formData.get("businessId"));
  await resolveManageableBusiness(businessId);
  const id = String(formData.get("id"));
  const owned = await prisma.question.findFirst({ where: { id, businessId }, select: { id: true } });
  if (!owned) return { ok: false, error: "Pregunta no encontrada." };
  const parsed = parseQuestionInput({
    text: formData.get("text"),
    type: formData.get("type"),
    options: formData.get("options"),
  });
  if (!parsed.ok) return { ok: false, error: parsed.error };
  await prisma.question.update({
    where: { id },
    data: { text: parsed.data.text, type: parsed.data.type, options: parsed.data.options },
  });
  revalidateQuestions(businessId);
  return { ok: true };
}
