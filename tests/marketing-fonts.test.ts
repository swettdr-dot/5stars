import { describe, it, expect } from "vitest";
import { fontSourceUrl, FONT_SOURCES } from "@/lib/marketing/fonts";

describe("fontSourceUrl", () => {
  it("mapea una familia conocida a su URL de fontsource", () => {
    expect(FONT_SOURCES["Inter"]).toBe("inter");
    expect(fontSourceUrl("Inter", 400)).toBe(
      "https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-400-normal.ttf",
    );
  });
  it("cae a Inter para una familia desconocida", () => {
    expect(fontSourceUrl("NoExiste", 700)).toBe(
      "https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-700-normal.ttf",
    );
  });
});
