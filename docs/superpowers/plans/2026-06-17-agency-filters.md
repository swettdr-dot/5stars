# Filtros del panel de agencia — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Añadir al resumen de la agencia un selector de negocio y un filtro de fechas (esta semana / este mes / personalizado) que acoten la analítica mostrada.

**Architecture:** Filtrado en el servidor vía query params (`?business=&range=&from=&to=`), siguiendo el patrón existente (`searchParams` + `RangeTabs`). Un helper puro `resolveDateRange` traduce los params a una ventana de fechas con semántica de calendario; un client component `BusinessFilterBar` navega cambiando los params; `agency/page.tsx` consulta Prisma acotado y agrega métricas por ventana.

**Tech Stack:** Next.js 16 (App Router, Server Components), React 19 client component, Prisma, Vitest. Sin dependencias nuevas.

Spec: `docs/superpowers/specs/2026-06-17-agency-filters-design.md`

---

## File Structure

- **Create** `src/lib/date-ranges.ts` — helper puro `resolveDateRange(input, now)` → ventana `{ range, start, end, prevStart, prevEnd, label }`.
- **Create** `src/lib/date-ranges.test.ts` — tests Vitest del helper.
- **Create** `src/app/(panel)/agency/_components/BusinessFilterBar.tsx` — client component: `<select>` de negocios + tabs de rango + inputs de fecha personalizada.
- **Modify** `src/app/(panel)/agency/page.tsx` — leer `searchParams`, acotar consultas, montar la barra, intercambiar KPI "Negocios"→"Vendedores".

---

## Task 1: Helper de rangos de fecha (`date-ranges.ts`)

**Files:**
- Create: `src/lib/date-ranges.ts`
- Test: `src/lib/date-ranges.test.ts`

- [ ] **Step 1: Write the failing test**

Crear `src/lib/date-ranges.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { resolveDateRange } from "./date-ranges";

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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/date-ranges.test.ts`
Expected: FAIL — "Failed to resolve import './date-ranges'" / `resolveDateRange is not a function`.

- [ ] **Step 3: Write minimal implementation**

Crear `src/lib/date-ranges.ts`:

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/date-ranges.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/date-ranges.ts src/lib/date-ranges.test.ts
git commit -m "feat: helper resolveDateRange para filtros de fecha (calendario)"
```

---

## Task 2: Client component `BusinessFilterBar`

**Files:**
- Create: `src/app/(panel)/agency/_components/BusinessFilterBar.tsx`

No lleva test unitario (UI de navegación; se valida en el render de la página y manualmente). Sigue el estilo visual de `src/components/ui/RangeTabs.tsx`.

- [ ] **Step 1: Create the component**

Crear `src/app/(panel)/agency/_components/BusinessFilterBar.tsx`:

```tsx
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
```

- [ ] **Step 2: Verify it typechecks / builds**

Run: `npm run lint`
Expected: sin errores en el archivo nuevo (puede haber warnings preexistentes ajenos).

- [ ] **Step 3: Commit**

```bash
git add src/app/(panel)/agency/_components/BusinessFilterBar.tsx
git commit -m "feat: BusinessFilterBar (selector de negocio + rango de fechas)"
```

---

## Task 3: Conectar filtros en `agency/page.tsx`

**Files:**
- Modify: `src/app/(panel)/agency/page.tsx` (reemplazo completo del archivo)

Cambios respecto al actual: lee `searchParams`; valida `business` contra los negocios de la agencia; resuelve la ventana con `resolveDateRange`; agrega métricas sobre las reseñas acotadas (negocio + ventana actual/previa); usa `BusinessFilterBar` en el header; intercambia el primer KPI a "Vendedores" cuando hay negocio; la tendencia respeta el negocio pero no la fecha.

- [ ] **Step 1: Replace the page with the filtered version**

Reemplazar **todo** el contenido de `src/app/(panel)/agency/page.tsx` por:

```tsx
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { aggregateMetrics, googlePct, inWindow, weeklyAverageTrend } from "@/lib/metrics";
import { resolveDateRange } from "@/lib/date-ranges";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { KpiCard } from "@/components/ui/KpiCard";
import { DistributionChart } from "@/components/charts/DistributionChart";
import { RatingDonut } from "@/components/charts/RatingDonut";
import { TrendChart } from "@/components/charts/TrendChart";
import { createBusiness } from "./actions";
import { BusinessFilterBar } from "./_components/BusinessFilterBar";
// Componentes compartidos entre Super y Agencia (viven en super/_components).
import { CreateEntityForm } from "../super/_components/CreateEntityForm";
import { EntityTable, type EntityRow } from "../super/_components/EntityTable";
import { dir, signed } from "../super/_components/kpi-format";

