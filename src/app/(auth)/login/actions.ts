"use server";
import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth";

export type LoginState = { error?: string };

/**
 * Autentica con credenciales. En éxito, `signIn` redirige a "/" (la raíz enruta
 * al panel según el rol) lanzando un redirect que debe propagarse. Si las
 * credenciales son inválidas, `signIn` lanza `AuthError`: lo capturamos y
 * devolvemos un mensaje en vez de un 500.
 */
export async function authenticate(_prev: LoginState, formData: FormData): Promise<LoginState> {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/",
    });
    return {};
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Email o contraseña incorrectos" };
    }
    throw error; // re-lanzar el redirect de éxito (NEXT_REDIRECT) u otros errores.
  }
}
