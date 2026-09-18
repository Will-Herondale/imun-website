/**
 * Server-side admin session management.
 *
 * Sessions are signed HMAC tokens held in an HttpOnly, SameSite=Strict,
 * Secure (production) cookie. The signing secret comes from the
 * ADMIN_SESSION_SECRET environment variable / App Service setting and is never
 * exposed to the browser.
 *
 * A per-session CSRF nonce is bound into the token; the API returns it to the
 * authenticated client over GET /api/admin/session and all mutations require
 * it in the `x-iemun-csrf` header (synchroniser-token pattern).
 */
import { createHmac, timingSafeEqual, randomBytes } from "node:crypto";

const COOKIE_NAME = "iemun_admin";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours
const MAX_TOKEN_AGE_MS = 30 * 1000; // clock-skew tolerance

export type AdminSession = {
  sub: string;
  email: string;
  csrf: string;
  exp: number; // epoch ms
};

function bufferFrom(hex: string): Buffer {
  return Buffer.from(hex, "utf8");
}

function sessionSecret(): Buffer {
  const fromEnv = process.env.ADMIN_SESSION_SECRET?.trim();
  if (fromEnv && fromEnv.length >= 32) return bufferFrom(fromEnv);
  if (process.env.NODE_ENV === "production") {
    throw new Error("ADMIN_SESSION_SECRET must be set to at least 32 characters in production.");
  }
  // Dev-only: ephemeral secret; sessions do not survive a restart.
  const warning =
    "WARNING: ADMIN_SESSION_SECRET is unset; using an ephemeral dev secret. Set it in .env.local for stable sessions.";
  console.warn(warning);
  return randomBytes(48);
}

export function signSessionToken(session: AdminSession): string {
  const body = JSON.stringify({
    sub: session.sub,
    email: session.email,
    csrf: session.csrf,
    exp: session.exp,
  });
  const payloadB64 = Buffer.from(body, "utf8").toString("base64url");
  const sig = createHmac("sha256", sessionSecret()).update(payloadB64).digest("hex");
  return `${payloadB64}.${sig}`;
}

export function verifySessionToken(token: string): AdminSession | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payloadB64, sig] = parts;
  const expected = createHmac("sha256", sessionSecret()).update(payloadB64).digest("hex");
  const sigA = Buffer.from(sig, "utf8");
  const sigB = Buffer.from(expected, "utf8");
  if (sigA.length !== sigB.length || !timingSafeEqual(sigA, sigB)) return null;
  try {
    const decoded = Buffer.from(payloadB64, "base64url").toString("utf8");
    const session = JSON.parse(decoded) as AdminSession;
    if (
      typeof session.exp !== "number" ||
      typeof session.sub !== "string" ||
      typeof session.csrf !== "string"
    ) {
      return null;
    }
    const now = Date.now();
    if (session.exp < now - MAX_TOKEN_AGE_MS) return null;
    if (session.exp > now + SESSION_TTL_MS + MAX_TOKEN_AGE_MS) return null; // forged far-future
    return session;
  } catch {
    return null;
  }
}

export function createAdminSession(email: string): { token: string; session: AdminSession } {
  const session: AdminSession = {
    sub: "organiser",
    email,
    csrf: randomBytes(24).toString("hex"),
    exp: Date.now() + SESSION_TTL_MS,
  };
  return { token: signSessionToken(session), session };
}

export { COOKIE_NAME };

export function cookieAttributes(secure: boolean): string {
  const attrs = [
    `${COOKIE_NAME}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
    ...(secure ? ["Secure"] : []),
    `Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`,
  ];
  return attrs.join("; ");
}

/** Compare two non-empty strings in constant time (SHA-256 pre-hashed). */
export function timingSafeEqualSha(a: string, b: string): boolean {
  const ha = createHmac("sha256", "compare").update(a).digest();
  const hb = createHmac("sha256", "compare").update(b).digest();
  return timingSafeEqual(ha, hb);
}