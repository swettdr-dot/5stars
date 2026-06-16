# Marketing — Publicaciones desde reseñas · Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir convertir una reseña en una imagen lista para Instagram (feed 1080×1080 y story 1080×1920) que mantiene la identidad visual del negocio vía un kit de marca, con galería en el panel.

**Architecture:** Render server-side con `ImageResponse` (Satori, nativo de Next.js 16) de plantillas JSX puras parametrizadas por un `BrandKit` por negocio. Las imágenes se suben a Vercel Blob y se referencian desde `MarketingPost`. El texto positivo se captura en el flujo público de 5★ antes de redirigir a Google. Acceso para `BUSINESS_ADMIN` (su negocio) y `AGENCY_ADMIN` (sus negocios, vía selector), acotado con helpers de tenancy.

**Tech Stack:** Next.js 16 (App Router, Server Actions, `next/og`), React 19, Prisma + Postgres, Zod, Vercel Blob (`@vercel/blob`), Anthropic SDK (`@anthropic-ai/sdk`, opcional), Vitest.

**Spec:** `docs/superpowers/specs/2026-06-16-marketing-publicaciones-design.md`

---

## Estructura de archivos

**Crear:**
- `src/lib/marketing/context.ts` — `marketingBusinessWhere(user, businessId?)` (tenancy pura).
- `src/lib/marketing/formats.ts` — tipo `PostFormat` + `FORMAT_DIMS`.
- `src/lib/marketing/brand-kit.ts` — tipos `BrandKitValues`, defaults, `resolveBrandKit`, Zod schema.
- `src/lib/marketing/fonts.ts` — `FONT_SOURCES` (familia → slug fontsource) + `loadFont`.
- `src/lib/marketing/templates/types.ts` — `TemplateKey`, `TemplateProps`, helpers de estrellas.
- `src/lib/marketing/templates/elegante.tsx` — plantilla "Elegante".
- `src/lib/marketing/templates/minimal.tsx` — plantilla "Minimal".
- `src/lib/marketing/templates/index.ts` — `TEMPLATES`, `TEMPLATE_LIST`.
- `src/lib/marketing/render.ts` — `renderPostPng(props) → Promise<Uint8Array>`.
- `src/lib/marketing/storage.ts` — `uploadPostImage(key, bytes) → url`, `blobKey(...)`.
- `src/lib/marketing/ai.ts` — `buildImprovePrompt`, `improveQuote` (opcional IA).
- `src/app/(panel)/marketing/page.tsx` — galería.
- `src/app/(panel)/marketing/brand-kit/page.tsx` — kit de marca.
- `src/app/(panel)/marketing/new/page.tsx` — editor de creación.
- `src/app/(panel)/marketing/preview/route.ts` — preview PNG en vivo.
- `src/app/(panel)/marketing/actions.ts` — server actions (kit, crear/borrar post, IA).
- `src/app/(panel)/marketing/_components/BrandKitForm.tsx`
- `src/app/(panel)/marketing/_components/PostEditor.tsx`
- `src/app/(panel)/marketing/_components/BusinessSelector.tsx`
- `src/app/(panel)/marketing/_components/Gallery.tsx`
- `tests/marketing-context.test.ts`
- `tests/marketing-brand-kit.test.ts`
- `tests/marketing-templates.test.ts`
- `tests/marketing-fonts.test.ts`
- `tests/marketing-storage.test.ts`
- `tests/marketing-ai.test.ts`

**Modificar:**
- `prisma/schema.prisma` — modelos `BrandKit`, `MarketingPost` + relaciones.
- `src/middleware.ts` — proteger `/marketing`.
- `src/app/(panel)/_components/nav.ts` — ítem "Marketing" en `BUSINESS_ADMIN` y `AGENCY_ADMIN`.
- `src/app/r/_components/ReviewFlow.tsx` — paso de captura de texto en 5★.
- `src/app/(panel)/business/reviews/page.tsx` — acción "Crear publicación" por reseña.
- `tests/submit-review.test.ts` — caso 5★ con comentario.

---

## Task 1: Esquema Prisma — BrandKit y MarketingPost

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Agregar relaciones en modelos existentes**

En `model Business` (después de `reviews Review[]`) agregar:

```prisma
  brandKit       BrandKit?
  marketingPosts MarketingPost[]
```

En `model Review` (después de `answers Answer[]`) agregar:

```prisma
  marketingPosts MarketingPost[]
```

- [ ] **Step 2: Agregar los nuevos modelos al final del archivo**

```prisma
model BrandKit {
  id              String   @id @default(cuid())
  businessId      String   @unique
  business        Business @relation(fields: [businessId], references: [id])
  primary         String   @default("#D97706")
  accent          String   @default("#16A34A")
  background      String   @default("#FFFFFF")
  text            String   @default("#1A1A1E")
  colors          String[] @default([])
  headingFont     String   @default("Playfair Display")
  bodyFont        String   @default("Inter")
  backgrounds     String[] @default([])
  toneOfVoice     String?
  logoOverrideUrl String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model MarketingPost {
  id             String   @id @default(cuid())
  businessId     String
  business       Business @relation(fields: [businessId], references: [id])
  reviewId       String?
  review         Review?  @relation(fields: [reviewId], references: [id])
  templateKey    String
  quoteText      String
  starRating     Int
  attribution    String?
  imageSquareUrl String?
  imageStoryUrl  String?
  createdById    String
  createdAt      DateTime @default(now())

  @@index([businessId, createdAt])
}
```

- [ ] **Step 3: Crear y aplicar la migración**

Run: `npx prisma migrate dev --name marketing_brand_kit_posts`
Expected: migración creada en `prisma/migrations/…`, cliente regenerado, sin errores.

- [ ] **Step 4: Verificar que el cliente compila**

Run: `npx tsc --noEmit`
Expected: sin errores de tipo relacionados con Prisma.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(marketing): esquema BrandKit y MarketingPost"
```

---

## Task 2: Helper de tenancy de marketing (puro)

**Files:**
- Create: `src/lib/marketing/context.ts`
- Test: `tests/marketing-context.test.ts`

- [ ] **Step 1: Escribir el test que falla**

```typescript
import { describe, it, expect } from "vitest";
import { marketingBusinessWhere } from "@/lib/marketing/context";

describe("marketingBusinessWhere", () => {
  it("business admin se acota a su negocio e ignora el id pedido", () => {
    expect(marketingBusinessWhere({ role: "BUSINESS_ADMIN", businessId: "b1" }, "otro"))
      .toEqual({ id: "b1" });
  });
  it("agency admin combina su agencia con el negocio pedido", () => {
    expect(marketingBusinessWhere({ role: "AGENCY_ADMIN", agencyId: "a1" }, "b9"))
      .toEqual({ id: "b9", agencyId: "a1" });
  });
  it("agency admin sin id pedido se acota solo a su agencia", () => {
    expect(marketingBusinessWhere({ role: "AGENCY_ADMIN", agencyId: "a1" }))
      .toEqual({ agencyId: "a1" });
  });
  it("super admin con id pedido se acota a ese negocio", () => {
    expect(marketingBusinessWhere({ role: "SUPER_ADMIN" }, "b3"))
      .toEqual({ id: "b3" });
  });
});
```

- [ ] **Step 2: Correr el test para verificar que falla**

Run: `npx vitest run tests/marketing-context.test.ts`
Expected: FAIL — "Cannot find module '@/lib/marketing/context'".

- [ ] **Step 3: Implementar el helper**

```typescript
import { businessWhereForSession, type SessionUser } from "@/lib/tenancy";

