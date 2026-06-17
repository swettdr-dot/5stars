import { describe, it, expect } from "vitest";
import {
  resolveBrandKit,
  brandKitSchema,
  DEFAULT_BRAND_KIT,
} from "@/lib/marketing/brand-kit";

describe("resolveBrandKit", () => {
  it("usa defaults cuando no hay kit y toma el logo del negocio", () => {
    const v = resolveBrandKit(null, "https://logo.png");
    expect(v.primary).toBe(DEFAULT_BRAND_KIT.primary);
    expect(v.logoUrl).toBe("https://logo.png");
    expect(v.toneOfVoice).toBeNull();
  });
  it("logoOverrideUrl del kit gana sobre el logo del negocio", () => {
    const v = resolveBrandKit(
      { ...DEFAULT_BRAND_KIT, logoOverrideUrl: "https://override.png" },
      "https://logo.png",
    );
    expect(v.logoUrl).toBe("https://override.png");
  });
});

describe("brandKitSchema", () => {
  it("acepta colores hex válidos", () => {
    const r = brandKitSchema.safeParse({
      primary: "#000000", accent: "#FFFFFF", background: "#FFFFFF", text: "#111111",
      headingFont: "Inter", bodyFont: "Inter", toneOfVoice: "Cercano",
    });
    expect(r.success).toBe(true);
  });
  it("rechaza un color no-hex", () => {
    const r = brandKitSchema.safeParse({
      primary: "rojo", accent: "#FFFFFF", background: "#FFFFFF", text: "#111111",
      headingFont: "Inter", bodyFont: "Inter",
    });
    expect(r.success).toBe(false);
  });
});
