# Editar preguntas — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir al `BUSINESS_ADMIN` editar el texto, el tipo y las opciones de una pregunta existente desde el constructor de preguntas.

**Architecture:** Se extrae la validación/normalización del formulario de pregunta (hoy inline en `createQuestion`) a un helper puro y testeable (`src/lib/question-input.ts`), reutilizado tanto por `createQuestion` como por la nueva `updateQuestion`. La UI gana edición en línea: cada tarjeta se transforma en un formulario pre-rellenado, controlado por un `editingId` en `QuestionsBuilder`. Sin migración de BD.

**Tech Stack:** Next.js 16 (App Router) + Server Actions, React 19, Prisma, Zod, Vitest, Tailwind CSS 4.

**Spec:** [docs/superpowers/specs/2026-06-17-editar-preguntas-design.md](../specs/2026-06-17-editar-preguntas-design.md)

---

## File Structure

- **Create:** `src/lib/question-input.ts` — helper puro `parseQuestionInput`: valida con Zod y normaliza opciones. Sin dependencias de Prisma/sesión, por eso es testeable como el resto de `lib/*`.
- **Create:** `tests/question-input.test.ts` — tests del helper (estilo de `tests/submit-review.test.ts`).
- **Modify:** `src/app/(panel)/business/questions/actions.ts` — `createQuestion` pasa a usar el helper; se agrega `updateQuestion`.
- **Modify:** `src/app/(panel)/business/questions/_components/QuestionsBuilder.tsx` — botón de editar + formulario de edición en línea + estado `editingId`.

---

## Task 1: Helper puro `parseQuestionInput`

**Files:**
- Create: `src/lib/question-input.ts`
- Test: `tests/question-input.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/question-input.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { parseQuestionInput } from "@/lib/question-input";

describe("parseQuestionInput", () => {
  it("acepta texto abierto e ignora opciones", () => {
    const r = parseQuestionInput({ text: " ¿Te atendieron bien? ", type: "TEXT", options: "x\ny" });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.text).toBe("¿Te atendieron bien?");
      expect(r.data.type).toBe("TEXT");
      expect(r.data.options).toEqual([]);
    }
  });

  it("parsea opciones múltiples una por línea, recortando y filtrando vacíos", () => {
    const r = parseQuestionInput({ text: "Calidad", type: "MULTIPLE_CHOICE", options: " Buena \n\n Mala \r\nRegular" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.options).toEqual(["Buena", "Mala", "Regular"]);
  });

  it("rechaza texto vacío", () => {
    const r = parseQuestionInput({ text: "   ", type: "TEXT", options: null });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/texto/i);
  });

  it("rechaza opción múltiple sin opciones", () => {
    const r = parseQuestionInput({ text: "Calidad", type: "MULTIPLE_CHOICE", options: "  \n  " });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/opción/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/question-input.test.ts`
Expected: FAIL — `Cannot find module '@/lib/question-input'`.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/question-input.ts`:

```ts
import { z } from "zod";

const schema = z.object({
  text: z.string().trim().min(1, "Escribe el texto de la pregunta."),
  type: z.enum(["TEXT", "MULTIPLE_CHOICE"]),
  // En "Texto abierto" el campo no se renderiza → FormData.get devuelve null.
  options: z.string().nullish(),
});

export type ParsedQuestion = {
  text: string;
  type: "TEXT" | "MULTIPLE_CHOICE";
  options: string[];
};

export type ParseResult = { ok: true; data: ParsedQuestion } | { ok: false; error: string };

/** Pure: valida y normaliza la entrada del formulario de pregunta (alta o edición). */
export function parseQuestionInput(raw: {
  text: FormDataEntryValue | null;
  type: FormDataEntryValue | null;
  options: FormDataEntryValue | null;
}): ParseResult {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Revisa los datos." };
  }
  const d = parsed.data;
  const options =
    d.type === "MULTIPLE_CHOICE" && d.options
      ? d.options.split(/\r?\n/).map((o) => o.trim()).filter(Boolean)
      : [];
  if (d.type === "MULTIPLE_CHOICE" && options.length === 0) {
    return { ok: false, error: "Agrega al menos una opción (una por línea)." };
  }
  return { ok: true, data: { text: d.text, type: d.type, options } };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/question-input.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/question-input.ts tests/question-input.test.ts
