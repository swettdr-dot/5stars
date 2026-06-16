import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { SettingsForm } from "./_components/SettingsForm";

export default async function SettingsPage() {
  const user = await requireUser();
  if (user.role !== "BUSINESS_ADMIN" || !user.businessId) {
    return <p className="text-body text-ink-2">No autorizado.</p>;
  }
  const business = await prisma.business.findUnique({ where: { id: user.businessId } });
  if (!business) {
    return <p className="text-body text-ink-2">Negocio no encontrado.</p>;
  }

  return (
    <div className="max-w-[680px]">
      <PageHeader
        title="Ajustes del negocio"
        subtitle="Configura el comportamiento del flujo de reseñas y la marca."
      />
      <SettingsForm
        defaults={{
          googleReviewUrl: business.googleReviewUrl,
          logoUrl: business.logoUrl ?? "",
          starThreshold: business.starThreshold,
        }}
      />
    </div>
  );
}
