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
