# La agencia gestiona la configuración de sus negocios — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mover la edición de Preguntas, Vendedores y Ajustes desde el `BUSINESS_ADMIN` (que queda en solo lectura) hacia el `AGENCY_ADMIN`, que las gestiona por negocio; y quitar Marketing al negocio.

**Architecture:** Un helper de tenancy puro (`manageableBusinessWhere`) decide qué negocios puede editar la sesión; un resolver (`resolveManageableBusiness`) lo aplica con Prisma. Las Server Actions existentes dejan de leer `businessId` de la sesión y lo toman del formulario, re-validándolo siempre por tenancy. Los componentes de edición (`QuestionsBuilder`, `SettingsForm`, `NewSellerDialog`) ganan modo lectura/edición y se reutilizan tanto en el panel del negocio (lectura) como en nuevas rutas de agencia por-negocio (`/agency/[businessId]/...`).

**Tech Stack:** Next.js 16 (App Router, Server Actions), React 19, Prisma/Postgres, Zod, Vitest, Tailwind 4.

**Spec:** `docs/superpowers/specs/2026-06-17-agency-manages-business-config-design.md`

---

## Estructura de archivos

**Crear:**
- `src/lib/business-access.ts` — `resolveManageableBusiness(businessId)`.
- `src/app/(panel)/agency/[businessId]/_components/BusinessTabs.tsx` — sub-nav (Preguntas/Vendedores/Ajustes) + encabezado del negocio.
- `src/app/(panel)/agency/[businessId]/questions/page.tsx`
- `src/app/(panel)/agency/[businessId]/sellers/page.tsx`
- `src/app/(panel)/agency/[businessId]/settings/page.tsx`

**Modificar:**
- `src/lib/tenancy.ts` — agregar `canManageBusinessConfig` + `manageableBusinessWhere`.
- `src/app/(panel)/business/questions/actions.ts` — `businessId` desde form + resolver.
- `src/app/(panel)/business/sellers/actions.ts` — idem.
- `src/app/(panel)/business/settings/actions.ts` — idem.
- `src/app/(panel)/business/questions/_components/QuestionsBuilder.tsx` — props `canEdit`/`businessId`.
- `src/app/(panel)/business/settings/_components/SettingsForm.tsx` — props `canEdit`/`businessId`.
- `src/app/(panel)/business/sellers/_components/NewSellerDialog.tsx` — prop `businessId`.
- `src/app/(panel)/business/questions/page.tsx` — pasar `canEdit={false}` + `businessId`.
- `src/app/(panel)/business/sellers/page.tsx` — `canEdit={false}` (ocultar alta).
- `src/app/(panel)/business/settings/page.tsx` — `canEdit={false}` + `businessId`.
- `src/app/(panel)/super/_components/EntityTable.tsx` — enlace opcional "Gestionar" por fila.
- `src/app/(panel)/agency/page.tsx` — pasar `manageHref` a la tabla.
- `src/app/(panel)/_components/nav.ts` — quitar Marketing de `BUSINESS_ADMIN`.
- `src/lib/marketing/page-context.ts` — negar `BUSINESS_ADMIN`.

**Tests:**
- `tests/tenancy.test.ts` — casos de `manageableBusinessWhere`.
- `tests/marketing-context.test.ts` — nada que cambiar (prueba `marketingBusinessWhere`, que no cambia). La negación de `BUSINESS_ADMIN` vive en `getMarketingContext`, que no tiene test unitario (usa Prisma/sesión); se verifica en el build + manual.

**Nota de cobertura de tests:** el repo prueba funciones puras (ver `tests/tenancy.test.ts`, `tests/marketing-context.test.ts`) y no monta mocks de Prisma/sesión para Server Actions. Por eso la decisión de autorización crítica se concentra en `manageableBusinessWhere` (pura, testeada exhaustivamente). Las acciones y `resolveManageableBusiness` delegan en ella; su corrección se valida con tipos/build (Task 15) y verificación manual.

---

## Task 1: Helper puro de tenancy `manageableBusinessWhere`

**Files:**
- Modify: `src/lib/tenancy.ts`
- Test: `tests/tenancy.test.ts`

- [ ] **Step 1: Escribir los tests que fallan**

Agregar al final de `tests/tenancy.test.ts`:

