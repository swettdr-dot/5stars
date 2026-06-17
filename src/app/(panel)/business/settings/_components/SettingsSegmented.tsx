"use client";

/**
 * Segmented 1–5 para el umbral de estrellas. Primitivo local (no existe aún en
 * components/ui). Usa radios nativos (sr-only) para accesibilidad por teclado y
 * lector de pantalla; el estilo lo controla el estado seleccionado.
 */
export function SettingsSegmented({
  name,
  value,
  onChange,
  disabled = false,
}: {
  name: string;
  value: number;
  onChange: (next: number) => void;
  disabled?: boolean;
}) {
  return (
    <fieldset className="flex gap-2 border-0 p-0 m-0">
      <legend className="sr-only">Umbral de estrellas</legend>
      {[1, 2, 3, 4, 5].map((n) => {
        const selected = value === n;
        return (
          <label
            key={n}
            className={`flex h-12 flex-1 items-center justify-center gap-0.5 rounded-control border text-[16px] font-semibold transition-colors focus-within:shadow-[0_0_0_3px_var(--ac-bg)] ${
              disabled ? "cursor-default" : "cursor-pointer"
            } ${
              selected
                ? "border-accent bg-accent-bg text-accent"
                : `border-line bg-card text-ink-2 ${disabled ? "" : "hover:border-accent hover:text-accent"}`
            }`}
          >
            <input
              type="radio"
              name={name}
              value={n}
              checked={selected}
              disabled={disabled}
              onChange={() => onChange(n)}
              className="sr-only"
            />
            {n}
            <span className="text-[12px]" aria-hidden="true">
              ★
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}
