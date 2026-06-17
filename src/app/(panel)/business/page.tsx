import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import {
  aggregateMetrics,
  googlePct,
  inWindow,
  weeklyAverageTrend,
} from "@/lib/metrics";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { KpiCard, type KpiDir } from "@/components/ui/KpiCard";
import { Avatar } from "@/components/ui/Avatar";
import { ChannelBadge } from "@/components/ui/Badge";
import { RangeTabs, rangeDays, normalizeRange } from "@/components/ui/RangeTabs";
import { DistributionChart } from "@/components/charts/DistributionChart";
import { RatingDonut } from "@/components/charts/RatingDonut";
import { TrendChart } from "@/components/charts/TrendChart";

const DAY_MS = 86_400_000;

function dir(delta: number): KpiDir {
  return delta > 0 ? "up" : delta < 0 ? "down" : "flat";
}
function signed(n: number, digits = 0, suffix = ""): string {
  return `${n > 0 ? "+" : ""}${n.toFixed(digits)}${suffix}`;
}

function relativeTime(date: Date, now: Date): string {
  const hours = (now.getTime() - date.getTime()) / 3_600_000;
  if (hours < 1) return "hace un momento";
  if (hours < 24) return `hace ${Math.floor(hours)}h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "ayer";
  if (days < 7) return `hace ${days} días`;
  return date.toLocaleDateString("es");
}

export default async function BusinessOverview({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const user = await requireUser();
  if (user.role !== "BUSINESS_ADMIN" || !user.businessId) return <p>No autorizado.</p>;

  const range = normalizeRange((await searchParams).range);
  const days = rangeDays(range);
  const now = new Date();
  const windowStart = new Date(now.getTime() - days * DAY_MS);
  const prevStart = new Date(now.getTime() - 2 * days * DAY_MS);

  const [business, allReviews, recent] = await Promise.all([
    prisma.business.findUnique({ where: { id: user.businessId }, select: { name: true } }),
    // Historial para ventanas, distribución y tendencia. TODO: para grandes
    // volúmenes, precalcular agregados en vez de traer todo.
    prisma.review.findMany({
      where: { businessId: user.businessId },
      select: { starRating: true, outcome: true, createdAt: true },
    }),
    prisma.review.findMany({
      where: { businessId: user.businessId },
      orderBy: { createdAt: "desc" },
      take: 4,
      select: {
        id: true,
        starRating: true,
        outcome: true,
        comment: true,
        createdAt: true,
        seller: { select: { name: true } },
      },
    }),
  ]);

  const cur = aggregateMetrics(inWindow(allReviews, windowStart));
  const prev = aggregateMetrics(inWindow(allReviews, prevStart, windowStart));
  const gPct = googlePct(cur);
  const iPct = cur.total === 0 ? 0 : 100 - gPct;
  const prevGPct = googlePct(prev);
  const prevIPct = prev.total === 0 ? 0 : 100 - prevGPct;

  const kpis = [
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
      label: "Reseñas",
      icon: "chat" as const,
      iconColor: "var(--ac)",
      value: cur.total.toLocaleString("es"),
      delta: signed(cur.total - prev.total),
      dir: dir(cur.total - prev.total),
      note: "este periodo",
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
    {
      label: "Internas",
      icon: "list" as const,
      iconColor: "var(--ink-3)",
      value: String(iPct),
      unit: "%",
      delta: signed(iPct - prevIPct, 0, "%"),
      dir: dir(iPct - prevIPct),
      note: "capturadas",
    },
  ];

  const dist = [5, 4, 3, 2, 1].map((star) => {
    const count = cur.distribution[star as 1 | 2 | 3 | 4 | 5];
    return { star, count, pct: cur.total === 0 ? 0 : Math.round((count / cur.total) * 100) };
  });

  const trend = weeklyAverageTrend(allReviews, now, 8);
  const trendDelta = Math.round((trend[trend.length - 1] - trend[0]) * 10) / 10;

  return (
    <div>
      <PageHeader
        title={`Resumen de ${business?.name ?? "tu negocio"}`}
        subtitle={`Cómo van tus reseñas en los últimos ${days} días.`}
        actions={<RangeTabs current={range} />}
      />

      {/* KPIs */}
      <div className="mb-[14px] grid grid-cols-2 gap-grid sm:grid-cols-4">
        {kpis.map((k) => (
          <KpiCard key={k.label} {...k} />
        ))}
      </div>

      {/* Distribución + Donut */}
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

      {/* Reseñas recientes + Tendencia */}
      <div className="grid grid-cols-1 gap-grid lg:grid-cols-[1.55fr_1fr]">
        <Card padding="p-0" className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-[18px] py-4">
            <div className="text-card-title font-semibold text-ink">Reseñas recientes</div>
            <Link
              href="/business/reviews"
              className="text-meta font-semibold text-accent hover:text-accent-dark"
            >
              Ver todo →
            </Link>
          </div>
          {recent.length === 0 && (
            <EmptyState
              icon="chat"
              title="Aún no hay reseñas"
              description="Comparte tu QR o enlace con tus clientes para empezar a recibir calificaciones."
              action={
                <Link
                  href="/business/qr"
                  className="rounded-control bg-accent px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-accent-dark"
                >
                  Ver mi QR / enlace
                </Link>
              }
            />
          )}
          {recent.map((r, i) => (
            <div
              key={r.id}
              className="flex items-center gap-3 border-b border-line px-[18px] py-[13px] last:border-b-0"
            >
              <Avatar name={r.seller?.name ?? "?"} index={i} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] text-ink">
                  {r.comment?.trim() || "Sin comentario."}
                </div>
                <div className="mt-px text-[11.5px] text-ink-3">
                  {r.seller?.name ?? "Sin vendedor"} · {relativeTime(r.createdAt, now)}
                </div>
              </div>
              <div className="whitespace-nowrap text-meta font-semibold text-amber">
                {r.starRating.toFixed(1)} ★
              </div>
              <ChannelBadge outcome={r.outcome} />
            </div>
          ))}
        </Card>

        <Card>
          <div className="text-card-title font-semibold text-ink">Tendencia del promedio</div>
          <div className="mb-1.5 mt-0.5 text-[12px] text-ink-3">Últimas 8 semanas</div>
          <div className="my-1 mb-3 flex items-baseline gap-2">
            <span className="text-[26px] font-semibold tracking-tight text-ink">
              {trend[trend.length - 1].toFixed(1)}
            </span>
            <span className={`text-meta font-semibold ${trendDelta >= 0 ? "text-green" : "text-red"}`}>
              {signed(trendDelta, 1)}
            </span>
          </div>
          <TrendChart data={trend} />
          <div className="mt-2 flex justify-between text-[11px] text-ink-3">
            <span>Hace 8 sem</span>
            <span>Hoy</span>
          </div>
        </Card>
      </div>
    </div>
  );
}
