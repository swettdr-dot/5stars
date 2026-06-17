# Handoff: 5stars — SaaS de gestión de reviews

## Resumen
Plataforma web multi-tenant para que negocios con Google My Business suban su calificación.
Se vende a agencias → negocios → vendedores, con 4 roles en cascada. El corazón del producto
es un **flujo público de review** (mobile-first, sin login) con redirección inteligente:
calificación alta → Google; calificación baja → captura privada.

Este paquete cubre:
- **Paneles autenticados** (shell común + 4 roles, foco en el de Negocio).
- **Flujo público** paso a paso con selector de estrellas y branching.

## Sobre los archivos de diseño
El archivo `5stars.dc.html` es una **referencia de diseño hecha en HTML/React** — un prototipo
que muestra el look & feel y el comportamiento previstos. **No es código de producción para copiar
literal.** La tarea es **recrear estos diseños en tu stack** (Next.js 16 App Router + React 19 +
Tailwind CSS 4 + Prisma/Postgres) usando tus patrones y componentes establecidos.

Cómo abrirlo: es un HTML autocontenido. Abrilo en cualquier navegador (doble click). Usa estilos
inline + variables CSS, así que todos los valores (colores, espaciados, tipos) son inspeccionables
con las DevTools.

## Fidelidad
**Alta fidelidad (hi-fi).** Colores, tipografía, espaciados e interacciones son finales.
Recrea la UI lo más fiel posible con tus librerías y convenciones. Los **gráficos** están hechos a
mano (divs, `conic-gradient`, SVG inline) sólo para el prototipo — en producción usa una librería real
(p. ej. Recharts o Tremor); respeta el aspecto, no la implementación. Los **datos son mock
hardcodeados**; hay que cablearlos a tu API/Prisma.

---

## Design Tokens

### Colores (variables CSS en `:root`)
| Token | Valor | Uso |
|---|---|---|
| `--ac` (acento) | `#5B5BF0` | Primario, botones, activos, links |
| `--ac-d` | `color-mix(in srgb, var(--ac) 84%, #000)` | Hover del primario |
| `--ac-bg` | `color-mix(in srgb, var(--ac) 10%, #fff)` | Fondo de chips/avatares/nav activo |
| `--ac-weak` | `color-mix(in srgb, var(--ac) 6%, #fff)` | Hover sutil |
| `--ink` | `#1A1A1F` | Texto principal |
| `--ink-2` | `#6A6A75` | Texto secundario |
| `--ink-3` | `#9A9AA4` | Texto terciario / placeholders |
| `--line` | `#EAEAEF` | Bordes y divisores |
| `--bg` | `#F6F6F8` | Fondo de la app |
| `--card` | `#FFFFFF` | Fondo de tarjetas |
| `--amber` | `#F5A524` | Estrellas / calificaciones |
| `--green` / `--green-bg` | `#16A34A` / `#E9F7EE` | Reseñas públicas (a Google), deltas positivos |
| `--red` / `--red-bg` | `#E5484D` / `#FCECEC` | Reseñas internas/capturadas, deltas negativos |

Colores de barras de distribución: 5★/4★ = `--amber`, 3★ = `#F0B86E`, 2★/1★ = `#E89A8E`.
Paletas de avatar (bg, texto), rotando por índice:
`#EEF0FF/#4F46E5`, `#E9F7EE/#16A34A`, `#FDF0E6/#D97706`, `#FCE9F0/#DB2777`, `#E6F4F8/#0891B2`, `#F0ECFA/#7C3AED`.

> El acento es **configurable por prop** (`accent`). En el flujo público el branding por-negocio es
> sólo el **logo**; el resto se mantiene neutral.

### Tipografía
- Familia UI: **Geist** (Google Fonts), pesos 400/500/600/700.
- Mono (links, URLs, código): **Geist Mono** 400/500.
- Escala observada: 27px/600 KPI · 22px/600 títulos de página · 16px/600 título topbar ·
  14px/600 títulos de card · 13.5px texto base · 12.5px secundario · 11px/600 uppercase labels
  (letter-spacing .04em). Títulos con `letter-spacing:-.02em`.

### Espaciado y forma
- Radios: cards 13px · controles/inputs 9–10px · chips/badges 20px (pill) · avatares 50%.
- Padding de card: 16–20px. Gap de grids: 14px. Padding de main: 26px 24px.
- Altura de controles: inputs/botones 40–42px · topbar 60px · sidebar 248px de ancho.
- Bordes: 1px `--line`. Sombras muy sutiles (la app es casi flat); login card:
  `0 8px 30px -12px rgba(20,20,40,.12)`.

### Animaciones
- `@keyframes pop` (scale .7→1.18→1, .4s) para checkmarks de éxito.
- Transiciones: barras de progreso/relleno `.4–.6s cubic-bezier(.2,.8,.2,1)`; hovers `.12–.15s`.
- Estrellas del selector: `transform: scale()` 1 → 1.1 (seleccionada) / 1.18 (hover).

