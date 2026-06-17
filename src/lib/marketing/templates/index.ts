import type { ReactElement } from "react";
import type { TemplateKey, TemplateProps } from "./types";
import { elegante } from "./elegante";
import { minimal } from "./minimal";

export type { TemplateKey, TemplateProps } from "./types";

export const TEMPLATES: Record<TemplateKey, (p: TemplateProps) => ReactElement> = {
  elegante,
  minimal,
};

export const TEMPLATE_LIST: { key: TemplateKey; label: string }[] = [
  { key: "elegante", label: "Elegante" },
  { key: "minimal", label: "Minimal" },
];

const TEMPLATE_KEYS = new Set<string>(Object.keys(TEMPLATES));

export function isTemplateKey(v: string): v is TemplateKey {
  return TEMPLATE_KEYS.has(v);
}
