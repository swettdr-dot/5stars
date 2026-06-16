import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { aggregateMetrics } from "@/lib/metrics";
import { createBusiness } from "./actions";

export default async function AgencyPage() {
  const user = await requireUser();
  if (user.role !== "AGENCY_ADMIN" || !user.agencyId) return <p>No autorizado.</p>;
  const businesses = await prisma.business.findMany({
    where: { agencyId: user.agencyId },
    include: { _count: { select: { reviews: true } } },
    orderBy: { createdAt: "desc" },
  });
  const reviews = await prisma.review.findMany({
    where: { business: { agencyId: user.agencyId } },
    select: { starRating: true, outcome: true },
  });
  const m = aggregateMetrics(reviews);
  return (
    <div className="space-y-8">
      <section className="grid grid-cols-3 gap-4">
        <Stat label="Reviews" value={m.total} />
        <Stat label="Promedio" value={m.average} />
        <Stat label="A Google" value={m.redirected} />
      </section>
      <section>
        <h1 className="mb-4 text-xl font-bold">Negocios</h1>
        <ul className="space-y-2">
          {businesses.map((b) => (
            <li key={b.id} className="rounded border p-3">
              {b.name} — {b._count.reviews} reviews — <code>/r/{b.slug}</code>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2 className="mb-2 font-semibold">Crear negocio</h2>
        <form action={createBusiness} className="grid max-w-md gap-2">
          <input name="name" placeholder="Nombre negocio" className="rounded border p-2" required />
          <input name="googleReviewUrl" type="url" placeholder="URL reseña Google" className="rounded border p-2" required />
          <input name="adminEmail" type="email" placeholder="Email admin negocio" className="rounded border p-2" required />
          <input name="adminPassword" type="password" placeholder="Contraseña" className="rounded border p-2" required />
          <button className="rounded bg-black p-2 text-white">Crear</button>
        </form>
      </section>
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