---

## Shell autenticado

**Layout:** sidebar fija (248px) + área principal (topbar sticky 60px + main scroll).
Variante **topbar**: la navegación pasa a la barra superior y se oculta el sidebar
(controlado por prop `navDefault: "sidebar" | "topbar"`). El contenido se alinea a la
izquierda (`max-width:1320px; margin:0`), pegado al sidebar.

**Sidebar:**
- Logo: cuadrado 30px radius 8px fondo `--ac`, glifo ★ blanco + wordmark "5stars" 16.5px/600.
- **Selector de rol** (botón con avatar + nombre org + rol): abre dropdown "Ver panel como"
  con los 4 roles (dot de color + check en el activo). Cada rol cambia nav + contenido.
- Nav: ítems con icono line (18px, stroke 1.7), label 13.5px; activo = fondo `--ac-bg`,
  texto `--ac-d`, peso 600. Badge opcional (p. ej. Reseñas "12").
- Pie: botón "Ver flujo público ↗" (dashed) + "Cerrar sesión".

**Topbar:** título de página (modo sidebar) o nav (modo topbar) · buscador (pill, placeholder) ·
avatar usuario "JM".

### Roles y navegación
- **SUPER_ADMIN** — org "5stars HQ". Nav: Resumen · Agencias · Ajustes.
- **AGENCY_ADMIN** — org "Pulse Digital". Nav: Resumen · Negocios · Ajustes.
- **BUSINESS_ADMIN** — org "Café Aroma" (foco principal). Nav: Resumen · Reseñas · Preguntas ·
  Vendedores · Mi QR/Enlace · Ajustes.
- **SELLER** — "Lucía Fernández". Nav: Mi rendimiento · Mi enlace.

---

## Pantallas

### Login
Centrado, card 380px. Logo + "Iniciá sesión" + email/password + botón primario "Ingresar".
Fondo radial sutil con `--ac-bg`. Inputs con focus ring `0 0 0 3px var(--ac-bg)`.

### Resumen (overview) — varía por rol
- **Fila de 4 KPIs**: ícono + label + valor 27px/600 + unidad + delta (↑ verde / ↓ rojo) + nota.
  Negocio: Promedio 4.6/5 · Reseñas 1.284 · A Google 71% · Internas 29%.
- **Distribución de calificaciones** (card): toggle **Barras / Columnas** (variación de gráfico).
  - Barras: filas 5★→1★ con track 10px, relleno de color por estrella, count + %.
  - Columnas: barras verticales con count arriba y label abajo.
- **Destino de las reseñas** (card): donut `conic-gradient(--ac 0→71%, #E6E6EC resto)`, agujero
  blanco con "71% / a Google" + leyenda (A Google / Internas).
- **Reseñas recientes** (lista): avatar inicial + texto + meta (vendedor · tiempo) + estrellas
  ámbar + badge canal (Google verde / Interno gris). Header con "Ver todo →".
- **Tendencia** (card): sparkline SVG (área con gradiente del acento + línea + punto final),
  valor grande + delta verde, ejes "Hace 8 sem / Hoy".
- Selector de rango: 7 / 30 / 90 días (activo = fondo blanco + borde).

### Reseñas (Negocio)
Filtros pill: Todas · A Google · Internas · Bajas (<5) con conteos. Lista de filas:
avatar, estrellas (★ llenas/vacías), badge ("Pública en Google" verde / "Capturada (privada)" rojo),
tiempo, texto, vendedor y contacto opcional. El filtro activo = fondo `--ac` texto blanco.

### Preguntas (constructor) — con vista previa en vivo
Layout de **dos columnas**: `grid-template-columns: minmax(0,1fr) 348px; gap:26px; align-items:start`.

**Columna izquierda — constructor:** lista ordenable (handle ⋮⋮) de preguntas: número en chip,
título, tipo ("Opción múltiple" / "Texto abierto · opcional"), chips de opciones, y toggle on/off.
Cada card es **clicable** y selecciona ese paso para previsualizarlo (borde + fondo de acento en la
card activa: `border 1.5px var(--ac)`, `background var(--ac-weak)`; inactiva `var(--line)`/`var(--card)`).
Botón dashed "+ Agregar pregunta". Nota fija (también clicable → previsualiza el paso de estrellas):
el **paso final siempre** es el selector de 1–5 estrellas; ≥ umbral (`threshold`, default 5★) →
Google, menor → captura privada.

**Columna derecha — vista previa en vivo (sticky `top:84px`):** mock de celular (330×560, borde
9px `#14141f`, radius 36px) que renderiza el paso seleccionado **exactamente como lo ve el cliente**
(header con logo + nombre + barra de progreso; opciones con emoji, o textarea, o selector de
estrellas estático). Pie del celular con navegación propia: ◀ / ▶ + 4 **puntos** (el activo se
ensancha a 18px en `--ac`). Debajo, contador "Paso X de 4 · sincronizado con tu selección".
Encabezado de la columna: "VISTA PREVIA EN VIVO" + indicador verde "Como lo ve el cliente".

