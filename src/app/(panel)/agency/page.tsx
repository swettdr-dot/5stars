import { Suspense } from "react";
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
    // "Negocios nuevos este mes": conteo fijo de 30 días (no sigue el filtro de rango).
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

  // Pestaña elegida por el usuario (estado de la UI). Difiere de `win.range`: al
  // elegir "Personalizado" sin fechas válidas, las métricas caen a "este mes"
  // (win.range="month") pero la barra debe seguir mostrando "Personalizado"
  // activo con los campos de fecha, para que el usuario pueda completarlas.
  const selectedRange =
    sp.range === "week" || sp.range === "custom" ? sp.range : "month";

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
          <Suspense fallback={<div className="h-[34px] w-[300px] animate-pulse rounded-[8px] bg-line" />}>
            <BusinessFilterBar
              businesses={businesses.map((b) => ({ id: b.id, name: b.name }))}
              business={businessId}
              range={selectedRange}
              from={sp.from ?? ""}
              to={sp.to ?? ""}
            />
          </Suspense>
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
          emptyHint="Aún no hay negocios. Crea el primero con &quot;+ Nuevo negocio&quot;."
        />
      </section>
    </div>
  );
}
