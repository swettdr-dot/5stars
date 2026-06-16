import { auth } from "@/lib/auth";
import type { SessionUser } from "@/lib/tenancy";
import { readViewAs } from "@/lib/view-as";

export type AppUser = SessionUser & { id: string };

/** Identidad real de la sesión (JWT), sin impersonación. */
export async function getRealUser(): Promise<AppUser> {
  const session = await auth();
  if (!session?.user) throw new Error("UNAUTHENTICATED");
  const u = session.user as {
    id: string;
    role: AppUser["role"];
    agencyId?: string | null;
    businessId?: string | null;
  };
  return { id: u.id, role: u.role, agencyId: u.agencyId, businessId: u.businessId };
}

/**
 * Usuario efectivo: la identidad real con la impersonación "Ver panel como"
 * aplicada. Sólo se aplica si el rol real es SUPER_ADMIN, por lo que únicamente
 * puede ACOTAR lo que ve (nunca escalar). Páginas y actions deben usar esto.
 */
export async function requireUser(): Promise<AppUser> {
  const real = await getRealUser();
  if (real.role === "SUPER_ADMIN") {
    const viewAs = await readViewAs();
    if (viewAs) return viewAs;
  }
  return real;
}

/** Para el shell: identidad real + efectiva (tras impersonación). */
export async function getViewContext(): Promise<{ real: AppUser; effective: AppUser }> {
  const real = await getRealUser();
  if (real.role === "SUPER_ADMIN") {
    const viewAs = await readViewAs();
    if (viewAs) return { real, effective: viewAs };
  }
  return { real, effective: real };
}

export function homePathForRole(role: SessionUser["role"]): string {
  return {
    SUPER_ADMIN: "/super",
    AGENCY_ADMIN: "/agency",
    BUSINESS_ADMIN: "/business",
    SELLER: "/seller",
  }[role];
}
