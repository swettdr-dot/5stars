import type { KpiDir } from "@/components/ui/KpiCard";

/** Dirección del delta para colorear la flecha del KpiCard. */
export function dir(delta: number): KpiDir {
  return delta > 0 ? "up" : delta < 0 ? "down" : "flat";
}

/** Formatea un delta con signo explícito (+/−) y sufijo opcional. */
export function signed(n: number, digits = 0, suffix = ""): string {
  return `${n > 0 ? "+" : ""}${n.toFixed(digits)}${suffix}`;
}
