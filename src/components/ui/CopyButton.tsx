"use client";
import { useState } from "react";

/** Botón "Copiar" que copia un valor al portapapeles. */
export function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-live="polite"
      className="h-10 shrink-0 rounded-control border border-line bg-card px-[14px] text-meta font-semibold text-ink transition-colors hover:border-accent hover:text-accent"
    >
      {copied ? "¡Copiado!" : "Copiar"}
    </button>
  );
}