**Estado que lo controla:** `previewStep` (0–3: las 3 preguntas + el paso de estrellas). Lo
modifican: click en una card, click en un punto, los botones ◀/▶, y la nota de "paso final".
Es de **solo lectura** (la vista previa no avanza sola ni captura datos); refleja la configuración.

> Implementación: en producción, esta vista previa debe renderizar el **mismo componente** del flujo
> público (modo "preview", sin envíos) alimentado por la config de preguntas/umbral/logo del negocio,
> para garantizar paridad 1:1 entre lo que se edita y lo que ve el cliente.

### Vendedores (Negocio)
Tabla: Vendedor (avatar + nombre + email) · Reseñas · Promedio (ámbar) · % a Google
(mini barra + valor). CTA primario "+ Nuevo vendedor".

### Mi QR / Enlace
Card con **QR** (placeholder con 3 finder patterns + logo central — reemplazar por QR real) +
"Descargar QR". Enlace público (input mono `5stars.app/r/cafearoma` + "Copiar"). Card de stats
(escaneos / reseñas generadas). CTA para previsualizar el flujo.

### Ajustes (Negocio)
- **Umbral de estrellas**: segmented 1–5 (default 5). Define el corte Google vs. privado.
- **URL de Google**: input con prefijo `https://` (mono).
- **Logo del negocio**: slot 64×64 (placeholder rayado) + "Subir logo". Resto del diseño neutral.
- Footer: Cancelar / Guardar cambios.

### Agencias / Negocios (Super / Agencia)
Tabla genérica reutilizable: entidad (avatar + nombre + subtítulo) · columna 2
(Negocios / Vendedores) · Reseñas · Promedio · Estado (badge). CTA "+ Nueva agencia / negocio".

---

## Flujo público (mobile-first, sin login)
Mock de celular 362×712 (notch). Header: logo del negocio (placeholder) + nombre + **barra de
progreso** (relleno `--ac`, transición .4s). Pasos:

1. **Pregunta 1–3**: opción múltiple (botones grandes con emoji + label; al tocar avanza) o
   texto abierto opcional (textarea + "Continuar").
2. **Selector de estrellas**: 5 estrellas SVG (46px). Hover/seleccionada rellenan ámbar con
   `scale`. Label dinámico ("¡Excelente! 🤩", etc.). Botón "Enviar calificación"
   (deshabilitado hasta elegir).
3. **Branching**:
   - **Alta (≥ umbral)**: check verde (anim `pop`), 5★, "¡Gracias por tu calificación!" + CTA
     "Calificar en Google".
   - **Baja (< umbral)**: "Tu opinión es privada" — textarea "¿Qué podemos mejorar?" + input de
     contacto opcional → "Enviar" → **Gracias** (check acento). **No** se publica.

### Estados de UX a implementar (no incluidos en el mock)
- **Carga**: skeletons en KPIs/tablas/charts.
- **Vacío**: "Aún no hay reseñas" con ilustración + CTA a compartir QR.
- **Error**: banners/toasts; reintento en fetch.
- **Éxito**: toasts al guardar ajustes / crear entidades.
- **Validación**: URL de Google válida; umbral 1–5; email/teléfono de contacto.

---

## State Management (lo que modela el prototipo)
`role` (4 valores) · `section` (overview/reviews/questions/sellers/qr/settings/entities) ·
`nav` (sidebar/topbar) · `range` (7d/30d/90d) · `chart` (bars/cols) · `reviewFilter` ·
`threshold` (1–5) · `previewStep` (0–3, vista previa del constructor) · y estado del flujo público: `publicOpen`, `pScreen`
(q1/q2/q3/rating/high/low/thanks), `pRating`, `pHover`.

En producción esto se mapea a: rol desde sesión/JWT, `section` a rutas del App Router,
`threshold`/preguntas/URL/logo desde el negocio (Prisma), métricas desde queries agregadas,
y el flujo público a una ruta dinámica por slug de negocio/vendedor sin auth.

## Props configurables (en el prototipo)
- `accent` (color) — acento de la plataforma.
- `businessName` (texto) — nombre del negocio en panel y flujo público.
- `navDefault` (`sidebar` | `topbar`) — variante de layout.

## Assets
- **Iconos**: line icons inline (home, star, chat, list, users, qr, gear, building, briefcase,
  chart). Reemplazables por tu set (Lucide encaja bien con el estilo).
- **Emojis**: sólo en el flujo público (opciones de respuesta y label de rating).
- **Logo del negocio** y **QR**: placeholders — proveer reales.
- **Fuentes**: Geist + Geist Mono desde Google Fonts.

## Archivos
- `5stars.dc.html` — prototipo completo (shell + 4 roles + flujo público). Toda la lógica de
  interacción y los valores de diseño están aquí.
