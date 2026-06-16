import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { qrDataUrl } from "@/lib/qr";

export async function GET(_req: Request, { params }: { params: Promise<{ sellerId: string }> }) {
  const user = await requireUser();
  if (user.role !== "BUSINESS_ADMIN" || !user.businessId) return new Response("Forbidden", { status: 403 });
  const { sellerId } = await params;
  const seller = await prisma.seller.findFirst({
    where: { id: sellerId, businessId: user.businessId },
    include: { business: true },
  });
  if (!seller) return new Response("Not found", { status: 404 });
  const base = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const link = `${base}/r/${seller.business.slug}/${seller.slug}`;
  const dataUrl = await qrDataUrl(link);
  const b64 = dataUrl.split(",")[1];
  return new Response(Buffer.from(b64, "base64"), {
    headers: { "Content-Type": "image/png" },
  });
}
