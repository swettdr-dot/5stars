"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { signOut } from "@/lib/auth";
import { getRealUser, homePathForRole } from "@/lib/session";
import type { SessionUser } from "@/lib/tenancy";
import { VIEW_AS_COOKIE, encodeViewAs, type ViewAsIdentity } from "@/lib/view-as";

const cookieOpts = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  secure: process.env.NODE_ENV === "production",
};

/** "Ver panel como": impersonación de un rol. Sólo permitida a SUPER_ADMIN. */
export async function setViewAs(role: SessionUser["role"]): Promise<void> {
  const real = await getRealUser();
  if (real.role !== "SUPER_ADMIN") return; // ignorado silenciosamente

  const jar = await cookies();

  // Volver a ser uno mismo.
  if (role === "SUPER_ADMIN") {
    jar.delete(VIEW_AS_COOKIE);
    redirect("/super");
  }

  // Resolver una identidad representativa del rol (datos demo seedados).
  const u = await prisma.user.findFirst({
    where: { role },
    orderBy: { createdAt: "asc" },
    select: { id: true, agencyId: true, businessId: true },
  });

  if (u) {
    const identity: ViewAsIdentity = {
      id: u.id,
      role,
      agencyId: u.agencyId,
      businessId: u.businessId,
    };
    jar.set(VIEW_AS_COOKIE, encodeViewAs(identity), cookieOpts);
  }

  redirect(homePathForRole(role));
}

/** Cierra sesión y limpia cualquier impersonación activa. */
export async function logout(): Promise<void> {
  (await cookies()).delete(VIEW_AS_COOKIE);
  await signOut({ redirectTo: "/login" });
}
