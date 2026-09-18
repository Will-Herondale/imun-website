import { describe, it, expect } from "vitest";
import { checkRateLimit } from "@/lib/security/rateLimit";

describe("checkRateLimit", () => {
  it("allows requests under the limit", () => {
    const a = checkRateLimit("ip:1", 3, 60_000);
    const b = checkRateLimit("ip:1", 3, 60_000);
    expect(a.allowed).toBe(true);
    expect(b.allowed).toBe(true);
    expect(b.remaining).toBe(1);
  });

  it("rejects when the limit is exceeded", () => {
    checkRateLimit("ip:2", 2, 60_000);
    checkRateLimit("ip:2", 2, 60_000);
    const blocked = checkRateLimit("ip:2", 2, 60_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("treats different actors independently", () => {
    checkRateLimit("ip:3", 1, 60_000);
    expect(checkRateLimit("ip:4", 1, 60_000).allowed).toBe(true);
  });

  it("expires stamps after the window", async () => {
    checkRateLimit("ip:5", 1, 1);
    await new Promise((r) => setTimeout(r, 5));
    expect(checkRateLimit("ip:5", 1, 1).allowed).toBe(true);
  });
});