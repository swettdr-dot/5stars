import type { ReactElement } from "react";
import type { TemplateProps } from "./types";
import { starString } from "./types";
import { FORMAT_DIMS } from "@/lib/marketing/formats";

/** Plantilla limpia: barra de acento, cita centrada sans-serif y firma discreta. */
export function minimal(p: TemplateProps): ReactElement {
  const { width, height } = FORMAT_DIMS[p.format];
  const pad = Math.round(width * 0.11);
  return (
    <div
      style={{
        width,
        height,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: pad,
        background: p.kit.background,
        color: p.kit.text,
        fontFamily: p.kit.bodyFont,
        textAlign: "center",
      }}
    >
      <div style={{ width: 90, height: 6, background: p.kit.accent, borderRadius: 3 }} />
      <span style={{ fontSize: 56, color: p.kit.accent, marginTop: 40 }}>
        {starString(p.rating)}
      </span>
      <span style={{ fontSize: 60, lineHeight: 1.25, fontWeight: 700, marginTop: 36 }}>
        {p.quote}
      </span>
      <span style={{ fontSize: 32, color: p.kit.primary, marginTop: 44, fontWeight: 700 }}>
        {p.attribution ?? p.businessName}
      </span>
    </div>
  );
}
