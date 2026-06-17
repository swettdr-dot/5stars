# QR y enlace por vendedor en la pestaña Vendedores — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que cada fila de la pestaña Vendedores (panel del negocio y vista de agencia) pueda expandirse para mostrar el QR y el enlace público propio del vendedor, con botones de descargar y copiar.

**Architecture:** El enlace y el QR (data URL PNG) se generan en el servidor dentro de cada `page.tsx` y se pasan en las filas. `SellersTable` se vuelve componente cliente y, con `useState`, despliega un panel inline (una fila abierta a la vez) con el QR + descargar y el enlace + copiar. Se extrae un helper compartido para construir el enlace público (DRY) y se mueve `CopyButton` a `components/ui` para reutilizarlo.

**Tech Stack:** Next.js 16 (App Router, Server Components), React 19, Prisma, librería `qrcode` (`src/lib/qr.ts`), Tailwind CSS 4, Vitest.

---

## File Structure

- `src/lib/public-links.ts` — **Crear.** Helper puro `sellerReviewLink(base, businessSlug, sellerSlug)` que arma el enlace público del vendedor. Única fuente de verdad del formato del enlace.
- `tests/public-links.test.ts` — **Crear.** Test del helper.
- `src/components/ui/CopyButton.tsx` — **Crear (mover).** `CopyButton` compartido (desde `business/qr/_components`).
- `src/app/(panel)/business/qr/_components/CopyButton.tsx` — **Eliminar** tras mover.
- `src/app/(panel)/business/qr/page.tsx` — **Modificar.** Actualizar import de `CopyButton`.
- `src/app/(panel)/business/sellers/_components/SellersTable.tsx` — **Modificar.** Ampliar `SellerRow` con `link`/`qr`; volverlo cliente; fila expandible.
- `src/app/(panel)/business/sellers/page.tsx` — **Modificar.** Calcular `link`/`qr` por vendedor.
- `src/app/(panel)/agency/[businessId]/sellers/page.tsx` — **Modificar.** Calcular `link`/`qr` por vendedor.

---

## Task 1: Helper compartido del enlace público del vendedor

**Files:**
- Create: `src/lib/public-links.ts`
- Test: `tests/public-links.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/public-links.test.ts
import { describe, expect, it } from "vitest";
import { sellerReviewLink } from "@/lib/public-links";

describe("sellerReviewLink", () => {
  it("arma el enlace público del vendedor", () => {
    expect(sellerReviewLink("https://app.test", "cafe-luna", "ana")).toBe(
      "https://app.test/r/cafe-luna/ana",
    );
  });

  it("no duplica la barra final del base", () => {
    expect(sellerReviewLink("https://app.test/", "cafe-luna", "ana")).toBe(
      "https://app.test/r/cafe-luna/ana",
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/public-links.test.ts`
Expected: FAIL — "Failed to resolve import "@/lib/public-links"" / `sellerReviewLink is not a function`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/public-links.ts

