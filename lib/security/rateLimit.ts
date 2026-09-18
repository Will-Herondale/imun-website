/**
 * Sliding-window in-memory rate limiter, keyed per actor (IP address).
 *
 * Suitable for a single App Service instance. If the site is ever scaled to
 * multiple instances, move to a shared store (e.g. Redis/Table Storage) —
 * see README. The limiter never logs personal data; keys live in memory only.
 */
const buckets = new Map<string, number[]>();
const CLEANUP_EVERY_MS = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup(): void {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_EVERY_MS) return;
  lastCleanup = now;
  for (const [key, stamps] of buckets) {
    const windowEndExclusive = now - maxWindowMs();
    if (!stamps.length || stamps[stamps.length - 1] < windowEndExclusive) buckets.delete(key);
  }
}

let configuredWindowMs = 60 * 1000;

function maxWindowMs(): number {
  return configuredWindowMs;
}

export type RateLimitResult = {
  allowed: boolean;
  /** Remaining requests in the current window. */
  remaining: number;
  /** Epoch ms when the limiting window resets. */
  resetAt: number;
  /** Whole seconds until the window resets (non-negative). */
  retryAfterSeconds: number;
};

/**
 * Records one attempt and decides whether it may proceed.
 * @param key   actor key, typically `ip:<address>`
 * @param limit max requests allowed within the window
 * @param windowMs sliding window length
 */
export function checkRateLimit(key: string, limit: number, windowMs = 60_000): RateLimitResult {
  cleanup();
  configuredWindowMs = windowMs;
  const now = Date.now();
  let stamps = buckets.get(key);
  if (!stamps) {
    stamps = [];
    buckets.set(key, stamps);
  }
  while (stamps.length && stamps[0] <= now - windowMs) stamps.shift();

  if (stamps.length >= limit) {
    const resetAt = (stamps[0] ?? now) + windowMs;
    return { allowed: false, remaining: 0, resetAt, retryAfterSeconds: Math.max(0, Math.ceil((resetAt - now) / 1000)) };
  }
  stamps.push(now);
  return { allowed: true, remaining: limit - stamps.length, resetAt: now + windowMs, retryAfterSeconds: Math.max(0, Math.ceil(windowMs / 1000)) };
}

/** Reasonable conference-scale defaults. */
export const LIMITS = {
  /** Registration submissions, per IP per 10 minutes. */
  registrations: { limit: 3, windowMs: 10 * 60 * 1000 },
  /** Admin login attempts, per IP per 15 minutes. */
  login: { limit: 8, windowMs: 15 * 60 * 1000 },
  /** Login attempts against a single admin account. */
  account: { limit: 8, windowMs: 15 * 60 * 1000 },
} as const;