"use client";
import { useActionState } from "react";
import { authenticate, type LoginState } from "../actions";

const INITIAL: LoginState = {};

const inputClass =
  "h-10 w-full rounded-[9px] border border-line bg-white px-3 text-[14px] text-ink outline-none " +
  "transition-shadow focus:border-accent focus:shadow-[0_0_0_3px_var(--ac-bg)]";

export function LoginForm() {
  const [state, action, pending] = useActionState(authenticate, INITIAL);

  return (
    <form action={action}>
      <label htmlFor="email" className="mb-1.5 block text-meta font-medium text-ink-2">
        Email
      </label>
      <input
        id="email"
        name="email"
        type="email"
        autoComplete="email"
        required
        className={`${inputClass} mb-3.5`}
      />

      <label htmlFor="password" className="mb-1.5 block text-meta font-medium text-ink-2">
        Contraseña
      </label>
      <input
        id="password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        className={`${inputClass} mb-2`}
      />

      {state.error && (
        <p role="alert" className="mb-2 text-meta text-red">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 h-[42px] w-full rounded-[9px] bg-accent text-[14.5px] font-semibold text-white transition-colors hover:bg-accent-dark disabled:opacity-60"
      >
        {pending ? "Ingresando…" : "Ingresar"}
      </button>
    </form>
  );
}
