import { requireUser, homePathForRole } from "@/lib/session";
import { signOut } from "@/lib/auth";

const NAV: Record<string, { href: string; label: string }[]> = {
  SUPER_ADMIN: [{ href: "/super", label: "Agencias" }],
  AGENCY_ADMIN: [{ href: "/agency", label: "Negocios" }],
  BUSINESS_ADMIN: [
    { href: "/business", label: "Panel" },
    { href: "/business/sellers", label: "Vendedores" },
    { href: "/business/questions", label: "Preguntas" },
    { href: "/business/settings", label: "Configuración" },
  ],
  SELLER: [{ href: "/seller", label: "Mi panel" }],
};

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const links = NAV[user.role] ?? [];
  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b p-4">
        <div className="flex items-center gap-4">
          <a href={homePathForRole(user.role)} className="font-bold">5stars</a>
          <nav className="flex gap-3 text-sm">
            {links.map((l) => (
              <a key={l.href} href={l.href} className="text-gray-600 hover:underline">{l.label}</a>
            ))}
          </nav>
        </div>
        <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }); }}>
          <button className="text-sm underline">Salir</button>
        </form>
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}
