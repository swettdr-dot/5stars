import Link from "next/link";

export type RangeId = "7d" | "30d" | "90d";

export const RANGES: { id: RangeId; label: string; days: number }[] = [
  { id: "7d", label: "7 días", days: 7 },
  { id: "30d", label: "30 días", days: 30 },
  { id: "90d", label: "90 días", days: 90 },
];

export function rangeDays(id: string | undefined): number {
  return RANGES.find((r) => r.id === id)?.days ?? 30;
}

export function normalizeRange(id: string | undefined): RangeId {
  return RANGES.find((r) => r.id === id)?.id ?? "30d";
}

/** Selector de rango 7/30/90 días (server): navega vía ?range=. */
export function RangeTabs({ current }: { current: RangeId }) {
  return (
    <div className="flex items-center gap-2">
      {RANGES.map((r) => {
        const active = r.id === current;
        return (
          <Link
            key={r.id}
            href={`?range=${r.id}`}
            scroll={false}
            className={`flex h-[34px] items-center rounded-[8px] border px-[13px] text-meta transition-colors ${
              active
                ? "border-line bg-card font-semibold text-ink"
                : "border-transparent font-medium text-ink-2 hover:bg-accent-weak"
            }`}
          >
            {r.label}
          </Link>
        );
      })}
    </div>
  );
}
