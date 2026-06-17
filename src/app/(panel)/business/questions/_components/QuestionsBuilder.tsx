"use client";

import { useActionState, useState } from "react";
import { ReviewFlow, type FlowQuestion } from "@/app/r/_components/ReviewFlow";
import { createQuestion, updateQuestion, deleteQuestion, reorderQuestions, toggleQuestion } from "../actions";

type Q = {
  id: string;
  text: string;
  type: "TEXT" | "MULTIPLE_CHOICE";
  options: string[];
  active: boolean;
  order: number;
};

type Business = { name: string; slug: string; logoUrl: string | null; starThreshold: number };

function typeLabel(t: Q["type"]): string {
  return t === "MULTIPLE_CHOICE" ? "Opción múltiple" : "Texto abierto · opcional";
}

export function QuestionsBuilder({ business, questions }: { business: Business; questions: Q[] }) {
  // Orden local (optimista para drag&drop); se resincroniza cuando el server revalida.
  const [items, setItems] = useState(questions);
  const [seenQ, setSeenQ] = useState(questions);
  if (seenQ !== questions) {
    setSeenQ(questions);
    setItems(questions);
  }
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const active = items.filter((q) => q.active);
  const ratingStep = active.length;
  const activeIndexById = new Map(active.map((q, i) => [q.id, i] as const));
  const flowQuestions: FlowQuestion[] = active.map((q) => ({
    id: q.id,
    text: q.text,
    type: q.type,
    options: q.options,
  }));

  function handleDrop(target: number) {
    if (dragIndex === null || dragIndex === target) {
      setDragIndex(null);
      return;
    }
    const next = [...items];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(target, 0, moved);
    setItems(next);
    setDragIndex(null);
    void reorderQuestions(next.map((q) => q.id));
  }

  const [previewStep, setPreviewStepRaw] = useState(0);
  const [showAdd, setShowAdd] = useState(false);
  const [newType, setNewType] = useState<"MULTIPLE_CHOICE" | "TEXT">("MULTIPLE_CHOICE");
  const [addState, addAction, addPending] = useActionState(createQuestion, { ok: false });
  // Cierra el form al crear con éxito (patrón "estado previo" de React).
  const [seenAdd, setSeenAdd] = useState(addState);
  if (seenAdd !== addState) {
    setSeenAdd(addState);
    if (addState.ok) setShowAdd(false);
  }
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editType, setEditType] = useState<"MULTIPLE_CHOICE" | "TEXT">("MULTIPLE_CHOICE");
  const [editState, editAction, editPending] = useActionState(updateQuestion, { ok: false });
  // Cierra el form de edición al guardar con éxito (patrón "estado previo").
  const [seenEdit, setSeenEdit] = useState(editState);
  if (seenEdit !== editState) {
    setSeenEdit(editState);
    if (editState.ok) setEditingId(null);
  }
  const setPreviewStep = (n: number) => setPreviewStepRaw(Math.min(Math.max(n, 0), ratingStep));
  const step = Math.min(previewStep, ratingStep);

  return (
    <div className="grid grid-cols-1 items-start gap-[26px] lg:grid-cols-[minmax(0,1fr)_348px]">
      {/* ── Columna izquierda: constructor ── */}
      <div>
        <div className="grid grid-cols-1 gap-[11px]">
          {items.map((q, i) => {
            const idx = activeIndexById.get(q.id);
            const selected = q.active && idx === step;
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
            return (
              <div
                key={q.id}
                draggable
                onDragStart={() => setDragIndex(i)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(i)}
                onDragEnd={() => setDragIndex(null)}
                onClick={() => q.active && idx != null && setPreviewStep(idx)}
                className={`flex items-start gap-3 rounded-[12px] border-[1.5px] p-[15px] transition-colors ${
                  q.active ? "cursor-pointer" : "opacity-60"
                } ${dragIndex === i ? "opacity-50" : ""} ${
                  selected ? "border-accent bg-accent-weak" : "border-line bg-card hover:border-[#dcdce3]"
                }`}
              >
                <span className="cursor-grab select-none pt-0.5 text-[9px] leading-[0.7] text-ink-3" title="Arrastrá para reordenar">
                  ⋮⋮
                </span>
                <span className="flex size-[26px] shrink-0 items-center justify-center rounded-[7px] bg-accent-bg text-meta font-semibold text-accent-dark">
                  {idx != null ? idx + 1 : "—"}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-card-title font-semibold text-ink">{q.text}</div>
                  <div className="text-[12px] text-ink-3">{typeLabel(q.type)}</div>
                  {q.options.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {q.options.map((o) => (
                        <span
                          key={o}
                          className="rounded-[7px] border border-line bg-canvas px-2.5 py-1 text-[12px] text-ink-2"
                        >
                          {o}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2" onClick={(e) => e.stopPropagation()}>
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
                  <form action={deleteQuestion}>
                    <input type="hidden" name="id" value={q.id} />
                    <button
                      type="submit"
                      aria-label="Eliminar"
                      className="flex size-6 items-center justify-center rounded-md text-ink-3 transition-colors hover:bg-red-bg hover:text-red"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                        <path d="M4 7h16M9 7V5h6v2M7 7l1 13h8l1-13" />
                      </svg>
                    </button>
                  </form>
                  <form action={toggleQuestion}>
                    <input type="hidden" name="id" value={q.id} />
                    <button
                      type="submit"
                      role="switch"
                      aria-checked={q.active}
                      aria-label={q.active ? "Desactivar" : "Activar"}
                      className="relative h-5 w-[34px] rounded-full transition-colors"
                      style={{ background: q.active ? "var(--ac)" : "#D8D8DF" }}
                    >
                      <span
                        className="absolute top-0.5 size-4 rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,.2)] transition-all"
                        style={{ left: q.active ? 16 : 2 }}
                      />
                    </button>
                  </form>
                </div>
              </div>
            );
          })}

          {showAdd ? (
            <form
              action={addAction}
              className="flex flex-col gap-2.5 rounded-[12px] border-[1.5px] border-accent bg-card p-[15px]"
            >
              <input
                name="text"
                required
                placeholder="Texto de la pregunta"
                className="h-10 rounded-control border border-line bg-card px-3 text-body text-ink outline-none focus:border-accent focus:shadow-[0_0_0_3px_var(--ac-bg)]"
              />
              <select
                name="type"
                value={newType}
                onChange={(e) => setNewType(e.target.value as "MULTIPLE_CHOICE" | "TEXT")}
                className="h-10 rounded-control border border-line bg-card px-3 text-body text-ink outline-none focus:border-accent"
              >
                <option value="MULTIPLE_CHOICE">Opción múltiple</option>
                <option value="TEXT">Texto abierto</option>
              </select>
              {newType === "MULTIPLE_CHOICE" && (
                <textarea
                  name="options"
                  rows={4}
                  placeholder={"Una opción por línea\nEj:\nExcelente\nBuena\nRegular\nMala"}
                  className="resize-none rounded-control border border-line bg-card p-3 text-body text-ink outline-none focus:border-accent focus:shadow-[0_0_0_3px_var(--ac-bg)]"
                />
              )}
              {addState.error && (
                <p role="alert" className="text-meta text-red">
                  {addState.error}
                </p>
              )}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={addPending}
                  className="rounded-control bg-accent px-4 py-2 text-[13px] font-semibold text-white hover:bg-accent-dark disabled:opacity-70"
                >
                  {addPending ? "Agregando…" : "Agregar"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  className="rounded-control px-4 py-2 text-[13px] font-semibold text-ink-2 hover:bg-accent-weak"
                >
                  Cancelar
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setNewType("MULTIPLE_CHOICE");
                setShowAdd(true);
              }}
              className="flex items-center justify-center gap-2 rounded-[12px] border border-dashed border-[#c9c9d4] bg-card p-[13px] text-[13px] font-semibold text-ink-2 transition-colors hover:border-accent hover:text-accent"
            >
              + Agregar pregunta
            </button>
          )}
        </div>

        {/* Nota del paso final (clickable → preview del selector de estrellas) */}
        <div
          onClick={() => setPreviewStep(ratingStep)}
          className={`mt-[14px] cursor-pointer rounded-[12px] border-[1.5px] p-[14px_16px] text-meta leading-[1.55] text-ink-2 transition-colors ${
            step === ratingStep
              ? "border-accent bg-accent-weak"
              : "border-[color-mix(in_srgb,var(--ac)_18%,#fff)] bg-accent-weak hover:border-accent"
          }`}
        >
          <b className="text-ink">Paso final fijo:</b> después de las preguntas siempre aparece el selector de 1 a 5
          estrellas. Si la nota es ≥ tu umbral ({business.starThreshold}★) se redirige a Google; si es menor, se
          captura en privado.
        </div>
      </div>

      {/* ── Columna derecha: vista previa en vivo ── */}
      <div className="sticky top-[84px]">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-label font-semibold uppercase tracking-label text-ink-3">Vista previa en vivo</span>
          <span className="flex items-center gap-1.5 text-label font-semibold text-green">
            <span className="size-[7px] rounded-full bg-green" />
            Como lo ve el cliente
          </span>
        </div>

        <div className="mx-auto flex h-[560px] w-[330px] flex-col overflow-hidden rounded-[36px] border-[9px] border-[#14141f] bg-card shadow-[0_22px_50px_-20px_rgba(0,0,0,.4)]">
          {/* notch */}
          <div className="flex h-6 shrink-0 items-center justify-center">
            <div className="-mt-[9px] h-[18px] w-[92px] rounded-b-[13px] bg-[#14141f]" />
          </div>
          {/* mismo componente del flujo público, en modo preview */}
          <div className="min-h-0 flex-1 overflow-hidden">
            <ReviewFlow
              preview
              step={step}
              name={business.name}
              logoUrl={business.logoUrl}
              questions={flowQuestions}
              starThreshold={business.starThreshold}
            />
          </div>
          {/* navegación del preview */}
          <div className="flex shrink-0 items-center justify-between border-t border-line bg-card px-3.5 py-2.5">
            <button
              type="button"
              onClick={() => setPreviewStep(step - 1)}
              disabled={step === 0}
              className="flex size-[30px] items-center justify-center rounded-[8px] border border-line bg-card text-[13px] text-ink-2 disabled:opacity-40"
            >
              ◀
            </button>
            <div className="flex items-center gap-1.5">
              {Array.from({ length: ratingStep + 1 }).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setPreviewStep(i)}
                  aria-label={`Paso ${i + 1}`}
                  className="h-1.5 rounded-full transition-all"
                  style={{ width: i === step ? 18 : 6, background: i === step ? "var(--ac)" : "#D8D8DF" }}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => setPreviewStep(step + 1)}
              disabled={step === ratingStep}
              className="flex size-[30px] items-center justify-center rounded-[8px] border border-line bg-card text-[13px] text-ink-2 disabled:opacity-40"
            >
              ▶
            </button>
          </div>
        </div>

        <div className="mt-2.5 text-center text-[11.5px] text-ink-3">
          Paso {step + 1} de {ratingStep + 1} · sincronizado con tu selección
        </div>
      </div>
    </div>
  );
}
