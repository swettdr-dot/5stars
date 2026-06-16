import type { NextAuthConfig } from "next-auth";
import type { Role } from "@prisma/client";

/**
 * Config base compartida y **edge-safe** (no importa Prisma ni bcrypt). La usa el
 * middleware para leer la sesión JWT sin inflar el bundle del Edge. Los providers
 * reales (Credentials con Prisma) se agregan en `auth.ts`, que corre en Node.
 */
export const authConfig = {
  session: { strategy: "jwt" },
  trustHost: true,
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        const u = user as { role: Role; agencyId: string | null; businessId: string | null };
        token.role = u.role;
        token.agencyId = u.agencyId;
        token.businessId = u.businessId;
      }
      return token;
    },
    session({ session, token }) {
      const u = session.user as {
        role?: Role;
        agencyId?: string | null;
        businessId?: string | null;
        id?: string;
      };
      u.role = token.role as Role;
      u.agencyId = (token.agencyId ?? null) as string | null;
      u.businessId = (token.businessId ?? null) as string | null;
      u.id = token.sub;
      return session;
    },
  },
} satisfies NextAuthConfig;
