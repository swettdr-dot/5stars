# QR y enlace propio por vendedor en la pestaña Vendedores

Fecha: 2026-06-17

## Objetivo

En la pestaña **Vendedores** (perfil del negocio) cada fila debe poder mostrar el
**QR** y el **enlace público propio** de ese vendedor, para que el administrador
del negocio (o la agencia) pueda compartirlos. Hoy la tabla solo muestra métricas
(reseñas, promedio, % a Google).

## Alcance

- Aplica a **ambas vistas** que renderizan la tabla de vendedores, ya que comparten
  el componente `SellersTable`:
  - Panel del negocio: `src/app/(panel)/business/sellers/page.tsx` (`BUSINESS_ADMIN`).
  - Vista de agencia: `src/app/(panel)/agency/[businessId]/sellers/page.tsx`
    (`AGENCY_ADMIN`/`SUPER_ADMIN` vía `resolveManageableBusiness`).
- Contenido de cada vendedor: **QR + Descargar** y **Enlace + Copiar**.
- **Fuera de alcance:** enlace "Ver como cliente", tracking de escaneos, cambios de
  modelo de datos, y cambios a la ruta de imagen QR existente.

## Enfoque

Generar el enlace y el QR en el servidor (en cada `page.tsx`) y renderizar el
detalle de forma expandible en el cliente.

### 1. Datos (servidor, en ambas `page.tsx`)

El tipo `SellerRow` se amplía con dos campos:

- `link: string` — enlace público del vendedor.
- `qr: string` — data URL del PNG del QR.

En cada página:

- Obtener `base = await getBaseUrl()` (mismo helper que usa el panel del vendedor y
  la página QR del negocio).
- Ampliar el `select` de Prisma de `seller.findMany` para incluir `slug` del
  vendedor, y disponer del `slug` del negocio:
  - En `business/sellers/page.tsx`: incluir `business: { select: { slug: true } }`
    en el select del vendedor (o consultar el slug del negocio una vez).
  - En `agency/[businessId]/sellers/page.tsx`: `resolveManageableBusiness` ya
    devuelve el negocio; asegurar que expone `slug` (si no, incluirlo en el select
    del vendedor igual que arriba).
- Por vendedor:
  - `link = `${base}/r/${businessSlug}/${sellerSlug}``
  - `qr = await qrDataUrl(link)`

Razón de generar todos los QR en la carga: los vendedores por negocio son pocos y
`qrDataUrl` es barato. Esto evita depender de la ruta de imagen
`business/sellers/qr/[sellerId]/route.ts`, que solo permite `BUSINESS_ADMIN` y
fallaría (403) en la vista de agencia. **Esa ruta queda intacta** (no se usa aquí,
no se modifica).

### 2. UI (`SellersTable.tsx`)

`SellersTable` pasa a ser componente cliente (`"use client"`) para manejar el estado
de expansión con `useState`.

- Comportamiento: **una sola fila abierta a la vez** (al abrir otra se cierra la
  anterior). Estado: `openId: string | null`.
- La fila del vendedor se vuelve un control accesible que alterna la expansión:
  `aria-expanded`, `aria-controls` apuntando al panel, y un chevron ▸/▾ como
  indicador visual. La fila sigue mostrando las mismas columnas (vendedor, reseñas,
  promedio, % a Google).
- Al expandir, debajo de la fila aparece un panel (`id` correspondiente a
  `aria-controls`) con dos bloques, reutilizando el patrón visual del panel del
  vendedor (`src/app/(panel)/seller/page.tsx`, tarjeta "Mi enlace / QR"):
  - **QR:** recuadro blanco con borde (`<img src={qr} alt="Código QR de <nombre>">`)
    + botón **Descargar QR** (`<a href={qr} download="qr-<slug>.png">`).
  - **Enlace:** campo `input` de solo lectura con el `link` + `CopyButton`.
- Estado vacío (sin vendedores) se mantiene igual.

### 3. Componente `CopyButton` compartido

Hoy `CopyButton` vive en `src/app/(panel)/business/qr/_components/CopyButton.tsx`.
Para reutilizarlo desde `SellersTable` sin acoplar carpetas de features, se **mueve
a una ubicación compartida**: `src/components/ui/CopyButton.tsx`.

- Actualizar el import en `business/qr/page.tsx` a la nueva ubicación.
- `SellersTable` lo importa desde la ubicación compartida.
- El componente no cambia de comportamiento.

## Componentes tocados

- `src/app/(panel)/business/sellers/page.tsx` — enriquecer filas con `link` + `qr`.
- `src/app/(panel)/agency/[businessId]/sellers/page.tsx` — ídem.
- `src/app/(panel)/business/sellers/_components/SellersTable.tsx` — cliente + fila
  expandible; ampliar tipo `SellerRow`.
- `src/components/ui/CopyButton.tsx` — nueva ubicación (movido).
- `src/app/(panel)/business/qr/page.tsx` — actualizar import de `CopyButton`.

## Multi-tenancy

Sin cambios en el modelo de acceso. Cada `page.tsx` ya acota los vendedores a su
negocio (`businessId` de la sesión / negocio resuelto por la agencia). El enlace y
QR se derivan de datos del propio negocio.

## Pruebas

- Verificación manual: expandir una fila muestra QR + enlace correctos; descargar
  produce el PNG; copiar funciona; abrir otra fila cierra la anterior.
- `npm run lint` y `npm run build` deben pasar.
- Si hay tests de QR/metrics existentes (`tests/qr.test.ts`), no deben romperse.
