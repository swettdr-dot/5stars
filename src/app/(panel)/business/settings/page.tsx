import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { updateSettings } from "./actions";

export default async function SettingsPage() {
  const user = await requireUser();
  if (user.role !== "BUSINESS_ADMIN" || !user.businessId) return <p>No autorizado.</p>;
  const b = await prisma.business.findUnique({ where: { id: user.businessId } });
  if (!b) return <p>Negocio no encontrado.</p>;
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Configuración</h1>
      <form action={updateSettings} className="grid max-w-md gap-3">
        <label className="text-sm">URL reseña Google
          <input name="googleReviewUrl" defaultValue={b.googleReviewUrl} className="mt-1 w-full rounded border p-2" required />
        </label>
        <label className="text-sm">URL logo (opcional)
          <input name="logoUrl" defaultValue={b.logoUrl ?? ""} className="mt-1 w-full rounded border p-2" />
        </label>
        <label className="text-sm">Umbral de estrellas para redirigir
          <input name="starThreshold" type="number" min={1} max={5} defaultValue={b.starThreshold} className="mt-1 w-full rounded border p-2" required />
        </label>
        <button className="rounded bg-black p-2 text-white">Guardar</button>
      </form>
    </div>
  );
}
