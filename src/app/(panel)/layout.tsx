import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getViewContext, type AppUser } from "@/lib/session";
import { RoleSwitcher } from "./_components/RoleSwitcher";
import { PanelNav } from "./_components/PanelNav";
import { Topbar } from "./_components/Topbar";
import { logout } from "./actions";

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

/** Nombre de la organización y enlace al flujo público, según el usuario efectivo. */
async function resolveOrg(u: AppUser): Promise<{ orgName: string; publicHref: string }> {
  switch (u.role) {
    case "SUPER_ADMIN": {
      const b = await prisma.business.findFirst({ orderBy: { createdAt: "asc" }, select: { slug: true } });
      return { orgName: "5stars HQ", publicHref: b ? `/r/${b.slug}` : "#" };
    }
    case "AGENCY_ADMIN": {
      const [agency, b] = await Promise.all([
        u.agencyId ? prisma.agency.findUnique({ where: { id: u.agencyId }, select: { name: true } }) : null,
        prisma.business.findFirst({ where: { agencyId: u.agencyId ?? "__none__" }, orderBy: { createdAt: "asc" }, select: { slug: true } }),
      ]);
      return { orgName: agency?.name ?? "Agencia", publicHref: b ? `/r/${b.slug}` : "#" };
    }
    case "BUSINESS_ADMIN": {
      const b = u.businessId
        ? await prisma.business.findUnique({ where: { id: u.businessId }, select: { name: true, slug: true } })
        : null;
      return { orgName: b?.name ?? "Negocio", publicHref: b ? `/r/${b.slug}` : "#" };
    }
    case "SELLER": {
      const s = await prisma.seller.findFirst({
        where: { userId: u.id },
        select: { name: true, slug: true, business: { select: { slug: true } } },
      });
      return {
        orgName: s?.name ?? "Vendedor",
        publicHref: s ? `/r/${s.business.slug}/${s.slug}` : "#",
      };
    }
  }
}

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const { real, effective } = await getViewContext();
  const { orgName, publicHref } = await resolveOrg(effective);
  const orgInitials = initials(orgName) || "5";
  const canSwitch = real.role === "SUPER_ADMIN";

  return (
    <div className="flex min-h-[calc(100vh/var(--panel-zoom))] bg-canvas text-ink [zoom:var(--panel-zoom)]">
      {/* Sidebar */}
      <aside className="sticky top-0 flex h-[calc(100vh/var(--panel-zoom))] w-[var(--sidebar-w)] shrink-0 flex-col border-r border-line bg-[#FCFCFD]">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-4 pb-3 pt-4">
          <span className="flex size-[30px] items-center justify-center rounded-[8px] bg-accent text-[16px] font-bold text-white">
            ★
          </span>
          <span className="text-[16.5px] font-semibold tracking-tight text-ink">5stars</span>
        </div>

        {/* Selector de rol */}
        <div className="px-3 pb-1">
          <RoleSwitcher orgName={orgName} orgInitials={orgInitials} role={effective.role} canSwitch={canSwitch} />
        </div>

        {/* Navegación */}
        <div className="flex-1 overflow-y-auto">
          <PanelNav role={effective.role} />
        </div>

        {/* Pie */}
        <div className="border-t border-line p-3">
          <Link
            href={publicHref}
            target="_blank"
            className="flex w-full items-center justify-center gap-2 rounded-control border border-dashed border-[#c9c9d4] bg-card px-2.5 py-2.5 text-meta font-semibold text-ink-2 transition-colors hover:border-accent hover:text-accent"
          >
            Ver flujo público ↗
          </Link>
          <form action={logout}>
            <button
              type="submit"
              className="mt-1.5 flex w-full items-center gap-2.5 rounded-control px-2.5 py-2 text-left text-[13px] text-ink-2 transition-colors hover:bg-accent-weak"
            >
              Cerrar sesión
            </button>
          </form>
        </div>
      </aside>

      {/* Área principal */}
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar role={effective.role} userInitials={orgInitials} />
        <main className="flex-1 overflow-auto">
          <div className="max-w-[1320px] px-6 py-[26px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