/**
 * Prisma `where` para el negocio sobre el que opera Marketing. El filtro de
 * sesión se aplica DESPUÉS del id pedido, así un BUSINESS_ADMIN nunca puede
 * apuntar a otro negocio (su `{ id }` pisa el pedido), mientras que un
 * AGENCY_ADMIN sí elige entre los suyos (`{ agencyId }` + `{ id }`).
 */
export function marketingBusinessWhere(
  user: SessionUser,
  businessId?: string,
): Record<string, unknown> {
  return {
    ...(businessId ? { id: businessId } : {}),
    ...businessWhereForSession(user),
  };
}
```

- [ ] **Step 4: Correr el test para verificar que pasa**

Run: `npx vitest run tests/marketing-context.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/marketing/context.ts tests/marketing-context.test.ts
git commit -m "feat(marketing): helper de tenancy marketingBusinessWhere"
```

---

## Task 3: Formatos de salida

**Files:**
- Create: `src/lib/marketing/formats.ts`

- [ ] **Step 1: Implementar el módulo (sin test propio; lo usan plantillas y render)**

```typescript
export type PostFormat = "SQUARE" | "STORY";

export const FORMAT_DIMS: Record<PostFormat, { width: number; height: number }> = {
  SQUARE: { width: 1080, height: 1080 },
  STORY: { width: 1080, height: 1920 },
};

export const ALL_FORMATS: PostFormat[] = ["SQUARE", "STORY"];

export const FORMAT_LABEL: Record<PostFormat, string> = {
  SQUARE: "Feed (1:1)",
  STORY: "Story (9:16)",
};
```

- [ ] **Step 2: Verificar compilación**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add src/lib/marketing/formats.ts
git commit -m "feat(marketing): formatos de salida (SQUARE/STORY)"
```

---

## Task 4: Kit de marca — tipos, defaults, resolución y validación

**Files:**
- Create: `src/lib/marketing/brand-kit.ts`
- Test: `tests/marketing-brand-kit.test.ts`

- [ ] **Step 1: Escribir el test que falla**

```typescript
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
```

- [ ] **Step 2: Correr el test para verificar que falla**

Run: `npx vitest run tests/marketing-brand-kit.test.ts`
Expected: FAIL — módulo inexistente.

- [ ] **Step 3: Implementar el módulo**

```typescript
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
  toneOfVoice: z.string().trim().max(280).optional().nullable(),
  logoOverrideUrl: dataOrHttpUrl.optional().nullable(),
});

export type BrandKitInput = z.infer<typeof brandKitSchema>;
```

- [ ] **Step 4: Correr el test para verificar que pasa**

Run: `npx vitest run tests/marketing-brand-kit.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/marketing/brand-kit.ts tests/marketing-brand-kit.test.ts
git commit -m "feat(marketing): kit de marca (tipos, defaults, validacion)"
```

---

## Task 5: Carga de fuentes para Satori

**Files:**
- Create: `src/lib/marketing/fonts.ts`
- Test: `tests/marketing-fonts.test.ts`

- [ ] **Step 1: Escribir el test que falla**

```typescript
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
```

- [ ] **Step 2: Correr el test para verificar que falla**

Run: `npx vitest run tests/marketing-fonts.test.ts`
Expected: FAIL — módulo inexistente.

- [ ] **Step 3: Implementar el módulo**

```typescript
/** Familia tipográfica → slug de fontsource (CDN jsDelivr). */
export const FONT_SOURCES: Record<string, string> = {
  Inter: "inter",
  "Playfair Display": "playfair-display",
  Montserrat: "montserrat",
  Lora: "lora",
};

export function fontSourceUrl(family: string, weight: 400 | 700): string {
  const slug = FONT_SOURCES[family] ?? "inter";
  return `https://cdn.jsdelivr.net/fontsource/fonts/${slug}@latest/latin-${weight}-normal.ttf`;
}

const cache = new Map<string, ArrayBuffer>();

/** Descarga (y cachea en memoria) el .ttf de una familia/peso. */
export async function loadFont(family: string, weight: 400 | 700): Promise<ArrayBuffer> {
  const url = fontSourceUrl(family, weight);
  const cached = cache.get(url);
  if (cached) return cached;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`FONT_FETCH_FAILED:${family}:${weight}`);
  const buf = await res.arrayBuffer();
  cache.set(url, buf);
  return buf;
}
```

- [ ] **Step 4: Correr el test para verificar que pasa**

Run: `npx vitest run tests/marketing-fonts.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/marketing/fonts.ts tests/marketing-fonts.test.ts
git commit -m "feat(marketing): carga de fuentes (fontsource) para Satori"
```

---

## Task 6: Plantillas — tipos y helpers

**Files:**
- Create: `src/lib/marketing/templates/types.ts`

- [ ] **Step 1: Implementar tipos y helper de estrellas**

```typescript
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
```

- [ ] **Step 2: Verificar compilación**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add src/lib/marketing/templates/types.ts
git commit -m "feat(marketing): tipos y helpers de plantillas"
```

---

## Task 7: Plantilla "Elegante" (función pura, TDD)

**Files:**
- Create: `src/lib/marketing/templates/elegante.tsx`
- Test: `tests/marketing-templates.test.ts`

- [ ] **Step 1: Escribir el test que falla**

Este helper de test recorre el árbol de elementos React (sin DOM) y junta textos y colores para verificar el contenido. Se reutiliza en la próxima task.

```typescript
import { describe, it, expect } from "vitest";
import type { ReactElement } from "react";
import { elegante } from "@/lib/marketing/templates/elegante";
import type { BrandKitValues } from "@/lib/marketing/brand-kit";

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
```

- [ ] **Step 2: Correr el test para verificar que falla**

Run: `npx vitest run tests/marketing-templates.test.ts`
Expected: FAIL — módulo inexistente.

- [ ] **Step 3: Implementar la plantilla**

```tsx
import type { TemplateProps } from "./types";
import { starString } from "./types";
import { FORMAT_DIMS } from "@/lib/marketing/formats";

/** Plantilla editorial: fondo de marca, cita grande con serif, estrellas y firma. */
export function elegante(p: TemplateProps): React.ReactElement {
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
          “{p.quote}”
        </span>
      </div>
      <span style={{ fontSize: 36, fontWeight: 700, color: p.kit.primary }}>
        {p.attribution ?? ""}
      </span>
    </div>
  );
}
```

- [ ] **Step 4: Correr el test para verificar que pasa**

Run: `npx vitest run tests/marketing-templates.test.ts`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add src/lib/marketing/templates/elegante.tsx tests/marketing-templates.test.ts
git commit -m "feat(marketing): plantilla Elegante"
```

---

## Task 8: Plantilla "Minimal" + índice de plantillas

**Files:**
- Create: `src/lib/marketing/templates/minimal.tsx`
- Create: `src/lib/marketing/templates/index.ts`
- Test: `tests/marketing-templates.test.ts` (agregar caso)

- [ ] **Step 1: Agregar el test que falla para la plantilla minimal y el índice**

Agregar al final de `tests/marketing-templates.test.ts` (reutiliza `collect` y `KIT` ya definidos arriba en el archivo):

```typescript
import { minimal } from "@/lib/marketing/templates/minimal";
import { TEMPLATES, TEMPLATE_LIST } from "@/lib/marketing/templates";

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
```

- [ ] **Step 2: Correr el test para verificar que falla**

Run: `npx vitest run tests/marketing-templates.test.ts`
Expected: FAIL — `minimal` / índice inexistentes.

- [ ] **Step 3: Implementar la plantilla minimal**

`src/lib/marketing/templates/minimal.tsx`:

```tsx
import type { TemplateProps } from "./types";
import { starString } from "./types";
import { FORMAT_DIMS } from "@/lib/marketing/formats";

