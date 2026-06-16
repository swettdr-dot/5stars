import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import {
  aggregateMetrics,
  googlePct,
  inWindow,
  weeklyAverageTrend,
} from "@/lib/metrics";
import { qrDataUrl } from "@/lib/qr";
import { getBaseUrl } from "@/lib/base-url";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { KpiCard, type KpiDir } from "@/components/ui/KpiCard";
import { DistributionChart } from "@/components/charts/DistributionChart";
import { RatingDonut } from "@/components/charts/RatingDonut";
import { TrendChart } from "@/components/charts/TrendChart";
import { CopyButton } from "./_components/CopyButton";

const DAY_MS = 86_400_000;
const RANGE_DAYS = 30;

function dir(delta: number): KpiDir {
  return delta > 0 ? "up" : delta < 0 ? "down" : "flat";
}
function signed(n: number, digits = 0, suffix = ""): string {
  return `${n > 0 ? "+" : ""}${n.toFixed(digits)}${suffix}`;
}

export default async function SellerDashboard() {
  const user = await requireUser();
  if (user.role !== "SELLER") return <p>No autorizado.</p>;

  // Solo el vendedor logueado y SOLO sus reseñas (tenancy por userId).
  const seller = await prisma.seller.findFirst({
    where: { userId: user.id },
    select: {
      name: true,
      slug: true,
      business: { select: { slug: true } },
      reviews: { select: { starRating: true, outcome: true, createdAt: true } },
    },
  });
  if (!seller) return <p>Vendedor no encontrado.</p>;

  const base = await getBaseUrl();
  const link = `${base}/r/${seller.business.slug}/${seller.slug}`;
  const previewPath = `/r/${seller.business.slug}/${seller.slug}`;
  const qr = await qrDataUrl(link);

  const now = new Date();
  const windowStart = new Date(now.getTime() - RANGE_DAYS * DAY_MS);
  const prevStart = new Date(now.getTime() - 2 * RANGE_DAYS * DAY_MS);

  const cur = aggregateMetrics(inWindow(seller.reviews, windowStart));
  const prev = aggregateMetrics(inWindow(seller.reviews, prevStart, windowStart));
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
      note: "vs. mes ant.",
    },
    {
      label: "Reseñas",
      icon: "chat" as const,
      iconColor: "var(--ac)",
      value: cur.total.toLocaleString("es"),
      delta: signed(cur.total - prev.total),
      dir: dir(cur.total - prev.total),
      note: "este mes",
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

  const trend = weeklyAverageTrend(seller.reviews, now, 8);
  const trendDelta = Math.round((trend[trend.length - 1] - trend[0]) * 10) / 10;

  return (
    <div>
      <PageHeader
        title={`Hola, ${seller.name} 👋`}
        subtitle="Tu rendimiento de reseñas este mes."
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
          <div className="text-card-title font-semibold text-ink">Destino de tus reseñas</div>
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

      {/* Mi enlace + Tendencia */}
      <div className="grid grid-cols-1 gap-grid lg:grid-cols-[1.55fr_1fr]">
        <Card>
          <div className="text-card-title font-semibold text-ink">Mi enlace / QR</div>
          <div className="mb-3 mt-0.5 text-[12px] text-ink-3">
            Comparte tu enlace o QR para que tus reseñas te queden atribuidas.
          </div>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="flex shrink-0 flex-col items-center gap-3">
              <div className="flex size-[180px] items-center justify-center rounded-[14px] border border-line bg-white p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qr} alt="Código QR de tu enlace" className="size-full" />
              </div>
              <a
                href={qr}
                download={`qr-${seller.slug}.png`}
                className="flex h-[38px] w-[180px] items-center justify-center rounded-control bg-accent text-[13px] font-semibold text-white transition-colors hover:bg-accent-dark"
              >
                Descargar QR
              </a>
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-3">
              <div>
                <div className="mb-2 text-meta font-semibold text-ink-2">Tu enlace público</div>
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={link}
                    aria-label="Tu enlace público"
                    className="h-10 min-w-0 flex-1 truncate rounded-control border border-line bg-canvas px-3 font-mono text-meta text-ink-2 focus:outline-none"
                  />
                  <CopyButton value={link} />
                </div>
              </div>
              <a
                href={previewPath}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-[44px] items-center justify-center rounded-control border border-dashed border-[#c9c9d4] bg-card text-[13px] font-semibold text-ink-2 transition-colors hover:border-accent hover:text-accent"
              >
                Ver cómo lo experimenta el cliente ↗
              </a>
            </div>
          </div>
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
