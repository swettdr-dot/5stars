# 5stars — SaaS de gestión de reviews

SaaS multi-tenant que ayuda a negocios con Google My Business a mejorar su
calificación de estrellas. Se vende a **agencias**, que lo entregan a sus
**negocios** clientes; cada negocio recolecta reviews vía link/QR público.

**Lógica central del flujo público:** al cliente final se le hacen preguntas
configurables y, al final, se le pide una calificación de estrellas (1–5).
- `starRating >= business.starThreshold` (default 5) → se redirige a
  `googleReviewUrl` (`outcome = REDIRECTED_GOOGLE`).
- `starRating < starThreshold` → se captura internamente con comentario y
  contacto opcional (`outcome = INTERNAL`). **No** redirige a Google.

Jerarquía de roles (aprovisionamiento manual en cascada):

```
SUPER_ADMIN  (dueño SaaS, ve todo)
 └── AGENCY_ADMIN   (solo su agencia y sus negocios)
      └── BUSINESS_ADMIN  (solo su negocio)
           └── SELLER     (solo sus propias reviews/métricas; login opcional)
```

El cliente final **nunca** inicia sesión.

---

## ⚠️ Next.js 16 — leer antes de codear

Este proyecto usa **Next.js 16**, que tiene breaking changes respecto a versiones
anteriores: APIs, convenciones y estructura de archivos pueden diferir de lo que
"recuerdas". **Antes de escribir cualquier código de Next.js, lee la guía
relevante en `node_modules/next/dist/docs/`** y atiende los avisos de deprecación.
No asumas patrones de memoria.

(Esta advertencia también vive en `AGENTS.md`, que sirve a otros agentes.)

---

## Comandos

```bash
npm run dev            # servidor de desarrollo (http://localhost:3000)
npm run build          # build de producción
npm run start          # servir el build
npm run lint           # eslint
npm run test           # vitest run (una pasada)

npm run db:seed        # seed base (incluye SUPER_ADMIN inicial)
npm run db:seed:demo   # seed de datos demo idempotente

npx prisma migrate dev --name <nombre>   # crear/aplicar migración
npx prisma generate                      # regenerar el cliente Prisma
npx prisma studio                        # inspeccionar la BD
```

Para correr un solo test: `npx vitest run <ruta>` o `npx vitest <patrón>`.

---

## Stack

- **Framework:** Next.js 16 (App Router) + **Server Actions**. React 19.
- **Base de datos:** PostgreSQL + **Prisma** ORM.
- **Auth:** Auth.js (NextAuth v5 beta), provider de credenciales (email/password),
  sesión JWT. Definido en `src/lib/auth.ts`.
- **UI:** Tailwind CSS 4. Idioma de la interfaz: **español**.
- **Validación:** Zod.
- **QR:** librería `qrcode`.
- **Tests:** Vitest.
- **Deploy:** Vercel + Postgres gestionado (Neon/Railway).

---

## Estructura

```
src/
  app/
    (auth)/login/          # pantalla de login
    (panel)/               # paneles autenticados, uno por rol
      layout.tsx           # shell de navegación del panel
      super/               # SUPER_ADMIN: CRUD agencias, conteos globales
      agency/              # AGENCY_ADMIN: CRUD negocios, métricas
      business/            # BUSINESS_ADMIN: settings, questions, sellers, métricas
      seller/              # SELLER: su link/QR y métricas propias
    r/                     # flujo público de review (SIN auth)
      [businessSlug]/                     # review genérica
      [businessSlug]/[sellerSlug]/        # review ligada a vendedor
      [businessSlug]/gracias/             # agradecimiento (caso interno)
      _components/ReviewFlow.tsx          # UI del flujo paso a paso
    api/auth/[...nextauth]/  # handler de Auth.js
  lib/
    prisma.ts        # singleton del cliente Prisma (única puerta a la BD)
    auth.ts          # configuración de Auth.js (handlers, auth, signIn/Out)
    session.ts       # acceso a la sesión/usuario actual
    tenancy.ts       # helpers de scoping multi-tenant por rol
    review-logic.ts  # decisión redirect-a-Google vs. captura interna
    review-build.ts  # armado del flujo de review desde la config del negocio
    metrics.ts       # cálculo de métricas (promedio, distribución, etc.)
    password.ts      # hash/verify con bcryptjs
    slug.ts          # generación de slugs
    qr.ts            # generación de QR
  middleware.ts      # protege /super /agency /business /seller → /login
prisma/
  schema.prisma      # modelo de datos
  seed.ts            # seed base
  seed-demo.ts       # seed demo idempotente
docs/superpowers/    # spec y plan del proyecto (ver Referencias)
```

