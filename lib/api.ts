/** Shared helpers for Next.js route handlers (API layer). */
import { cookies } from "next/headers";
import {
  COOKIE_NAME,
  cookieAttributes,
  createAdminSession,
  verifySessionToken,
  type AdminSession,
} from "@/lib/auth/session";

export function jsonError(message: string, status: number, extra?: Record<string, unknown>) {
  return Response.json({ ok: false, error: message, ...extra }, { status });
}

export function jsonOk<T>(data: T, init?: { status?: number; headers?: HeadersInit }) {
  return Response.json({ ok: true, ...data }, { status: init?.status ?? 200, headers: init?.headers });
}

/** Reads + verifies the admin session cookie for the current request. */
export async function readAdminSession(): Promise<AdminSession | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

/** Sends a fresh signed session cookie on a response. */
export function attachSessionCookie(response: globalThis.Response, email: string): globalThis.Response {
  const { token } = createAdminSession(email);
  const attrs = cookieAttributes(true);
  const header = attrs.replace(`${COOKIE_NAME}=`, `${COOKIE_NAME}=${token}`);
  response.headers.set("Set-Cookie", header);
  return response;
}

/** Expires the session cookie. */
export function clearSessionCookie(response: globalThis.Response): globalThis.Response {
  response.headers.set(
    "Set-Cookie",
    `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`
  );
  return response;
}