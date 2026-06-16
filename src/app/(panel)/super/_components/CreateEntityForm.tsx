"use client";

import { useActionState, useId, useState } from "react";
import { Card } from "@/components/ui/Card";

/** Estado devuelto por las server actions de creación (super/agency). */
export type EntityFormState = {
  ok: boolean;
  message?: string;
  error?: string;
  fieldErrors?: Record<string, string>;
};

export type EntityField = {
  name: string;
  label: string;
  type?: "text" | "email" | "password" | "url";
  placeholder?: string;
  autoComplete?: string;
};

const initial: EntityFormState = { ok: false };

/**
 * Cabecera de la sección de entidades (título + subtítulo + CTA) con un formulario
 * de creación colapsable. Reutilizable por Super (agencias) y Agencia (negocios):
 * recibe la server action existente como prop y la ejecuta vía useActionState.
 */
export function CreateEntityForm({
  title,
  subtitle,
  cta,
  submitLabel,
  fields,
  action,
}: {
  title: string;
  subtitle: string;
  cta: string;
  submitLabel: string;
  fields: EntityField[];
  action: (prev: EntityFormState, formData: FormData) => Promise<EntityFormState>;
}) {
  const [state, formAction, isPending] = useActionState(action, initial);
  const [open, setOpen] = useState(false);
  const panelId = useId();

  // Al guardar con éxito: colapsar. Patrón oficial de React de "estado previo"
  // (set-state condicional durante el render): compara contra el último resultado
  // procesado. El panel se desmonta al cerrar, así que reabrirlo da un form limpio.
  const [seenState, setSeenState] = useState(state);
  if (seenState !== state) {
    setSeenState(state);
    if (state.ok && open) setOpen(false);
  }

  const fieldErrors = state.fieldErrors ?? {};

  return (
    <div className="mb-[18px]">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-title font-semibold tracking-tight text-ink">{title}</h2>
          <p className="mt-0.5 text-body text-ink-2">{subtitle}</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={panelId}
          className="h-[38px] rounded-control bg-accent px-[15px] text-body font-semibold text-white transition-colors hover:bg-accent-dark"
        >
          {open ? "Cerrar" : cta}
        </button>
      </div>

      {state.ok && state.message && (
        <div
          role="status"
          className="mt-3 rounded-control border border-green/30 bg-green-bg px-4 py-2.5 text-body font-medium text-green"
        >
          {state.message}
        </div>
      )}

      {open && (
        <Card padding="p-5" className="mt-3">
          <form action={formAction} className="grid gap-3 sm:max-w-md">
            {state.error && (
              <div
                role="alert"
                className="rounded-control border border-red/30 bg-red-bg px-3 py-2 text-meta font-medium text-red"
              >
                {state.error}
              </div>
            )}
            {fields.map((f) => {
              const err = fieldErrors[f.name];
              return (
                <label key={f.name} className="grid gap-1 text-meta font-medium text-ink-2">
                  {f.label}
                  <input
                    name={f.name}
                    type={f.type ?? "text"}
                    placeholder={f.placeholder}
                    autoComplete={f.autoComplete}
                    required
                    aria-invalid={Boolean(err)}
                    className={`h-[42px] rounded-control border bg-card px-3 text-body text-ink outline-none focus:shadow-[0_0_0_3px_var(--ac-bg)] ${
                      err ? "border-red" : "border-line"
                    }`}
                  />
                  {err && <span className="font-normal text-red">{err}</span>}
                </label>
              );
            })}
            <div className="mt-1 flex justify-end gap-[10px]">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={isPending}
                className="h-10 rounded-control border border-line bg-card px-4 text-body font-semibold text-ink-2 transition-colors hover:border-ink-3 disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="h-10 rounded-control bg-accent px-[18px] text-body font-semibold text-white transition-colors hover:bg-accent-dark disabled:opacity-70"
              >
                {isPending ? "Creando…" : submitLabel}
              </button>
            </div>
          </form>
        </Card>
      )}
      {/* Ancla para aria-controls (el panel se monta/desmonta). */}
      <span id={panelId} className="sr-only" />
    </div>
  );
}
