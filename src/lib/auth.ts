import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  trustHost: true,
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(creds) {
        const email = String(creds?.email ?? "");
        const password = String(creds?.password ?? "");
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;
        if (!(await verifyPassword(password, user.passwordHash))) return null;
        return {
          id: user.id,
          email: user.email,
          role: user.role,
          agencyId: user.agencyId,
          businessId: user.businessId,
        };
      },
    }),
  ],
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
});
