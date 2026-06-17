# Filtros del panel de agencia — selector de negocio + rango de fechas

Fecha: 2026-06-17
Estado: aprobado (diseño)

## Problema

El resumen de la agencia (`src/app/(panel)/agency/page.tsx`) muestra siempre
métricas **agregadas de todos los negocios** y un periodo fijo (últimos 30 días).
El encabezado actual es texto estático: "Agencia Demo — 1 negocio".

Se necesita poder:

1. **Seleccionar un negocio** y ver la analítica acotada a ese negocio (o a
   todos).
2. **Filtrar por fecha** con presets "Esta semana" / "Este mes" y un rango
   **personalizado** (desde / hasta).

## Decisiones tomadas

- **Semántica de fechas: calendario.** "Esta semana" = desde el lunes hasta hoy.
  "Este mes" = desde el día 1 del mes hasta hoy. (No rolling.)
- **Alcance del selector de negocio: solo analítica.** Filtra KPIs, distribución,
  donut y tendencia. La tabla de gestión de negocios y el formulario
  "+ Nuevo negocio" **no se tocan** (son gestión, no análisis).
- **Periodo anterior (para deltas):** ventana de igual longitud inmediatamente
  anterior a la seleccionada. Aplica a semana, mes y personalizado por igual.
- **Defaults:** "Todos los negocios" + "Este mes".
- **Tendencia de 8 semanas:** respeta el negocio seleccionado pero **no** el rango
  de fechas (es una vista de tendencia propia, siempre últimas 8 semanas).
- **KPI "Negocios":** con "Todos" muestra el conteo de negocios; con un negocio
  seleccionado se reemplaza por **"Vendedores"** de ese negocio.

## Arquitectura: filtrado en el servidor vía URL

El estado de los filtros vive en query params; la página sigue siendo Server
Component que consulta Prisma ya acotado. Sigue el patrón existente del repo
(`?range=` + `searchParams`, ver `business/page.tsx` y `RangeTabs.tsx`).

Query params:

- `?business=<id>` — id del negocio; ausente = todos.
- `?range=week|month|custom` — preset (default `month`).
- `?from=YYYY-MM-DD&to=YYYY-MM-DD` — solo cuando `range=custom`.

Ventajas: compartible, recargable, sin estado cliente complejo.

## Componentes

### `src/lib/date-ranges.ts` (nuevo, puro y testeable)

Helper que dado `{ range, from, to }` y un `now` devuelve:

```ts
type Resolved = {
  range: "week" | "month" | "custom";
  start: Date;           // inicio de la ventana (inclusive)
  end: Date;             // fin de la ventana (exclusivo) — normalmente "ahora"
  prevStart: Date;       // ventana previa de igual longitud (inclusive)
  prevEnd: Date;         // = start (exclusivo)
  label: string;         // texto para el subtítulo, p. ej. "esta semana"
};

function resolveDateRange(input: {
  range?: string;
  from?: string;
  to?: string;
}, now: Date): Resolved;
```

Reglas:

- `week`: `start` = lunes 00:00 de la semana de `now`; `end` = `now`.
- `month`: `start` = día 1 00:00 del mes de `now`; `end` = `now`.
- `custom`: `start` = `from` 00:00; `end` = `to` 23:59:59.999 (fin de día inclusivo).
  Si `from`/`to` faltan, son inválidos o `from > to` → cae a `month`.
- `range` fuera del enum → `month`.
- `prevStart`/`prevEnd`: ventana de igual longitud (`end - start`) justo antes de
  `start`.

Inicio de semana = **lunes** (convención local del proyecto, español).

### `BusinessFilterBar` (client component)

Vive en `agency/_components/BusinessFilterBar.tsx`. Se monta en la prop `actions`
del `PageHeader`. Contiene:

- `<select>` de negocios: opción "Todos los negocios" + una por negocio
  (`{ id, name }`). Al cambiar navega a `?business=<id>` (o sin el param si
  "Todos"), preservando `range`/`from`/`to`.
- Tabs **Esta semana / Este mes / Personalizado**, reutilizando el estilo visual
  de `RangeTabs`. Al cambiar navega `?range=`, preservando `business`.
- Cuando `range=custom`, muestra dos `<input type="date">` (Desde / Hasta) que al
  cambiar navegan con `?from=&to=`.

Usa `useRouter`/`useSearchParams` de `next/navigation`. Navegación con
`scroll: false`.

### `agency/page.tsx` (cambios)

- Firma con `searchParams: Promise<{ business?: string; range?: string; from?: string; to?: string }>`.
- Normaliza `business`: debe pertenecer a la agencia; si no, se ignora (todos).
- Llama `resolveDateRange` para obtener la ventana y la ventana previa.
- `where` base de Prisma para reseñas:
  `{ business: { agencyId }, ...(businessId ? { businessId } : {}) }`.
- KPIs / distribución / donut: usan `inWindow(reviews, start, end)` y
  `inWindow(reviews, prevStart, prevEnd)` para deltas.
- Tendencia: `weeklyAverageTrend` sobre las reseñas del negocio seleccionado (sin
  filtro de fecha).
- Reemplaza el subtítulo fijo por el `BusinessFilterBar`. El subtítulo del
  `PageHeader` pasa a describir la selección actual (negocio + label de rango).
- KPI "Negocios" → "Vendedores" cuando hay negocio seleccionado.

## Flujo de datos

1. `page.tsx` resuelve `searchParams` → `resolveDateRange` → ventana.
2. Construye `where` de Prisma acotado por agencia (+ negocio si aplica).
3. Agrega métricas por ventana (actual y previa) con los helpers de `metrics.ts`.
4. `BusinessFilterBar` navega con nuevos params → recarga server.

## Qué se filtra

| Sección                         | Filtra por negocio | Filtra por fecha |
|---------------------------------|--------------------|------------------|
| 4 KPIs                          | Sí                 | Sí               |
| Distribución de estrellas       | Sí                 | Sí               |
| Donut "Destino de las reseñas"  | Sí                 | Sí               |
| Tendencia de 8 semanas          | Sí                 | No (8 sem fijas) |
| Tabla de negocios + form crear  | No                 | No               |

## Validación y errores (servidor)

- `business`: si no pertenece a la agencia → se ignora (todos).
- `range`: fuera del enum → `month`.
- `custom` con fechas inválidas o `from > to` → `month`.
- Toda normalización ocurre en el servidor antes de consultar; los params nunca
  llegan crudos a Prisma.

## Tests

`src/lib/date-ranges.test.ts` (Vitest):

- `week`: inicio en lunes 00:00; deltas a la semana previa.
- `month`: inicio día 1 00:00.
- `custom` válido: incluye el día `to` completo.
- `custom` inválido (`from > to`, fechas vacías) → cae a `month`.
- Ventana previa de igual longitud y contigua a la actual.

## Fuera de alcance (YAGNI)

- Precálculo/caché de agregados para grandes volúmenes (ya hay TODO en el código).
- Multi-selección de negocios (solo uno o todos).
- Exportación de datos filtrados.