git commit -m "feat: helper puro parseQuestionInput para validar preguntas"
```

---

## Task 2: Refactor `createQuestion` para usar el helper

**Files:**
- Modify: `src/app/(panel)/business/questions/actions.ts`

- [ ] **Step 1: Reemplazar el bloque de validación inline por el helper**

En `actions.ts`, eliminar el `createSchema` local (líneas 16-21) y reescribir `createQuestion` para delegar en `parseQuestionInput`. Agregar el import arriba:

```ts
import { parseQuestionInput } from "@/lib/question-input";
```

Reemplazar la función `createQuestion` completa por:

```ts
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
```

Eliminar también el import de `z` si ya no se usa en el archivo (al quitar `createSchema`, `z` queda sin uso → ESLint fallará). Verificar y quitar `import { z } from "zod";`.

- [ ] **Step 2: Verificar que no quedó nada roto**

Run: `npx vitest run && npm run lint`
Expected: tests PASS, lint sin errores (en particular, sin `'z' is defined but never used`).

- [ ] **Step 3: Commit**

```bash
git add src/app/\(panel\)/business/questions/actions.ts
git commit -m "refactor: createQuestion usa parseQuestionInput"
```

---

## Task 3: Server action `updateQuestion`

**Files:**
- Modify: `src/app/(panel)/business/questions/actions.ts`

- [ ] **Step 1: Agregar `updateQuestion`**

Añadir al final de `actions.ts`:

```ts
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
```

- [ ] **Step 2: Verificar compilación/lint**

Run: `npm run lint`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(panel\)/business/questions/actions.ts
git commit -m "feat: server action updateQuestion (texto, tipo, opciones)"
```

---

## Task 4: Edición en línea en `QuestionsBuilder`

**Files:**
- Modify: `src/app/(panel)/business/questions/_components/QuestionsBuilder.tsx`

- [ ] **Step 1: Importar `updateQuestion` y agregar estado de edición**

En el import de actions (línea 5), agregar `updateQuestion`:

```tsx
import { createQuestion, updateQuestion, deleteQuestion, reorderQuestions, toggleQuestion } from "../actions";
```

Dentro de `QuestionsBuilder`, junto al resto de hooks de estado (cerca de la línea 56), agregar:

```tsx
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editType, setEditType] = useState<"MULTIPLE_CHOICE" | "TEXT">("MULTIPLE_CHOICE");
  const [editState, editAction, editPending] = useActionState(updateQuestion, { ok: false });
  // Cierra el form de edición al guardar con éxito (patrón "estado previo").
  const [seenEdit, setSeenEdit] = useState(editState);
  if (seenEdit !== editState) {
    setSeenEdit(editState);
    if (editState.ok) setEditingId(null);
  }
```

- [ ] **Step 2: Hacer que abrir un form cierre el otro**

En el handler del botón "+ Agregar pregunta" (línea ~200), antes de `setShowAdd(true)` agregar `setEditingId(null);`. Y al iniciar edición (Step 4) se hará `setShowAdd(false);`.

Reemplazar el `onClick` del botón "+ Agregar pregunta":

```tsx
              onClick={() => {
                setEditingId(null);
                setNewType("MULTIPLE_CHOICE");
                setShowAdd(true);
              }}
```

- [ ] **Step 3: Renderizar el form de edición en lugar de la tarjeta cuando `editingId === q.id`**

Dentro del `.map((q, i) => { ... })` (línea 73), reemplazar el `return ( <div draggable ... > ... </div> )` por una bifurcación. Al inicio del cuerpo del map, justo después de `const selected = ...;`, agregar:

