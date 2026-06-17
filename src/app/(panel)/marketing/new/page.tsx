import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { getMarketingContext } from "@/lib/marketing/page-context";
import { PostEditor } from "../_components/PostEditor";

export default async function NewPostPage({
  searchParams,
}: {
  searchParams: Promise<{ businessId?: string; reviewId?: string }>;
}) {
  const sp = await searchParams;
  const ctx = await getMarketingContext(sp.businessId);
  if (!ctx) return <p className="text-body text-ink-2">No autorizado.</p>;

  let quoteText = "";
  let starRating = 5;
  let attribution = "";
  let reviewId: string | null = null;

  if (sp.reviewId) {
    const review = await prisma.review.findFirst({
      where: { id: sp.reviewId, businessId: ctx.business.id },
      select: { id: true, comment: true, starRating: true, contactName: true },
    });
    if (review) {
      reviewId = review.id;
      quoteText = review.comment ?? "";
      starRating = review.starRating;
      attribution = review.contactName ? `— ${review.contactName}` : "";
    }
  }

  return (
    <div>
      <PageHeader title="Crear publicación" subtitle="Elegí plantilla, ajustá el texto y generá la imagen." />
      <PostEditor
        businessId={ctx.business.id}
        initial={{ reviewId, quoteText, starRating, attribution }}
      />
    </div>
  );
}
