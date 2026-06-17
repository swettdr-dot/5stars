"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

export function BusinessSelector({
  options,
  current,
}: {
  options: { id: string; name: string }[];
  current: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  if (options.length <= 1) return null;

  function onChange(id: string) {
    const next = new URLSearchParams(params.toString());
    next.set("businessId", id);
    router.push(`${pathname}?${next.toString()}`);
  }

  return (
    <select
      value={current}
      onChange={(e) => onChange(e.target.value)}
      className="h-10 rounded-control border border-line bg-card px-3 text-body text-ink outline-none focus:border-accent"
      aria-label="Negocio"
    >
      {options.map((o) => (
        <option key={o.id} value={o.id}>
          {o.name}
        </option>
      ))}
    </select>
  );
}
