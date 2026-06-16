# Marketing — Publicaciones desde reseñas

**Fecha:** 2026-06-16
**Estado:** Diseño aprobado, pendiente plan de implementación

## Resumen

Nueva pestaña **Marketing** en el panel que permite convertir una reseña de un
cliente en una **imagen lista para publicar** en Instagram (feed y stories),
manteniendo la **identidad visual del negocio** mediante un **kit de marca**
(colores, tipografías, logo, fondos, tono de voz).

El punto de entrada es la lista de reseñas: se hace clic en una reseña y se pide
"Crear publicación". La imagen se arma con **plantillas prediseñadas
parametrizadas por el kit de marca** (no un editor libre), renderizadas con
`ImageResponse` (Satori, nativo de Next.js 16) y guardadas en **Vercel Blob**.
Las publicaciones quedan en una **galería** dentro del panel.

### Decisiones tomadas (brainstorming)

- **Origen del texto:** se captura el texto también en las reseñas de 5★ antes de
  redirigir a Google (hoy solo se guarda el texto de las internas).
- **Motor de imagen:** plantilla + marca (no IA pura, no híbrido) por texto nítido
  y costo bajo. Render con `ImageResponse`/Satori.
- **Kit de marca:** completo (paleta extendida, tipografías título/cuerpo, fondos,
  tono de voz), pero con **plantillas prediseñadas parametrizadas**, no un editor
  visual libre (eso queda como evolución).
- **Destino:** generar + **galería** guardada en el panel (sin publicación directa
  a Instagram).
- **Formatos:** Cuadrado 1080×1080 y Story 1080×1920.
- **Acceso:** `BUSINESS_ADMIN` (su negocio) y `AGENCY_ADMIN` (sus negocios, vía
  selector de negocio).

## Modelo de datos (Prisma)

### Nuevo modelo `BrandKit` (1:1 con `Business`)

- `businessId` (único, relación 1:1).
- Paleta: `primary`, `accent`, `background`, `text` (colores hex) + `colors String[]`
  (paleta extendida).
- Tipografías: `headingFont`, `bodyFont` (de un set curado que Satori pueda cargar).
- `backgrounds String[]` — URLs de imágenes/texturas subidas a Vercel Blob.
- `toneOfVoice String?` — usado por el asistente de texto IA.
- `logoOverrideUrl String?` — opcional; por defecto se usa `Business.logoUrl`.

### Nuevo modelo `MarketingPost` (item de galería)

- `businessId`, `reviewId String?` (reseña origen), `templateKey`.
- `quoteText` (copia editable del texto de la reseña), `starRating`,
  `attribution String?` (ej. "— Juan, cliente").
- `imageSquareUrl String?`, `imageStoryUrl String?` (una fila puede tener ambos
  tamaños; los formatos son columnas nullable, no una tabla aparte — YAGNI).
- `createdById`, `createdAt`.

### `Review` — sin cambios de esquema

Se reutiliza `comment` para guardar también el texto de las reseñas 5★, y
`contactName` para la atribución. No se agregan enums nuevos.

## Captura de texto en el flujo público (5★)

En `ReviewFlow` (`/r/*`), cuando `starRating >= business.starThreshold` (camino
`REDIRECTED_GOOGLE`), se agrega **un paso intermedio antes de redirigir**:

- Pantalla: "¡Gracias! Escribe tu reseña y te la copiamos para pegarla en Google"
  → `textarea` + nombre opcional.
- **Opcional/saltable:** un botón "Ir a Google" no bloquea la conversión.
- Al continuar: se guarda `Review.comment` (+ `contactName`) con
  `outcome = REDIRECTED_GOOGLE` vía la server action existente del flujo, se copia
  el texto al portapapeles y se redirige a `googleReviewUrl`.
- Se respeta la regla del repo: `/r/*` sigue **sin auth** y solo depende de
  `Business`/`Seller`/`Question`. No se mezcla lógica de panel.

## Pestaña Marketing — navegación y acceso

Visible para `BUSINESS_ADMIN` y `AGENCY_ADMIN` (vía `PanelNav` por rol):

