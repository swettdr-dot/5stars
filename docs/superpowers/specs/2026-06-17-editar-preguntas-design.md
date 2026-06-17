# Editar preguntas — diseño

## Problema

El constructor de preguntas del panel de negocio
([QuestionsBuilder.tsx](../../../src/app/(panel)/business/questions/_components/QuestionsBuilder.tsx))
permite **crear, eliminar, reordenar (drag & drop) y activar/desactivar**
preguntas, pero no permite **editar** una pregunta existente. Para corregir un
texto o cambiar las opciones, hoy hay que eliminar la pregunta y recrearla
(perdiendo orden, estado activo y respuestas asociadas).

## Objetivo

Permitir al `BUSINESS_ADMIN` editar una pregunta existente: su **texto**, su
**tipo** (`TEXT` ↔ `MULTIPLE_CHOICE`) y sus **opciones**.

## Alcance

- Editable: `text`, `type`, `options`.
- No editable por esta vía: `order` (se gestiona con drag & drop) ni `active`
  (se gestiona con el toggle). La edición no debe tocar esos campos.
- Sin cambios de modelo de datos ni migración: `Question` ya tiene todos los
  campos necesarios.

## UX — edición en línea

Cada tarjeta de pregunta gana un botón de **editar** (ícono lápiz), junto a los
de eliminar y activar/desactivar. Al pulsarlo, esa tarjeta se reemplaza por un
formulario en línea con los mismos campos del formulario de "Agregar"
(texto, selector de tipo, textarea de opciones), pre-rellenado con los valores
actuales de la pregunta. El formulario tiene botones **Guardar** y **Cancelar**.

Se reaprovecha el patrón visual ya existente del formulario de creación para
mantener coherencia. Se descarta un modal/diálogo aparte: añadiría un componente
nuevo sin beneficio, y el repo ya resuelve los formularios en línea.

### Estado en el cliente

- Un `editingId: string | null` en `QuestionsBuilder`. Solo una pregunta es
  editable a la vez.
- Abrir la edición de una pregunta cierra el formulario de "Agregar", y abrir
  "Agregar" cierra cualquier edición en curso.
- Al guardar con éxito, el formulario de edición se cierra (mismo patrón
  "estado previo" que usa el alta para cerrarse).

## Server action — `updateQuestion`

Nueva server action en
[actions.ts](../../../src/app/(panel)/business/questions/actions.ts):

- Reutiliza la misma validación Zod que `createQuestion` (texto requerido; si el
  tipo es `MULTIPLE_CHOICE`, al menos una opción, una por línea).
- Recibe además el `id` de la pregunta.
- Verifica pertenencia al negocio con
  `prisma.question.findFirst({ where: { id, businessId } })`, igual que
  `deleteQuestion` y `toggleQuestion`. Si no pertenece, no hace nada.
- Persiste `text`, `type`, `options`. **No** modifica `order` ni `active`.
- Devuelve el mismo `QuestionFormState` (`{ ok, error? }`) para feedback en línea
  vía `useActionState`.
- Llama a `revalidatePath("/business/questions")`.

## Datos históricos

Editar las opciones de una pregunta de opción múltiple no rompe la integridad
referencial: las `Answer` ya guardadas conservan su texto y simplemente pueden
referirse a una opción que ya no existe. Es comportamiento aceptable (dato
histórico) y no se va a complicar con migración ni reconciliación.

## Pruebas

- Tests unitarios de `updateQuestion` (Vitest), siguiendo el estilo existente de
  las actions:
  - Actualiza texto/tipo/opciones de una pregunta propia.
  - Rechaza texto vacío y `MULTIPLE_CHOICE` sin opciones.
  - No actúa sobre una pregunta de otro negocio (scoping multi-tenant).
  - No altera `order` ni `active`.
