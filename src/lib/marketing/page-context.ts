import { prisma } from "@/lib/prisma";
import { requireUser, type AppUser } from "@/lib/session";
import { marketingBusinessWhere } from "@/lib/marketing/context";

export type MarketingContext = {
  user: AppUser;
  business: { id: string; name: string; logoUrl: string | null; slug: string };
  options: { id: string; name: string }[]; // negocios elegibles (agencia); 1 para negocio
};

/**
 * Resuelve el negocio activo de Marketing acotado por rol. Para AGENCY_ADMIN usa
 * `?businessId=` si pertenece a su agencia; si no, el primero. Devuelve `null`
 * si el usuario no puede operar marketing o no hay negocio.
 */
export async function getMarketingContext(
  requestedBusinessId?: string,
): Promise<MarketingContext | null> {
  const user = await requireUser();
  if (user.role !== "BUSINESS_ADMIN" && user.role !== "AGENCY_ADMIN") return null;

  const options =
    user.role === "AGENCY_ADMIN"
      ? await prisma.business.findMany({
          where: marketingBusinessWhere(user),
          orderBy: { createdAt: "asc" },
          select: { id: true, name: true },
        })
      : [];

  const business = await prisma.business.findFirst({
    where: marketingBusinessWhere(user, requestedBusinessId),
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, logoUrl: true, slug: true },
  });
  if (!business) return null;

  return { user, business, options };
}
