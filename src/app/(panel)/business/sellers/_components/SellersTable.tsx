"use client";
import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { CopyButton } from "@/components/ui/CopyButton";

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
  /** Enlace público propio del vendedor. */
  link: string;
  /** Slug del vendedor (para nombrar el archivo del QR descargado). */
  slug: string;
  /** Data URL (PNG) del código QR del enlace. */
  qr: string;
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
  const [openId, setOpenId] = useState<string | null>(null);

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

      {rows.map((s, i) => {
        const open = openId === s.id;
        const panelId = `seller-qr-${s.id}`;
        return (
          <div key={s.id} className="border-b border-line last:border-b-0">
            {/* Fila clickeable que alterna el detalle */}
            <button
              type="button"
              onClick={() => setOpenId(open ? null : s.id)}
              aria-expanded={open}
              aria-controls={panelId}
              className={`${COLS} w-full py-[14px] text-left transition-colors hover:bg-canvas`}
            >
              {/* Vendedor */}
              <div className="flex min-w-0 items-center gap-[11px]">
                <span className="text-ink-3" aria-hidden>
                  {open ? "▾" : "▸"}
                </span>
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
            </button>

            {/* Panel expandible: QR + descargar, enlace + copiar */}
            {open && (
              <div
                id={panelId}
                className="flex flex-col gap-4 border-t border-line bg-canvas px-[18px] py-4 sm:flex-row sm:items-start"
              >
                <div className="flex shrink-0 flex-col items-center gap-3">
                  <div className="flex size-[160px] items-center justify-center rounded-[14px] border border-line bg-white p-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={s.qr} alt={`Código QR del enlace de ${s.name}`} className="size-full" />
                  </div>
                  <a
                    href={s.qr}
                    download={`qr-${s.slug}.png`}
                    className="flex h-[38px] w-[160px] items-center justify-center rounded-control bg-accent text-[13px] font-semibold text-white transition-colors hover:bg-accent-dark"
                  >
                    Descargar QR
                  </a>
                </div>

                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <div className="text-meta font-semibold text-ink-2">Enlace público del vendedor</div>
                  <div className="flex gap-2">
                    <input
                      readOnly
                      value={s.link}
                      aria-label={`Enlace público de ${s.name}`}
                      className="h-10 min-w-0 flex-1 truncate rounded-control border border-line bg-card px-3 font-mono text-meta text-ink-2 focus:outline-none"
                    />
                    <CopyButton value={s.link} />
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </Card>
  );
}
