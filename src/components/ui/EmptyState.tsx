import type { ReactNode } from "react";
import { Icon, type IconName } from "./icons";

/** Estado vacío: ícono + título + descripción + CTA opcional. */
export function EmptyState({
  icon = "chat",
  title,
  description,
  action,
  className = "",
}: {
  icon?: IconName;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center justify-center px-6 py-12 text-center ${className}`}>
      <span className="mb-3 flex size-12 items-center justify-center rounded-full bg-accent-bg text-accent">
        <Icon name={icon} size={22} />
      </span>
      <p className="text-card-title font-semibold text-ink">{title}</p>
      {description && <p className="mt-1 max-w-xs text-meta text-ink-2">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
