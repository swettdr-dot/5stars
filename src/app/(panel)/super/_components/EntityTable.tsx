import type { ReactNode } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";

/** Fila genérica de la tabla de entidades (agencias para super, negocios para agencia). */
export type EntityRow = {
  id: string;
  /** Nombre de la entidad (también alimenta el Avatar). */
  name: string;
  /** Subtítulo bajo el nombre (dominio público, fecha de alta, etc.). */
  sub: string;
  /** Valor de la 2ª columna ya formateado (Negocios / Vendedores). */
  col2: string;
  /** Total de reseñas ya formateado. */
  reviews: string;
  /** Promedio 0–5. */
  avg: number;
  /** Estado activo (con actividad) vs. prueba (sin reseñas aún). */
  active: boolean;
};

const COLS = "grid-cols-[2.2fr_1fr_1fr_1fr_0.8fr]";

/** Badge de Estado LOCAL (no usar ChannelBadge, que es para canal de reseña). */
export function StatusBadge({ tone, children }: { tone: "active" | "trial"; children: ReactNode }) {
  const cls = tone === "active" ? "bg-green-bg text-green" : "bg-accent-bg text-accent-dark";
  return (
    <span
      className={`justify-self-start whitespace-nowrap rounded-pill px-[9px] py-[3px] text-label font-semibold ${cls}`}
    >
      {children}
    </span>
  );
}

/** Tabla de entidades reutilizable entre los paneles de Super y Agencia. */
export function EntityTable({
  col1Label,
  col2Label,
  rows,
  activeLabel,
  trialLabel = "Prueba",
  emptyHint,
  manageHref,
}: {
  col1Label: string;
  col2Label: string;
  rows: EntityRow[];
  /** Texto del estado activo según género ("Activa" / "Activo"). */
  activeLabel: string;
  trialLabel?: string;
  emptyHint: string;
  /** Si se provee, cada fila enlaza a la gestión del negocio (panel de agencia). */
  manageHref?: (id: string) => string;
}) {
  return (
    <Card padding="p-0" className="overflow-hidden">
      <div
        className={`grid ${COLS} gap-[14px] border-b border-line px-[18px] py-[11px] text-label font-semibold uppercase tracking-[.04em] text-ink-3`}
      >
        <span>{col1Label}</span>
        <span>{col2Label}</span>
        <span>Reseñas</span>
        <span>Promedio</span>
        <span>Estado</span>
      </div>

      {rows.length === 0 ? (
        <div className="px-[18px] py-10 text-center text-meta text-ink-3">{emptyHint}</div>
      ) : (
        rows.map((e, i) => {
          const inner = (
            <>
              <div className="flex min-w-0 items-center gap-[11px]">
                <Avatar name={e.name} index={i} />
                <div className="min-w-0">
                  <div className="truncate text-[13.5px] font-semibold text-ink">{e.name}</div>
                  <div className="truncate text-[11.5px] text-ink-3">{e.sub}</div>
                </div>
              </div>
              <span className="text-[13.5px] font-semibold text-ink">{e.col2}</span>
              <span className="text-[13.5px] font-semibold text-ink">{e.reviews}</span>
              <span className="text-[13.5px] font-semibold text-amber">{e.avg.toFixed(1)} ★</span>
              <StatusBadge tone={e.active ? "active" : "trial"}>
                {e.active ? activeLabel : trialLabel}
              </StatusBadge>
            </>
          );
          const cls = `grid ${COLS} items-center gap-[14px] border-b border-line px-[18px] py-[14px] last:border-b-0`;
          return manageHref ? (
            <Link key={e.id} href={manageHref(e.id)} className={`${cls} transition-colors hover:bg-canvas`}>
              {inner}
            </Link>
          ) : (
            <div key={e.id} className={cls}>
              {inner}
            </div>
          );
        })
      )}
    </Card>
  );
}
