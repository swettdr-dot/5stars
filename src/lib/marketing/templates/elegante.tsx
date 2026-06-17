import type { ReactElement } from "react";
import type { TemplateProps } from "./types";
import { starString } from "./types";
import { FORMAT_DIMS } from "@/lib/marketing/formats";

/** Plantilla editorial: fondo de marca, cita grande con serif, estrellas y firma. */
export function elegante(p: TemplateProps): ReactElement {
  const { width, height } = FORMAT_DIMS[p.format];
  const pad = Math.round(width * 0.1);
  return (
    <div
      style={{
        width,
        height,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: pad,
        background: p.kit.background,
        color: p.kit.text,
        fontFamily: p.kit.bodyFont,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        {p.kit.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.kit.logoUrl} width={72} height={72} style={{ borderRadius: 16 }} alt="" />
        ) : null}
        <span style={{ fontSize: 34, fontWeight: 700, color: p.kit.primary }}>
          {p.businessName}
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <span style={{ fontSize: 64, color: p.kit.accent }}>{starString(p.rating)}</span>
        <span
          style={{
            fontSize: 72,
            lineHeight: 1.15,
            fontWeight: 700,
            fontFamily: p.kit.headingFont,
            marginTop: 28,
          }}
        >
          {"“"}{p.quote}{"”"}
        </span>
      </div>
      <span style={{ fontSize: 36, fontWeight: 700, color: p.kit.primary }}>
        {p.attribution ?? ""}
      </span>
    </div>
  );
}
