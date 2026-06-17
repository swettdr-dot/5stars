export type SessionUser = {
  role: "SUPER_ADMIN" | "AGENCY_ADMIN" | "BUSINESS_ADMIN" | "SELLER";
  agencyId?: string | null;
  businessId?: string | null;
};

/** Prisma `where` filter limiting Business rows to what the session may see. */
export function businessWhereForSession(u: SessionUser): Record<string, unknown> {
  switch (u.role) {
    case "SUPER_ADMIN":
      return {};
    case "AGENCY_ADMIN":
      return { agencyId: u.agencyId ?? "__none__" };
    case "BUSINESS_ADMIN":
    case "SELLER":
      return { id: u.businessId ?? "__none__" };
  }
}

/** Roles que pueden editar la configuración (preguntas/vendedores/ajustes) de un negocio. */
export function canManageBusinessConfig(role: SessionUser["role"]): boolean {
  return role === "SUPER_ADMIN" || role === "AGENCY_ADMIN";
}

/**
 * `where` para localizar un negocio que la sesión puede EDITAR, o `null` si su rol
 * no gestiona configuración. Combina el negocio pedido con el alcance del rol, así
 * una agencia solo alcanza negocios de su agencia (super, cualquiera).
 */
export function manageableBusinessWhere(
  u: SessionUser,
  businessId: string,
): Record<string, unknown> | null {
  if (!canManageBusinessConfig(u.role)) return null;
  return { id: businessId, ...businessWhereForSession(u) };
}
