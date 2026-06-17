import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { marketingBusinessWhere } from "@/lib/marketing/context";
import { resolveBrandKit } from "@/lib/marketing/brand-kit";
import { isTemplateKey } from "@/lib/marketing/templates";
import { renderPostPng } from "@/lib/marketing/render";
import type { PostFormat } from "@/lib/marketing/formats";

export const runtime = "nodejs";

/** GET /marketing/preview?businessId&templateKey&format&quote&rating&attribution */
export async function GET(req: Request): Promise<Response> {
  const user = await requireUser();
  if (user.role !== "BUSINESS_ADMIN" && user.role !== "AGENCY_ADMIN") {
    return new Response("Forbidden", { status: 403 });
  }
  const url = new URL(req.url);
  const q = url.searchParams;

  const business = await prisma.business.findFirst({
    where: marketingBusinessWhere(user, q.get("businessId") ?? undefined),
    select: { id: true, name: true, logoUrl: true },
  });
  if (!business) return new Response("Not found", { status: 404 });

  const templateKey = q.get("templateKey") ?? "elegante";
  if (!isTemplateKey(templateKey)) return new Response("Bad template", { status: 400 });

  const format = (q.get("format") === "STORY" ? "STORY" : "SQUARE") as PostFormat;
  const rating = Math.max(1, Math.min(5, Number(q.get("rating") ?? "5")));
  const quote = (q.get("quote") ?? "").slice(0, 280) || "Tu reseña aparecerá aquí.";
  const attribution = q.get("attribution") || null;

  const kit = await prisma.brandKit.findUnique({ where: { businessId: business.id } });
  const values = resolveBrandKit(kit, business.logoUrl);

  try {
    const png = await renderPostPng({
      templateKey,
      format,
      quote,
      rating,
      attribution,
      businessName: business.name,
      kit: values,
    });
    return new Response(Buffer.from(png), {
      headers: { "Content-Type": "image/png", "Cache-Control": "no-store" },
    });
  } catch {
    return new Response("Render error", { status: 500 });
  }
}
