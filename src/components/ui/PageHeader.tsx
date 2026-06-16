import type { ReactNode } from "react";

/** Encabezado de página: título 22px + subtítulo, con acciones opcionales a la derecha. */
export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h2 className="text-title font-semibold tracking-tight text-ink">{title}</h2>
        {subtitle && <p className="mt-0.5 text-body text-ink-2">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
