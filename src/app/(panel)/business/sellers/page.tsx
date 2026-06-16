import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { aggregateMetrics, googlePct } from "@/lib/metrics";
import { PageHeader } from "@/components/ui/PageHeader";
import { SellersTable, type SellerRow } from "./_components/SellersTable";
import { NewSellerDialog } from "./_components/NewSellerDialog";

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
      <PageHeader
        title="Vendedores"
        subtitle="Cada uno tiene su propio link/QR para atribuir reseñas."
        actions={<NewSellerDialog />}
      />
      <SellersTable rows={rows} />
    </div>
  );
}