```ts
import { canManageBusinessConfig, manageableBusinessWhere } from "@/lib/tenancy";

describe("canManageBusinessConfig", () => {
  it("permite a super y agencia", () => {
    expect(canManageBusinessConfig("SUPER_ADMIN")).toBe(true);
    expect(canManageBusinessConfig("AGENCY_ADMIN")).toBe(true);
  });
  it("niega a negocio y vendedor", () => {
    expect(canManageBusinessConfig("BUSINESS_ADMIN")).toBe(false);
    expect(canManageBusinessConfig("SELLER")).toBe(false);
  });
});

describe("manageableBusinessWhere", () => {
  it("agencia combina el negocio pedido con su agencia", () => {
    expect(manageableBusinessWhere({ role: "AGENCY_ADMIN", agencyId: "a1" }, "b9"))
      .toEqual({ id: "b9", agencyId: "a1" });
  });
  it("super admin se acota al negocio pedido", () => {
    expect(manageableBusinessWhere({ role: "SUPER_ADMIN" }, "b3"))
      .toEqual({ id: "b3" });
  });
  it("negocio no puede gestionar (null)", () => {
    expect(manageableBusinessWhere({ role: "BUSINESS_ADMIN", businessId: "b1" }, "b1"))
      .toBeNull();
  });
  it("vendedor no puede gestionar (null)", () => {
    expect(manageableBusinessWhere({ role: "SELLER", businessId: "b1" }, "b1"))
      .toBeNull();
  });
});
```

- [ ] **Step 2: Correr los tests y verificar que fallan**

Run: `npx vitest run tests/tenancy.test.ts`
Expected: FAIL — `canManageBusinessConfig`/`manageableBusinessWhere` no existen.

- [ ] **Step 3: Implementar los helpers**

Agregar al final de `src/lib/tenancy.ts`:

```ts
/** Roles que pueden editar la configuración (preguntas/vendedores/ajustes) de un negocio. */
export function canManageBusinessConfig(role: SessionUser["role"]): boolean {
  return role === "SUPER_ADMIN" || role === "AGENCY_ADMIN";
}

/**
 * `where` para localizar un negocio que la sesión puede EDITAR, o `null` si su rol
 * no gestiona configuración. Combina el negocio pedido con el alcance del rol, así
 * una agencia solo alcanza negocios de su agencia (super, cualquiera).
 */
export function manageableBusinessWhere(
  u: SessionUser,
  businessId: string,
): Record<string, unknown> | null {
  if (!canManageBusinessConfig(u.role)) return null;
  return { id: businessId, ...businessWhereForSession(u) };
}
```

- [ ] **Step 4: Correr los tests y verificar que pasan**

Run: `npx vitest run tests/tenancy.test.ts`
Expected: PASS (todos).

- [ ] **Step 5: Commit**

```bash
git add src/lib/tenancy.ts tests/tenancy.test.ts
git commit -m "feat(tenancy): helpers manageableBusinessWhere/canManageBusinessConfig"
```

---

## Task 2: Resolver `resolveManageableBusiness`

**Files:**
- Create: `src/lib/business-access.ts`

- [ ] **Step 1: Implementar el resolver**

Crear `src/lib/business-access.ts`:

```ts
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { manageableBusinessWhere } from "@/lib/tenancy";

/** Negocio gestionable resuelto y validado por tenancy. */
export type ManageableBusiness = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  googleReviewUrl: string;
  starThreshold: number;
};

/**
 * Resuelve y autoriza el negocio que la sesión puede EDITAR. Lanza FORBIDDEN si el
 * rol no gestiona configuración o si `businessId` cae fuera de su alcance. La
 * autorización nunca confía en el id recibido: se re-valida contra el rol.
 */
export async function resolveManageableBusiness(
  businessId: string,
): Promise<ManageableBusiness> {
  const user = await requireUser();
  const where = manageableBusinessWhere(user, businessId);
  if (!where) throw new Error("FORBIDDEN");
  const business = await prisma.business.findFirst({
    where,
    select: {
      id: true,
      name: true,
      slug: true,
      logoUrl: true,
      googleReviewUrl: true,
      starThreshold: true,
    },
  });
  if (!business) throw new Error("FORBIDDEN");
  return business;
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores nuevos en `src/lib/business-access.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/business-access.ts
git commit -m "feat: resolveManageableBusiness (autorización por negocio)"
```

---

## Task 3: Acciones de Preguntas toman `businessId`

**Files:**
- Modify: `src/app/(panel)/business/questions/actions.ts`

- [ ] **Step 1: Reemplazar el guard y leer `businessId` del form**

En `src/app/(panel)/business/questions/actions.ts`, reemplazar el import y el helper `ownBusinessId` por el resolver, y leer `businessId` de cada acción.

Reemplazar las líneas 1-11 (imports + `ownBusinessId`):

```ts
"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { parseQuestionInput } from "@/lib/question-input";
import { resolveManageableBusiness } from "@/lib/business-access";

/** Revalida la vista de edición (agencia) y la de lectura (negocio). */
function revalidateQuestions(businessId: string) {
  revalidatePath(`/agency/${businessId}/questions`);
  revalidatePath("/business/questions");
}
```

- [ ] **Step 2: Actualizar `createQuestion`**

Reemplazar el cuerpo desde `const businessId = await ownBusinessId();` (en `createQuestion`) por:

```ts
  const businessId = String(formData.get("businessId"));
  await resolveManageableBusiness(businessId);
  const parsed = parseQuestionInput({
    text: formData.get("text"),
    type: formData.get("type"),
    options: formData.get("options"),
  });
  if (!parsed.ok) return { ok: false, error: parsed.error };
  const count = await prisma.question.count({ where: { businessId } });
  await prisma.question.create({
    data: {
      businessId,
      text: parsed.data.text,
      type: parsed.data.type,
      options: parsed.data.options,
      order: count,
    },
  });
  revalidateQuestions(businessId);
  return { ok: true };
