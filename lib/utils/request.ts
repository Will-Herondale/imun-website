/** Extracts the caller IP address from incoming request headers. */
export function clientIpFrom(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) {
    const first = fwd.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "local";
}

/** Already-requested security headers are set in next.config; kept here for tests. */
export const SECURITY_HEADER_NAMES = [
  "X-Content-Type-Options",
  "X-Frame-Options",
  "Referrer-Policy",
  "Permissions-Policy",
  "Content-Security-Policy",
] as const;