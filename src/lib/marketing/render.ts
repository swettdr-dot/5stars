import { ImageResponse } from "next/og";
import { TEMPLATES, type TemplateKey, type TemplateProps } from "@/lib/marketing/templates";
import { FORMAT_DIMS } from "@/lib/marketing/formats";
import { loadFont } from "@/lib/marketing/fonts";

export type RenderInput = TemplateProps & { templateKey: TemplateKey };

/** Renderiza una plantilla a PNG (Uint8Array) al tamaño del formato pedido. */
export async function renderPostPng(input: RenderInput): Promise<Uint8Array> {
  const { templateKey, ...props } = input;
  const element = TEMPLATES[templateKey](props);
  const { width, height } = FORMAT_DIMS[props.format];

  const [bodyReg, bodyBold, headingBold] = await Promise.all([
    loadFont(props.kit.bodyFont, 400),
    loadFont(props.kit.bodyFont, 700),
    loadFont(props.kit.headingFont, 700),
  ]);

  const res = new ImageResponse(element, {
    width,
    height,
    fonts: [
      { name: props.kit.bodyFont, data: bodyReg, weight: 400, style: "normal" },
      { name: props.kit.bodyFont, data: bodyBold, weight: 700, style: "normal" },
      { name: props.kit.headingFont, data: headingBold, weight: 700, style: "normal" },
    ],
  });
  const buf = await res.arrayBuffer();
  return new Uint8Array(buf);
}
