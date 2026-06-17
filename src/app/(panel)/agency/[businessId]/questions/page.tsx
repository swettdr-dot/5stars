import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { resolveManageableBusiness } from "@/lib/business-access";
import { BusinessTabs } from "../_components/BusinessTabs";
import { QuestionsBuilder } from "@/app/(panel)/business/questions/_components/QuestionsBuilder";

export default async function AgencyQuestionsPage({
  params,
}: {
  params: Promise<{ businessId: string }>;
}) {
  const { businessId } = await params;
  const business = await resolveManageableBusiness(businessId).catch(() => null);
  if (!business) notFound();

  const questions = await prisma.question.findMany({
    where: { businessId },
    orderBy: { order: "asc" },
    select: { id: true, text: true, type: true, options: true, active: true, order: true },
  });

  return (
    <div>
      <BusinessTabs businessId={businessId} businessName={business.name} active="questions" />
      <div className="mb-4 flex items-center justify-between gap-4">
        <p className="text-meta text-ink-2">
          Lo que ve el cliente antes de calificar. Se muestran en orden.
        </p>
        <Link
          href={`/r/${business.slug}`}
          target="_blank"
          className="flex h-[38px] items-center rounded-control border border-line bg-card px-[15px] text-[13px] font-semibold text-ink-2 transition-colors hover:border-accent hover:text-accent"
        >
          Previsualizar ↗
        </Link>
      </div>
      <QuestionsBuilder
        business={{
          name: business.name,
          slug: business.slug,
          logoUrl: business.logoUrl,
          starThreshold: business.starThreshold,
        }}
        questions={questions}
        businessId={businessId}
        canEdit
      />
    </div>
  );
}
