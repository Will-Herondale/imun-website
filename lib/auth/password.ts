/**
 * Organiser authentication.
 *
 * Credentials are configured through environment variables / App Service
 * settings (ADMIN_EMAIL, ADMIN_PASSWORD), never through the source code, and
 * verified on the server. Login attempts are throttled by IP and account.
 *
 * Recommended upgrade before wide deployment: replace this with Microsoft
 * Entra ID / App Service Authentication (Easy Auth) — instructions in README's
 * production checklist. This module keeps the interface boundary so the
 * switch is isolated.
 */
import { timingSafeEqualSha } from "@/lib/auth/session";

export function adminEmail(): string {
  const email = process.env.ADMIN_EMAIL?.trim();
  if (process.env.NODE_ENV === "production" && !email) {
    throw new Error("ADMIN_EMAIL must be set in production.");
  }
  return email ?? "";
}

export function adminPassword(): string {
  const password = process.env.ADMIN_PASSWORD ?? "";
  if (process.env.NODE_ENV === "production" && password.length < 16) {
    throw new Error("ADMIN_PASSWORD too short for production (minimum 16 characters).");
  }
  return password;
}

export function verifyAdmin(email: string, password: string): boolean {
  const expectedEmail = adminEmail().toLowerCase();
  const expectedPassword = adminPassword();
  if (!expectedEmail || !expectedPassword || expectedPassword.length < 12) return false;
  const supplied = `${email.trim().toLowerCase()}:${password}`;
  const expected = `${expectedEmail}:${expectedPassword}`;
  return timingSafeEqualSha(supplied, expected);
}

/** Local-development convenience flag. */
export function allowLocalAdmin(): boolean {
  return process.env.ALLOW_LOCAL_ADMIN === "true";
}