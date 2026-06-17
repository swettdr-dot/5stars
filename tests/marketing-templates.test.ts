import { describe, it, expect } from "vitest";
import type { ReactElement } from "react";
import { elegante } from "@/lib/marketing/templates/elegante";
import type { BrandKitValues } from "@/lib/marketing/brand-kit";
import { minimal } from "@/lib/marketing/templates/minimal";
import { TEMPLATES, TEMPLATE_LIST } from "@/lib/marketing/templates";

const KIT: BrandKitValues = {
  primary: "#112233", accent: "#445566", background: "#FFFFFF", text: "#000000",
  colors: [], headingFont: "Playfair Display", bodyFont: "Inter",
  backgrounds: [], toneOfVoice: null, logoUrl: null,
};

function collect(node: unknown, texts: string[], colors: string[]): void {
  if (node == null || typeof node === "boolean") return;
  if (typeof node === "string" || typeof node === "number") {
    texts.push(String(node));
    return;
  }
  if (Array.isArray(node)) {
    node.forEach((n) => collect(n, texts, colors));
    return;
  }
  const el = node as ReactElement<{ style?: Record<string, unknown>; children?: unknown }>;
  const props = el.props ?? {};
  const style = props.style ?? {};
  for (const v of Object.values(style)) {
    if (typeof v === "string") colors.push(v);
  }
  collect(props.children, texts, colors);
}

describe("plantilla elegante", () => {
  it("incluye cita, estrellas y atribución, y aplica colores del kit", () => {
    const el = elegante({
      quote: "Atención excelente",
      rating: 5,
      attribution: "— Ana",
      businessName: "Café Luna",
      kit: KIT,
      format: "SQUARE",
    });
    const texts: string[] = [];
    const colors: string[] = [];
    collect(el, texts, colors);
    const joined = texts.join(" ");
    expect(joined).toContain("Atención excelente");
    expect(joined).toContain("★★★★★");
    expect(joined).toContain("— Ana");
    expect(joined).toContain("Café Luna");
    expect(colors).toContain("#112233"); // primary
  });
});

describe("plantilla minimal", () => {
  it("incluye la cita y aplica color de acento", () => {
    const el = minimal({
      quote: "Volveré seguro",
      rating: 4,
      attribution: "— Luis",
      businessName: "Café Luna",
      kit: KIT,
      format: "STORY",
    });
    const texts: string[] = [];
    const colors: string[] = [];
    collect(el, texts, colors);
    expect(texts.join(" ")).toContain("Volveré seguro");
    expect(colors).toContain("#445566"); // accent
  });
});

describe("índice de plantillas", () => {
  it("expone elegante y minimal", () => {
    expect(Object.keys(TEMPLATES).sort()).toEqual(["elegante", "minimal"]);
    expect(TEMPLATE_LIST.map((t) => t.key).sort()).toEqual(["elegante", "minimal"]);
  });
});
