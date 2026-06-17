import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { aggregateMetrics, googlePct } from "@/lib/metrics";
import { resolveManageableBusiness } from "@/lib/business-access";
import { BusinessTabs } from "../_components/BusinessTabs";
import { SellersTable, type SellerRow } from "@/app/(panel)/business/sellers/_components/SellersTable";
import { NewSellerDialog } from "@/app/(panel)/business/sellers/_components/NewSellerDialog";

export default async function AgencySellersPage({
  params,
}: {
  params: Promise<{ businessId: string }>;
}) {
  const { businessId } = await params;
  const business = await resolveManageableBusiness(businessId).catch(() => null);
  if (!business) notFound();

  const sellers = await prisma.seller.findMany({
    where: { businessId },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      user: { select: { email: true } },
      reviews: { select: { starRating: true, outcome: true } },
    },
  });

  const rows: SellerRow[] = sellers.map((s) => {
    const m = aggregateMetrics(s.reviews);
    return {
      id: s.id,
      name: s.name,
      email: s.user?.email ?? null,
      reviews: m.total,
      avg: m.average,
      pct: googlePct(m),
    };
  });

  return (
    <div>
      <BusinessTabs businessId={businessId} businessName={business.name} active="sellers" />
      <div className="mb-4 flex items-center justify-between gap-4">
        <p className="text-meta text-ink-2">
          Cada uno tiene su propio link/QR para atribuir reseñas.
        </p>
        <NewSellerDialog businessId={businessId} />
      </div>
      <SellersTable rows={rows} />
    </div>
  );
}