Las páginas de panel usan **Server Actions** (`actions.ts` colocado junto a cada
`page.tsx`) para las mutaciones.

---

## Modelo de datos (Prisma/Postgres)

- **Agency** → tiene muchos `Business` y `User`.
- **Business** → `slug` único, `googleReviewUrl`, `starThreshold` (default 5),
  `logoUrl?`. Pertenece a una `Agency`. Tiene `User`, `Seller`, `Question`, `Review`.
- **User** → `email` único, `passwordHash`, `role`, `agencyId?`, `businessId?`.
  Un usuario puede estar ligado a un `Seller` (login opcional del vendedor).
- **Seller** → `slug` único **dentro del negocio** (`@@unique([businessId, slug])`),
  `userId?` opcional.
- **Question** → `text`, `type` (`TEXT` | `MULTIPLE_CHOICE`), `options[]`, `order`,
  `active`. La pregunta de **estrellas NO se modela**: es un paso final fijo del flujo.
- **Review** → `starRating` (1–5), `outcome` (`REDIRECTED_GOOGLE` | `INTERNAL`),
  `sellerId?`, `comment?`, `contactName?/Phone?/Email?`.
- **Answer** → respuesta a una `Question` ligada a una `Review`.

Enums: `Role`, `QuestionType`, `ReviewOutcome`.

---

## Convenciones y reglas

- **Idioma: español neutro (regla estricta).** Toda comunicación con el usuario y
  todo texto de UI van en **español neutro**, sin voseo ni regionalismos (no usar
  "vos/tenés/podés/dale/acá", etc.; usar "tú puedes" o formas impersonales, "aquí").
- **Multi-tenancy:** toda consulta sobre datos de tenant debe acotarse al rol de
  la sesión. Usa los helpers de `src/lib/tenancy.ts` (p. ej.
  `businessWhereForSession`) en vez de construir filtros a mano. Nunca devuelvas
  filas fuera del alcance del rol.
- **Acceso a datos:** Prisma (`src/lib/prisma.ts`) es la **única** puerta a la BD.
- **Mutaciones:** vía Server Actions, con validación de entrada con **Zod**.
- **El flujo público (`/r/*`) no requiere auth** y solo depende de `Business`,
  `Seller`, `Question`. No mezcles lógica de panel ahí.
- **Modularidad:** cada módulo (`lib/*`, paneles por rol) tiene un propósito claro
  y se comunica por interfaces (server actions / funciones de acceso a datos).
  Mantén los archivos enfocados.
- Sigue los patrones existentes del repo antes de introducir nuevos.

---

## Variables de entorno

- `DATABASE_URL` — conexión Postgres (pooled).
- `DIRECT_URL` — conexión directa para migraciones Prisma.
- `AUTH_SECRET` — secret de Auth.js (NextAuth v5).
- `BLOB_READ_WRITE_TOKEN` — token de Vercel Blob para guardar imágenes de marketing.
- `ANTHROPIC_API_KEY` — opcional; habilita el asistente de texto IA del editor.

---

## Referencias

- Diseño/spec: `docs/superpowers/specs/2026-06-15-reviews-saas-design.md`
- Plan de implementación: `docs/superpowers/plans/2026-06-15-reviews-saas-mvp.md`
- Guía de Next.js 16 (local, autoritativa): `node_modules/next/dist/docs/`