/** Enlace público del flujo de review ligado a un vendedor: `<base>/r/<negocio>/<vendedor>`. */
export function sellerReviewLink(
  base: string,
  businessSlug: string,
  sellerSlug: string,
): string {
  const root = base.replace(/\/$/, "");
  return `${root}/r/${businessSlug}/${sellerSlug}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/public-links.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/public-links.ts tests/public-links.test.ts
git commit -m "feat(lib): helper sellerReviewLink para el enlace público del vendedor"
```

---

## Task 2: Mover `CopyButton` a `components/ui`

**Files:**
- Create: `src/components/ui/CopyButton.tsx`
- Delete: `src/app/(panel)/business/qr/_components/CopyButton.tsx`
- Modify: `src/app/(panel)/business/qr/page.tsx`

- [ ] **Step 1: Crear el componente en la ubicación compartida**

Crear `src/components/ui/CopyButton.tsx` con exactamente este contenido (idéntico al actual, sin cambios de comportamiento):

```tsx
"use client";
import { useState } from "react";

/** Botón "Copiar" que copia un valor al portapapeles. */
export function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-live="polite"
      className="h-10 shrink-0 rounded-control border border-line bg-card px-[14px] text-meta font-semibold text-ink transition-colors hover:border-accent hover:text-accent"
    >
      {copied ? "¡Copiado!" : "Copiar"}
    </button>
  );
}
```

- [ ] **Step 2: Eliminar el componente viejo**

```bash
git rm "src/app/(panel)/business/qr/_components/CopyButton.tsx"
```

- [ ] **Step 3: Actualizar el import en la página QR del negocio**

En `src/app/(panel)/business/qr/page.tsx`, reemplazar:

```tsx
import { CopyButton } from "./_components/CopyButton";
```

por:

```tsx
import { CopyButton } from "@/components/ui/CopyButton";
```

- [ ] **Step 4: Verificar que compila**

Run: `npm run build`
Expected: build OK (sin errores de import de `CopyButton`).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor(ui): mover CopyButton a components/ui para reutilizarlo"
```

---

## Task 3: Calcular `link`/`qr` por vendedor en ambas páginas

Esta tarea amplía el tipo `SellerRow` (definido en `SellersTable.tsx`) y rellena los datos en las dos páginas. `SellersTable` aún no los renderiza (los ignora), pero el proyecto compila.

**Files:**
- Modify: `src/app/(panel)/business/sellers/_components/SellersTable.tsx` (solo el tipo)
- Modify: `src/app/(panel)/business/sellers/page.tsx`
- Modify: `src/app/(panel)/agency/[businessId]/sellers/page.tsx`

- [ ] **Step 1: Ampliar el tipo `SellerRow`**

En `src/app/(panel)/business/sellers/_components/SellersTable.tsx`, agregar dos campos al tipo `SellerRow` (después de `pct`):

```ts
export type SellerRow = {
  id: string;
  name: string;
  /** Email del User vinculado (login opcional); null si no tiene. */
  email: string | null;
  reviews: number;
  /** Promedio de estrellas (0 si aún no tiene reseñas). */
  avg: number;
  /** % de reseñas redirigidas a Google (0–100). */
  pct: number;
  /** Enlace público propio del vendedor. */
  link: string;
  /** Slug del vendedor (para nombrar el archivo del QR descargado). */
  slug: string;
  /** Data URL (PNG) del código QR del enlace. */
  qr: string;
};
```

- [ ] **Step 2: Enriquecer las filas en el panel del negocio**

En `src/app/(panel)/business/sellers/page.tsx`:

1. Agregar imports (junto a los existentes):

```ts
import { qrDataUrl } from "@/lib/qr";
import { getBaseUrl } from "@/lib/base-url";
import { sellerReviewLink } from "@/lib/public-links";
```

2. Incluir `slug` y el `slug` del negocio en el `select` de `seller.findMany`:

```ts
  const sellers = await prisma.seller.findMany({
    where: { businessId: user.businessId },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      business: { select: { slug: true } },
      user: { select: { email: true } },
      reviews: { select: { starRating: true, outcome: true } },
    },
  });
```

3. Obtener la base y construir las filas de forma asíncrona (reemplazar el bloque `const rows = sellers.map(...)`):

```ts
  const base = await getBaseUrl();
  const rows: SellerRow[] = await Promise.all(
    sellers.map(async (s) => {
      const m = aggregateMetrics(s.reviews);
      const link = sellerReviewLink(base, s.business.slug, s.slug);
      return {
        id: s.id,
        name: s.name,
        email: s.user?.email ?? null,
        reviews: m.total,
        avg: m.average,
        pct: googlePct(m),
        link,
        slug: s.slug,
        qr: await qrDataUrl(link),
      };
    }),
  );
