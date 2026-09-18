import type { NextRequest } from "next/server";
import { verifyAdmin } from "@/lib/auth/password";
import { checkRateLimit, LIMITS } from "@/lib/security/rateLimit";
import { clientIpFrom } from "@/lib/utils/request";
import { attachSessionCookie, jsonError, jsonOk } from "@/lib/api";
import { log } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const ip = clientIpFrom(request);

  // Token buckets for both the IP and the account to slow credential stuffing.
  const ipToken = checkRateLimit(`login-ip:${ip}`, LIMITS.login.limit, LIMITS.login.windowMs);
  if (!ipToken.allowed) {
    return jsonError("Too many login attempts. Try again later.", 429, { code: "RATE_LIMITED" });
  }

  const account = (process.env.ADMIN_EMAIL ?? "").toLowerCase();
  if (account) {
    const accountToken = checkRateLimit(
      `login-acct:${account}`,
      LIMITS.account.limit,
      LIMITS.account.windowMs
    );
    if (!accountToken.allowed) {
      return jsonError("Too many login attempts for this account. Try again later.", 429, {
        code: "RATE_LIMITED",
      });
    }
  }

  const text = await request.text().catch(() => "");
  if (Buffer.byteLength(text, "utf8") > 4 * 1024 || !text.trim()) {
    return jsonError("Invalid request.", 400, { code: "BAD_REQUEST" });
  }
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return jsonError("Invalid JSON.", 400, { code: "INVALID_JSON" });
  }
  const { email, password } = (raw ?? {}) as { email?: unknown; password?: unknown };
  if (typeof email !== "string" || typeof password !== "string") {
    return jsonError("Email and password are required.", 422, { code: "MISSING_FIELDS" });
  }

  const ok = verifyAdmin(email, password);
  if (!ok) {
    log.warn("admin login failed", { ip, email: email.toLowerCase() });
    return jsonError("Invalid credentials.", 401, { code: "INVALID_CREDENTIALS" });
  }

  log.info("admin login succeeded", { ip });
  const response = attachSessionCookie(jsonOk({ authenticated: true }), email.toLowerCase());
  return response;
}