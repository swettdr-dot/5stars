"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { SessionUser } from "@/lib/tenancy";
import { NAV, activeHref } from "./nav";
import { Icon } from "@/components/ui/icons";

export function PanelNav({ role }: { role: SessionUser["role"] }) {
  const pathname = usePathname();
  const items = NAV[role];
  const active = activeHref(pathname, items);

  return (
    <nav className="flex flex-col gap-0.5 px-3 py-2">
      {items.map((item) => {
        const isActive = item.href === active;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={`flex items-center gap-2.5 rounded-control px-2.5 py-2 text-[13.5px] transition-colors ${
              isActive
                ? "bg-accent-bg font-semibold text-accent-dark"
                : "font-medium text-ink-2 hover:bg-accent-weak"
            }`}
          >
            <Icon name={item.icon} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
