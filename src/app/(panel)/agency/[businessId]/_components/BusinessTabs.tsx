import Link from "next/link";

type Tab = "questions" | "sellers" | "settings";

const TABS: { key: Tab; label: string }[] = [
  { key: "questions", label: "Preguntas" },
  { key: "sellers", label: "Vendedores" },
  { key: "settings", label: "Ajustes" },
];

/** Encabezado con nombre del negocio, volver y pestañas de gestión (agencia). */
export function BusinessTabs({
  businessId,
  businessName,
  active,
}: {
  businessId: string;
  businessName: string;
  active: Tab;
}) {
  return (
    <div className="mb-5">
      <Link
        href="/agency"
        className="text-meta font-semibold text-ink-3 transition-colors hover:text-accent"
      >
        ← Volver a negocios
      </Link>
      <h1 className="mt-2 text-[20px] font-semibold tracking-tight text-ink">{businessName}</h1>
      <nav className="mt-3 flex gap-1 border-b border-line">
        {TABS.map((t) => {
          const isActive = t.key === active;
          return (
            <Link
              key={t.key}
              href={`/agency/${businessId}/${t.key}`}
              className={`-mb-px border-b-2 px-3 py-2 text-[13px] font-semibold transition-colors ${
                isActive
                  ? "border-accent text-accent"
                  : "border-transparent text-ink-2 hover:text-ink"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