```

- [ ] **Step 3: Actualizar `deleteQuestion`**

```ts
export async function deleteQuestion(formData: FormData) {
  const businessId = String(formData.get("businessId"));
  await resolveManageableBusiness(businessId);
  const id = String(formData.get("id"));
  const q = await prisma.question.findFirst({ where: { id, businessId }, select: { id: true } });
  if (!q) return;
  await prisma.$transaction([
    prisma.answer.deleteMany({ where: { questionId: id } }),
    prisma.question.delete({ where: { id } }),
  ]);
  revalidateQuestions(businessId);
}
```

- [ ] **Step 4: Actualizar `reorderQuestions` (firma con businessId)**

```ts
/** Persiste el nuevo orden (lista de ids en el orden deseado). */
export async function reorderQuestions(businessId: string, orderedIds: string[]) {
  await resolveManageableBusiness(businessId);
  const owned = await prisma.question.findMany({ where: { businessId }, select: { id: true } });
  const ownedSet = new Set(owned.map((o) => o.id));
  const ids = orderedIds.filter((id) => ownedSet.has(id));
  if (ids.length === 0) return;
  await prisma.$transaction(
    ids.map((id, i) => prisma.question.update({ where: { id }, data: { order: i } })),
  );
  revalidateQuestions(businessId);
}
```

- [ ] **Step 5: Actualizar `toggleQuestion` y `updateQuestion`**

```ts
export async function toggleQuestion(formData: FormData) {
  const businessId = String(formData.get("businessId"));
  await resolveManageableBusiness(businessId);
  const id = String(formData.get("id"));
  const q = await prisma.question.findFirst({ where: { id, businessId } });
  if (q) await prisma.question.update({ where: { id }, data: { active: !q.active } });
  revalidateQuestions(businessId);
}

export async function updateQuestion(
  _prev: QuestionFormState,
  formData: FormData,
): Promise<QuestionFormState> {
  const businessId = String(formData.get("businessId"));
  await resolveManageableBusiness(businessId);
  const id = String(formData.get("id"));
  const owned = await prisma.question.findFirst({ where: { id, businessId }, select: { id: true } });
  if (!owned) return { ok: false, error: "Pregunta no encontrada." };
  const parsed = parseQuestionInput({
    text: formData.get("text"),
    type: formData.get("type"),
    options: formData.get("options"),
  });
  if (!parsed.ok) return { ok: false, error: parsed.error };
  await prisma.question.update({
    where: { id },
    data: { text: parsed.data.text, type: parsed.data.type, options: parsed.data.options },
  });
  revalidateQuestions(businessId);
  return { ok: true };
}
```

Mantener `export type QuestionFormState = { ok: boolean; error?: string };` como está.

- [ ] **Step 6: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: error esperado en `QuestionsBuilder.tsx` (llama `reorderQuestions` con la firma vieja) — se corrige en Task 6. Sin otros errores en `actions.ts`.

- [ ] **Step 7: Commit**

```bash
git add src/app/\(panel\)/business/questions/actions.ts
git commit -m "refactor(questions): acciones autorizadas por businessId del form"
```

---

## Task 4: Acciones de Vendedores toman `businessId`

**Files:**
- Modify: `src/app/(panel)/business/sellers/actions.ts`

- [ ] **Step 1: Cambiar imports y autorización**

En `src/app/(panel)/business/sellers/actions.ts`, reemplazar el import de `requireUser` por el resolver:

Reemplazar línea 6 (`import { requireUser } from "@/lib/session";`) por:

```ts
import { resolveManageableBusiness } from "@/lib/business-access";
```

- [ ] **Step 2: Reemplazar la resolución de negocio en `createSeller`**

Reemplazar el bloque (líneas ~38-41):

```ts
  const user = await requireUser();
  if (user.role !== "BUSINESS_ADMIN" || !user.businessId) {
    return { ok: false, error: "No autorizado." };
  }
```

por:

```ts
  const businessId = String(formData.get("businessId"));
  try {
    await resolveManageableBusiness(businessId);
  } catch {
    return { ok: false, error: "No autorizado." };
  }
```

- [ ] **Step 3: Sustituir `user.businessId` por `businessId`**

En el resto de `createSeller`, reemplazar las 3 referencias `user.businessId` por `businessId`:
- `where: { businessId: user.businessId, slug: { startsWith: base } }` → `where: { businessId, slug: { startsWith: base } }`
- `data: { name: data.name, slug, businessId: user.businessId }` → `data: { name: data.name, slug, businessId }`
- `businessId: user.businessId,` (en `prisma.user.create`) → `businessId,`

Y al final reemplazar `revalidatePath("/business/sellers");` por:

```ts
  revalidatePath(`/agency/${businessId}/sellers`);
  revalidatePath("/business/sellers");
