import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { homePathForRole } from "@/lib/session";
import type { SessionUser } from "@/lib/tenancy";

/** El MVP no tiene landing pública: la raíz lleva al panel (o al login). */
export default async function Home() {
  const session = await auth();
  const role = (session?.user as { role?: SessionUser["role"] } | undefined)?.role;
  redirect(role ? homePathForRole(role) : "/login");
}
