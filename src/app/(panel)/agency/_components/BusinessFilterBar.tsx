"use client";
import { useRouter, useSearchParams } from "next/navigation";
import type { RangePreset } from "@/lib/date-ranges";

const RANGE_TABS: { id: RangePreset; label: string }[] = [
  { id: "week", label: "Esta semana" },
  { id: "month", label: "Este mes" },
  { id: "custom", label: "Personalizado" },
];

/**
 * Barra de filtros del resumen de agencia: selector de negocio + rango de fechas.
 * Navega cambiando los query params (?business=&range=&from=&to=), preservando
 * el resto. La página (Server Component) re-consulta con los nuevos params.
 */
export function BusinessFilterBar({
  businesses,
  business,
  range,
  from,
  to,
}: {
  businesses: { id: string; name: string }[];
  business: string | null;
  range: RangePreset;
  from: string;
  to: string;
}) {
  const router = useRouter();
  const params = useSearchParams();

  function navigate(updates: Record<string, string | null>) {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v === null || v === "") next.delete(k);
      else next.set(k, v);
    }
    const qs = next.toString();
    router.push(qs ? `?${qs}` : "?", { scroll: false });
  }

  const inputCls =
    "h-[34px] rounded-[8px] border border-line bg-card px-[10px] text-meta text-ink";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={business ?? ""}
        onChange={(e) => navigate({ business: e.target.value || null })}
        className={`${inputCls} font-medium`}
        aria-label="Filtrar por negocio"
      >
        <option value="">Todos los negocios</option>
        {businesses.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
          </option>
        ))}
      </select>

      <div className="flex items-center gap-2">
        {RANGE_TABS.map((t) => {
          const active = t.id === range;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() =>
                navigate(t.id === "custom" ? { range: "custom" } : { range: t.id, from: null, to: null })
              }
              className={`flex h-[34px] items-center rounded-[8px] border px-[13px] text-meta transition-colors ${
                active
                  ? "border-line bg-card font-semibold text-ink"
                  : "border-transparent font-medium text-ink-2 hover:bg-accent-weak"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {range === "custom" && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={from}
            max={to || undefined}
            onChange={(e) => navigate({ range: "custom", from: e.target.value || null })}
            className={inputCls}
            aria-label="Desde"
          />
          <span className="text-meta text-ink-3">→</span>
          <input
            type="date"
            value={to}
            min={from || undefined}
            onChange={(e) => navigate({ range: "custom", to: e.target.value || null })}
            className={inputCls}
            aria-label="Hasta"
          />
        </div>
      )}
    </div>
  );
}
