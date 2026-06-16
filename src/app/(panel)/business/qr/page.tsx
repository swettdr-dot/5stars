import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { qrDataUrl } from "@/lib/qr";
import { getBaseUrl } from "@/lib/base-url";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { CopyButton } from "./_components/CopyButton";

export default async function QrPage() {
  const user = await requireUser();
  if (user.role !== "BUSINESS_ADMIN" || !user.businessId) return <p>No autorizado.</p>;

  // Acotado al negocio de la sesión: businessId ES la frontera de tenant.
  const [business, reviewsGenerated] = await Promise.all([
    prisma.business.findUnique({
      where: { id: user.businessId },
      select: { slug: true, name: true },
    }),
    prisma.review.count({ where: { businessId: user.businessId } }),
  ]);
  if (!business) return <p>Negocio no encontrado.</p>;

  const base = await getBaseUrl();
  const publicLink = `${base}/r/${business.slug}`;
  const qr = await qrDataUrl(publicLink);

  return (
    <div>
      <PageHeader
        title="Mi QR / Enlace"
        subtitle="Comparte este enlace o QR con tus clientes para recolectar reseñas."
      />

      <div className="grid max-w-[760px] grid-cols-1 gap-grid md:grid-cols-[300px_1fr]">
        {/* QR */}
        <Card padding="p-[22px]" className="flex flex-col items-center gap-4">
          <div className="flex size-[200px] items-center justify-center rounded-[14px] border border-line bg-white p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr} alt={`Código QR del enlace de ${business.name}`} className="size-full" />
          </div>
          <a
            href={qr}
            download={`qr-${business.slug}.png`}
            className="flex h-[38px] w-full items-center justify-center rounded-control bg-accent text-[13px] font-semibold text-white transition-colors hover:bg-accent-dark"
          >
            Descargar QR
          </a>
        </Card>

        {/* Enlace + stats + CTA */}
        <div className="flex flex-col gap-grid">
          <Card>
            <div className="mb-2 text-meta font-semibold text-ink-2">Tu enlace público</div>
            <div className="flex gap-2">
              <input
                readOnly
                value={publicLink}
                aria-label="Enlace público del negocio"
                className="h-10 flex-1 truncate rounded-control border border-line bg-canvas px-3 font-mono text-meta text-ink-2 focus:outline-none"
              />
              <CopyButton value={publicLink} />
            </div>
          </Card>

          <Card>
            <div className="grid grid-cols-2 gap-grid">
              <div>
                <div className="text-[22px] font-semibold tracking-tight text-ink">—</div>
                <div className="mt-0.5 text-meta text-ink-3">Escaneos este mes</div>
              </div>
              <div>
                <div className="text-[22px] font-semibold tracking-tight text-ink">
                  {reviewsGenerated.toLocaleString("es")}
                </div>
                <div className="mt-0.5 text-meta text-ink-3">Reseñas generadas</div>
              </div>
            </div>
            {/* NEEDS-SHARED: tracking de escaneos de QR */}
          </Card>

          <a
            href={`/r/${business.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-[44px] items-center justify-center rounded-control border border-dashed border-[#c9c9d4] bg-card text-[13px] font-semibold text-ink-2 transition-colors hover:border-accent hover:text-accent"
          >
            Ver cómo lo experimenta el cliente ↗
          </a>
        </div>
      </div>
    </div>
  );
}