/** Plantilla limpia: barra de acento, cita centrada sans-serif y firma discreta. */
export function minimal(p: TemplateProps): React.ReactElement {
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
```

- [ ] **Step 4: Implementar el índice**

`src/lib/marketing/templates/index.ts`:

```typescript
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
```

- [ ] **Step 5: Correr los tests para verificar que pasan**

Run: `npx vitest run tests/marketing-templates.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add src/lib/marketing/templates/minimal.tsx src/lib/marketing/templates/index.ts tests/marketing-templates.test.ts
git commit -m "feat(marketing): plantilla Minimal e indice de plantillas"
```

---

## Task 9: Render a PNG con ImageResponse

**Files:**
- Create: `src/lib/marketing/render.ts`

Nota: el render real toca red (fuentes) y `next/og`; se verifica vía build + la app corriendo, no con test unitario.

- [ ] **Step 1: Implementar el módulo de render**

```typescript
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
```

- [ ] **Step 2: Verificar compilación**

Run: `npx tsc --noEmit`
Expected: sin errores (si `next/og` no resuelve tipos, confirmar Next 16 con `ls node_modules/next/og*`).

- [ ] **Step 3: Commit**

```bash
git add src/lib/marketing/render.ts
git commit -m "feat(marketing): render de plantillas a PNG con ImageResponse"
```

---

## Task 10: Almacenamiento en Vercel Blob

**Files:**
- Create: `src/lib/marketing/storage.ts`
- Test: `tests/marketing-storage.test.ts`
- Modify: `package.json` (dependencia `@vercel/blob`)

- [ ] **Step 1: Instalar la dependencia**

Run: `npm install @vercel/blob`
Expected: `@vercel/blob` agregado a `dependencies`.

- [ ] **Step 2: Escribir el test que falla (solo la parte pura: la clave)**

```typescript
import { describe, it, expect } from "vitest";
import { blobKey } from "@/lib/marketing/storage";

describe("blobKey", () => {
  it("arma una ruta estable por negocio/post/formato", () => {
    expect(blobKey("b1", "p9", "SQUARE")).toBe("marketing/b1/p9-square.png");
    expect(blobKey("b1", "p9", "STORY")).toBe("marketing/b1/p9-story.png");
  });
});
```

- [ ] **Step 3: Correr el test para verificar que falla**

Run: `npx vitest run tests/marketing-storage.test.ts`
Expected: FAIL — módulo inexistente.

- [ ] **Step 4: Implementar el módulo**

```typescript
import { put } from "@vercel/blob";
import type { PostFormat } from "@/lib/marketing/formats";

export function blobKey(businessId: string, postId: string, format: PostFormat): string {
  return `marketing/${businessId}/${postId}-${format.toLowerCase()}.png`;
}

/** Sube el PNG a Vercel Blob (acceso público) y devuelve la URL. */
export async function uploadPostImage(key: string, bytes: Uint8Array): Promise<string> {
  const { url } = await put(key, Buffer.from(bytes), {
    access: "public",
    contentType: "image/png",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
  return url;
}
```

- [ ] **Step 5: Correr el test para verificar que pasa**

Run: `npx vitest run tests/marketing-storage.test.ts`
Expected: PASS (1 test).

- [ ] **Step 6: Commit**

```bash
git add src/lib/marketing/storage.ts tests/marketing-storage.test.ts package.json package-lock.json
git commit -m "feat(marketing): almacenamiento de imagenes en Vercel Blob"
```

---

## Task 11: Navegación, middleware y nav por rol

**Files:**
- Modify: `src/middleware.ts`
- Modify: `src/app/(panel)/_components/nav.ts`

- [ ] **Step 1: Proteger `/marketing` en el middleware**

En `src/middleware.ts`, agregar `/marketing` a la lista `isPanel` y al `matcher`:

```typescript
import { auth } from "@/lib/auth";

export default auth((req) => {
  const isPanel = ["/super", "/agency", "/business", "/seller", "/marketing"].some((p) =>
    req.nextUrl.pathname.startsWith(p),
  );
  if (isPanel && !req.auth) {
    const url = new URL("/login", req.nextUrl.origin);
    return Response.redirect(url);
  }
});

export const config = {
  matcher: [
    "/super/:path*",
    "/agency/:path*",
    "/business/:path*",
    "/seller/:path*",
    "/marketing/:path*",
  ],
};
```

- [ ] **Step 2: Agregar el ítem "Marketing" al nav de negocio y agencia**

En `src/app/(panel)/_components/nav.ts`, dentro de `NAV`:

En `AGENCY_ADMIN` reemplazar el arreglo por:

```typescript
  AGENCY_ADMIN: [
    { href: "/agency", label: "Negocios", icon: "briefcase" },
    { href: "/marketing", label: "Marketing", icon: "image" },
  ],
```

En `BUSINESS_ADMIN`, agregar antes de `Ajustes`:

```typescript
    { href: "/marketing", label: "Marketing", icon: "image" },
```

- [ ] **Step 3: Verificar que el icono `image` existe; si no, usar uno existente**

Run: `npx vitest run` no aplica aquí. En su lugar abrir `src/components/ui/icons.tsx` y confirmar que `IconName` incluye `"image"`. Si no existe, usar `"qr"` o agregar un icono `image` siguiendo el patrón del archivo (un `<path>` de imagen). Mantener el set de `IconName` consistente con `nav.ts`.

- [ ] **Step 4: Verificar compilación**

Run: `npx tsc --noEmit`
Expected: sin errores (en particular, `icon` debe ser un `IconName` válido).

- [ ] **Step 5: Commit**

```bash
git add src/middleware.ts src/app/(panel)/_components/nav.ts src/components/ui/icons.tsx
git commit -m "feat(marketing): ruta /marketing protegida y nav por rol"
```

---

## Task 12: Selector de negocio (agencia) + resolución de contexto

**Files:**
- Create: `src/app/(panel)/marketing/_components/BusinessSelector.tsx`
- Create: `src/lib/marketing/page-context.ts`

Este helper resuelve, para una request de panel, el negocio activo y la lista de negocios elegibles (para la agencia).

- [ ] **Step 1: Implementar el helper de contexto de página**

`src/lib/marketing/page-context.ts`:

```typescript
import { prisma } from "@/lib/prisma";
import { requireUser, type AppUser } from "@/lib/session";
import { marketingBusinessWhere } from "@/lib/marketing/context";

export type MarketingContext = {
  user: AppUser;
  business: { id: string; name: string; logoUrl: string | null; slug: string };
  options: { id: string; name: string }[]; // negocios elegibles (agencia); 1 para negocio
};

/**
 * Resuelve el negocio activo de Marketing acotado por rol. Para AGENCY_ADMIN usa
 * `?businessId=` si pertenece a su agencia; si no, el primero. Devuelve `null`
 * si el usuario no puede operar marketing o no hay negocio.
 */
export async function getMarketingContext(
  requestedBusinessId?: string,
): Promise<MarketingContext | null> {
  const user = await requireUser();
  if (user.role !== "BUSINESS_ADMIN" && user.role !== "AGENCY_ADMIN") return null;

  const options =
    user.role === "AGENCY_ADMIN"
      ? await prisma.business.findMany({
          where: marketingBusinessWhere(user),
          orderBy: { createdAt: "asc" },
          select: { id: true, name: true },
        })
      : [];

  const business = await prisma.business.findFirst({
    where: marketingBusinessWhere(user, requestedBusinessId),
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, logoUrl: true, slug: true },
  });
  if (!business) return null;

  return { user, business, options };
}
```

- [ ] **Step 2: Implementar el selector (cliente)**

`src/app/(panel)/marketing/_components/BusinessSelector.tsx`:

```tsx
"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

export function BusinessSelector({
  options,
  current,
}: {
  options: { id: string; name: string }[];
  current: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  if (options.length <= 1) return null;

  function onChange(id: string) {
    const next = new URLSearchParams(params.toString());
    next.set("businessId", id);
    router.push(`${pathname}?${next.toString()}`);
  }

  return (
    <select
      value={current}
      onChange={(e) => onChange(e.target.value)}
      className="h-10 rounded-control border border-line bg-card px-3 text-body text-ink outline-none focus:border-accent"
      aria-label="Negocio"
    >
      {options.map((o) => (
        <option key={o.id} value={o.id}>
          {o.name}
        </option>
      ))}
    </select>
  );
}
```

- [ ] **Step 3: Verificar compilación**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add src/lib/marketing/page-context.ts src/app/(panel)/marketing/_components/BusinessSelector.tsx
git commit -m "feat(marketing): contexto de negocio activo y selector de agencia"
```

---

## Task 13: Action y página del Kit de marca

**Files:**
- Create: `src/app/(panel)/marketing/actions.ts`
- Create: `src/app/(panel)/marketing/_components/BrandKitForm.tsx`
- Create: `src/app/(panel)/marketing/brand-kit/page.tsx`

- [ ] **Step 1: Implementar la action `saveBrandKit`**

`src/app/(panel)/marketing/actions.ts`:

```typescript
"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { marketingBusinessWhere } from "@/lib/marketing/context";
import { brandKitSchema } from "@/lib/marketing/brand-kit";

export type BrandKitState = {
  ok: boolean;
  message?: string;
  error?: string;
};

/** Verifica que el usuario puede operar sobre `businessId`; devuelve el id o lanza. */
async function assertBusiness(businessId: string): Promise<string> {
  const user = await requireUser();
  if (user.role !== "BUSINESS_ADMIN" && user.role !== "AGENCY_ADMIN") {
    throw new Error("FORBIDDEN");
  }
  const b = await prisma.business.findFirst({
    where: marketingBusinessWhere(user, businessId),
    select: { id: true },
  });
  if (!b) throw new Error("FORBIDDEN");
  return b.id;
}

export async function saveBrandKit(
  _prev: BrandKitState,
  formData: FormData,
): Promise<BrandKitState> {
  let businessId: string;
  try {
    businessId = await assertBusiness(String(formData.get("businessId") ?? ""));
  } catch {
    return { ok: false, error: "No tenés permisos para este negocio." };
  }

  const parsed = brandKitSchema.safeParse({
    primary: formData.get("primary"),
    accent: formData.get("accent"),
    background: formData.get("background"),
    text: formData.get("text"),
    colors: formData.getAll("colors").map(String).filter(Boolean),
    headingFont: formData.get("headingFont"),
    bodyFont: formData.get("bodyFont"),
    backgrounds: formData.getAll("backgrounds").map(String).filter(Boolean),
    toneOfVoice: (formData.get("toneOfVoice") as string) || null,
    logoOverrideUrl: (formData.get("logoOverrideUrl") as string) || null,
  });
  if (!parsed.success) {
    return { ok: false, error: "Revisá los colores y campos del kit." };
  }
  const d = parsed.data;

  await prisma.brandKit.upsert({
    where: { businessId },
    create: { businessId, ...d, toneOfVoice: d.toneOfVoice ?? null, logoOverrideUrl: d.logoOverrideUrl ?? null },
    update: { ...d, toneOfVoice: d.toneOfVoice ?? null, logoOverrideUrl: d.logoOverrideUrl ?? null },
  });

  revalidatePath("/marketing/brand-kit");
  return { ok: true, message: "Kit de marca guardado." };
}
```

- [ ] **Step 2: Implementar el formulario (cliente)**

`src/app/(panel)/marketing/_components/BrandKitForm.tsx`:

```tsx
"use client";

import { useActionState } from "react";
import { Card } from "@/components/ui/Card";
import { saveBrandKit, type BrandKitState } from "../actions";
import { FONT_OPTIONS, type BrandKitValues } from "@/lib/marketing/brand-kit";

const initial: BrandKitState = { ok: false };

const COLOR_FIELDS = [
  { name: "primary", label: "Color primario" },
  { name: "accent", label: "Color de acento" },
  { name: "background", label: "Fondo" },
  { name: "text", label: "Texto" },
] as const;

export function BrandKitForm({
  businessId,
  values,
}: {
  businessId: string;
  values: BrandKitValues;
}) {
  const [state, formAction, pending] = useActionState(saveBrandKit, initial);

  return (
    <form action={formAction} className="space-y-[14px]">
      <input type="hidden" name="businessId" value={businessId} />

      {state.ok && state.message && (
        <div role="status" className="rounded-control border border-green/30 bg-green-bg px-4 py-2.5 text-body font-medium text-green">
          {state.message}
        </div>
      )}
      {!state.ok && state.error && (
        <div role="alert" className="rounded-control border border-red/30 bg-red-bg px-4 py-2.5 text-body font-medium text-red">
          {state.error}
        </div>
      )}

      <Card padding="p-5">
        <div className="mb-3 text-card-title font-semibold text-ink">Colores</div>
        <div className="grid grid-cols-2 gap-4">
          {COLOR_FIELDS.map((f) => (
            <label key={f.name} className="flex items-center gap-3 text-meta text-ink-2">
              <input
                type="color"
                name={f.name}
                defaultValue={values[f.name]}
                className="h-10 w-14 cursor-pointer rounded border border-line bg-card"
              />
              {f.label}
            </label>
          ))}
        </div>
      </Card>

      <Card padding="p-5">
        <div className="mb-3 text-card-title font-semibold text-ink">Tipografías</div>
        <div className="grid grid-cols-2 gap-4">
          <label className="text-meta text-ink-2">
            Títulos
            <select name="headingFont" defaultValue={values.headingFont} className="mt-1 h-10 w-full rounded-control border border-line bg-card px-3 text-body text-ink">
              {FONT_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </label>
          <label className="text-meta text-ink-2">
            Cuerpo
            <select name="bodyFont" defaultValue={values.bodyFont} className="mt-1 h-10 w-full rounded-control border border-line bg-card px-3 text-body text-ink">
              {FONT_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </label>
        </div>
      </Card>

      <Card padding="p-5">
        <label className="mb-2 block text-card-title font-semibold text-ink">Tono de voz (opcional)</label>
        <p className="mb-2 text-meta text-ink-2">Lo usa el asistente de IA al pulir el texto de la reseña.</p>
        <textarea
          name="toneOfVoice"
          defaultValue={values.toneOfVoice ?? ""}
          rows={3}
          maxLength={280}
          placeholder="Ej: cercano, cálido, sin tecnicismos."
          className="w-full resize-none rounded-control border border-line bg-card p-3 text-body text-ink outline-none focus:border-accent"
        />
      </Card>

      <Card padding="p-5">
        <label className="mb-2 block text-card-title font-semibold text-ink">Logo (opcional)</label>
        <p className="mb-2 text-meta text-ink-2">Por defecto se usa el logo del negocio. Pegá una URL para sobrescribirlo.</p>
        <input
          type="url"
          name="logoOverrideUrl"
          defaultValue={values.logoUrl ?? ""}
          placeholder="https://…"
          className="h-10 w-full rounded-control border border-line bg-card px-3 font-mono text-meta text-ink outline-none focus:border-accent"
        />
      </Card>

      <div className="flex justify-end pt-1">
        <button type="submit" disabled={pending} className="h-10 rounded-control bg-accent px-[18px] text-body font-semibold text-white transition-colors hover:bg-accent-dark disabled:opacity-70">
          {pending ? "Guardando…" : "Guardar kit"}
        </button>
      </div>
    </form>
  );
}
```

- [ ] **Step 3: Implementar la página**

`src/app/(panel)/marketing/brand-kit/page.tsx`:

```tsx
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { getMarketingContext } from "@/lib/marketing/page-context";
import { resolveBrandKit } from "@/lib/marketing/brand-kit";
import { BrandKitForm } from "../_components/BrandKitForm";
import { BusinessSelector } from "../_components/BusinessSelector";

export default async function BrandKitPage({
  searchParams,
}: {
  searchParams: Promise<{ businessId?: string }>;
}) {
  const ctx = await getMarketingContext((await searchParams).businessId);
  if (!ctx) return <p className="text-body text-ink-2">No autorizado.</p>;

  const kit = await prisma.brandKit.findUnique({ where: { businessId: ctx.business.id } });
  const values = resolveBrandKit(kit, ctx.business.logoUrl);

  return (
    <div className="max-w-[680px]">
      <div className="mb-4 flex items-center justify-between gap-4">
        <PageHeader title="Kit de marca" subtitle="Identidad visual aplicada a tus publicaciones." />
        <BusinessSelector options={ctx.options} current={ctx.business.id} />
      </div>
      <BrandKitForm businessId={ctx.business.id} values={values} />
    </div>
  );
}
```

- [ ] **Step 4: Verificar compilación y lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: sin errores.

- [ ] **Step 5: Commit**

```bash
git add src/app/(panel)/marketing/actions.ts src/app/(panel)/marketing/_components/BrandKitForm.tsx src/app/(panel)/marketing/brand-kit/page.tsx
git commit -m "feat(marketing): pagina y action del kit de marca"
```

---

## Task 14: Captura de texto en el flujo público (5★)

**Files:**
- Modify: `tests/submit-review.test.ts`
- Modify: `src/app/r/_components/ReviewFlow.tsx`

El backend ya conserva `comment`/`contactName` (ver `buildReviewCreateData`); solo falta el paso de UI y un test que fije el comportamiento para 5★.

- [ ] **Step 1: Agregar el test que fija el caso 5★ con comentario**

Agregar a `tests/submit-review.test.ts` dentro del `describe`:

```typescript
  it("5 estrellas con comentario: redirige a Google y conserva el texto", () => {
    const d = buildReviewCreateData({ ...base, starRating: 5, comment: "Excelente trato", contactName: "Ana" });
    expect(d.outcome).toBe("REDIRECTED_GOOGLE");
    expect(d.comment).toBe("Excelente trato");
    expect(d.contactName).toBe("Ana");
  });
```

- [ ] **Step 2: Correr el test para verificar que pasa (comportamiento ya soportado)**

Run: `npx vitest run tests/submit-review.test.ts`
Expected: PASS (3 tests). Confirma que el modelo de datos ya soporta el caso; el resto de la task es UI.

- [ ] **Step 3: Agregar estado y un terminal de captura en `ReviewFlow`**

En `src/app/r/_components/ReviewFlow.tsx`, cambiar el tipo de `terminal` para incluir `"capture"`:

```tsx
  const [terminal, setTerminal] = useState<null | "capture" | "high" | "low" | "thanks">(null);
```

Y en `sendRating`, cuando es alto, mostrar primero la captura en vez de enviar directo:

```tsx
  function sendRating() {
    if (preview || stars === 0) return;
    if (stars >= starThreshold) setTerminal("capture");
    else setTerminal("low");
  }
```

- [ ] **Step 4: Renderizar la pantalla de captura (saltable) antes del terminal "high"**

En el bloque de `body`, agregar una rama **antes** de `else if (!preview && terminal === "high")`:

```tsx
  if (!preview && terminal === "capture") {
    body = (
      <div className="flex flex-1 flex-col">
        <h2 className="text-[19px] font-semibold tracking-tight text-ink">¡Gracias! ¿Nos dejás tu reseña?</h2>
        <p className="mt-1 text-meta text-ink-2">La copiamos para que solo la pegues en Google.</p>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={4}
          placeholder="Contanos tu experiencia…"
          className="mt-4 w-full resize-none rounded-control border border-line bg-card p-3 text-body text-ink outline-none focus:border-accent focus:shadow-[0_0_0_3px_var(--ac-bg)]"
        />
        <input
          value={contactName}
          onChange={(e) => setContactName(e.target.value)}
          placeholder="Tu nombre (opcional)"
          className="mt-2.5 h-11 w-full rounded-control border border-line bg-card px-3 text-body text-ink outline-none focus:border-accent focus:shadow-[0_0_0_3px_var(--ac-bg)]"
        />
        <div className="mt-auto flex flex-col gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              if (comment.trim()) {
                navigator.clipboard?.writeText(comment).catch(() => {});
              }
              submit({ comment, contactName }, "high");
            }}
            className="w-full rounded-control bg-accent py-3 text-[15px] font-semibold text-white transition-colors hover:bg-accent-dark disabled:opacity-60"
          >
            Copiar e ir a Google
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => submit({}, "high")}
            className="w-full rounded-control border border-line bg-card py-2.5 text-[13px] font-medium text-ink-2 transition-colors hover:border-accent hover:text-accent disabled:opacity-60"
          >
            Ir directo a Google
          </button>
        </div>
      </div>
    );
  } else if (!preview && terminal === "high") {
```

(El resto de las ramas del `if/else if` quedan igual.)

- [ ] **Step 5: Verificar build, lint y tests**

Run: `npm run lint && npx vitest run`
Expected: sin errores; todos los tests verdes.

- [ ] **Step 6: Commit**

```bash
git add tests/submit-review.test.ts src/app/r/_components/ReviewFlow.tsx
git commit -m "feat(marketing): captura opcional del texto en resenas 5 estrellas"
```

---

## Task 15: Route handler de preview (PNG en vivo)

**Files:**
- Create: `src/app/(panel)/marketing/preview/route.ts`

- [ ] **Step 1: Implementar el handler**

```typescript
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { marketingBusinessWhere } from "@/lib/marketing/context";
import { resolveBrandKit } from "@/lib/marketing/brand-kit";
import { isTemplateKey } from "@/lib/marketing/templates";
import { renderPostPng } from "@/lib/marketing/render";
import type { PostFormat } from "@/lib/marketing/formats";

export const runtime = "nodejs";

/** GET /marketing/preview?businessId&templateKey&format&quote&rating&attribution */
export async function GET(req: Request): Promise<Response> {
  const user = await requireUser();
  if (user.role !== "BUSINESS_ADMIN" && user.role !== "AGENCY_ADMIN") {
    return new Response("Forbidden", { status: 403 });
  }
  const url = new URL(req.url);
  const q = url.searchParams;

  const business = await prisma.business.findFirst({
    where: marketingBusinessWhere(user, q.get("businessId") ?? undefined),
    select: { id: true, name: true, logoUrl: true },
  });
  if (!business) return new Response("Not found", { status: 404 });

  const templateKey = q.get("templateKey") ?? "elegante";
  if (!isTemplateKey(templateKey)) return new Response("Bad template", { status: 400 });

  const format = (q.get("format") === "STORY" ? "STORY" : "SQUARE") as PostFormat;
  const rating = Math.max(1, Math.min(5, Number(q.get("rating") ?? "5")));
  const quote = (q.get("quote") ?? "").slice(0, 280) || "Tu reseña aparecerá aquí.";
  const attribution = q.get("attribution") || null;

  const kit = await prisma.brandKit.findUnique({ where: { businessId: business.id } });
  const values = resolveBrandKit(kit, business.logoUrl);

  try {
    const png = await renderPostPng({
      templateKey,
      format,
      quote,
      rating,
      attribution,
      businessName: business.name,
      kit: values,
    });
    return new Response(Buffer.from(png), {
      headers: { "Content-Type": "image/png", "Cache-Control": "no-store" },
    });
  } catch {
    return new Response("Render error", { status: 500 });
  }
}
```

- [ ] **Step 2: Verificar compilación**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add src/app/(panel)/marketing/preview/route.ts
git commit -m "feat(marketing): route handler de preview PNG"
```

---

## Task 16: Actions de crear y borrar publicación

**Files:**
- Modify: `src/app/(panel)/marketing/actions.ts`

- [ ] **Step 1: Agregar imports necesarios al inicio de `actions.ts`**

Debajo de los imports existentes, agregar:

```typescript
import { z } from "zod";
import { resolveBrandKit } from "@/lib/marketing/brand-kit";
import { renderPostPng } from "@/lib/marketing/render";
import { uploadPostImage, blobKey } from "@/lib/marketing/storage";
import { isTemplateKey } from "@/lib/marketing/templates";
import type { PostFormat } from "@/lib/marketing/formats";
```

- [ ] **Step 2: Agregar el esquema y la action `createPost`**

```typescript
const createPostSchema = z.object({
  businessId: z.string().min(1),
  reviewId: z.string().optional().nullable(),
  templateKey: z.string().refine(isTemplateKey, "Plantilla inválida."),
  quoteText: z.string().trim().min(1, "El texto no puede estar vacío.").max(280),
  starRating: z.coerce.number().int().min(1).max(5),
  attribution: z.string().trim().max(80).optional().nullable(),
  formats: z.array(z.enum(["SQUARE", "STORY"])).min(1),
});

export type CreatePostResult =
  | { ok: true; postId: string }
  | { ok: false; error: string };

export async function createPost(raw: unknown): Promise<CreatePostResult> {
  const parsed = createPostSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  const input = parsed.data;

  let businessId: string;
  try {
    businessId = await assertBusiness(input.businessId);
  } catch {
    return { ok: false, error: "No tenés permisos para este negocio." };
  }

  const user = await requireUser();
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { name: true, logoUrl: true },
  });
  if (!business) return { ok: false, error: "Negocio no encontrado." };

  const kitRow = await prisma.brandKit.findUnique({ where: { businessId } });
  const kit = resolveBrandKit(kitRow, business.logoUrl);

  // Fila primero (necesitamos el id para la clave de Blob), luego se rellenan URLs.
  const post = await prisma.marketingPost.create({
    data: {
      businessId,
      reviewId: input.reviewId ?? null,
      templateKey: input.templateKey,
      quoteText: input.quoteText,
      starRating: input.starRating,
      attribution: input.attribution ?? null,
      createdById: user.id,
    },
  });

  try {
    const urls: Partial<Record<PostFormat, string>> = {};
    for (const format of input.formats as PostFormat[]) {
      const png = await renderPostPng({
        templateKey: input.templateKey as Parameters<typeof renderPostPng>[0]["templateKey"],
        format,
        quote: input.quoteText,
        rating: input.starRating,
        attribution: input.attribution ?? null,
        businessName: business.name,
        kit,
      });
      urls[format] = await uploadPostImage(blobKey(businessId, post.id, format), png);
    }
    await prisma.marketingPost.update({
      where: { id: post.id },
      data: {
        imageSquareUrl: urls.SQUARE ?? null,
        imageStoryUrl: urls.STORY ?? null,
      },
    });
  } catch {
    // Limpieza: sin imágenes la fila no sirve.
    await prisma.marketingPost.delete({ where: { id: post.id } }).catch(() => {});
    return { ok: false, error: "No se pudo generar la imagen. Intentá de nuevo." };
  }

  revalidatePath("/marketing");
  return { ok: true, postId: post.id };
}

export async function deletePost(postId: string): Promise<{ ok: boolean }> {
  const user = await requireUser();
  // Acota el borrado al alcance del rol vía relación business.
  const post = await prisma.marketingPost.findFirst({
    where: { id: postId, business: marketingBusinessWhere(user) },
    select: { id: true },
  });
  if (!post) return { ok: false };
  await prisma.marketingPost.delete({ where: { id: post.id } });
  revalidatePath("/marketing");
  return { ok: true };
}
```

- [ ] **Step 3: Verificar compilación y lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add src/app/(panel)/marketing/actions.ts
git commit -m "feat(marketing): actions crear y borrar publicacion"
```

---

## Task 17: Editor de creación (página + componente cliente)

**Files:**
- Create: `src/app/(panel)/marketing/_components/PostEditor.tsx`
- Create: `src/app/(panel)/marketing/new/page.tsx`

- [ ] **Step 1: Implementar el editor (cliente)**

`src/app/(panel)/marketing/_components/PostEditor.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { createPost } from "../actions";
import { TEMPLATE_LIST, type TemplateKey } from "@/lib/marketing/templates";
import { ALL_FORMATS, FORMAT_LABEL, type PostFormat } from "@/lib/marketing/formats";

export function PostEditor({
  businessId,
  initial,
}: {
  businessId: string;
  initial: { reviewId: string | null; quoteText: string; starRating: number; attribution: string };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [templateKey, setTemplateKey] = useState<TemplateKey>("elegante");
  const [previewFormat, setPreviewFormat] = useState<PostFormat>("SQUARE");
  const [quoteText, setQuoteText] = useState(initial.quoteText);
  const [attribution, setAttribution] = useState(initial.attribution);
  const [formats, setFormats] = useState<PostFormat[]>(["SQUARE"]);

  const previewUrl =
    `/marketing/preview?businessId=${encodeURIComponent(businessId)}` +
    `&templateKey=${templateKey}&format=${previewFormat}` +
    `&rating=${initial.starRating}&quote=${encodeURIComponent(quoteText)}` +
    `&attribution=${encodeURIComponent(attribution)}`;

  function toggleFormat(f: PostFormat) {
    setFormats((cur) => (cur.includes(f) ? cur.filter((x) => x !== f) : [...cur, f]));
  }

  function onCreate() {
    setError(null);
    startTransition(async () => {
      const res = await createPost({
        businessId,
        reviewId: initial.reviewId,
        templateKey,
        quoteText,
        starRating: initial.starRating,
        attribution,
        formats,
      });
      if (res.ok) router.push("/marketing");
      else setError(res.error);
    });
  }

  return (
    <div className="grid grid-cols-[1fr_360px] gap-6 max-lg:grid-cols-1">
      <div className="space-y-[14px]">
        {error && (
          <div role="alert" className="rounded-control border border-red/30 bg-red-bg px-4 py-2.5 text-body font-medium text-red">
            {error}
          </div>
        )}

        <Card padding="p-5">
          <div className="mb-3 text-card-title font-semibold text-ink">Plantilla</div>
          <div className="flex gap-2">
            {TEMPLATE_LIST.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTemplateKey(t.key)}
                className={`rounded-control border px-4 py-2 text-body font-medium transition-colors ${
                  templateKey === t.key ? "border-accent bg-accent-weak text-accent-dark" : "border-line text-ink-2 hover:border-accent"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </Card>

        <Card padding="p-5">
          <label className="mb-2 block text-card-title font-semibold text-ink">Texto de la reseña</label>
          <textarea
            value={quoteText}
            onChange={(e) => setQuoteText(e.target.value)}
            rows={4}
            maxLength={280}
            className="w-full resize-none rounded-control border border-line bg-card p-3 text-body text-ink outline-none focus:border-accent"
          />
          <input
            value={attribution}
            onChange={(e) => setAttribution(e.target.value)}
            placeholder="Atribución (ej. — Ana, clienta)"
            className="mt-2.5 h-11 w-full rounded-control border border-line bg-card px-3 text-body text-ink outline-none focus:border-accent"
          />
        </Card>

        <Card padding="p-5">
          <div className="mb-3 text-card-title font-semibold text-ink">Formatos a generar</div>
          <div className="flex gap-4">
            {ALL_FORMATS.map((f) => (
              <label key={f} className="flex items-center gap-2 text-body text-ink-2">
                <input type="checkbox" checked={formats.includes(f)} onChange={() => toggleFormat(f)} />
                {FORMAT_LABEL[f]}
              </label>
            ))}
          </div>
        </Card>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={onCreate}
            disabled={pending || formats.length === 0 || !quoteText.trim()}
            className="h-10 rounded-control bg-accent px-[18px] text-body font-semibold text-white transition-colors hover:bg-accent-dark disabled:opacity-60"
          >
            {pending ? "Generando…" : "Generar y guardar"}
          </button>
        </div>
      </div>

      <Card padding="p-4">
        <div className="mb-3 flex gap-2">
          {ALL_FORMATS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setPreviewFormat(f)}
              className={`rounded-pill border px-3 py-1 text-meta transition-colors ${
                previewFormat === f ? "border-accent bg-accent font-semibold text-white" : "border-line text-ink-2"
              }`}
            >
              {FORMAT_LABEL[f]}
            </button>
          ))}
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={previewUrl}
          src={previewUrl}
          alt="Vista previa"
          className="w-full rounded-control border border-line"
        />
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Implementar la página del editor**

