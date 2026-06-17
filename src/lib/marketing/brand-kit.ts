import { z } from "zod";

/** Familias tipográficas soportadas (deben existir en FONT_SOURCES). */
export const FONT_OPTIONS = ["Inter", "Playfair Display", "Montserrat", "Lora"] as const;
export type FontOption = (typeof FONT_OPTIONS)[number];

/** Valores resueltos (sin nulls salvo lo opcional) que consumen las plantillas. */
export type BrandKitValues = {
  primary: string;
  accent: string;
  background: string;
  text: string;
  colors: string[];
  headingFont: string;
  bodyFont: string;
  backgrounds: string[];
  toneOfVoice: string | null;
  logoUrl: string | null;
};

export const DEFAULT_BRAND_KIT = {
  primary: "#D97706",
  accent: "#16A34A",
  background: "#FFFFFF",
  text: "#1A1A1E",
  colors: [] as string[],
  headingFont: "Playfair Display",
  bodyFont: "Inter",
  backgrounds: [] as string[],
  toneOfVoice: null as string | null,
  logoOverrideUrl: null as string | null,
};

type BrandKitRow = typeof DEFAULT_BRAND_KIT;

/** Mezcla el kit guardado (o defaults) con el logo del negocio. */
export function resolveBrandKit(
  kit: Partial<BrandKitRow> | null,
  businessLogoUrl: string | null,
): BrandKitValues {
  const k = { ...DEFAULT_BRAND_KIT, ...(kit ?? {}) };
  return {
    primary: k.primary,
    accent: k.accent,
    background: k.background,
    text: k.text,
    colors: k.colors ?? [],
    headingFont: k.headingFont,
    bodyFont: k.bodyFont,
    backgrounds: k.backgrounds ?? [],
    toneOfVoice: k.toneOfVoice ?? null,
    logoUrl: k.logoOverrideUrl || businessLogoUrl || null,
  };
}

const hex = z
  .string()
  .trim()
  .regex(/^#([0-9a-fA-F]{6})$/, "Usá un color hex tipo #1A2B3C.");

const fontOption = z.enum(FONT_OPTIONS);

const dataOrHttpUrl = z
  .string()
  .trim()
  .refine(
    (v) => /^https?:\/\//i.test(v) || /^data:image\//i.test(v),
    "Subí una imagen o pegá una URL válida.",
  );

export const brandKitSchema = z.object({
  primary: hex,
  accent: hex,
  background: hex,
  text: hex,
  colors: z.array(hex).max(8).optional().default([]),
  headingFont: fontOption,
  bodyFont: fontOption,
  backgrounds: z.array(dataOrHttpUrl).max(5).optional().default([]),
  toneOfVoice: z.string().trim().max(280).optional().nullable().default(null),
  logoOverrideUrl: dataOrHttpUrl.optional().nullable(),
});

export type BrandKitInput = z.infer<typeof brandKitSchema>;
