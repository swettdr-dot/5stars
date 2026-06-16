"use client";

import { Area, AreaChart, ResponsiveContainer } from "recharts";

/** Sparkline de tendencia: área con gradiente del acento + punto en el último dato. */
export function TrendChart({ data }: { data: number[] }) {
  const points = data.map((v, i) => ({ i, v }));
  const lastIndex = points.length - 1;

  return (
    <div style={{ height: 70 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
          <defs>
            <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--ac)" stopOpacity={0.18} />
              <stop offset="100%" stopColor="var(--ac)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="v"
            stroke="var(--ac)"
            strokeWidth={2}
            strokeLinecap="round"
            fill="url(#trendGrad)"
            isAnimationActive={false}
            dot={(props: { cx?: number; cy?: number; index?: number }) =>
              props.index === lastIndex ? (
                <circle key="last" cx={props.cx} cy={props.cy} r={3.5} fill="var(--ac)" />
              ) : (
                <circle key={props.index} cx={props.cx} cy={props.cy} r={0} fill="transparent" />
              )
            }
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
