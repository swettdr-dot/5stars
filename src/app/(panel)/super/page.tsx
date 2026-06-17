import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { aggregateMetrics, googlePct, inWindow, weeklyAverageTrend } from "@/lib/metrics";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { KpiCard } from "@/components/ui/KpiCard";
import { DistributionChart } from "@/components/charts/DistributionChart";
import { RatingDonut } from "@/components/charts/RatingDonut";
import { TrendChart } from "@/components/charts/TrendChart";
import { createAgency } from "./actions";
import { CreateEntityForm } from "./_components/CreateEntityForm";
import { EntityTable, type EntityRow } from "./_components/EntityTable";
import { dir, signed } from "./_components/kpi-format";

const DAY_MS = 86_400_000;

export default async function SuperOverview() {
  const user = await requireUser();
  if (user.role !== "SUPER_ADMIN") return <p className="text-body text-ink-2">No autorizado.</p>;

  const now = new Date();
  const monthStart = new Date(now.getTime() - 30 * DAY_MS);
  const prevStart = new Date(now.getTime() - 60 * DAY_MS);

  const [agencyCount, businessCount, newAgencies, newBusinesses, agencies, reviews] =
    await Promise.all([
      prisma.agency.count(),
      prisma.business.count(),
      prisma.agency.count({ where: { createdAt: { gte: monthStart } } }),
      prisma.business.count({ where: { createdAt: { gte: monthStart } } }),
      prisma.agency.findMany({
        include: { _count: { select: { businesses: true } } },
        orderBy: { createdAt: "desc" },
      }),
      // Historial completo para KPIs, distribución y tendencia. TODO: precalcular
      // agregados para grandes volúmenes en vez de traer todas las filas.
      prisma.review.findMany({
        select: { starRating: true, outcome: true, createdAt: true, business: { select: { agencyId: true } } },
      }),
    ]);

  const reviewLikes = reviews.map((r) => ({
    starRating: r.starRating,
    outcome: r.outcome,
    createdAt: r.createdAt,
  }));
  const all = aggregateMetrics(reviewLikes);
  const cur = aggregateMetrics(inWindow(reviewLikes, monthStart));
  const prev = aggregateMetrics(inWindow(reviewLikes, prevStart, monthStart));
  const gPct = googlePct(all);

  // Reseñas por agencia para la tabla de entidades.
  const byAgency = new Map<string, { starRating: number; outcome: typeof reviews[number]["outcome"] }[]>();
  for (const r of reviews) {
    const aid = r.business.agencyId;
    if (!aid) continue;
    const arr = byAgency.get(aid);
    if (arr) arr.push({ starRating: r.starRating, outcome: r.outcome });
    else byAgency.set(aid, [{ starRating: r.starRating, outcome: r.outcome }]);
  }

  const kpis = [
    {
      label: "Agencias",
      icon: "building" as const,
      iconColor: "#7C3AED",
      value: agencyCount.toLocaleString("es"),
      delta: signed(newAgencies),
      dir: dir(newAgencies),
      note: "este mes",
    },
    {
      label: "Negocios",
      icon: "briefcase" as const,
      iconColor: "var(--ac)",
      value: businessCount.toLocaleString("es"),
      delta: signed(newBusinesses),
      dir: dir(newBusinesses),
      note: "este mes",
    },
    {
      label: "Reseñas",
      icon: "chat" as const,
      iconColor: "var(--green)",
      value: all.total.toLocaleString("es"),
      delta: signed(cur.total),
      dir: dir(cur.total),
      note: "este mes",
    },
    {
      label: "Promedio",
      icon: "star" as const,
      iconColor: "var(--amber)",
      value: all.average.toFixed(1),
      unit: "/ 5",
      delta: signed(Math.round((cur.average - prev.average) * 10) / 10, 1),
      dir: dir(cur.average - prev.average),
      note: "global",
    },
  ];

  const dist = [5, 4, 3, 2, 1].map((star) => {
    const count = all.distribution[star as 1 | 2 | 3 | 4 | 5];
    return { star, count, pct: all.total === 0 ? 0 : Math.round((count / all.total) * 100) };
  });
  const trend = weeklyAverageTrend(reviewLikes, now, 8);
  const trendDelta = Math.round((trend[trend.length - 1] - trend[0]) * 10) / 10;

  const rows: EntityRow[] = agencies.map((a) => {
    const m = aggregateMetrics(byAgency.get(a.id) ?? []);
    return {
      id: a.id,
      name: a.name,
      sub: `Alta: ${a.createdAt.toLocaleDateString("es")}`,
      col2: a._count.businesses.toLocaleString("es"),
      reviews: m.total.toLocaleString("es"),
      avg: m.average,
      active: m.total > 0,
    };
  });

  return (
    <div>
      <PageHeader title="Resumen global" subtitle="Toda la plataforma 5stars." />

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
              <b className="text-ink">{all.redirected.toLocaleString("es")}</b>
            </div>
            <div className="flex items-center gap-2.5 text-meta">
              <span className="size-2.5 rounded-[3px] bg-[#E3E3EA]" />
              <span className="flex-1 text-ink-2">Internas (privadas)</span>
              <b className="text-ink">{(all.total - all.redirected).toLocaleString("es")}</b>
            </div>
          </div>
        </Card>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-grid">
        <Card>
          <div className="text-card-title font-semibold text-ink">Tendencia del promedio</div>
          <div className="mb-1.5 mt-0.5 text-[12px] text-ink-3">Últimas 8 semanas · plataforma completa</div>
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
          title="Agencias"
          subtitle={`${agencyCount.toLocaleString("es")} ${agencyCount === 1 ? "agencia" : "agencias"} en la plataforma.`}
          cta="+ Nueva agencia"
          submitLabel="Crear agencia"
          action={createAgency}
          fields={[
            { name: "agencyName", label: "Nombre de la agencia", placeholder: "Pulse Digital" },
            { name: "adminEmail", label: "Email del admin", type: "email", placeholder: "admin@agencia.com", autoComplete: "off" },
            { name: "adminPassword", label: "Contraseña", type: "password", placeholder: "Mínimo 6 caracteres", autoComplete: "new-password" },
          ]}
        />
        <EntityTable
          col1Label="Agencia"
          col2Label="Negocios"
          activeLabel="Activa"
          rows={rows}
          emptyHint="Aún no hay agencias. Crea la primera con “+ Nueva agencia”."
        />
      </section>
    </div>
  );
}
