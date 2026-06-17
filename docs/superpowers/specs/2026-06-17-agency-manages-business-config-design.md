# La agencia gestiona la configuración de sus negocios

Fecha: 2026-06-17

## Resumen

Hoy cada `BUSINESS_ADMIN` administra él mismo las **Preguntas**, los
**Vendedores** y los **Ajustes** de su negocio. Este cambio **invierte** esa
responsabilidad: la **agencia** (`AGENCY_ADMIN`) pasa a editar esas tres áreas
para cada uno de sus negocios, y el negocio queda en **modo lectura**, viendo
también su Resumen, Reseñas y QR. La pestaña de **Marketing** deja de estar
disponible para el negocio (pasa a ser solo de la agencia).

Decisiones tomadas con el usuario:

- Acceso del negocio a Preguntas/Vendedores/Ajustes: **solo lectura** (no se
  quitan las pantallas; se muestran sin poder editar).
- Gestión por la agencia: **detalle por negocio** (entra a un negocio desde su
  lista y obtiene pestañas que reutilizan los componentes actuales).
- Marketing: **se quita del negocio** (queda solo para la agencia).

## Modelo de permisos

Quién puede qué tras el cambio:

| Pantalla | AGENCY_ADMIN | BUSINESS_ADMIN |
|---|---|---|
| Resumen, Reseñas, QR | su vista de agencia | ✅ ve |
| Preguntas, Vendedores, Ajustes | ✅ **edita** (por negocio) | 👁️ **solo lectura** |
| Marketing | ✅ | ❌ removido |

`SUPER_ADMIN` y `SELLER` no cambian. `SUPER_ADMIN` puede alcanzar la gestión
por-negocio impersonando una agencia ("Ver panel como").

### Helper único de autorización

Nuevo helper en `src/lib/tenancy.ts` (o módulo de sesión que pueda usar Prisma):

```
resolveManageableBusiness(businessId): Promise<Business>
```

- Llama a `requireUser()`.
- Exige rol con permiso de gestión: `AGENCY_ADMIN` (o `SUPER_ADMIN` efectivo por
  impersonación). `BUSINESS_ADMIN` y `SELLER` → `FORBIDDEN`.
- Verifica que `businessId` caiga dentro de `businessWhereForSession(user)`
  mediante una consulta (`prisma.business.findFirst({ where: { id: businessId,
  ...businessWhereForSession(user) } })`). Si no existe en alcance → `FORBIDDEN`.
- Devuelve el negocio.

Este helper reemplaza el `ownBusinessId()` y los chequeos inline
`role === "BUSINESS_ADMIN"` que hoy viven en cada `actions.ts`. El `businessId`
deja de leerse de la sesión: viene del formulario (campo oculto) y **siempre se
re-valida** contra el alcance del rol. Por lo tanto el campo oculto no es una
vía de escalada: una agencia solo puede apuntar a negocios de su agencia, y un
negocio no pasa el guard.

## Rutas y navegación

### Agencia (edición, por negocio)

Nuevas rutas con `businessId` en la URL:

- `/agency/[businessId]/questions`
- `/agency/[businessId]/sellers`
- `/agency/[businessId]/settings`

Cada página valida el negocio con `resolveManageableBusiness` y renderiza el
componente reutilizado en modo edición (`canEdit=true`). Comparten:

- Un sub-encabezado con el nombre del negocio.
- Un enlace **"← Volver a negocios"** hacia `/agency`.
- Pestañas locales: **Preguntas · Vendedores · Ajustes**.

Entrada: en el listado de negocios de `/agency` cada fila gana un enlace
**"Gestionar"** que lleva a `/agency/[businessId]/questions` (pestaña por
defecto). Requiere extender `EntityTable` para soportar una acción/enlace por
fila sin romper su uso actual (selección de filtro) en Super y Agencia.

### Negocio (lectura)

Se mantienen las rutas actuales y se renderizan en modo lectura
(`canEdit=false`):

- `/business/questions`
- `/business/sellers`
- `/business/settings`

`/business` (Resumen), `/business/reviews` (Reseñas) y `/business/qr` (QR) no
cambian.

### Navegación (`src/app/(panel)/_components/nav.ts`)