```

- [ ] **Step 4: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: error esperado en `NewSellerDialog.tsx` (falta enviar `businessId`) — se corrige en Task 8. Sin otros errores en `actions.ts`.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(panel\)/business/sellers/actions.ts
git commit -m "refactor(sellers): createSeller autorizado por businessId del form"
```

---

## Task 5: Acción de Ajustes toma `businessId`

**Files:**
- Modify: `src/app/(panel)/business/settings/actions.ts`

- [ ] **Step 1: Cambiar imports**

Reemplazar línea 5 (`import { requireUser } from "@/lib/session";`) por:

```ts
import { resolveManageableBusiness } from "@/lib/business-access";
```

- [ ] **Step 2: Reemplazar autorización y target en `updateSettings`**

Reemplazar el bloque (líneas ~45-49):

```ts
  const user = await requireUser();
  // Acotado al negocio de la sesión (tenancy): solo el BUSINESS_ADMIN de su negocio.
  if (user.role !== "BUSINESS_ADMIN" || !user.businessId) {
    return { ok: false, error: "No tenés permisos para editar este negocio." };
  }
```

por:

```ts
  const businessId = String(formData.get("businessId"));
  try {
    await resolveManageableBusiness(businessId);
  } catch {
    return { ok: false, error: "No tienes permisos para editar este negocio." };
  }
```

(Nota: "No tienes" — español neutro, sin voseo.)

- [ ] **Step 3: Apuntar el update y la revalidación al `businessId`**

Reemplazar `where: { id: user.businessId },` por `where: { id: businessId },`.

Reemplazar `revalidatePath("/business/settings");` por:

```ts
  revalidatePath(`/agency/${businessId}/settings`);
  revalidatePath("/business/settings");
```

