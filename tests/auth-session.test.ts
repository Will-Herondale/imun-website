import { describe, it, expect, vi, afterEach } from "vitest";
import {
  createAdminSession,
  signSessionToken,
  verifySessionToken,
  timingSafeEqualSha,
} from "@/lib/auth/session";

afterEach(() => vi.unstubAllEnvs());

describe("session tokens", () => {
  it("round-trips a signed session", () => {
    vi.stubEnv("ADMIN_SESSION_SECRET", "x".repeat(40));
    const { token, session } = createAdminSession("organiser@iemun.example");
    const decoded = verifySessionToken(token);
    expect(decoded?.email).toBe(session.email);
    expect(decoded?.csrf).toBe(session.csrf);
    expect(decoded?.sub).toBe("organiser");
  });

  it("rejects tampered tokens", () => {
    vi.stubEnv("ADMIN_SESSION_SECRET", "y".repeat(40));
    const { token } = createAdminSession("organiser@iemun.example");
    const tampered = `${token.slice(0, -4)}zzzz`;
    expect(verifySessionToken(tampered)).toBeNull();
  });

  it("rejects tokens signed with a different secret", () => {
    vi.stubEnv("ADMIN_SESSION_SECRET", "s1".repeat(20));
    const { token } = createAdminSession("organiser@iemun.example");
    vi.stubEnv("ADMIN_SESSION_SECRET", "s2".repeat(20));
    expect(verifySessionToken(token)).toBeNull();
  });

  it("rejects expired sessions", () => {
    vi.stubEnv("ADMIN_SESSION_SECRET", "z".repeat(40));
    const session = {
      sub: "organiser",
      email: "o@e.example",
      csrf: "abc",
      exp: Date.now() - 60_000,
    };
    expect(verifySessionToken(signSessionToken(session))).toBeNull();
  });

  it("validates with constant-time equality helper", () => {
    expect(timingSafeEqualSha("secret-a", "secret-a")).toBe(true);
    expect(timingSafeEqualSha("secret-a", "secret-b")).toBe(false);
  });
});