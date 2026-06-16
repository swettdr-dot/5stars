"use client";

import { usePathname } from "next/navigation";
import type { SessionUser } from "@/lib/tenancy";
import { NAV, activeHref } from "./nav";

export function Topbar({
  role,
  userInitials,
}: {
  role: SessionUser["role"];
  userInitials: string;
}) {
  const pathname = usePathname();
  const items = NAV[role];
  const active = activeHref(pathname, items);
  const title = items.find((i) => i.href === active)?.label ?? "";

  return (
    <header className="sticky top-0 z-20 flex h-[60px] shrink-0 items-center gap-4 border-b border-line bg-[rgba(252,252,253,.85)] px-6 backdrop-blur-[8px]">
      <h1 className="text-topbar font-semibold tracking-tight text-ink">{title}</h1>
      <div className="ml-auto flex items-center gap-3">
        <div className="hidden h-9 min-w-[200px] items-center gap-2 rounded-control border border-line bg-card px-3 text-meta text-ink-3 sm:flex">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden>
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.2-3.2" />
          </svg>
          Buscar…
        </div>
        <div className="flex size-[34px] items-center justify-center rounded-full bg-accent-bg text-[13px] font-semibold text-accent-dark">
          {userInitials}
        </div>
      </div>
    </header>
  );
}
