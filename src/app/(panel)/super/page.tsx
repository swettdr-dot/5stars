import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { createAgency } from "./actions";

export default async function SuperPage() {
  const user = await requireUser();
  if (user.role !== "SUPER_ADMIN") return <p>No autorizado.</p>;
  const [agencies, agencyCount, businessCount, reviewCount] = await Promise.all([
    prisma.agency.findMany({
      include: { _count: { select: { businesses: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.agency.count(),
    prisma.business.count(),
    prisma.review.count(),
  ]);
  return (
    <div className="space-y-8">
      <section className="grid grid-cols-3 gap-4">
        <Stat label="Agencias" value={agencyCount} />
        <Stat label="Negocios" value={businessCount} />
        <Stat label="Reviews" value={reviewCount} />
      </section>
      <section>
        <h1 className="mb-4 text-xl font-bold">Agencias</h1>
        <ul className="space-y-2">
          {agencies.map((a) => (
            <li key={a.id} className="rounded border p-3">
              {a.name} — {a._count.businesses} negocios
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2 className="mb-2 font-semibold">Crear agencia</h2>
        <form action={createAgency} className="grid max-w-md gap-2">
          <input name="agencyName" placeholder="Nombre agencia" className="rounded border p-2" required />
          <input name="adminEmail" type="email" placeholder="Email admin" className="rounded border p-2" required />
          <input name="adminPassword" type="password" placeholder="Contraseña admin" className="rounded border p-2" required />
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