```

- [ ] **Step 3: Enriquecer las filas en la vista de agencia**

En `src/app/(panel)/agency/[businessId]/sellers/page.tsx`:

1. Agregar imports:

```ts
import { qrDataUrl } from "@/lib/qr";
import { getBaseUrl } from "@/lib/base-url";
import { sellerReviewLink } from "@/lib/public-links";
```

2. Incluir `slug` en el `select` del vendedor (el slug del negocio ya está en `business.slug`):

```ts
  const sellers = await prisma.seller.findMany({
    where: { businessId },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      user: { select: { email: true } },
      reviews: { select: { starRating: true, outcome: true } },
    },
  });
```

3. Obtener la base y construir las filas (reemplazar el bloque `const rows = sellers.map(...)`):

```ts
  const base = await getBaseUrl();
  const rows: SellerRow[] = await Promise.all(
    sellers.map(async (s) => {
      const m = aggregateMetrics(s.reviews);
      const link = sellerReviewLink(base, business.slug, s.slug);
      return {
        id: s.id,
        name: s.name,
        email: s.user?.email ?? null,
        reviews: m.total,
        avg: m.average,
        pct: googlePct(m),
        link,
        slug: s.slug,
        qr: await qrDataUrl(link),
      };
    }),
  );
```

- [ ] **Step 4: Verificar que compila**

Run: `npm run build`
Expected: build OK. (`SellerRow` ahora exige `link`/`slug`/`qr` y ambas páginas los proveen.)

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(sellers): calcular enlace y QR por vendedor en panel y agencia"
```

---

## Task 4: Fila expandible con QR y enlace en `SellersTable`

Convertir `SellersTable` en componente cliente y desplegar el detalle (QR + descargar, enlace + copiar) bajo la fila al hacer click. Una sola fila abierta a la vez.

**Files:**
- Modify: `src/app/(panel)/business/sellers/_components/SellersTable.tsx`

- [ ] **Step 1: Encabezado del archivo, imports y estado**

Al inicio de `src/app/(panel)/business/sellers/_components/SellersTable.tsx`, agregar la directiva de cliente y el import de `useState` y `CopyButton`:

```tsx
"use client";
import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { CopyButton } from "@/components/ui/CopyButton";
```

(El tipo `SellerRow` y el componente `GoogleBar` se mantienen como están tras la Tarea 3.)

- [ ] **Step 2: Reescribir el componente `SellersTable` con fila expandible**

Reemplazar la función `SellersTable` completa por:

```tsx
export function SellersTable({ rows }: { rows: SellerRow[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  if (rows.length === 0) {
    return (
      <Card className="text-center" padding="p-12">
        <p className="text-body font-semibold text-ink">Aún no hay vendedores</p>
        <p className="mt-1 text-meta text-ink-3">
          Crea tu primer vendedor para darle un link/QR propio y atribuir sus reseñas.
        </p>
      </Card>
    );
  }

  return (
    <Card padding="p-0" className="overflow-hidden">
      {/* Encabezado de columnas */}
      <div
        className={`${COLS} border-b border-line py-[11px] text-label font-semibold uppercase tracking-label text-ink-3`}
      >
        <span>Vendedor</span>
        <span>Reseñas</span>
        <span>Promedio</span>
        <span>% a Google</span>
      </div>

      {rows.map((s, i) => {
        const open = openId === s.id;
        const panelId = `seller-qr-${s.id}`;
        return (
          <div key={s.id} className="border-b border-line last:border-b-0">
            {/* Fila clickeable que alterna el detalle */}
            <button
              type="button"
              onClick={() => setOpenId(open ? null : s.id)}
              aria-expanded={open}
              aria-controls={panelId}
              className={`${COLS} w-full py-[14px] text-left transition-colors hover:bg-canvas`}
            >
              {/* Vendedor */}
              <div className="flex min-w-0 items-center gap-[11px]">
                <span className="text-ink-3" aria-hidden>
                  {open ? "▾" : "▸"}
                </span>
                <Avatar name={s.name} index={i} size={32} />
                <div className="min-w-0">
                  <div className="truncate text-body font-semibold text-ink">{s.name}</div>
                  <div className="truncate text-[11.5px] text-ink-3">{s.email ?? "—"}</div>
                </div>
              </div>

              {/* Reseñas */}
              <span className="text-body font-semibold text-ink">{s.reviews}</span>

              {/* Promedio */}
              <span className="text-body font-semibold text-amber">
                {s.reviews === 0 ? "—" : `${s.avg.toFixed(1)} ★`}
              </span>

              {/* % a Google */}
              <GoogleBar pct={s.pct} />
            </button>

            {/* Panel expandible: QR + descargar, enlace + copiar */}
            {open && (
              <div
                id={panelId}
                className="flex flex-col gap-4 border-t border-line bg-canvas px-[18px] py-4 sm:flex-row sm:items-start"
              >
                <div className="flex shrink-0 flex-col items-center gap-3">
                  <div className="flex size-[160px] items-center justify-center rounded-[14px] border border-line bg-white p-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={s.qr} alt={`Código QR del enlace de ${s.name}`} className="size-full" />
                  </div>
                  <a
                    href={s.qr}
                    download={`qr-${s.slug}.png`}
                    className="flex h-[38px] w-[160px] items-center justify-center rounded-control bg-accent text-[13px] font-semibold text-white transition-colors hover:bg-accent-dark"
                  >
                    Descargar QR
                  </a>
                </div>

                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <div className="text-meta font-semibold text-ink-2">Enlace público del vendedor</div>
                  <div className="flex gap-2">
                    <input
                      readOnly
                      value={s.link}
                      aria-label={`Enlace público de ${s.name}`}
                      className="h-10 min-w-0 flex-1 truncate rounded-control border border-line bg-card px-3 font-mono text-meta text-ink-2 focus:outline-none"
                    />
                    <CopyButton value={s.link} />
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </Card>
  );
}
```

