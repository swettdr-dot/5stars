import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";

export type SellerRow = {
  id: string;
  name: string;
  /** Email del User vinculado (login opcional); null si no tiene. */
  email: string | null;
  reviews: number;
  /** Promedio de estrellas (0 si aún no tiene reseñas). */
  avg: number;
  /** % de reseñas redirigidas a Google (0–100). */
  pct: number;
};

const COLS = "grid grid-cols-[2fr_1fr_1fr_1.2fr] items-center gap-[14px] px-[18px]";

/** Mini barra de progreso del % a Google. */
function GoogleBar({ pct }: { pct: number }) {
  return (
    <div className="flex items-center gap-[9px]">
      <div className="h-[7px] max-w-20 flex-1 overflow-hidden rounded-[5px] bg-[#F0F0F4]">
        <div className="h-full rounded-[5px] bg-accent" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-meta font-semibold text-ink-2">{pct}%</span>
    </div>
  );
}

export function SellersTable({ rows }: { rows: SellerRow[] }) {
  if (rows.length === 0) {
    return (
      <Card className="text-center" padding="p-12">
        <p className="text-body font-semibold text-ink">Aún no hay vendedores</p>
        <p className="mt-1 text-meta text-ink-3">
          Crea tu primer vendedor para darle un link/QR propio y atribuir sus reseñas.
        </p>
      </Card>
    );
  }

  return (
    <Card padding="p-0" className="overflow-hidden">
      {/* Encabezado de columnas */}
      <div
        className={`${COLS} border-b border-line py-[11px] text-label font-semibold uppercase tracking-label text-ink-3`}
      >
        <span>Vendedor</span>
        <span>Reseñas</span>
        <span>Promedio</span>
        <span>% a Google</span>
      </div>

      {rows.map((s, i) => (
        <div key={s.id} className={`${COLS} border-b border-line py-[14px] last:border-b-0`}>
          {/* Vendedor */}
          <div className="flex min-w-0 items-center gap-[11px]">
            <Avatar name={s.name} index={i} size={32} />
            <div className="min-w-0">
              <div className="truncate text-body font-semibold text-ink">{s.name}</div>
              <div className="truncate text-[11.5px] text-ink-3">{s.email ?? "—"}</div>
            </div>
          </div>

          {/* Reseñas */}
          <span className="text-body font-semibold text-ink">{s.reviews}</span>

          {/* Promedio */}
          <span className="text-body font-semibold text-amber">
            {s.reviews === 0 ? "—" : `${s.avg.toFixed(1)} ★`}
          </span>

          {/* % a Google */}
          <GoogleBar pct={s.pct} />
        </div>
      ))}
    </Card>
  );
}
