import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { createQuestion, deleteQuestion, toggleQuestion } from "./actions";

export default async function QuestionsPage() {
  const user = await requireUser();
  if (user.role !== "BUSINESS_ADMIN" || !user.businessId) return <p>No autorizado.</p>;
  const questions = await prisma.question.findMany({
    where: { businessId: user.businessId },
    orderBy: { order: "asc" },
  });
  return (
    <div className="space-y-8">
      <h1 className="text-xl font-bold">Preguntas</h1>
      <p className="text-sm text-gray-500">La pregunta de estrellas se muestra siempre al final.</p>
      <ul className="space-y-2">
        {questions.map((q) => (
          <li key={q.id} className="flex items-center justify-between rounded border p-3">
            <span>{q.text} {q.active ? "" : "(inactiva)"} <em className="text-xs text-gray-400">{q.type}</em></span>
            <span className="flex gap-2">
              <form action={toggleQuestion}><input type="hidden" name="id" value={q.id} /><button className="text-sm underline">{q.active ? "Desactivar" : "Activar"}</button></form>
              <form action={deleteQuestion}><input type="hidden" name="id" value={q.id} /><button className="text-sm text-red-600 underline">Eliminar</button></form>
            </span>
          </li>
        ))}
      </ul>
      <form action={createQuestion} className="grid max-w-md gap-2">
        <input name="text" placeholder="Texto de la pregunta" className="rounded border p-2" required />
        <select name="type" className="rounded border p-2">
          <option value="TEXT">Texto libre</option>
          <option value="MULTIPLE_CHOICE">Opción múltiple</option>
        </select>
        <input name="options" placeholder="Opciones separadas por coma (si aplica)" className="rounded border p-2" />
        <button className="rounded bg-black p-2 text-white">Agregar pregunta</button>
      </form>
    </div>
  );
}
