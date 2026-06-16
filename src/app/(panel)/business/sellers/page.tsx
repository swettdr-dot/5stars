import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { createSeller } from "./actions";

export default async function SellersPage() {
  const user = await requireUser();
  if (user.role !== "BUSINESS_ADMIN" || !user.businessId) return <p>No autorizado.</p>;
  const business = await prisma.business.findUnique({
    where: { id: user.businessId },
    include: { sellers: { orderBy: { name: "asc" }, include: { user: true } } },
  });
  if (!business) return <p>Negocio no encontrado.</p>;
  return (
    <div className="space-y-8">
      <h1 className="text-xl font-bold">Vendedores</h1>
      <ul className="space-y-2">
        {business.sellers.map((s) => (
          <li key={s.id} className="rounded border p-3 text-sm">
            <span className="font-medium">{s.name}</span> — <code>/r/{business.slug}/{s.slug}</code>
            {s.user
              ? <span className="ml-2 text-xs text-green-600">login: {s.user.email}</span>
              : <span className="ml-2 text-xs text-gray-400">sin login</span>}
            {" — "}
            <a className="text-xs underline" href={`/business/sellers/qr/${s.id}`} target="_blank">descargar QR</a>
          </li>
        ))}
      </ul>
      <form action={createSeller} className="grid max-w-md gap-2">
        <input name="name" placeholder="Nombre vendedor" className="rounded border p-2" required />
        <input name="email" type="email" placeholder="Email login (opcional)" className="rounded border p-2" />
        <input name="password" type="password" placeholder="Contraseña login (opcional, mín 6)" className="rounded border p-2" />
        <button className="rounded bg-black p-2 text-white">Agregar</button>
      </form>
    </div>
  );
}
