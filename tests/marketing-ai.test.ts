import { describe, it, expect } from "vitest";
import { buildImprovePrompt } from "@/lib/marketing/ai";

describe("buildImprovePrompt", () => {
  it("incluye el texto original y el tono de voz", () => {
    const p = buildImprovePrompt("buena atención", "cercano y cálido");
    expect(p).toContain("buena atención");
    expect(p).toContain("cercano y cálido");
  });
  it("funciona sin tono de voz", () => {
    const p = buildImprovePrompt("buena atención", null);
    expect(p).toContain("buena atención");
  });
});