```tsx
            if (editingId === q.id) {
              return (
                <form
                  key={q.id}
                  action={editAction}
                  className="flex flex-col gap-2.5 rounded-[12px] border-[1.5px] border-accent bg-card p-[15px]"
                >
                  <input type="hidden" name="id" value={q.id} />
                  <input
                    name="text"
                    required
                    defaultValue={q.text}
                    placeholder="Texto de la pregunta"
                    className="h-10 rounded-control border border-line bg-card px-3 text-body text-ink outline-none focus:border-accent focus:shadow-[0_0_0_3px_var(--ac-bg)]"
                  />
                  <select
                    name="type"
                    value={editType}
                    onChange={(e) => setEditType(e.target.value as "MULTIPLE_CHOICE" | "TEXT")}
                    className="h-10 rounded-control border border-line bg-card px-3 text-body text-ink outline-none focus:border-accent"
                  >
                    <option value="MULTIPLE_CHOICE">Opción múltiple</option>
                    <option value="TEXT">Texto abierto</option>
                  </select>
                  {editType === "MULTIPLE_CHOICE" && (
                    <textarea
                      name="options"
                      rows={4}
                      defaultValue={q.options.join("\n")}
                      placeholder={"Una opción por línea\nEj:\nExcelente\nBuena\nRegular\nMala"}
                      className="resize-none rounded-control border border-line bg-card p-3 text-body text-ink outline-none focus:border-accent focus:shadow-[0_0_0_3px_var(--ac-bg)]"
                    />
                  )}
                  {editState.error && (
                    <p role="alert" className="text-meta text-red">
                      {editState.error}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={editPending}
                      className="rounded-control bg-accent px-4 py-2 text-[13px] font-semibold text-white hover:bg-accent-dark disabled:opacity-70"
                    >
                      {editPending ? "Guardando…" : "Guardar"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="rounded-control px-4 py-2 text-[13px] font-semibold text-ink-2 hover:bg-accent-weak"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              );
            }
```

> El `defaultValue` en `text`/`textarea` queda fijo al montar el form; como el form se desmonta al cambiar `editingId` y se vuelve a montar para otra pregunta, los valores iniciales siempre corresponden a la pregunta editada. El `select` es controlado por `editType`, que se inicializa en el Step 4 al abrir la edición.

- [ ] **Step 4: Agregar el botón de editar (lápiz) en la barra de acciones de la tarjeta**

En el bloque de acciones de la tarjeta (`<div className="flex shrink-0 items-center gap-2" onClick={(e) => e.stopPropagation()}>`, línea ~113), antes del `<form action={deleteQuestion}>`, agregar:

```tsx
                  <button
                    type="button"
                    aria-label="Editar"
                    onClick={() => {
                      setShowAdd(false);
                      setEditType(q.type);
                      setEditingId(q.id);
                    }}
                    className="flex size-6 items-center justify-center rounded-md text-ink-3 transition-colors hover:bg-accent-weak hover:text-accent"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                    </svg>
                  </button>
```

- [ ] **Step 5: Verificar build y lint**

Run: `npm run lint && npm run build`
Expected: sin errores de ESLint ni de TypeScript/compilación.

- [ ] **Step 6: Verificación manual**

Run: `npm run dev`, entrar como `BUSINESS_ADMIN`, ir a `/business/questions`.
Verificar:
- El lápiz abre el form pre-rellenado con texto, tipo y opciones actuales.
- Cambiar tipo a "Texto abierto" oculta el textarea; volver a "Opción múltiple" lo muestra.
- "Guardar" persiste los cambios y cierra el form; la tarjeta y la vista previa reflejan lo nuevo.
- "Cancelar" descarta sin cambios.
- Abrir edición cierra el form de "Agregar" y viceversa.
- Guardar no altera el orden ni el estado activo/inactivo de la pregunta.

- [ ] **Step 7: Commit**

```bash
git add src/app/\(panel\)/business/questions/_components/QuestionsBuilder.tsx
git commit -m "feat: edición en línea de preguntas en el constructor"
```

---

## Self-Review notes

- **Cobertura del spec:** alcance (text/type/options, sin tocar order/active) → Tasks 3 y 4 Step 6; UX en línea → Task 4; `updateQuestion` con scoping multi-tenant → Task 3; sin migración → confirmado (no hay tarea de Prisma); datos históricos → no requiere acción; pruebas → Task 1 (helper puro). Las actions dependen de Prisma/sesión y el repo no tiene mocking de Prisma en tests; por eso la cobertura de tests automatizados se concentra en el helper puro reutilizado por ambas actions, y la lógica de `updateQuestion` se verifica manualmente en Task 4 Step 6 — coherente con el estilo de `tests/*` existente.
- **Nomenclatura consistente:** `parseQuestionInput` devuelve `{ ok, data | error }`; tanto `createQuestion` como `updateQuestion` la consumen con `if (!parsed.ok)`.
- **Idioma:** mensajes en español neutro (se corrige "Revisá" → "Revisa" al extraer el helper).
