import type { TemplateKey, TemplateProps } from "./types";
import { elegante } from "./elegante";
import { minimal } from "./minimal";

export type { TemplateKey, TemplateProps } from "./types";

export const TEMPLATES: Record<TemplateKey, (p: TemplateProps) => React.ReactElement> = {
  elegante,
  minimal,
};

export const TEMPLATE_LIST: { key: TemplateKey; label: string }[] = [
  { key: "elegante", label: "Elegante" },
  { key: "minimal", label: "Minimal" },
];

export function isTemplateKey(v: string): v is TemplateKey {
  return v === "elegante" || v === "minimal";
}