`src/app/(panel)/marketing/new/page.tsx`:

```tsx
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { getMarketingContext } from "@/lib/marketing/page-context";
import { PostEditor } from "../_components/PostEditor";

export default async function NewPostPage({
  searchParams,
}: {
  searchParams: Promise<{ businessId?: string; reviewId?: string }>;
}) {
  const sp = await searchParams;
  const ctx = await getMarketingContext(sp.businessId);
  if (!ctx) return <p className="text-body text-ink-2">No autorizado.</p>;

  let quoteText = "";
  let starRating = 5;
  let attribution = "";
  let reviewId: string | null = null;

  if (sp.reviewId) {
    const review = await prisma.review.findFirst({
      where: { id: sp.reviewId, businessId: ctx.business.id },
      select: { id: true, comment: true, starRating: true, contactName: true },
    });
    if (review) {
      reviewId = review.id;
      quoteText = review.comment ?? "";
      starRating = review.starRating;
      attribution = review.contactName ? `— ${review.contactName}` : "";
    }
  }

  return (
    <div>
      <PageHeader title="Crear publicación" subtitle="Elegí plantilla, ajustá el texto y generá la imagen." />
      <PostEditor
        businessId={ctx.business.id}
        initial={{ reviewId, quoteText, starRating, attribution }}
      />
    </div>
  );
}
```