- [ ] **Step 3: Verificar lint y build**

Run: `npm run lint && npm run build`
Expected: ambos OK (sin warnings de `@next/next/no-img-element` por el comentario de eslint-disable; sin errores de tipos).

- [ ] **Step 4: Verificación manual**

Run: `npm run dev` y, autenticado como `BUSINESS_ADMIN`, abrir `/business/sellers`.
Expected:
- Cada fila tiene chevron ▸; al hacer click se despliega ▾ mostrando QR + "Descargar QR" y el enlace + "Copiar".
- Abrir una segunda fila cierra la primera (una abierta a la vez).
- "Copiar" muestra "¡Copiado!"; "Descargar QR" baja un PNG `qr-<slug>.png`.
- Repetir como `AGENCY_ADMIN` en `/agency/<businessId>/sellers`: mismo comportamiento.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(panel)/business/sellers/_components/SellersTable.tsx"
git commit -m "feat(sellers): fila expandible con QR y enlace por vendedor"
```

---

## Self-Review

- **Spec coverage:**
  - Fila expandible → Task 4. ✓
  - Ambas vistas (negocio + agencia) → Task 3 (datos en ambas páginas) + Task 4 (componente compartido). ✓
  - QR + Descargar y Enlace + Copiar → Task 4 panel. ✓
  - Generar QR en servidor sin tocar la ruta de imagen → Task 3 usa `qrDataUrl`/`getBaseUrl`; la ruta `qr/[sellerId]/route.ts` no se toca. ✓
  - Mover `CopyButton` a ubicación compartida → Task 2. ✓
  - Multi-tenancy intacto → ambas páginas conservan su `where` por negocio; no se añaden consultas fuera de alcance. ✓
- **Placeholder scan:** sin TBD/TODO; todo el código está completo en cada paso.
- **Type consistency:** `SellerRow` (Task 3) define `link`/`slug`/`qr`; ambas páginas (Task 3) los rellenan; `SellersTable` (Task 4) consume `s.qr`, `s.slug`, `s.link`, `s.name`, `s.email`, `s.reviews`, `s.avg`, `s.pct`. `sellerReviewLink(base, businessSlug, sellerSlug)` (Task 1) se llama con esa firma en ambas páginas. `CopyButton({ value })` (Task 2) se usa con `value`. Consistente.
