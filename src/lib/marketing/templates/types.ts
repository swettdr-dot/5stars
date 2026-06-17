import type { BrandKitValues } from "@/lib/marketing/brand-kit";
import type { PostFormat } from "@/lib/marketing/formats";

export type TemplateKey = "elegante" | "minimal";

export type TemplateProps = {
  quote: string;
  rating: number;
  attribution?: string | null;
  businessName: string;
  kit: BrandKitValues;
  format: PostFormat;
};

/** Cadena de estrellas llenas/vacías (Satori renderiza estos glifos sin fuente extra). */
export function starString(rating: number): string {
  const full = Math.max(0, Math.min(5, Math.round(rating)));
  return "★★★★★".slice(0, full) + "☆☆☆☆☆".slice(0, 5 - full);
}
