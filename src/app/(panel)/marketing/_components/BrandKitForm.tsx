"use client";

import { useActionState } from "react";
import { Card } from "@/components/ui/Card";
import { saveBrandKit, type BrandKitState } from "../actions";
import { FONT_OPTIONS, type BrandKitValues } from "@/lib/marketing/brand-kit";

const initial: BrandKitState = { ok: false };

const COLOR_FIELDS = [
  { name: "primary", label: "Color primario" },
  { name: "accent", label: "Color de acento" },
  { name: "background", label: "Fondo" },
  { name: "text", label: "Texto" },
] as const;

export function BrandKitForm({
  businessId,
  values,
}: {
  businessId: string;
  values: BrandKitValues;
}) {
  const [state, formAction, pending] = useActionState(saveBrandKit, initial);

  return (
    <form action={formAction} className="space-y-[14px]">
      <input type="hidden" name="businessId" value={businessId} />

      {state.ok && state.message && (
        <div role="status" className="rounded-control border border-green/30 bg-green-bg px-4 py-2.5 text-body font-medium text-green">
          {state.message}
        </div>
      )}
      {!state.ok && state.error && (
        <div role="alert" className="rounded-control border border-red/30 bg-red-bg px-4 py-2.5 text-body font-medium text-red">
          {state.error}
        </div>
      )}

      <Card padding="p-5">
        <div className="mb-3 text-card-title font-semibold text-ink">Colores</div>
        <div className="grid grid-cols-2 gap-4">
          {COLOR_FIELDS.map((f) => (
            <label key={f.name} className="flex items-center gap-3 text-meta text-ink-2">
              <input
                type="color"
                name={f.name}
                defaultValue={values[f.name]}
                className="h-10 w-14 cursor-pointer rounded border border-line bg-card"
              />
              {f.label}
            </label>
          ))}
        </div>
      </Card>

      <Card padding="p-5">
        <div className="mb-3 text-card-title font-semibold text-ink">Tipografías</div>
        <div className="grid grid-cols-2 gap-4">
          <label className="text-meta text-ink-2">
            Títulos
            <select name="headingFont" defaultValue={values.headingFont} className="mt-1 h-10 w-full rounded-control border border-line bg-card px-3 text-body text-ink">
              {FONT_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </label>
          <label className="text-meta text-ink-2">
            Cuerpo
            <select name="bodyFont" defaultValue={values.bodyFont} className="mt-1 h-10 w-full rounded-control border border-line bg-card px-3 text-body text-ink">
              {FONT_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </label>
        </div>
      </Card>

      <Card padding="p-5">
        <label className="mb-2 block text-card-title font-semibold text-ink">Tono de voz (opcional)</label>
        <p className="mb-2 text-meta text-ink-2">Lo usa el asistente de IA al pulir el texto de la reseña.</p>
        <textarea
          name="toneOfVoice"
          defaultValue={values.toneOfVoice ?? ""}
          rows={3}
          maxLength={280}
          placeholder="Ej: cercano, cálido, sin tecnicismos."
          className="w-full resize-none rounded-control border border-line bg-card p-3 text-body text-ink outline-none focus:border-accent"
        />
      </Card>

      <Card padding="p-5">
        <label className="mb-2 block text-card-title font-semibold text-ink">Logo (opcional)</label>
        <p className="mb-2 text-meta text-ink-2">Por defecto se usa el logo del negocio. Pega una URL para sobrescribirlo.</p>
        <input
          type="url"
          name="logoOverrideUrl"
          defaultValue={values.logoOverrideUrl ?? ""}
          placeholder="https://…"
          className="h-10 w-full rounded-control border border-line bg-card px-3 font-mono text-meta text-ink outline-none focus:border-accent"
        />
      </Card>

      <div className="flex justify-end pt-1">
        <button type="submit" disabled={pending} className="h-10 rounded-control bg-accent px-[18px] text-body font-semibold text-white transition-colors hover:bg-accent-dark disabled:opacity-70">
          {pending ? "Guardando…" : "Guardar kit"}
        </button>
      </div>
    </form>
  );
}
