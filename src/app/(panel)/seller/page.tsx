import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { aggregateMetrics } from "@/lib/metrics";
import { qrDataUrl } from "@/lib/qr";

export default async function SellerDashboard() {
  const user = await requireUser();
  if (user.role !== "SELLER") return <p>No autorizado.</p>;
  const seller = await prisma.seller.findFirst({
    where: { userId: user.id },
    include: { business: true, reviews: true },
  });
  if (!seller) return <p>Vendedor no encontrado.</p>;
  const base = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const link = `${base}/r/${seller.business.slug}/${seller.slug}`;
  const qr = await qrDataUrl(link);
  const m = aggregateMetrics(seller.reviews);
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Hola, {seller.name}</h1>
      <div className="grid grid-cols-3 gap-4">
        <Stat label="Reviews" value={m.total} />
        <Stat label="Promedio" value={m.average} />
        <Stat label="A Google" value={m.redirected} />
      </div>
      <div className="space-y-2">
        <p className="text-sm">Tu link: <a className="underline" href={link}>{link}</a></p>
        <img src={qr} alt="QR" className="h-48 w-48" />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded border p-4 text-center">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
}
