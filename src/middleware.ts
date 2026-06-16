import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

// Middleware edge-safe: inicializa Auth.js solo con la config base (sin Prisma/bcrypt),
// así el bundle del Edge se mantiene chico. Solo lee la sesión JWT para proteger rutas.
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const isPanel = ["/super", "/agency", "/business", "/seller"].some((p) =>
    req.nextUrl.pathname.startsWith(p),
  );
  if (isPanel && !req.auth) {
    return Response.redirect(new URL("/login", req.nextUrl.origin));
  }
});

export const config = { matcher: ["/super/:path*", "/agency/:path*", "/business/:path*", "/seller/:path*"] };
