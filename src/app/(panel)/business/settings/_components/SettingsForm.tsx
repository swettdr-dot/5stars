"use client";

import { useActionState, useState, type ChangeEvent } from "react";
import { Card } from "@/components/ui/Card";
import { updateSettings, type SettingsState } from "../actions";
import { SettingsSegmented } from "./SettingsSegmented";

const initialState: SettingsState = { ok: false };

/** Quita el esquema (http/https) para mostrar la URL tras el prefijo fijo. */
function stripScheme(url: string): string {
  return url.replace(/^https?:\/\//i, "");
}

export function SettingsForm({
  defaults,
  businessId,
  canEdit,
}: {
  defaults: { googleReviewUrl: string; logoUrl: string; starThreshold: number };
  businessId: string;
  canEdit: boolean;
}) {
  const [state, formAction, isPending] = useActionState(updateSettings, initialState);

  const [threshold, setThreshold] = useState(defaults.starThreshold);
  const [googleRest, setGoogleRest] = useState(stripScheme(defaults.googleReviewUrl));
  const [logoUrl, setLogoUrl] = useState(defaults.logoUrl);
  const [logoError, setLogoError] = useState<string | null>(null);

  function resetToDefaults() {
    setThreshold(defaults.starThreshold);
    setGoogleRest(stripScheme(defaults.googleReviewUrl));
    setLogoUrl(defaults.logoUrl);
    setLogoError(null);
  }

  function onPickFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // permite volver a elegir el mismo archivo
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setLogoError("El archivo debe ser una imagen.");
      return;
    }
    if (file.size > 200 * 1024) {
      setLogoError("La imagen supera los 200 KB.");
      return;
    }
    setLogoError(null);
    const reader = new FileReader();
    reader.onload = () => setLogoUrl(String(reader.result));
    reader.readAsDataURL(file);
  }

  const fieldErrors = state.fieldErrors ?? {};
  // Reconstruye la URL completa: si pegaron el esquema lo respetamos, si no, https://.
  const fullGoogleUrl = /^https?:\/\//i.test(googleRest)
    ? googleRest
    : `https://${googleRest}`;

  return (
    <form action={formAction} className="space-y-[14px]">
      <input type="hidden" name="businessId" value={businessId} />
      {/* Banner de resultado */}
      {state.ok && state.message && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-control border border-green/30 bg-green-bg px-4 py-2.5 text-body font-medium text-green"
        >
          <CheckIcon />
          {state.message}
        </div>
      )}
      {!state.ok && state.error && (
        <div
          role="alert"
          className="rounded-control border border-red/30 bg-red-bg px-4 py-2.5 text-body font-medium text-red"
        >
          {state.error}
        </div>
      )}

      {/* Umbral de estrellas */}
      <Card padding="p-5">
        <div className="text-card-title font-semibold text-ink">Umbral de estrellas</div>
        <p className="mb-[14px] mt-[3px] text-meta text-ink-2">
          Calificaciones de <b className="font-semibold text-ink">{threshold}★ o más</b> se
          redirigen a Google. Menores se capturan en privado.
        </p>
        <SettingsSegmented name="starThreshold" value={threshold} onChange={canEdit ? setThreshold : () => {}} />
        {fieldErrors.starThreshold && (
          <p className="mt-2 text-meta text-red">{fieldErrors.starThreshold}</p>
        )}
      </Card>

      {/* URL de Google */}
      <Card padding="p-5">
        <label
          htmlFor="googleReviewUrlInput"
          className="mb-[14px] block text-card-title font-semibold text-ink"
        >
          URL de tu ficha de Google
        </label>
        <div
          className={`flex h-[42px] items-center overflow-hidden rounded-control border bg-card focus-within:shadow-[0_0_0_3px_var(--ac-bg)] ${
            fieldErrors.googleReviewUrl ? "border-red" : "border-line"
          }`}
        >
          <span className="flex h-full items-center border-r border-line bg-canvas px-3 font-mono text-[13px] text-ink-3">
            https://
          </span>
          <input
            id="googleReviewUrlInput"
            type="text"
            inputMode="url"
            value={googleRest}
            onChange={(e) => setGoogleRest(stripScheme(e.target.value))}
            placeholder="g.page/tu-negocio/review"
            disabled={!canEdit}
            aria-invalid={Boolean(fieldErrors.googleReviewUrl)}
            aria-describedby="googleReviewUrlHelp"
            className="h-full flex-1 border-none bg-transparent px-3 font-mono text-body text-ink outline-none"
          />
        </div>
        {/* La acción valida y persiste la URL completa. */}
        <input type="hidden" name="googleReviewUrl" value={fullGoogleUrl} />
        <p id="googleReviewUrlHelp" className="mt-[9px] text-[12px] text-ink-3">
          {fieldErrors.googleReviewUrl ??
            "Aquí se envía al cliente cuando deja una calificación alta."}
        </p>
      </Card>

      {/* Logo del negocio */}
      <Card padding="p-5">
        <div className="text-card-title font-semibold text-ink">Logo del negocio</div>
        <p className="mb-[14px] mt-[3px] text-meta text-ink-2">
          Se muestra en el flujo público. El resto del diseño se mantiene neutral.
        </p>
        <div className="flex items-center gap-4">
          <LogoSlot url={logoUrl} />
          <div className="flex flex-col gap-2">
            <label className="inline-flex h-[38px] w-fit cursor-pointer items-center rounded-control border border-line bg-card px-[15px] text-body font-semibold text-ink-2 transition-colors hover:border-accent hover:text-accent">
              Subir logo
              <input type="file" accept="image/*" onChange={onPickFile} disabled={!canEdit} className="hidden" />
            </label>
            {logoUrl.startsWith("data:") ? (
              <button
                type="button"
                onClick={() => {
                  setLogoUrl("");
                  setLogoError(null);
                }}
                className="w-fit text-meta text-ink-3 underline-offset-2 hover:underline"
              >
                Imagen subida ✓ — quitar
              </button>
            ) : (
              <input
                type="url"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="o pega una URL (https://…)"
                disabled={!canEdit}
                aria-label="URL del logo"
                aria-invalid={Boolean(fieldErrors.logoUrl)}
                className={`h-[38px] w-[280px] max-w-full rounded-control border bg-card px-3 font-mono text-meta text-ink outline-none focus:shadow-[0_0_0_3px_var(--ac-bg)] ${
                  fieldErrors.logoUrl ? "border-red" : "border-line"
                }`}
              />
            )}
            <p className="text-[12px] text-ink-3">PNG o JPG, hasta 200 KB.</p>
          </div>
        </div>
        {/* La acción persiste el valor (data URL de la imagen subida o la URL pegada). */}
        <input type="hidden" name="logoUrl" value={logoUrl} />
        {(logoError || fieldErrors.logoUrl) && (
          <p className="mt-2 text-meta text-red">{logoError ?? fieldErrors.logoUrl}</p>
        )}
      </Card>

      {/* Footer */}
      {canEdit && (
      <div className="flex justify-end gap-[10px] pt-1">
        <button
          type="button"
          onClick={resetToDefaults}
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
          {isPending ? "Guardando…" : "Guardar cambios"}
        </button>
      </div>
      )}
    </form>
  );
}

function LogoSlot({ url }: { url: string }) {
  const valid = /^(https?:\/\/|data:image\/)/i.test(url.trim());
  if (valid) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt="Logo del negocio"
        className="h-16 w-16 shrink-0 rounded-[14px] border border-line object-cover"
      />
    );
  }
  return (
    <div
      className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[14px] border border-line text-center font-mono text-[9px] leading-tight text-ink-3"
      style={{
        background: "repeating-linear-gradient(135deg,#F2F2F6 0 8px,#fff 8px 16px)",
      }}
      aria-hidden="true"
    >
      logo
      <br />
      64×64
    </div>
  );
}

function CheckIcon() {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
