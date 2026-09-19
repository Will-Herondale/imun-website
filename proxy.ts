/**
 * Proxy (Next 16 renamed middleware → proxy) that provides production CSP
 * with per-request nonces.
 *
 * Next.js renders a handful of inline scripts for hydration. A static
 * `script-src 'self'` CSP (as configured in next.config) blocks them and the
 * app silently fails to hydrate. The fix is nonce-based CSP: we generate a
 * nonce per request, put it in the CSP header AND in the `x-nonce` request
 * header that Next reads to tag its own inline scripts/styles.
 *
 * Side effect: matching routes are server-rendered per request. That is what
 * we want on Azure App Service (self-hosted); the pages in this app are
 * light.
 */
import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  // Two UUIDs give a 244-bit entropy nonce using Web Crypto, which is
  // available in both the Edge and Node middleware runtimes.
  const nonce = `${crypto.randomUUID()}${crypto.randomUUID()}`
    .replaceAll("-", "")
    .toString();

  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}'`,
    // No nonce here on purpose: a nonce would make browsers ignore
    // 'unsafe-inline', and React sets inline styles (e.g. transition-delay)
    // that are then blocked. Inline styles are far lower risk than scripts.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join("; ");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  // Next.js reads the nonce out of the request's CSP header to stamp its own
  // inline hydration scripts. Without this the inline scripts are blocked and
  // the page never hydrates (which leaves every [data-reveal] at opacity: 0).
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon\\.ico|robots\\.txt|sitemap\\.xml).*)",
  ],
};