- [ ] **Step 3: Verificar compilación y lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add src/app/(panel)/marketing/_components/PostEditor.tsx src/app/(panel)/marketing/new/page.tsx
git commit -m "feat(marketing): editor de creacion con preview en vivo"
```

---

## Task 18: Galería de publicaciones

**Files:**
- Create: `src/app/(panel)/marketing/_components/Gallery.tsx`
- Create: `src/app/(panel)/marketing/page.tsx`

- [ ] **Step 1: Implementar la galería (cliente, con borrar)**

`src/app/(panel)/marketing/_components/Gallery.tsx`:

```tsx
"use client";

import { useTransition } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { deletePost } from "../actions";

export type GalleryItem = {
  id: string;
  quoteText: string;
  imageSquareUrl: string | null;
  imageStoryUrl: string | null;
};

export function Gallery({ items, businessId }: { items: GalleryItem[]; businessId: string }) {
  const [pending, startTransition] = useTransition();

  if (items.length === 0) {
    return (
      <Card padding="p-8">
        <p className="text-center text-body text-ink-2">
          Aún no hay publicaciones.{" "}
          <Link href={`/marketing/new?businessId=${businessId}`} className="font-semibold text-accent">
            Creá la primera
          </Link>
          .
        </p>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-4 max-lg:grid-cols-2 max-sm:grid-cols-1">
      {items.map((it) => {
        const thumb = it.imageSquareUrl ?? it.imageStoryUrl;
        return (
          <Card key={it.id} padding="p-3">
            {thumb && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={thumb} alt={it.quoteText} className="aspect-square w-full rounded-control border border-line object-cover" />
            )}
            <p className="mt-2 line-clamp-2 text-meta text-ink-2">{it.quoteText}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {it.imageSquareUrl && (
                <a href={it.imageSquareUrl} download className="rounded-control border border-line px-3 py-1 text-meta font-semibold text-ink-2 hover:border-accent hover:text-accent">
                  Feed
                </a>
              )}
              {it.imageStoryUrl && (
                <a href={it.imageStoryUrl} download className="rounded-control border border-line px-3 py-1 text-meta font-semibold text-ink-2 hover:border-accent hover:text-accent">
                  Story
                </a>
              )}
              <button
                type="button"
                disabled={pending}
                onClick={() => startTransition(() => void deletePost(it.id))}
                className="ml-auto rounded-control px-3 py-1 text-meta text-red hover:bg-red-bg disabled:opacity-60"
              >
                Borrar
              </button>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Implementar la página de galería**

`src/app/(panel)/marketing/page.tsx`:

```tsx
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { getMarketingContext } from "@/lib/marketing/page-context";
import { Gallery } from "./_components/Gallery";
import { BusinessSelector } from "./_components/BusinessSelector";

export default async function MarketingGallery({
  searchParams,
}: {
  searchParams: Promise<{ businessId?: string }>;
}) {
  const ctx = await getMarketingContext((await searchParams).businessId);
  if (!ctx) return <p className="text-body text-ink-2">No autorizado.</p>;

  const items = await prisma.marketingPost.findMany({
    where: { businessId: ctx.business.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, quoteText: true, imageSquareUrl: true, imageStoryUrl: true },
  });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-4">
        <PageHeader title="Marketing" subtitle="Publicaciones generadas desde tus reseñas." />
        <div className="flex items-center gap-3">
          <BusinessSelector options={ctx.options} current={ctx.business.id} />
          <Link
            href={`/marketing/brand-kit?businessId=${ctx.business.id}`}
            className="h-10 rounded-control border border-line bg-card px-4 text-body font-semibold leading-10 text-ink-2 transition-colors hover:border-accent hover:text-accent"
          >
            Kit de marca
          </Link>
          <Link
            href={`/marketing/new?businessId=${ctx.business.id}`}
            className="h-10 rounded-control bg-accent px-4 text-body font-semibold leading-10 text-white transition-colors hover:bg-accent-dark"
          >
            Nueva publicación
          </Link>
        </div>
      </div>
      <Gallery items={items} businessId={ctx.business.id} />
    </div>
  );
}
```

- [ ] **Step 3: Verificar compilación y lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add src/app/(panel)/marketing/_components/Gallery.tsx src/app/(panel)/marketing/page.tsx
git commit -m "feat(marketing): galeria de publicaciones"
```

---

## Task 19: Acción "Crear publicación" en la lista de reseñas

**Files:**
- Modify: `src/app/(panel)/business/reviews/page.tsx`

- [ ] **Step 1: Importar `Link` (ya está importado) y agregar el botón por reseña**

Dentro del `.map` de `rows`, en el bloque de la reseña, después del `<div>` con `text`/contacto, agregar un enlace a crear publicación. Reemplazar el cierre del bloque de cada fila para incluir la acción:

Localizar:

```tsx
                <div className="mt-1.5 text-[11.5px] text-ink-3">
                  Vendedor: {r.seller?.name ?? "Sin vendedor"}
                  {contact && ` · Contacto: ${contact}`}
                </div>
              </div>
            </div>
```

y reemplazar por:

```tsx
                <div className="mt-1.5 text-[11.5px] text-ink-3">
                  Vendedor: {r.seller?.name ?? "Sin vendedor"}
                  {contact && ` · Contacto: ${contact}`}
                </div>
                {r.comment?.trim() && (
                  <Link
                    href={`/marketing/new?reviewId=${r.id}`}
                    className="mt-2 inline-flex items-center rounded-control border border-line px-3 py-1 text-[11.5px] font-semibold text-ink-2 transition-colors hover:border-accent hover:text-accent"
                  >
                    Crear publicación
                  </Link>
                )}
              </div>
            </div>
```

- [ ] **Step 2: Verificar compilación y lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(panel)/business/reviews/page.tsx"
git commit -m "feat(marketing): accion Crear publicacion en la lista de resenas"
```

---

## Task 20: Asistente de texto con IA (opcional)

**Files:**
- Create: `src/lib/marketing/ai.ts`
- Test: `tests/marketing-ai.test.ts`
- Modify: `package.json` (dependencia `@anthropic-ai/sdk`)
- Modify: `src/app/(panel)/marketing/actions.ts` (action `improveText`)
- Modify: `src/app/(panel)/marketing/_components/PostEditor.tsx` (botón "Mejorar con IA")

- [ ] **Step 1: Instalar la dependencia**

Run: `npm install @anthropic-ai/sdk`
Expected: agregado a `dependencies`.

- [ ] **Step 2: Escribir el test que falla (parte pura: el prompt)**

```typescript
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
```

- [ ] **Step 3: Correr el test para verificar que falla**

Run: `npx vitest run tests/marketing-ai.test.ts`
Expected: FAIL — módulo inexistente.

- [ ] **Step 4: Implementar el módulo**

`src/lib/marketing/ai.ts`:

```typescript
import Anthropic from "@anthropic-ai/sdk";

export function buildImprovePrompt(original: string, toneOfVoice: string | null): string {
  const tono = toneOfVoice ? `Tono de voz de la marca: ${toneOfVoice}.` : "";
  return [
    "Sos un editor de marketing. Reescribí la siguiente reseña de un cliente para",
    "usarla como cita en una publicación, en español, breve (máx 200 caracteres),",
    "conservando el sentido y sin inventar hechos. Devolvé SOLO el texto, sin comillas.",
    tono,
    `Reseña original: "${original}"`,
  ]
    .filter(Boolean)
    .join("\n");
}

/** Pule el texto con Claude. Lanza si no hay API key configurada. */
export async function improveQuote(original: string, toneOfVoice: string | null): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("NO_API_KEY");
  const client = new Anthropic({ apiKey });
  const msg = await client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 300,
    messages: [{ role: "user", content: buildImprovePrompt(original, toneOfVoice) }],
  });
  const block = msg.content.find((b) => b.type === "text");
  const text = block && block.type === "text" ? block.text.trim() : "";
  return text || original;
}
```

- [ ] **Step 5: Correr el test para verificar que pasa**

Run: `npx vitest run tests/marketing-ai.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 6: Agregar la action `improveText` en `actions.ts`**

Agregar import al inicio:

```typescript
import { improveQuote } from "@/lib/marketing/ai";
```

Y al final del archivo:

```typescript
export async function improveText(input: {
  businessId: string;
  text: string;
}): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  let businessId: string;
  try {
    businessId = await assertBusiness(input.businessId);
  } catch {
    return { ok: false, error: "No autorizado." };
  }
  const kit = await prisma.brandKit.findUnique({
    where: { businessId },
    select: { toneOfVoice: true },
  });
  try {
    const text = await improveQuote(input.text, kit?.toneOfVoice ?? null);
    return { ok: true, text };
  } catch {
    return { ok: false, error: "El asistente no está disponible." };
  }
}
```

- [ ] **Step 7: Agregar el botón "Mejorar con IA" en `PostEditor.tsx`**

Agregar import:

```tsx
import { createPost, improveText } from "../actions";
```

Debajo del `<textarea>` del texto (dentro de la `Card` "Texto de la reseña"), agregar:

```tsx
          <button
            type="button"
            disabled={pending || !quoteText.trim()}
            onClick={() =>
              startTransition(async () => {
                const res = await improveText({ businessId, text: quoteText });
                if (res.ok) setQuoteText(res.text);
                else setError(res.error);
              })
            }
            className="mt-2 inline-flex w-fit items-center rounded-control border border-line px-3 py-1.5 text-meta font-semibold text-ink-2 transition-colors hover:border-accent hover:text-accent disabled:opacity-60"
          >
            ✨ Mejorar con IA
          </button>
```

- [ ] **Step 8: Verificar compilación, lint y tests**

Run: `npx tsc --noEmit && npm run lint && npx vitest run`
Expected: sin errores; todos los tests verdes.

- [ ] **Step 9: Commit**

```bash
git add src/lib/marketing/ai.ts tests/marketing-ai.test.ts src/app/(panel)/marketing/actions.ts src/app/(panel)/marketing/_components/PostEditor.tsx package.json package-lock.json
git commit -m "feat(marketing): asistente de texto con IA (opcional)"
```

---

## Task 21: Documentación de variables de entorno y verificación final

**Files:**
- Modify: `CLAUDE.md` (sección "Variables de entorno")

- [ ] **Step 1: Documentar las nuevas variables**

En `CLAUDE.md`, sección "Variables de entorno", agregar:

```markdown
- `BLOB_READ_WRITE_TOKEN` — token de Vercel Blob para guardar imágenes de marketing.
- `ANTHROPIC_API_KEY` — opcional; habilita el asistente de texto IA del editor.
```

- [ ] **Step 2: Correr toda la suite de tests**

Run: `npx vitest run`
Expected: PASS — todos los tests (incluye los nuevos de marketing).

- [ ] **Step 3: Build de producción**

Run: `npm run build`
Expected: build exitoso sin errores de tipos ni de rutas.

- [ ] **Step 4: Verificación manual (con la app corriendo)**

Run: `npm run dev` y verificar:
- `/marketing` carga la galería (vacía al inicio) para BUSINESS_ADMIN.
- `/marketing/brand-kit` guarda colores/fuentes/tono.
- En `/business/reviews`, una reseña con comentario muestra "Crear publicación".
- El editor muestra la preview en vivo y "Generar y guardar" crea la publicación (requiere `BLOB_READ_WRITE_TOKEN`).
- Como AGENCY_ADMIN, el selector de negocio cambia el contexto.

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md
git commit -m "docs(marketing): variables de entorno BLOB y ANTHROPIC"
```

---

## Notas de verificación / dependencias entre tasks

- Tasks 2–10 son librería pura/aislada (TDD donde aplica) y no dependen de la UI.
- Task 9 (render) y 15 (preview) dependen de 6–8 (plantillas) y 5 (fuentes).
- Task 16 (createPost) depende de 9, 10 y 13 (`assertBusiness`).
- Task 17 (editor) depende de 15 (preview) y 16 (createPost).
- Task 20 (IA) es opcional; el resto del feature funciona sin `ANTHROPIC_API_KEY`.
- El feature requiere `BLOB_READ_WRITE_TOKEN` para **generar** imágenes (Tasks 16+);
  el preview (Task 15) no usa Blob y funciona sin ese token.
```
