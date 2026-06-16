import { Card } from "./Card";
import { Icon, type IconName } from "./icons";

export type KpiDir = "up" | "down" | "flat";

/** Tarjeta de KPI: icono + label, valor 27px + unidad, y delta con flecha + nota. */
export function KpiCard({
  label,
  icon,
  iconColor,
  value,
  unit,
  delta,
  dir = "flat",
  note,
}: {
  label: string;
  icon: IconName;
  iconColor: string;
  value: string;
  unit?: string;
  delta?: string;
  dir?: KpiDir;
  note?: string;
}) {
  const deltaColor = dir === "up" ? "text-green" : dir === "down" ? "text-red" : "text-ink-3";
  const arrow = dir === "up" ? "↑" : dir === "down" ? "↓" : "→";
  return (
    <Card padding="px-4 pb-3.5 pt-4">
      <div className="mb-3 flex items-center gap-1.5 text-meta font-medium text-ink-2">
        <span style={{ color: iconColor }} className="flex">
          <Icon name={icon} size={16} />
        </span>
        {label}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-kpi font-semibold tracking-tight text-ink">{value}</span>
        {unit && <span className="text-[13px] text-ink-3">{unit}</span>}
      </div>
      {delta && (
        <div className={`mt-2 flex items-center gap-1 text-[12px] font-semibold ${deltaColor}`}>
          <span>{arrow}</span>
          <span>{delta}</span>
          {note && <span className="font-normal text-ink-3">{note}</span>}
        </div>
      )}
    </Card>
  );
}
