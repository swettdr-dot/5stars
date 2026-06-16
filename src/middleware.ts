import { auth } from "@/lib/auth";

export default auth((req) => {
  const isPanel = ["/super", "/agency", "/business", "/seller"].some((p) =>
    req.nextUrl.pathname.startsWith(p),
  );
  if (isPanel && !req.auth) {
    const url = new URL("/login", req.nextUrl.origin);
    return Response.redirect(url);
  }
});

export const config = { matcher: ["/super/:path*", "/agency/:path*", "/business/:path*", "/seller/:path*"] };
