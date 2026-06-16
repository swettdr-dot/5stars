import { auth } from "@/lib/auth";
import type { SessionUser } from "@/lib/tenancy";

export async function requireUser(): Promise<SessionUser & { id: string }> {
  const session = await auth();
  if (!session?.user) throw new Error("UNAUTHENTICATED");
  const u = session.user as any;
  return { id: u.id, role: u.role, agencyId: u.agencyId, businessId: u.businessId };
}

export function homePathForRole(role: SessionUser["role"]): string {
  return {
    SUPER_ADMIN: "/super",
    AGENCY_ADMIN: "/agency",
    BUSINESS_ADMIN: "/business",
    SELLER: "/seller",
  }[role];
}
