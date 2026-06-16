import type { ReactNode } from "react";

/** Tarjeta base del panel: fondo blanco, borde sutil, radio 13px. */
export function Card({
  children,
  className = "",
  padding = "p-[18px]",
}: {
  children: ReactNode;
  className?: string;
  /** Override del padding (algunas cards usan 16px o 0 cuando llevan header propio). */
  padding?: string;
}) {
  return (
    <div className={`rounded-card border border-line bg-card ${padding} ${className}`}>{children}</div>
  );
}
