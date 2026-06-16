"use client";
import { useActionState, useEffect, useRef } from "react";
import { createSeller, type CreateSellerState } from "../actions";

const INITIAL: CreateSellerState = { ok: false };

const inputClass =
  "h-10 w-full rounded-control border border-line bg-card px-3 text-body text-ink " +
  "placeholder:text-ink-3 focus:border-accent focus:outline-none focus:ring-[3px] focus:ring-accent-bg";

/** CTA "+ Nuevo vendedor" + modal con el alta. Usa el Server Action `createSeller`. */
export function NewSellerDialog() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(createSeller, INITIAL);

  // Al crear con éxito, el server revalida y la fila aparece: cerramos el modal.
  useEffect(() => {
    if (state.ok) dialogRef.current?.close();
  }, [state]);

  function open() {
    formRef.current?.reset();
    dialogRef.current?.showModal();
  }

  return (
    <>
      <button
        type="button"
        onClick={open}
        className="h-[38px] rounded-control bg-accent px-[15px] text-[13px] font-semibold text-white transition-colors hover:bg-accent-dark"
      >
        + Nuevo vendedor
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby="new-seller-title"
        className="m-auto w-[380px] max-w-[calc(100vw-32px)] rounded-card border border-line bg-card p-0 text-ink backdrop:bg-ink/20"
      >
        <form ref={formRef} action={formAction} className="flex flex-col gap-4 p-[22px]">
          <div>
            <h2 id="new-seller-title" className="text-card-title font-semibold tracking-tight">
              Nuevo vendedor
            </h2>
            <p className="mt-0.5 text-meta text-ink-2">
              Tendrá su propio link/QR para atribuir reseñas. El login es opcional.
            </p>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-meta font-semibold text-ink-2">Nombre</span>
            <input name="name" required autoFocus placeholder="Lucía Fernández" className={inputClass} />
          </label>

          <div className="flex flex-col gap-1.5">
            <span className="text-meta font-semibold text-ink-2">Login del vendedor (opcional)</span>
            <input name="email" type="email" placeholder="Email" className={inputClass} />
            <input
              name="password"
              type="password"
              placeholder="Contraseña (mín. 6)"
              className={inputClass}
            />
          </div>

          {state.error && (
            <p role="alert" className="text-meta text-red">
              {state.error}
            </p>
          )}

          <div className="mt-1 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="h-[38px] rounded-control border border-line bg-card px-[15px] text-[13px] font-semibold text-ink-2 transition-colors hover:border-accent hover:text-accent"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={pending}
              className="h-[38px] rounded-control bg-accent px-[15px] text-[13px] font-semibold text-white transition-colors hover:bg-accent-dark disabled:opacity-60"
            >
              {pending ? "Creando…" : "Crear vendedor"}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
