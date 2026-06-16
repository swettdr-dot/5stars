import type { ReviewOutcome } from "@prisma/client";

/** Badge de canal de la reseña: pública en Google (verde) vs. interna/privada (gris). */
export function ChannelBadge({
  outcome,
  variant = "short",
}: {
  outcome: ReviewOutcome;
  /** "short" → Google/Interno; "long" → Pública en Google/Capturada (privada). */
  variant?: "short" | "long";
}) {
  const isGoogle = outcome === "REDIRECTED_GOOGLE";
  const label = isGoogle
    ? variant === "long"
      ? "Pública en Google"
      : "Google"
    : variant === "long"
      ? "Capturada (privada)"
      : "Interno";
  // Google siempre verde. Internas: gris en listas compactas (short), rojo cuando
  // se nombran explícitamente como privadas (long).
  const tone = isGoogle
    ? "bg-green-bg text-green"
    : variant === "long"
      ? "bg-red-bg text-red"
      : "bg-canvas text-ink-2";
  return <span className={`rounded-pill px-2 py-[3px] text-label font-semibold ${tone}`}>{label}</span>;
}
