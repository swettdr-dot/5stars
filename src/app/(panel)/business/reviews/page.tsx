import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { ChannelBadge } from "@/components/ui/Badge";
import { StarRating } from "@/components/ui/StarRating";
import { EmptyState } from "@/components/ui/EmptyState";

type FilterId = "all" | "google" | "internal" | "low";

const FILTERS: { id: FilterId; label: string }[] = [
  { id: "all", label: "Todas" },
  { id: "google", label: "A Google" },
  { id: "internal", label: "Internas" },
  { id: "low", label: "Bajas (<5)" },
];

function normalizeFilter(v: string | undefined): FilterId {
  return FILTERS.find((f) => f.id === v)?.id ?? "all";
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

export default async function BusinessReviews({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const user = await requireUser();
  if (user.role !== "BUSINESS_ADMIN" || !user.businessId) return <p>No autorizado.</p>;

  const filter = normalizeFilter((await searchParams).filter);
  const now = new Date();

  // TODO: paginar para volúmenes grandes.
  const all = await prisma.review.findMany({
    where: { businessId: user.businessId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      starRating: true,
      outcome: true,
      comment: true,
      contactName: true,
      contactEmail: true,
      contactPhone: true,
      createdAt: true,
      seller: { select: { name: true } },
    },
  });

  const counts: Record<FilterId, number> = {
    all: all.length,
    google: all.filter((r) => r.outcome === "REDIRECTED_GOOGLE").length,
    internal: all.filter((r) => r.outcome === "INTERNAL").length,
    low: all.filter((r) => r.starRating < 5).length,
  };

  const rows = all.filter((r) =>
    filter === "all"
      ? true
      : filter === "google"
        ? r.outcome === "REDIRECTED_GOOGLE"
        : filter === "internal"
          ? r.outcome === "INTERNAL"
          : r.starRating < 5,
  );

  return (
    <div>
      <PageHeader title="Reseñas" subtitle="Todas las calificaciones recibidas, públicas e internas." />

      {/* Filtros pill */}
      <div className="mb-[14px] flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active = f.id === filter;
          return (
            <Link
              key={f.id}
              href={f.id === "all" ? "?" : `?filter=${f.id}`}
              scroll={false}
              className={`flex h-[34px] items-center rounded-pill border px-[13px] text-meta transition-colors ${
                active
                  ? "border-accent bg-accent font-semibold text-white"
                  : "border-line bg-card font-medium text-ink-2 hover:border-[#dcdce3]"
              }`}
            >
              {f.label} ({counts[f.id]})
            </Link>
          );
        })}
      </div>

      {/* Lista */}
      <Card padding="p-0" className="overflow-hidden">
        {rows.length === 0 &&
          (counts.all === 0 ? (
            <EmptyState
              icon="chat"
              title="Aún no hay reseñas"
              description="Compartí tu QR o enlace con tus clientes para empezar a recibir calificaciones."
              action={
                <Link
                  href="/business/qr"
                  className="rounded-control bg-accent px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-accent-dark"
                >
                  Ver mi QR / enlace
                </Link>
              }
            />
          ) : (
            <EmptyState
              icon="search"
              title="Sin resultados"
              description="No hay reseñas que coincidan con este filtro."
              action={
                <Link
                  href="?"
                  className="rounded-control border border-line bg-card px-4 py-2 text-[13px] font-semibold text-ink-2 transition-colors hover:border-accent hover:text-accent"
                >
                  Ver todas
                </Link>
              }
            />
          ))}
        {rows.map((r, i) => {
          const contact = [r.contactName, r.contactEmail, r.contactPhone].filter(Boolean).join(" · ");
          const text =
            r.comment?.trim() ||
            (r.outcome === "REDIRECTED_GOOGLE" ? "Redirigida a Google." : "Sin comentario.");
          return (
            <div key={r.id} className="flex gap-3.5 border-b border-line px-[18px] py-[15px] last:border-b-0">
              <Avatar name={r.contactName ?? r.seller?.name ?? "Anónimo"} index={i} size={38} />
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-2.5">
                  <StarRating value={r.starRating} size={14} />
                  <ChannelBadge outcome={r.outcome} variant="long" />
                  <span className="text-[11.5px] text-ink-3">{relativeTime(r.createdAt, now)}</span>
                </div>
                <div className="text-body leading-relaxed text-ink">{text}</div>
                <div className="mt-1.5 text-[11.5px] text-ink-3">
                  Vendedor: {r.seller?.name ?? "Sin vendedor"}
                  {contact && ` · Contacto: ${contact}`}
                </div>
              </div>
            </div>
          );
        })}
      </Card>
    </div>
  );
}
