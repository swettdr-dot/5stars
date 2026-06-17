export type RangePreset = "week" | "month" | "custom";

export type ResolvedRange = {
  range: RangePreset;
  /** Inicio de la ventana (inclusive). */
  start: Date;
  /** Fin de la ventana (exclusivo). */
  end: Date;
  /** Inicio de la ventana previa de igual longitud (inclusive). */
  prevStart: Date;
  /** Fin de la ventana previa (exclusivo) = start. */
  prevEnd: Date;
  /** Texto para el subtítulo, p. ej. "esta semana". */
  label: string;
};

const DAY_MS = 86_400_000;

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Parsea "YYYY-MM-DD" a Date local a medianoche; null si es inválida. */
function parseISODate(s: string | undefined): Date | null {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  // Rechaza overflow (p. ej. 2026-02-31 → marzo).
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) {
    return null;
  }
  return date;
}

function withPrev(range: RangePreset, start: Date, end: Date, label: string): ResolvedRange {
  const len = end.getTime() - start.getTime();
  return {
    range,
    start,
    end,
    prevStart: new Date(start.getTime() - len),
    prevEnd: start,
    label,
  };
}

/**
 * Traduce los query params de filtro a una ventana de fechas con semántica de
 * calendario. Inicio de semana = lunes. Entradas inválidas caen a "este mes".
 */
export function resolveDateRange(
  input: { range?: string; from?: string; to?: string },
  now: Date,
): ResolvedRange {
  if (input.range === "custom") {
    const from = parseISODate(input.from);
    const to = parseISODate(input.to);
    if (from && to && from.getTime() <= to.getTime()) {
      // end exclusivo = inicio del día siguiente a `to` (incluye el día completo).
      const end = new Date(to.getFullYear(), to.getMonth(), to.getDate() + 1);
      return withPrev("custom", from, end, "rango personalizado");
    }
    // inválido → cae a month
  }

  if (input.range === "week") {
    const today = startOfDay(now);
    // getDay(): 0=domingo..6=sábado. Convertir a 0=lunes..6=domingo.
    const dow = (today.getDay() + 6) % 7;
    const start = new Date(today.getTime() - dow * DAY_MS);
    return withPrev("week", start, now, "esta semana");
  }

  // month (default)
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  return withPrev("month", start, now, "este mes");
}
