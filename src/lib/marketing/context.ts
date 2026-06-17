import { businessWhereForSession, type SessionUser } from "@/lib/tenancy";

/**
 * Prisma `where` para el negocio sobre el que opera Marketing. El filtro de
 * sesión se aplica DESPUÉS del id pedido, así un BUSINESS_ADMIN nunca puede
 * apuntar a otro negocio (su `{ id }` pisa el pedido), mientras que un
 * AGENCY_ADMIN sí elige entre los suyos (`{ agencyId }` + `{ id }`).
 */
export function marketingBusinessWhere(
  user: SessionUser,
  businessId?: string,
): Record<string, unknown> {
  return {
    ...(businessId ? { id: businessId } : {}),
    ...businessWhereForSession(user),
  };
}
