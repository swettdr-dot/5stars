import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { createAgency } from "./actions";

export default async function SuperPage() {
  const user = await requireUser();
  if (user.role !== "SUPER_ADMIN") return <p>No autorizado.</p>;
  const agencies = await prisma.agency.findMany({
    include: { _count: { select: { businesses: true } } },
    orderBy: { createdAt: "desc" },
  });
  return (
    <div className="space-y-8">
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
