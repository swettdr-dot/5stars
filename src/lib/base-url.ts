import { headers } from "next/headers";

/**
 * URL base pública del sitio. Usa NEXTAUTH_URL si está definida; si no, la deriva
 * del host real de la request (Vercel envía x-forwarded-host/proto). Así los
 * enlaces/QR del flujo público apuntan al dominio correcto sin configurar nada.
 */
export async function getBaseUrl(): Promise<string> {
  const env = process.env.NEXTAUTH_URL;
  if (env) return env.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (host) {
    const proto = h.get("x-forwarded-proto") ?? "https";
    return `${proto}://${host}`;
  }
  return "http://localhost:3000";
}
