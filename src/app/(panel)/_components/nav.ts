import type { SessionUser } from "@/lib/tenancy";
import type { IconName } from "@/components/ui/icons";

export type NavItem = { href: string; label: string; icon: IconName };

type Role = SessionUser["role"];

/**
 * Navegación por rol. Sólo apunta a rutas que existen hoy (sin 404s);
 * etiquetas/iconos siguen el handoff. Ampliar a medida que se agreguen pantallas
 * (p. ej. Reseñas, Mi QR/Enlace para BUSINESS_ADMIN).
 */
export const NAV: Record<Role, NavItem[]> = {
  SUPER_ADMIN: [{ href: "/super", label: "Agencias", icon: "building" }],
  AGENCY_ADMIN: [
    { href: "/agency", label: "Negocios", icon: "briefcase" },
    { href: "/marketing", label: "Marketing", icon: "image" },
  ],
  BUSINESS_ADMIN: [
    { href: "/business", label: "Resumen", icon: "home" },
    { href: "/business/reviews", label: "Reseñas", icon: "chat" },
    { href: "/business/questions", label: "Preguntas", icon: "list" },
    { href: "/business/sellers", label: "Vendedores", icon: "users" },
    { href: "/business/qr", label: "Mi QR / Enlace", icon: "qr" },
    { href: "/marketing", label: "Marketing", icon: "image" },
    { href: "/business/settings", label: "Ajustes", icon: "gear" },
  ],
  SELLER: [{ href: "/seller", label: "Mi panel", icon: "chart" }],
};

export const ROLE_ORDER: Role[] = ["SUPER_ADMIN", "AGENCY_ADMIN", "BUSINESS_ADMIN", "SELLER"];

export const ROLE_META: Record<Role, { label: string; dot: string }> = {
  SUPER_ADMIN: { label: "Super admin", dot: "#4F46E5" },
  AGENCY_ADMIN: { label: "Agencia", dot: "#16A34A" },
  BUSINESS_ADMIN: { label: "Negocio", dot: "#D97706" },
  SELLER: { label: "Vendedor", dot: "#0891B2" },
};

/** Href del ítem de nav más específico que matchea el pathname (o null). */
export function activeHref(pathname: string, items: NavItem[]): string | null {
  let best: string | null = null;
  for (const it of items) {
    if (pathname === it.href || pathname.startsWith(it.href + "/")) {
      if (!best || it.href.length > best.length) best = it.href;
    }
  }
  return best;
}
