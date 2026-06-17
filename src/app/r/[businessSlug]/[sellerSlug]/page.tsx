import { notFound } from "next/navigation";
import { loadReviewContext } from "@/app/r/_components/loader";
import { ReviewFlow } from "@/app/r/_components/ReviewFlow";

export default async function PublicReviewSeller({ params }: { params: Promise<{ businessSlug: string; sellerSlug: string }> }) {
  const { businessSlug, sellerSlug } = await params;
  const ctx = await loadReviewContext(businessSlug, sellerSlug);
  if (!ctx) notFound();
  const { business, sellerId } = ctx;
  return (
    <main className="flex h-dvh justify-center bg-canvas">
      <div className="flex h-full w-full max-w-[420px] flex-col bg-card">
        <ReviewFlow
          businessId={business.id}
          sellerId={sellerId}
          name={business.name}
          logoUrl={business.logoUrl}
          questions={business.questions}
          starThreshold={business.starThreshold}
        />
      </div>
    </main>
  );
}
