import { describe, it, expect } from "vitest";
import { resolveDateRange } from "@/lib/date-ranges";

// Jueves 2026-06-18 10:00 local.
const now = new Date(2026, 5, 18, 10, 0, 0);

describe("resolveDateRange", () => {
  it("week: inicia el lunes 00:00 de la semana de now", () => {
    const r = resolveDateRange({ range: "week" }, now);
    expect(r.range).toBe("week");
    // Lunes 2026-06-15 00:00.
    expect(r.start).toEqual(new Date(2026, 5, 15, 0, 0, 0));
    expect(r.end).toEqual(now);
    expect(r.label).toBe("esta semana");
  });

  it("month: inicia el día 1 00:00 del mes de now", () => {
    const r = resolveDateRange({ range: "month" }, now);
    expect(r.range).toBe("month");
    expect(r.start).toEqual(new Date(2026, 5, 1, 0, 0, 0));
    expect(r.end).toEqual(now);
  });

  it("default (range ausente o inválido) cae a month", () => {
    expect(resolveDateRange({}, now).range).toBe("month");
    expect(resolveDateRange({ range: "zzz" }, now).range).toBe("month");
  });

  it("ventana previa es contigua y de igual longitud", () => {
    const r = resolveDateRange({ range: "month" }, now);
    expect(r.prevEnd).toEqual(r.start);
    const len = r.end.getTime() - r.start.getTime();
    expect(r.start.getTime() - r.prevStart.getTime()).toBe(len);
  });

  it("custom válido incluye el día 'to' completo (end = inicio del día siguiente)", () => {
    const r = resolveDateRange({ range: "custom", from: "2026-06-01", to: "2026-06-10" }, now);
    expect(r.range).toBe("custom");
    expect(r.start).toEqual(new Date(2026, 5, 1, 0, 0, 0));
    expect(r.end).toEqual(new Date(2026, 5, 11, 0, 0, 0));
  });

  it("custom inválido (from > to) cae a month", () => {
    expect(resolveDateRange({ range: "custom", from: "2026-06-10", to: "2026-06-01" }, now).range).toBe("month");
  });

  it("custom con fecha mal formada cae a month", () => {
    expect(resolveDateRange({ range: "custom", from: "2026-02-31", to: "2026-03-05" }, now).range).toBe("month");
    expect(resolveDateRange({ range: "custom", from: "", to: "" }, now).range).toBe("month");
  });
});
