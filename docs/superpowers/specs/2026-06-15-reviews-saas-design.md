# Diseño — SaaS de gestión de reviews y mejora de estrellas (Google My Business)

**Fecha:** 2026-06-15
**Estado:** Aprobado para planificación

## 1. Resumen

SaaS multi-tenant que ayuda a negocios (restaurantes, comercios) con Google My
Business a mejorar su calificación de estrellas. El producto se vende a **agencias
de marketing**, que a su vez lo entregan a sus **negocios** clientes. Cada negocio
recolecta reviews mediante un link o QR; al cliente final se le hacen preguntas
configurables y, al final, se le pide una calificación de estrellas. Quienes dan
5 estrellas se redirigen a Google My Business (buscando que repliquen la reseña
allí); quienes dan menos quedan capturados internamente para mejora del negocio.

## 2. Objetivos del MVP

- Recolectar reviews vía link/QR público, sin login para el cliente final.
- Preguntas configurables por negocio; paso final fijo de estrellas (1–5).
- Redirección a Google para 5 estrellas; captura interna para <5.
- Reviews opcionalmente ligadas a un vendedor.
- Paneles por rol con métricas y gestión.
- Aprovisionamiento manual (sin cobros).

### Fuera de alcance (MVP)
- Cobros / suscripciones (Stripe).
- Integración con la API de Google Business Profile (OAuth, lectura de rating real).
- Whitelabel de agencia (dominios/branding propios).
- Notificaciones por email de reviews negativas.

## 3. Jerarquía y roles

```
Dueño SaaS (SUPER_ADMIN)
 └── Agencia (AGENCY_ADMIN)
      └── Negocio (BUSINESS_ADMIN)
           └── Vendedores (SELLER)
```

Cuatro roles con login. Cada usuario está acotado a su nivel:
- **SUPER_ADMIN**: ve y gestiona todo el sistema.
- **AGENCY_ADMIN**: solo su agencia y los negocios de esa agencia.
- **BUSINESS_ADMIN**: solo su negocio.
- **SELLER**: solo sus propias reviews/métricas.

Aprovisionamiento en cascada y manual: el super admin crea agencias (y su admin),
la agencia crea negocios (y su admin), el negocio crea vendedores.

## 4. Modelo de datos

Entidades principales (Prisma/Postgres):

- **Agency**: `id`, `name`.
- **Business**: `id`, `agencyId`, `name`, `logoUrl`, `googleReviewUrl`,
  `starThreshold` (default 5), `slug` (único).
- **User**: `id`, `email`, `passwordHash`, `role`, `agencyId?`, `businessId?`.
- **Seller**: `id`, `businessId`, `name`, `slug` (único dentro del negocio),
  `userId?` (login opcional).
- **Question**: `id`, `businessId`, `text`, `type` (`TEXT` | `MULTIPLE_CHOICE`),
  `options?` (para opción múltiple), `order`, `active`.
  La pregunta de estrellas NO se modela aquí: es un paso final fijo del flujo.
- **Review**: `id`, `businessId`, `sellerId?`, `starRating` (1–5),
  `outcome` (`REDIRECTED_GOOGLE` | `INTERNAL`), `createdAt`,
  `comment?`, `contactName?`, `contactPhone?`, `contactEmail?`.
- **Answer**: `id`, `reviewId`, `questionId`, `value`.

Relaciones: Agency 1—N Business; Business 1—N Seller; Business 1—N Question;
Business 1—N Review; Review 1—N Answer; Seller 1—N Review (opcional).

Multi-tenancy: scoping de filas por `agencyId`/`businessId` derivado del rol de la
sesión en cada consulta.

## 5. Flujo público de review

Rutas:
- `/r/[businessSlug]` — review genérica (sin vendedor).
- `/r/[businessSlug]/[sellerSlug]` — review ligada a un vendedor.

Pasos:
1. Landing con nombre + logo del negocio.
2. Se muestran las preguntas `active` del negocio, en orden (una a una).
3. Paso final fijo: selección de estrellas (1–5).
4. Al enviar:
   - `starRating >= starThreshold` (default 5): se guarda `Review` con
     `outcome = REDIRECTED_GOOGLE` y se **redirige a `googleReviewUrl`**.
   - `starRating < starThreshold`: se guarda `Review` con `outcome = INTERNAL`,
     se muestra pantalla pidiendo **comentario + contacto opcional**, y un
     mensaje de agradecimiento. No hay redirección a Google.

Las respuestas a las preguntas se persisten como `Answer` ligadas a la `Review`.

## 6. Paneles por rol

- **Super admin**: CRUD de agencias y su admin inicial; conteos globales.
- **Agencia**: CRUD de negocios y su admin; métricas agregadas de sus negocios.
- **Negocio**:
  - Configuración: preguntas (builder), `googleReviewUrl`, logo, `starThreshold`.
  - Gestión de vendedores y obtención de sus links/QR.
  - Métricas: promedio de estrellas, total de reviews, distribución por estrella,
    # redirigidos a Google, desglose por vendedor.
  - Lista de reviews internas (<5) con respuestas y datos de contacto.
- **Vendedor**: su link/QR personal y sus propias métricas (total, promedio,
  # redirigidos).

## 7. Stack técnico

- **Framework**: Next.js (App Router, TypeScript), Server Actions.
- **Base de datos**: Postgres + Prisma ORM.
- **UI**: Tailwind CSS + shadcn/ui. Idioma: **español**.
- **Auth**: Auth.js (credenciales email/password). SUPER_ADMIN sembrado por seed.
- **QR**: librería `qrcode` para generar los códigos de los links.
- **Deploy**: Vercel + Postgres gestionado (Neon/Railway).

## 8. Decisiones asumidas

- Umbral de redirección configurable por negocio, **default 5**.
- Vendedores tienen link/QR aunque no tengan login; el login es solo para métricas.
- El cliente final nunca inicia sesión.
- UI en español.

## 9. Arquitectura (unidades y límites)

- **Public review module**: rutas `/r/*`, render del flujo, submit de review.
  Depende solo de `Business`, `Seller`, `Question`. No requiere auth.
- **Auth & tenancy module**: sesión, roles, helpers de scoping. Consumido por
  todos los paneles.
- **Admin panels**: un módulo por rol, cada uno consume el módulo de tenancy para
  acotar datos.
- **Data layer**: Prisma como única puerta a Postgres; queries scoped por tenant.

Cada módulo se puede entender y probar de forma independiente a través de sus
interfaces (server actions / funciones de acceso a datos).
