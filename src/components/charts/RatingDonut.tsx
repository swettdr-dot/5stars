"use client";

import { Cell, Pie, PieChart } from "recharts";

/** Donut "Destino de las reseñas": acento = a Google, gris = internas. */
export function RatingDonut({ highPct }: { highPct: number }) {
  const data = [
    { name: "A Google", value: highPct },
    { name: "Internas", value: 100 - highPct },
  ];
  const colors = ["var(--ac)", "#E6E6EC"];

  return (
    <div className="relative" style={{ width: 158, height: 158 }}>
      <PieChart width={158} height={158}>
        <Pie
          data={data}
          dataKey="value"
          cx="50%"
          cy="50%"
          innerRadius={59}
          outerRadius={79}
          startAngle={90}
          endAngle={-270}
          stroke="none"
          isAnimationActive={false}
        >
          {data.map((d, i) => (
            <Cell key={d.name} fill={colors[i]} />
          ))}
        </Pie>
      </PieChart>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-[30px] font-semibold tracking-tight text-ink">{highPct}%</div>
        <div className="mt-px text-[11.5px] text-ink-3">a Google</div>
      </div>
    </div>
  );
}
