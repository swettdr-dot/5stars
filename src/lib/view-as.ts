import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";
import type { SessionUser } from "@/lib/tenancy";

/**
 * Impersonación "Ver panel como" para SUPER_ADMIN (demo). El cookie guarda una
 * identidad efectiva firmada con HMAC; sólo se honra cuando el rol REAL de la
 * sesión es SUPER_ADMIN (ver `requireUser`), así nunca escala privilegios.
 */
export const VIEW_AS_COOKIE = "viewAs";

export type ViewAsIdentity = SessionUser & { id: string };

function secret(): string {
  return process.env.AUTH_SECRET ?? "dev-secret";
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function encodeViewAs(v: ViewAsIdentity): string {
  const payload = Buffer.from(JSON.stringify(v)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function decodeViewAs(token: string): ViewAsIdentity | null {
  const [payload, mac] = token.split(".");
  if (!payload || !mac) return null;
  const expected = sign(payload);
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as ViewAsIdentity;
  } catch {
    return null;
  }
}

export async function readViewAs(): Promise<ViewAsIdentity | null> {
  const token = (await cookies()).get(VIEW_AS_COOKIE)?.value;
  return token ? decodeViewAs(token) : null;
}