const DAY_MS = 86_400_000;

export default async function AgencyOverview({
  searchParams,
}: {
  searchParams: Promise<{ business?: string; range?: string; from?: string; to?: string }>;
}) {
  const user = await requireUser();
  if (user.role !== "AGENCY_ADMIN" || !user.agencyId) {
    return <p className="text-body text-ink-2">No autorizado.</p>;
  }
  const agencyId = user.agencyId;

  const now = new Date();
  const sp = await searchParams;
  const win = resolveDateRange(sp, now);
  const monthStart = new Date(now.getTime() - 30 * DAY_MS);

  const [agency, businesses, newBusinesses, reviews] = await Promise.all([
    prisma.agency.findUnique({ where: { id: agencyId }, select: { name: true } }),
    prisma.business.findMany({
      where: { agencyId },
      include: { _count: { select: { sellers: true, reviews: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.business.count({ where: { agencyId, createdAt: { gte: monthStart } } }),
    // Historial de la agencia para KPIs, distribución y tendencia. TODO: precalcular
    // agregados para grandes volúmenes.
    prisma.review.findMany({
      where: { business: { agencyId } },
      select: { starRating: true, outcome: true, createdAt: true, businessId: true },
    }),
  ]);

  // Valida el negocio seleccionado contra los de la agencia (si no pertenece, todos).
  const selected = businesses.find((b) => b.id === sp.business) ?? null;
  const businessId = selected?.id ?? null;

  // Reseñas acotadas al negocio seleccionado (o todas las de la agencia).
  const scoped = businessId ? reviews.filter((r) => r.businessId === businessId) : reviews;
  const scopedLikes = scoped.map((r) => ({
    starRating: r.starRating,
    outcome: r.outcome,
    createdAt: r.createdAt,
  }));

  const cur = aggregateMetrics(inWindow(scopedLikes, win.start, win.end));
  const prev = aggregateMetrics(inWindow(scopedLikes, win.prevStart, win.prevEnd));
  const gPct = googlePct(cur);
  const prevGPct = googlePct(prev);

  // Reseñas por negocio para el promedio de cada fila de la tabla (siempre todas).
  const byBusiness = new Map<string, { starRating: number; outcome: typeof reviews[number]["outcome"] }[]>();
  for (const r of reviews) {
    const arr = byBusiness.get(r.businessId);
    if (arr) arr.push({ starRating: r.starRating, outcome: r.outcome });
    else byBusiness.set(r.businessId, [{ starRating: r.starRating, outcome: r.outcome }]);
  }

  // Primer KPI: "Negocios" (todos) o "Vendedores" (negocio seleccionado).
  const firstKpi = selected
    ? {
        label: "Vendedores",
        icon: "users" as const,
        iconColor: "var(--ac)",
        value: selected._count.sellers.toLocaleString("es"),
        note: selected.name,
      }
    : {
        label: "Negocios",
        icon: "briefcase" as const,
        iconColor: "var(--ac)",
        value: businesses.length.toLocaleString("es"),
        delta: signed(newBusinesses),
        dir: dir(newBusinesses),
        note: "este mes",
      };

  const kpis = [
    firstKpi,
    {
      label: "Reseñas",
      icon: "chat" as const,
      iconColor: "var(--green)",
      value: cur.total.toLocaleString("es"),
      delta: signed(cur.total - prev.total),
      dir: dir(cur.total - prev.total),
      note: "vs. periodo ant.",
    },
    {
      label: "Promedio",
      icon: "star" as const,
      iconColor: "var(--amber)",
      value: cur.average.toFixed(1),
      unit: "/ 5",
      delta: signed(Math.round((cur.average - prev.average) * 10) / 10, 1),
      dir: dir(cur.average - prev.average),
      note: "vs. periodo ant.",
    },
    {
      label: "A Google",
      icon: "chart" as const,
      iconColor: "var(--green)",
      value: String(gPct),
      unit: "%",
      delta: signed(gPct - prevGPct, 0, "%"),
      dir: dir(gPct - prevGPct),
      note: "redirigidas",
    },
  ];

  const dist = [5, 4, 3, 2, 1].map((star) => {
    const count = cur.distribution[star as 1 | 2 | 3 | 4 | 5];
    return { star, count, pct: cur.total === 0 ? 0 : Math.round((count / cur.total) * 100) };
  });
  // La tendencia respeta el negocio seleccionado pero no el rango de fechas.
  const trend = weeklyAverageTrend(scopedLikes, now, 8);
  const trendDelta = Math.round((trend[trend.length - 1] - trend[0]) * 10) / 10;

  const rows: EntityRow[] = businesses.map((b) => {
    const m = aggregateMetrics(byBusiness.get(b.id) ?? []);
    return {
      id: b.id,
      name: b.name,
      sub: `/r/${b.slug}`,
      col2: b._count.sellers.toLocaleString("es"),
      reviews: m.total.toLocaleString("es"),
      avg: m.average,
      active: m.total > 0,
    };
  });

  const agencyName = agency?.name ?? "Tu agencia";
  const scopeLabel = selected ? selected.name : "todos los negocios";

  return (
    <div>
      <PageHeader
        title="Resumen de la agencia"
        subtitle={`${scopeLabel} · ${win.label}.`}
        actions={
          <BusinessFilterBar
            businesses={businesses.map((b) => ({ id: b.id, name: b.name }))}
            business={businessId}
            range={win.range}
            from={sp.from ?? ""}
            to={sp.to ?? ""}
          />
        }
      />

      <div className="mb-[14px] grid grid-cols-2 gap-grid sm:grid-cols-4">
        {kpis.map((k) => (
          <KpiCard key={k.label} {...k} />
        ))}
      </div>

      <div className="mb-[14px] grid grid-cols-1 gap-grid lg:grid-cols-[1.55fr_1fr]">
        <Card>
          <DistributionChart data={dist} />
        </Card>
        <Card className="flex flex-col">
          <div className="text-card-title font-semibold text-ink">Destino de las reseñas</div>
          <div className="mb-2 mt-0.5 text-[12px] text-ink-3">Redirigidas vs. capturadas</div>
          <div className="my-1.5 flex flex-1 items-center justify-center">
            <RatingDonut highPct={gPct} />
          </div>
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center gap-2.5 text-meta">
              <span className="size-2.5 rounded-[3px] bg-accent" />
              <span className="flex-1 text-ink-2">A Google (públicas)</span>
              <b className="text-ink">{cur.redirected.toLocaleString("es")}</b>
            </div>
            <div className="flex items-center gap-2.5 text-meta">
              <span className="size-2.5 rounded-[3px] bg-[#E3E3EA]" />
              <span className="flex-1 text-ink-2">Internas (privadas)</span>
              <b className="text-ink">{(cur.total - cur.redirected).toLocaleString("es")}</b>
            </div>
          </div>
        </Card>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-grid">
        <Card>
          <div className="text-card-title font-semibold text-ink">Tendencia del promedio</div>
          <div className="mb-1.5 mt-0.5 text-[12px] text-ink-3">
            Últimas 8 semanas · {scopeLabel}
          </div>
          <div className="my-1 mb-3 flex items-baseline gap-2">
            <span className="text-[26px] font-semibold tracking-tight text-ink">
              {trend[trend.length - 1].toFixed(1)}
            </span>
            <span className={`text-meta font-semibold ${trendDelta >= 0 ? "text-green" : "text-red"}`}>
              {signed(trendDelta, 1)}
            </span>
          </div>
          <TrendChart data={trend} />
        </Card>
      </div>

      <section>
        <CreateEntityForm
          title="Negocios"
          subtitle={`${agencyName} — ${businesses.length} ${businesses.length === 1 ? "negocio" : "negocios"}.`}
          cta="+ Nuevo negocio"
          submitLabel="Crear negocio"
          action={createBusiness}
          fields={[
            { name: "name", label: "Nombre del negocio", placeholder: "Café Aroma" },
            { name: "googleReviewUrl", label: "URL de reseña de Google", type: "url", placeholder: "https://g.page/tu-negocio/review" },
            { name: "adminEmail", label: "Email del admin", type: "email", placeholder: "admin@negocio.com", autoComplete: "off" },
            { name: "adminPassword", label: "Contraseña", type: "password", placeholder: "Mínimo 6 caracteres", autoComplete: "new-password" },
          ]}
        />
        <EntityTable
          col1Label="Negocio"
          col2Label="Vendedores"
          activeLabel="Activo"
          rows={rows}
          emptyHint="Aún no hay negocios. Crea el primero con “+ Nuevo negocio”."
        />
      </section>
    </div>
  );
}
```

Nota: el `emptyHint` se corrige a "Crea" (español neutro; el original tenía "Creá").

- [ ] **Step 2: Run the full test suite**

Run: `npm run test`
Expected: PASS (incluye los nuevos tests de `date-ranges`).

- [ ] **Step 3: Lint + build**

Run: `npm run lint`
Expected: sin errores nuevos.

Run: `npm run build`
Expected: build exitoso (la página de agencia compila como dinámica por usar `searchParams`).

- [ ] **Step 4: Manual smoke test**

Run: `npm run dev`, entrar como AGENCY_ADMIN (usar `npm run db:seed:demo` si hace falta) a `/agency` y verificar:
- El selector lista los negocios; al elegir uno, KPIs/distribución/donut/tendencia cambian y el primer KPI pasa a "Vendedores".
- Tabs "Esta semana"/"Este mes" cambian las métricas; "Personalizado" muestra los dos `input[type=date]` y al elegir fechas filtra.
- La tabla de negocios y el formulario "+ Nuevo negocio" siguen mostrando todo siempre.
- La URL refleja los filtros y recargar la página los conserva.

- [ ] **Step 5: Commit**

```bash
git add src/app/(panel)/agency/page.tsx
git commit -m "feat: filtros de negocio y fecha en el resumen de agencia"
```

---

## Self-Review (completado al escribir el plan)

- **Cobertura del spec:** selector de negocio (Task 2 + 3), rango calendario semana/mes/custom (Task 1), periodo previo de igual longitud (Task 1), defaults Todos+mes (Task 1 default + selector vacío), tendencia solo por negocio (Task 3), KPI Negocios→Vendedores (Task 3), validación servidor de business/range/custom (Task 1 + Task 3 `find`), tests de `date-ranges` (Task 1). Cubierto.
- **Placeholders:** ninguno; todo el código está completo.
- **Consistencia de tipos:** `RangePreset` y `ResolvedRange` definidos en Task 1 y usados igual en Tasks 2 y 3; `resolveDateRange(input, now)`, `inWindow(reviews, start, end)`, `aggregateMetrics`, `googlePct`, `signed`, `dir` coinciden con las firmas reales del repo (`metrics.ts`, `kpi-format`).
```
