import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { aggregateMetrics, googlePct } from "@/lib/metrics";
import { qrDataUrl } from "@/lib/qr";
import { getBaseUrl } from "@/lib/base-url";
import { sellerReviewLink } from "@/lib/public-links";
import { PageHeader } from "@/components/ui/PageHeader";
import { SellersTable, type SellerRow } from "./_components/SellersTable";

export default async function SellersPage() {
  const user = await requireUser();
  if (user.role !== "BUSINESS_ADMIN" || !user.businessId) return <p>No autorizado.</p>;

  // Acotado al negocio de la sesión: businessId ES la frontera de tenant del vendedor.
  const sellers = await prisma.seller.findMany({
    where: { businessId: user.businessId },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      business: { select: { slug: true } },
      user: { select: { email: true } },
      reviews: { select: { starRating: true, outcome: true } },
    },
  });

  const base = await getBaseUrl();
  const rows: SellerRow[] = await Promise.all(
    sellers.map(async (s) => {
      const m = aggregateMetrics(s.reviews);
      const link = sellerReviewLink(base, s.business.slug, s.slug);
      return {
        id: s.id,
        name: s.name,
        email: s.user?.email ?? null,
        reviews: m.total,
        avg: m.average,
        pct: googlePct(m),
        link,
        slug: s.slug,
        qr: await qrDataUrl(link),
      };
    }),
  );

  return (
    <div>
      <PageHeader
        title="Vendedores"
        subtitle="Cada uno tiene su propio link/QR para atribuir reseñas."
      />
      <SellersTable rows={rows} />
    </div>
  );
}
