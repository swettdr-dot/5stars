import { prisma } from "@/lib/prisma";

export async function loadReviewContext(businessSlug: string, sellerSlug?: string) {
  const business = await prisma.business.findUnique({
    where: { slug: businessSlug },
    include: { questions: { where: { active: true }, orderBy: { order: "asc" } } },
  });
  if (!business) return null;
  let sellerId: string | null = null;
  if (sellerSlug) {
    const seller = await prisma.seller.findFirst({
      where: { businessId: business.id, slug: sellerSlug },
    });
    sellerId = seller?.id ?? null;
  }
  return { business, sellerId };
}