- `/business/marketing` → **Galería** de publicaciones (grid de miniaturas,
  descargar/borrar).
- `/business/marketing/brand-kit` → editor del **Kit de marca**.
- `/business/marketing/new?reviewId=…` → **editor de creación** (plantilla +
  formato, edición de texto, previsualización, generar).
- En `/business/reviews` (lista existente) se agrega la acción **"Crear
  publicación"** por reseña → abre el editor con esa reseña precargada.

### Acceso de la agencia

Como `AGENCY_ADMIN` no tiene `businessId`, la pestaña Marketing muestra un
**selector de negocio** (entre los de su agencia) arriba; el negocio elegido
define el contexto. Todo se acota con `businessWhereForSession` de `tenancy.ts`;
nunca se devuelven filas fuera del alcance del rol. Para `BUSINESS_ADMIN` el
contexto es siempre su propio negocio (sin selector).

## Generación de la imagen (motor de render)

Pipeline server-side (server action o route handler, scoped por tenancy):

1. Carga `BrandKit` + datos del post (texto, estrellas, atribución), acotado al rol.
2. Renderiza la plantilla elegida como **JSX → PNG** con `ImageResponse` (Satori)
   al tamaño pedido (1080×1080 y/o 1080×1920).
3. Sube el/los PNG a **Vercel Blob** → URLs.
4. Crea/actualiza la fila `MarketingPost` con `imageSquareUrl`/`imageStoryUrl`.

**Plantillas** (`src/lib/marketing/templates/`): 2–3 componentes prediseñados,
cada uno una **función pura** `(quote, rating, attribution, brandKit, format) →
JSX`, parametrizada por el kit de marca. Aisladas y testeables sin tocar la BD.

**Fuentes:** Satori requiere los buffers de fuente; se carga un set curado (las
opciones que ofrece el kit) en el momento del render.

**Previsualización:** el mismo route handler sirve un PNG en vivo según los
parámetros actuales del editor, para ver el resultado antes de guardar en galería.

**Asistente de texto IA (opcional):** botón "Mejorar con IA" en el editor que toma
el texto crudo + `toneOfVoice` y devuelve una versión pulida usando Claude
(`claude-opus-4-8` u otro modelo de texto). Si no hay `ANTHROPIC_API_KEY` o no se
usa, se publica el texto tal cual.

**Variables de entorno nuevas:** `BLOB_READ_WRITE_TOKEN` (Vercel Blob) y
`ANTHROPIC_API_KEY` (solo si se usa el asistente).

## Manejo de errores

- **Validación con Zod** en toda mutación (kit, creación de post, captura de texto
  en el flujo público) — patrón del repo.
- Subida a Blob fallida → no se crea/actualiza el `MarketingPost`; error legible al
  editor (sin filas huérfanas).
- Render Satori fallido (fuente que no carga, texto excesivo) → mensaje claro +
  límite de longitud de `quoteText`.
- Asistente IA caído o sin API key → degradación silenciosa al texto original;
  nunca bloquea la generación de la imagen.
- Tenancy: toda consulta/mutación de marketing pasa por `businessWhereForSession`;
  un id fuera de alcance devuelve "no autorizado", no datos.

## Pruebas (Vitest)

- **Plantillas** (funciones puras): el JSX resultante contiene texto/estrellas/
  atribución y aplica colores del kit. Unitario, sin BD.
- **Captura 5★:** el camino `REDIRECTED_GOOGLE` guarda `comment`/`contactName` y
  sigue redirigiendo (extiende los tests de `review-logic`).
- **Tenancy de marketing:** `BUSINESS_ADMIN` solo ve su negocio; `AGENCY_ADMIN`
  solo los suyos; ids ajenos rechazados.
- **Validación Zod:** entradas inválidas del kit y del editor rechazadas.

## Fuera de alcance (evolución futura)

- Editor visual libre de plantillas (drag & drop).
- Render híbrido con IA generando fondos/decoración.
- Publicación directa a Instagram/Meta (API, OAuth, app review).
- Formato horizontal 1200×628 para anuncios de Facebook.
- Integración con Google Business Profile API para importar reseñas.
