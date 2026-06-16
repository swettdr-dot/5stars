import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { createSeller } from "./actions";

export default async function SellersPage() {
  const user = await requireUser();
  if (user.role !== "BUSINESS_ADMIN" || !user.businessId) return <p>No autorizado.</p>;
  const business = await prisma.business.findUnique({
    where: { id: user.businessId },
    include: { sellers: { orderBy: { name: "asc" } } },
  });
  if (!business) return <p>Negocio no encontrado.</p>;
  return (
    <div className="space-y-8">
      <h1 className="text-xl font-bold">Vendedores</h1>
      <ul className="space-y-2">
        {business.sellers.map((s) => (
          <li key={s.id} className="rounded border p-3">
            {s.name} — <code>/r/{business.slug}/{s.slug}</code>
          </li>
        ))}
      </ul>
      <form action={createSeller} className="grid max-w-md gap-2">
        <input name="name" placeholder="Nombre vendedor" className="rounded border p-2" required />
        <button className="rounded bg-black p-2 text-white">Agregar</button>
      </form>
    </div>
  );
}
