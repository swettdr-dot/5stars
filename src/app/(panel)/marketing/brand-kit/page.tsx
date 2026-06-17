import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { getMarketingContext } from "@/lib/marketing/page-context";
import { resolveBrandKit } from "@/lib/marketing/brand-kit";
import { BrandKitForm } from "../_components/BrandKitForm";
import { BusinessSelector } from "../_components/BusinessSelector";

export default async function BrandKitPage({
  searchParams,
}: {
  searchParams: Promise<{ businessId?: string }>;
}) {
  const ctx = await getMarketingContext((await searchParams).businessId);
  if (!ctx) return <p className="text-body text-ink-2">No autorizado.</p>;

  const kit = await prisma.brandKit.findUnique({ where: { businessId: ctx.business.id } });
  const values = resolveBrandKit(kit, ctx.business.logoUrl);

  return (
    <div className="max-w-[680px]">
      <div className="mb-4 flex items-center justify-between gap-4">
        <PageHeader title="Kit de marca" subtitle="Identidad visual aplicada a tus publicaciones." />
        <BusinessSelector options={ctx.options} current={ctx.business.id} />
      </div>
      <BrandKitForm businessId={ctx.business.id} values={values} />
    </div>
  );
}