- [ ] **Step 4: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: error esperado en `SettingsForm.tsx` (falta `businessId`) — se corrige en Task 7. Sin otros errores en `actions.ts`.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(panel\)/business/settings/actions.ts
git commit -m "refactor(settings): updateSettings autorizado por businessId del form"
```

---

## Task 6: `QuestionsBuilder` con `canEdit` y `businessId`

**Files:**
- Modify: `src/app/(panel)/business/questions/_components/QuestionsBuilder.tsx`

- [ ] **Step 1: Ampliar la firma del componente**

Reemplazar la firma (línea 22):

```tsx
export function QuestionsBuilder({ business, questions }: { business: Business; questions: Q[] }) {
```

por:

```tsx
export function QuestionsBuilder({
  business,
  questions,
  businessId,
  canEdit,
}: {
  business: Business;
  questions: Q[];
  businessId: string;
  canEdit: boolean;
}) {
```

- [ ] **Step 2: Pasar `businessId` al reordenar**

Reemplazar `void reorderQuestions(next.map((q) => q.id));` por:

```tsx
    void reorderQuestions(businessId, next.map((q) => q.id));
```

- [ ] **Step 3: Agregar `businessId` oculto a los forms de mutación**

En cada `<form action={...}>` de mutación, agregar un input oculto. Concretamente:

- En el form de edición (`action={editAction}`), debajo de `<input type="hidden" name="id" value={q.id} />` agregar:
  ```tsx
                  <input type="hidden" name="businessId" value={businessId} />
  ```
- En el form de `deleteQuestion`, debajo de `<input type="hidden" name="id" value={q.id} />` agregar la misma línea.
- En el form de `toggleQuestion`, debajo de `<input type="hidden" name="id" value={q.id} />` agregar la misma línea.
- En el form de alta (`action={addAction}`), como primer hijo del `<form>` agregar:
  ```tsx
              <input type="hidden" name="businessId" value={businessId} />
  ```

- [ ] **Step 4: Gatear el drag y la edición con `canEdit`**

En el `<div>` de cada fila (el que tiene `draggable`), reemplazar los handlers para que solo apliquen en edición:

```tsx
                draggable={canEdit}
                onDragStart={() => canEdit && setDragIndex(i)}
                onDragOver={(e) => canEdit && e.preventDefault()}
                onDrop={() => canEdit && handleDrop(i)}
                onDragEnd={() => setDragIndex(null)}
```

Envolver el asa de arrastre y el bloque de acciones (editar/eliminar/toggle) con `{canEdit && ( ... )}`:
- El `<span ... title="Arrastra para reordenar">⋮⋮</span>` → `{canEdit && (<span ...>⋮⋮</span>)}`.
- El `<div className="flex shrink-0 items-center gap-2" ...>` con los botones → `{canEdit && (<div ...>...</div>)}`.

- [ ] **Step 5: Ocultar el alta cuando no se puede editar**

Envolver todo el bloque `{showAdd ? (<form>...</form>) : (<button>+ Agregar pregunta</button>)}` con `{canEdit && ( ... )}`.

- [ ] **Step 6: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: error esperado en `business/questions/page.tsx` (faltan props nuevas) — se corrige en Task 9. Sin otros errores en este archivo.

- [ ] **Step 7: Commit**

```bash
git add src/app/\(panel\)/business/questions/_components/QuestionsBuilder.tsx
git commit -m "feat(questions): QuestionsBuilder soporta modo lectura y businessId"
```

---

## Task 7: `SettingsForm` con `canEdit` y `businessId`

**Files:**
- Modify: `src/app/(panel)/business/settings/_components/SettingsForm.tsx`

- [ ] **Step 1: Ampliar la firma**

Reemplazar la firma (líneas 15-19):

```tsx
export function SettingsForm({
  defaults,
}: {
  defaults: { googleReviewUrl: string; logoUrl: string; starThreshold: number };
}) {
```

por:

```tsx
export function SettingsForm({
  defaults,
  businessId,
  canEdit,
}: {
  defaults: { googleReviewUrl: string; logoUrl: string; starThreshold: number };
  businessId: string;
  canEdit: boolean;
}) {
```

- [ ] **Step 2: Enviar `businessId` y deshabilitar inputs en lectura**

Como primer hijo del `<form action={formAction} ...>` agregar:

```tsx
      <input type="hidden" name="businessId" value={businessId} />
```

Deshabilitar entradas cuando `!canEdit`. Agregar `disabled={!canEdit}` a:
- el `<input id="googleReviewUrlInput" ... />`,
- el `<input type="url" ... />` del logo (rama sin imagen subida),
- el `<input type="file" ... />` ("Subir logo").

Para el control segmentado del umbral, pasar la condición:

```tsx
        <SettingsSegmented name="starThreshold" value={threshold} onChange={canEdit ? setThreshold : () => {}} />
```

- [ ] **Step 3: Ocultar el footer de guardado en lectura**

Envolver el `<div className="flex justify-end gap-[10px] pt-1">...</div>` (botones Cancelar/Guardar) con `{canEdit && ( ... )}`.

- [ ] **Step 4: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: error esperado en `business/settings/page.tsx` (faltan props) — se corrige en Task 9. Sin otros errores aquí.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(panel\)/business/settings/_components/SettingsForm.tsx
git commit -m "feat(settings): SettingsForm soporta modo lectura y businessId"
```

---

## Task 8: `NewSellerDialog` con `businessId`

**Files:**
- Modify: `src/app/(panel)/business/sellers/_components/NewSellerDialog.tsx`

- [ ] **Step 1: Aceptar `businessId` y enviarlo**

Reemplazar la firma (línea 12):

```tsx
export function NewSellerDialog() {
```

por:

```tsx
export function NewSellerDialog({ businessId }: { businessId: string }) {
```

Como primer hijo del `<form ref={formRef} action={formAction} ...>` agregar:

```tsx
          <input type="hidden" name="businessId" value={businessId} />
```

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: error esperado en `business/sellers/page.tsx` (falta `businessId`) — se corrige en Task 9. Sin otros errores aquí.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(panel\)/business/sellers/_components/NewSellerDialog.tsx
git commit -m "feat(sellers): NewSellerDialog envía businessId"
```

---

## Task 9: Páginas del negocio en modo lectura

**Files:**
- Modify: `src/app/(panel)/business/questions/page.tsx`
- Modify: `src/app/(panel)/business/sellers/page.tsx`
- Modify: `src/app/(panel)/business/settings/page.tsx`

- [ ] **Step 1: Questions (lectura)**

En `business/questions/page.tsx`, reemplazar `<QuestionsBuilder business={business} questions={questions} />` por:

```tsx
      <QuestionsBuilder
        business={business}
        questions={questions}
        businessId={user.businessId}
        canEdit={false}
      />
```

- [ ] **Step 2: Settings (lectura)**

En `business/settings/page.tsx`, reemplazar el `<SettingsForm defaults={{...}} />` por:

```tsx
      <SettingsForm
        businessId={user.businessId}
        canEdit={false}
        defaults={{
          googleReviewUrl: business.googleReviewUrl,
          logoUrl: business.logoUrl ?? "",
          starThreshold: business.starThreshold,
        }}
      />
```

- [ ] **Step 3: Sellers (ocultar alta)**

En `business/sellers/page.tsx`, quitar el alta del `PageHeader`. Reemplazar:

```tsx
      <PageHeader
        title="Vendedores"
        subtitle="Cada uno tiene su propio link/QR para atribuir reseñas."
        actions={<NewSellerDialog />}
      />
```

por:

```tsx
      <PageHeader
        title="Vendedores"
        subtitle="Cada uno tiene su propio link/QR para atribuir reseñas."
      />
```

Y eliminar el import `import { NewSellerDialog } from "./_components/NewSellerDialog";` (ya no se usa en esta página).

- [ ] **Step 4: Verificar tipos y lint**

Run: `npx tsc --noEmit`
Expected: sin errores en estas tres páginas (las firmas nuevas quedan satisfechas; `reorderQuestions` ya usa la firma nueva).

- [ ] **Step 5: Commit**

```bash
git add src/app/\(panel\)/business/questions/page.tsx src/app/\(panel\)/business/sellers/page.tsx src/app/\(panel\)/business/settings/page.tsx
git commit -m "feat(business): paneles de preguntas/vendedores/ajustes en modo lectura"
```

---

## Task 10: Sub-nav de gestión por negocio (agencia)

**Files:**
- Create: `src/app/(panel)/agency/[businessId]/_components/BusinessTabs.tsx`

- [ ] **Step 1: Crear el componente de encabezado + pestañas**

Crear `src/app/(panel)/agency/[businessId]/_components/BusinessTabs.tsx`:

```tsx
import Link from "next/link";

type Tab = "questions" | "sellers" | "settings";

const TABS: { key: Tab; label: string }[] = [
  { key: "questions", label: "Preguntas" },
  { key: "sellers", label: "Vendedores" },
  { key: "settings", label: "Ajustes" },
];

/** Encabezado con nombre del negocio, volver y pestañas de gestión (agencia). */
export function BusinessTabs({
  businessId,
  businessName,
  active,
}: {
  businessId: string;
  businessName: string;
  active: Tab;
}) {
  return (
    <div className="mb-5">
      <Link
        href="/agency"
        className="text-meta font-semibold text-ink-3 transition-colors hover:text-accent"
      >
        ← Volver a negocios
      </Link>
      <h1 className="mt-2 text-[20px] font-semibold tracking-tight text-ink">{businessName}</h1>
      <nav className="mt-3 flex gap-1 border-b border-line">
        {TABS.map((t) => {
          const isActive = t.key === active;
          return (
            <Link
              key={t.key}
              href={`/agency/${businessId}/${t.key}`}
              className={`-mb-px border-b-2 px-3 py-2 text-[13px] font-semibold transition-colors ${
                isActive
                  ? "border-accent text-accent"
                  : "border-transparent text-ink-2 hover:text-ink"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores en el nuevo archivo.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(panel\)/agency/\[businessId\]/_components/BusinessTabs.tsx
git commit -m "feat(agency): pestañas de gestión por negocio"
```

---

## Task 11: Páginas de gestión por negocio (agencia)

**Files:**
- Create: `src/app/(panel)/agency/[businessId]/questions/page.tsx`
- Create: `src/app/(panel)/agency/[businessId]/sellers/page.tsx`
- Create: `src/app/(panel)/agency/[businessId]/settings/page.tsx`

- [ ] **Step 1: Página de Preguntas (edición)**

Crear `src/app/(panel)/agency/[businessId]/questions/page.tsx`:

```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { resolveManageableBusiness } from "@/lib/business-access";
import { BusinessTabs } from "../_components/BusinessTabs";
import { QuestionsBuilder } from "@/app/(panel)/business/questions/_components/QuestionsBuilder";

export default async function AgencyQuestionsPage({
  params,
}: {
  params: Promise<{ businessId: string }>;
}) {
  const { businessId } = await params;
  const business = await resolveManageableBusiness(businessId).catch(() => null);
  if (!business) notFound();

  const questions = await prisma.question.findMany({
    where: { businessId },
    orderBy: { order: "asc" },
    select: { id: true, text: true, type: true, options: true, active: true, order: true },
  });

  return (
    <div>
      <BusinessTabs businessId={businessId} businessName={business.name} active="questions" />
      <div className="mb-4 flex items-center justify-between gap-4">
        <p className="text-meta text-ink-2">
          Lo que ve el cliente antes de calificar. Se muestran en orden.
        </p>
        <Link
          href={`/r/${business.slug}`}
          target="_blank"
          className="flex h-[38px] items-center rounded-control border border-line bg-card px-[15px] text-[13px] font-semibold text-ink-2 transition-colors hover:border-accent hover:text-accent"
        >
          Previsualizar ↗
        </Link>
      </div>
      <QuestionsBuilder
        business={{
          name: business.name,
          slug: business.slug,
          logoUrl: business.logoUrl,
          starThreshold: business.starThreshold,
        }}
        questions={questions}
        businessId={businessId}
        canEdit
      />
    </div>
  );
}
```

- [ ] **Step 2: Página de Vendedores (edición)**

Crear `src/app/(panel)/agency/[businessId]/sellers/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { aggregateMetrics, googlePct } from "@/lib/metrics";
import { resolveManageableBusiness } from "@/lib/business-access";
import { BusinessTabs } from "../_components/BusinessTabs";
import { SellersTable, type SellerRow } from "@/app/(panel)/business/sellers/_components/SellersTable";
import { NewSellerDialog } from "@/app/(panel)/business/sellers/_components/NewSellerDialog";

export default async function AgencySellersPage({
  params,
}: {
  params: Promise<{ businessId: string }>;
}) {
  const { businessId } = await params;
  const business = await resolveManageableBusiness(businessId).catch(() => null);
  if (!business) notFound();

  const sellers = await prisma.seller.findMany({
    where: { businessId },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      user: { select: { email: true } },
      reviews: { select: { starRating: true, outcome: true } },
    },
  });

  const rows: SellerRow[] = sellers.map((s) => {
    const m = aggregateMetrics(s.reviews);
    return {
      id: s.id,
      name: s.name,
      email: s.user?.email ?? null,
      reviews: m.total,
      avg: m.average,
      pct: googlePct(m),
    };
  });

  return (
    <div>
      <BusinessTabs businessId={businessId} businessName={business.name} active="sellers" />
      <div className="mb-4 flex items-center justify-between gap-4">
        <p className="text-meta text-ink-2">
          Cada uno tiene su propio link/QR para atribuir reseñas.
        </p>
        <NewSellerDialog businessId={businessId} />
      </div>
      <SellersTable rows={rows} />
    </div>
  );
}
```

- [ ] **Step 3: Página de Ajustes (edición)**

Crear `src/app/(panel)/agency/[businessId]/settings/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { resolveManageableBusiness } from "@/lib/business-access";
import { BusinessTabs } from "../_components/BusinessTabs";
import { SettingsForm } from "@/app/(panel)/business/settings/_components/SettingsForm";

export default async function AgencySettingsPage({
  params,
}: {
  params: Promise<{ businessId: string }>;
}) {
  const { businessId } = await params;
  const business = await resolveManageableBusiness(businessId).catch(() => null);
  if (!business) notFound();

  return (
    <div className="max-w-[680px]">
      <BusinessTabs businessId={businessId} businessName={business.name} active="settings" />
      <SettingsForm
        businessId={businessId}
        canEdit
        defaults={{
          googleReviewUrl: business.googleReviewUrl,
          logoUrl: business.logoUrl ?? "",
          starThreshold: business.starThreshold,
        }}
      />
    </div>
  );
}
```

- [ ] **Step 4: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores en las tres páginas nuevas.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(panel\)/agency/\[businessId\]/questions/page.tsx src/app/\(panel\)/agency/\[businessId\]/sellers/page.tsx src/app/\(panel\)/agency/\[businessId\]/settings/page.tsx
git commit -m "feat(agency): gestión de preguntas/vendedores/ajustes por negocio"
```

---

## Task 12: Enlace "Gestionar" desde el listado de negocios

**Files:**
- Modify: `src/app/(panel)/super/_components/EntityTable.tsx`
- Modify: `src/app/(panel)/agency/page.tsx`

- [ ] **Step 1: Soporte de enlace por fila en `EntityTable`**

En `EntityTable.tsx`, agregar `import Link from "next/link";` al inicio (junto a los imports existentes).

Agregar la prop opcional `manageHref` a la firma del componente (dentro del objeto de props, tras `emptyHint`):

```tsx
  emptyHint: string;
  /** Si se provee, cada fila enlaza a la gestión del negocio (panel de agencia). */
  manageHref?: (id: string) => string;
```

Reemplazar el render de cada fila (el bloque `rows.map((e, i) => ( ... ))`) para envolver la fila en un `Link` cuando `manageHref` esté presente. Sustituir el `<div key={e.id} className={...}>...</div>` por:

```tsx
        rows.map((e, i) => {
          const inner = (
            <>
              <div className="flex min-w-0 items-center gap-[11px]">
                <Avatar name={e.name} index={i} />
                <div className="min-w-0">
                  <div className="truncate text-[13.5px] font-semibold text-ink">{e.name}</div>
                  <div className="truncate text-[11.5px] text-ink-3">{e.sub}</div>
                </div>
              </div>
              <span className="text-[13.5px] font-semibold text-ink">{e.col2}</span>
              <span className="text-[13.5px] font-semibold text-ink">{e.reviews}</span>
              <span className="text-[13.5px] font-semibold text-amber">{e.avg.toFixed(1)} ★</span>
              <StatusBadge tone={e.active ? "active" : "trial"}>
                {e.active ? activeLabel : trialLabel}
              </StatusBadge>
            </>
          );
          const cls = `grid ${COLS} items-center gap-[14px] border-b border-line px-[18px] py-[14px] last:border-b-0`;
          return manageHref ? (
            <Link key={e.id} href={manageHref(e.id)} className={`${cls} transition-colors hover:bg-canvas`}>
              {inner}
            </Link>
          ) : (
            <div key={e.id} className={cls}>
              {inner}
            </div>
          );
        })
```

- [ ] **Step 2: Pasar `manageHref` desde el panel de agencia**

En `agency/page.tsx`, en el `<EntityTable ... />` agregar la prop:

```tsx
          manageHref={(id) => `/agency/${id}/questions`}
```

(Justo después de `emptyHint=...`.)

- [ ] **Step 3: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores. El uso de `EntityTable` en `super/page.tsx` sigue válido (prop opcional).

- [ ] **Step 4: Commit**

```bash
git add src/app/\(panel\)/super/_components/EntityTable.tsx src/app/\(panel\)/agency/page.tsx
git commit -m "feat(agency): cada negocio del listado enlaza a su gestión"
```

---

## Task 13: Quitar Marketing del menú del negocio

**Files:**
- Modify: `src/app/(panel)/_components/nav.ts`

- [ ] **Step 1: Editar la navegación de `BUSINESS_ADMIN`**

En `nav.ts`, quitar la línea de Marketing del array `BUSINESS_ADMIN`:

Eliminar:

```ts
    { href: "/marketing", label: "Marketing", icon: "image" },
```

(Dejar intactas las demás entradas: Resumen, Reseñas, Preguntas, Vendedores, Mi QR / Enlace, Ajustes.)

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(panel\)/_components/nav.ts
git commit -m "feat(nav): Marketing deja de mostrarse al negocio"
```

---

## Task 14: Cerrar Marketing al negocio en el servidor

**Files:**
- Modify: `src/lib/marketing/page-context.ts`

- [ ] **Step 1: Negar `BUSINESS_ADMIN` en `getMarketingContext`**

En `page-context.ts`, reemplazar:

```ts
  if (user.role !== "BUSINESS_ADMIN" && user.role !== "AGENCY_ADMIN") return null;
```

por:

```ts
  if (user.role !== "AGENCY_ADMIN") return null;
```

(Marketing pasa a ser solo de la agencia; `SUPER_ADMIN` lo alcanza impersonando.)

- [ ] **Step 2: Limpiar la rama muerta de `options`**

Como `user.role` solo puede ser `AGENCY_ADMIN` tras el guard, simplificar el cálculo de `options`. Reemplazar:

```ts
  const options =
    user.role === "AGENCY_ADMIN"
      ? await prisma.business.findMany({
          where: marketingBusinessWhere(user),
          orderBy: { createdAt: "asc" },
          select: { id: true, name: true },
        })
      : [];
```

por:

```ts
  const options = await prisma.business.findMany({
    where: marketingBusinessWhere(user),
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true },
  });
```

- [ ] **Step 3: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores. `marketingBusinessWhere` sigue aceptando el `user` (rol acotado).

- [ ] **Step 4: Commit**

```bash
git add src/lib/marketing/page-context.ts
git commit -m "feat(marketing): solo la agencia accede al contexto de marketing"
```

---

## Task 15: Verificación integral

**Files:** (ninguno nuevo)

- [ ] **Step 1: Lint**

Run: `npm run lint`
Expected: sin errores. (Atención a imports sin usar tras los cambios, p. ej. `requireUser` removido de actions.)

- [ ] **Step 2: Tests**

Run: `npm run test`
Expected: PASS, incluidos los nuevos casos de `tenancy.test.ts`.

- [ ] **Step 3: Tipos + build**

Run: `npm run build`
Expected: build exitoso, sin errores de tipos ni de rutas.

- [ ] **Step 4: Verificación manual (checklist)**

Con `npm run dev`:
- Como AGENCY_ADMIN: `/agency` → "Gestionar" en un negocio → editar preguntas, agregar vendedor, guardar ajustes; confirmar persistencia.
- Como BUSINESS_ADMIN: `/business/questions`, `/business/sellers`, `/business/settings` se ven sin controles de edición; `/marketing` ya no aparece en el menú y al visitarla directo muestra "No autorizado".
- Confirmar que un AGENCY_ADMIN no puede gestionar un negocio de otra agencia (URL directa `/agency/<idAjeno>/questions` → `notFound`).

- [ ] **Step 5: Commit final (si quedaron ajustes de lint)**

```bash
git add -A
git commit -m "chore: ajustes finales de lint/verificación"
```

---

## Autorrevisión (cobertura del spec)

- Modelo de permisos (agencia edita / negocio lee): Tasks 3-9, 11.
- Helper `resolveManageableBusiness` + tenancy puro: Tasks 1-2.
- Rutas de agencia por negocio + pestañas + volver: Tasks 10-11.
- Enlace "Gestionar" desde el listado: Task 12.
- Quitar Marketing del negocio (menú + servidor): Tasks 13-14.
- Modo lectura del negocio: Tasks 6-9.
- Pruebas: Task 1 (autorización pura) + Task 15 (build/manual). Las acciones delegan la autorización en `manageableBusinessWhere` (testeada), de acuerdo con la práctica de tests del repo.
