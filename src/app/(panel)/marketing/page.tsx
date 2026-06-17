import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { getMarketingContext } from "@/lib/marketing/page-context";
import { Gallery } from "./_components/Gallery";
import { BusinessSelector } from "./_components/BusinessSelector";

export default async function MarketingGallery({
  searchParams,
}: {
  searchParams: Promise<{ businessId?: string }>;
}) {
  const ctx = await getMarketingContext((await searchParams).businessId);
  if (!ctx) return <p className="text-body text-ink-2">No autorizado.</p>;

  const items = await prisma.marketingPost.findMany({
    where: { businessId: ctx.business.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, quoteText: true, imageSquareUrl: true, imageStoryUrl: true },
  });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-4">
        <PageHeader title="Marketing" subtitle="Publicaciones generadas desde tus reseñas." />
        <div className="flex items-center gap-3">
          <BusinessSelector options={ctx.options} current={ctx.business.id} />
          <Link
            href={`/marketing/brand-kit?businessId=${ctx.business.id}`}
            className="h-10 rounded-control border border-line bg-card px-4 text-body font-semibold leading-10 text-ink-2 transition-colors hover:border-accent hover:text-accent"
          >
            Kit de marca
          </Link>
          <Link
            href={`/marketing/new?businessId=${ctx.business.id}`}
            className="h-10 rounded-control bg-accent px-4 text-body font-semibold leading-10 text-white transition-colors hover:bg-accent-dark"
          >
            Nueva publicación
          </Link>
        </div>
      </div>
      <Gallery items={items} businessId={ctx.business.id} />
    </div>
  );
}
