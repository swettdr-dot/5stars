import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { manageableBusinessWhere } from "@/lib/tenancy";

/** Negocio gestionable resuelto y validado por tenancy. */
export type ManageableBusiness = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  googleReviewUrl: string;
  starThreshold: number;
};

/**
 * Resuelve y autoriza el negocio que la sesión puede EDITAR. Lanza FORBIDDEN si el
 * rol no gestiona configuración o si `businessId` cae fuera de su alcance. La
 * autorización nunca confía en el id recibido: se re-valida contra el rol.
 */
export async function resolveManageableBusiness(
  businessId: string,
): Promise<ManageableBusiness> {
  const user = await requireUser();
  const where = manageableBusinessWhere(user, businessId);
  if (!where) throw new Error("FORBIDDEN");
  const business = await prisma.business.findFirst({
    where,
    select: {
      id: true,
      name: true,
      slug: true,
      logoUrl: true,
      googleReviewUrl: true,
      starThreshold: true,
    },
  });
  if (!business) throw new Error("FORBIDDEN");
  return business;
}
