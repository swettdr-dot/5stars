import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { QuestionsBuilder } from "./_components/QuestionsBuilder";

export default async function QuestionsPage() {
  const user = await requireUser();
  if (user.role !== "BUSINESS_ADMIN" || !user.businessId) return <p>No autorizado.</p>;

  const business = await prisma.business.findUnique({
    where: { id: user.businessId },
    select: { name: true, slug: true, logoUrl: true, starThreshold: true },
  });
  if (!business) return <p>Negocio no encontrado.</p>;

  const questions = await prisma.question.findMany({
    where: { businessId: user.businessId },
    orderBy: { order: "asc" },
    select: { id: true, text: true, type: true, options: true, active: true, order: true },
  });

  return (
    <div>
      <PageHeader
        title="Constructor de preguntas"
        subtitle="Lo que ve el cliente antes de calificar. Se muestran en orden."
        actions={
          <Link
            href={`/r/${business.slug}`}
            target="_blank"
            className="flex h-[38px] items-center rounded-control border border-line bg-card px-[15px] text-[13px] font-semibold text-ink-2 transition-colors hover:border-accent hover:text-accent"
          >
            Previsualizar ↗
          </Link>
        }
      />
      <QuestionsBuilder
        business={business}
        questions={questions}
        businessId={user.businessId}
        canEdit={false}
      />
    </div>
  );
}