- `BUSINESS_ADMIN`: se **quita Marketing**. Quedan: Resumen, Reseñas, Preguntas
  (lectura), Vendedores (lectura), Mi QR/Enlace, Ajustes (lectura).
- `AGENCY_ADMIN`: sin cambios en el sidebar (Negocios, Marketing). Las pantallas
  por-negocio se alcanzan desde el listado, no desde el sidebar.

### Bloqueo de Marketing al negocio

`getMarketingContext` (`src/lib/marketing/page-context.ts`) deja de aceptar
`BUSINESS_ADMIN` (hoy: `if (role !== "BUSINESS_ADMIN" && role !== "AGENCY_ADMIN")
return null`). Tras el cambio solo `AGENCY_ADMIN` (y `SUPER_ADMIN` efectivo)
operan marketing, de modo que `/marketing` queda cerrada por servidor además de
oculta del menú.

## Componentes

Los componentes compartidos se quedan donde están y los importan ambos paneles
(mismo patrón vigente: la agencia ya importa de `super/_components`). Ganan una
prop `canEdit` y reciben `businessId` para las acciones.

- `QuestionsBuilder`
  (`src/app/(panel)/business/questions/_components/QuestionsBuilder.tsx`):
  - `canEdit=false`: oculta agregar/editar/eliminar/toggle, quita `draggable` y
    el asa de arrastre. **Conserva** la lista y la vista previa en vivo.
  - `canEdit=true`: agrega un campo oculto `businessId` a cada form (crear,
    editar, eliminar, toggle) y al reordenar (que hoy llama una server action
    directa) pasa el `businessId`.
- `SettingsForm`
  (`src/app/(panel)/business/settings/_components/SettingsForm.tsx`):
  - `canEdit=false`: inputs deshabilitados y sin botones Guardar/Cancelar
    (resumen no editable).
  - `canEdit=true`: campo oculto `businessId`.
- Vendedores: `SellersTable` ya es solo display; sin cambios. `NewSellerDialog`
  se renderiza únicamente con `canEdit`, y su form incluye `businessId`.

## Acciones (Server Actions)

Archivos: `questions/actions.ts`, `sellers/actions.ts`, `settings/actions.ts`.

- Cada acción toma `businessId` del `formData` (o argumento ligado para
  `reorderQuestions`) y lo valida con `resolveManageableBusiness(businessId)` en
  lugar de leerlo de la sesión.
- Toda consulta queda acotada a ese `businessId` (igual que hoy verifican
  pertenencia con `where: { id, businessId }`).
- `revalidatePath` apunta a la ruta de agencia en uso, p. ej.
  `/agency/${businessId}/questions`. Opcionalmente también la ruta de negocio
  correspondiente para refrescar la vista de lectura.

## Flujo de datos

1. La página resuelve el negocio objetivo: propio (`user.businessId`) para el
   negocio en lectura; `[businessId]` validado por `resolveManageableBusiness`
   para la agencia.
2. Pasa `canEdit` + `businessId` al componente compartido.
3. Las acciones re-validan el `businessId` por tenancy antes de escribir.

La autorización nunca confía en el campo oculto: el guard re-deriva el alcance
desde la sesión.

## Manejo de errores

- `resolveManageableBusiness` lanza `FORBIDDEN` ante rol sin permiso o negocio
  fuera de alcance; las páginas de agencia muestran "No autorizado" / `notFound`
  según corresponda y las acciones devuelven su estado de error de UI existente
  (`{ ok: false, error }`) cuando aplica.
- Las páginas de negocio en lectura mantienen sus guards actuales
  (`role !== "BUSINESS_ADMIN"` → "No autorizado").

## Pruebas (Vitest)

- `resolveManageableBusiness`: agencia con negocio propio ✅; agencia con negocio
  ajeno ❌; `BUSINESS_ADMIN` ❌; `SELLER` ❌.
- Acciones de questions/sellers/settings: rechazan un `businessId` fuera de
  alcance y aceptan uno propio de la agencia.
- `getMarketingContext`: niega `BUSINESS_ADMIN`.

## Fuera de alcance (YAGNI)

- Reseñas/QR por-negocio desde el panel de agencia (la agencia ya tiene su
  Resumen filtrable por negocio).
- Relocalizar los componentes/acciones compartidos a un módulo neutro: se
  mantiene el cross-import existente para minimizar churn.
