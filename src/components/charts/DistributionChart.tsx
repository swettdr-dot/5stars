"use client";

import { useState } from "react";
import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, XAxis, YAxis } from "recharts";

export type DistDatum = { star: number; count: number; pct: number };

/** Color por estrella (tokens --star-N). */
function starColor(star: number): string {
  return `var(--star-${star})`;
}

type TickProps = { x?: string | number; y?: string | number; payload?: { value: string | number } };

/** Tick "N★" con el número en ink-2 y la estrella en ámbar (modo columnas). */
function StarTick({ x, y, payload }: TickProps) {
  return (
    <text x={x} y={y} dy={4} textAnchor="middle" fontSize={12.5} fontWeight={600} fill="var(--ink-2)">
      {payload?.value}
      <tspan fill="var(--amber)">★</tspan>
    </text>
  );
}

export function DistributionChart({ data }: { data: DistDatum[] }) {
  const [mode, setMode] = useState<"bars" | "cols">("bars");
  const total = data.reduce((a, d) => a + d.count, 0);
  const maxCount = Math.max(1, ...data.map((d) => d.count));
  // Recharts necesita categoría string para no desalinear barras/labels.
  const colData = data.map((d) => ({ name: String(d.star), star: d.star, count: d.count }));

  return (
    <div>
      <div className="mb-[18px] flex items-center justify-between">
        <div>
          <div className="text-card-title font-semibold text-ink">Distribución de calificaciones</div>
          <div className="mt-0.5 text-[12px] text-ink-3">{total.toLocaleString("es")} reseñas</div>
        </div>
        <div className="flex gap-1 rounded-[8px] border border-line bg-canvas p-[3px]">
          {(["bars", "cols"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`rounded-[6px] px-2.5 py-1 text-[11.5px] font-semibold transition-colors ${
                mode === m ? "bg-card text-ink shadow-sm" : "text-ink-3 hover:text-ink-2"
              }`}
            >
              {m === "bars" ? "Barras" : "Columnas"}
            </button>
          ))}
        </div>
      </div>

      {mode === "bars" ? (
        /* Barras horizontales: progress bars en CSS (fiel al prototipo). */
        <div className="flex flex-col gap-[11px]">
          {data.map((d) => (
            <div key={d.star} className="flex items-center gap-3">
              <div className="flex w-[34px] items-center justify-end gap-0.5 text-meta font-semibold text-ink-2">
                {d.star}
                <span className="text-amber">★</span>
              </div>
              <div className="h-2.5 flex-1 overflow-hidden rounded-[6px] bg-[#F0F0F4]">
                <div
                  className="h-full rounded-[6px] transition-[width] duration-500 ease-out"
                  style={{ width: `${d.pct}%`, background: starColor(d.star) }}
                />
              </div>
              <div className="w-[78px] text-right text-meta text-ink-2">
                <b className="text-ink">{d.count.toLocaleString("es")}</b> · {d.pct}%
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Columnas verticales: bar chart real con Recharts. */
        <div style={{ height: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={colData} margin={{ top: 22, right: 4, bottom: 4, left: 4 }} barCategoryGap="20%">
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={(p) => <StarTick {...p} />} />
              <YAxis hide domain={[0, maxCount]} />
              <Bar dataKey="count" maxBarSize={46} radius={[8, 8, 3, 3]} isAnimationActive={false}>
                {colData.map((d) => (
                  <Cell key={d.star} fill={starColor(d.star)} />
                ))}
                <LabelList
                  dataKey="count"
                  position="top"
                  offset={8}
                  formatter={(v) => Number(v).toLocaleString("es")}
                  style={{ fontSize: 12, fontWeight: 600, fill: "var(--ink-2)" }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
