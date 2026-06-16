"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { SessionUser } from "@/lib/tenancy";
import { ROLE_META, ROLE_ORDER } from "./nav";
import { setViewAs } from "../actions";

type Role = SessionUser["role"];

export function RoleSwitcher({
  orgName,
  orgInitials,
  role,
  canSwitch,
}: {
  orgName: string;
  orgInitials: string;
  role: Role;
  canSwitch: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  function pick(r: Role) {
    setOpen(false);
    start(() => setViewAs(r));
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => canSwitch && setOpen((o) => !o)}
        disabled={!canSwitch || pending}
        aria-haspopup={canSwitch ? "menu" : undefined}
        aria-expanded={canSwitch ? open : undefined}
        className={`flex w-full items-center gap-2.5 rounded-control border border-line bg-card px-2.5 py-2 text-left transition-colors ${
          canSwitch ? "hover:border-[#dcdce3]" : "cursor-default"
        } ${pending ? "opacity-60" : ""}`}
      >
        <span className="flex size-[30px] shrink-0 items-center justify-center rounded-[8px] bg-accent-bg text-[13px] font-semibold text-accent-dark">
          {orgInitials}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-semibold text-ink">{orgName}</span>
          <span className="block text-label text-ink-3">{ROLE_META[role].label}</span>
        </span>
        {canSwitch && <span className="text-label text-ink-3">▼</span>}
      </button>

      {open && canSwitch && (
        <div
          role="menu"
          className="absolute left-0 right-0 z-30 mt-1.5 overflow-hidden rounded-control border border-line bg-card shadow-[0_10px_24px_-14px_rgba(20,20,40,.2)]"
        >
          <div className="px-3 pb-1 pt-2.5 text-[10.5px] font-semibold uppercase tracking-label text-ink-3">
            Ver panel como
          </div>
          {ROLE_ORDER.map((r) => (
            <button
              key={r}
              role="menuitemradio"
              aria-checked={r === role}
              onClick={() => pick(r)}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-accent-weak"
            >
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ background: ROLE_META[r].dot }}
              />
              <span className="flex-1 text-meta font-medium text-ink">{ROLE_META[r].label}</span>
              {r === role && <span className="text-label font-semibold text-accent">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
