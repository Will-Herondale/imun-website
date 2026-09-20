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

/**
 * Maintenance mode. Set SITE_MAINTENANCE=true in the hosting environment to
 * "pause" the public website: every public page and the delegate-facing APIs
 * respond 503 (temporary, so Google keeps the pages and re-crawls later) with
 * a branded notice. The admin area and admin APIs stay fully available, and
 * robots.txt / sitemap.xml / static assets keep serving. Removing the variable
 * restores the site; both work without a code change or redeploy.
 */
function maintenanceNotice(): NextResponse {
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>IMUN — Registration paused</title>
<meta name="robots" content="noindex, nofollow, noarchive">
<style>html,body{margin:0}body{min-height:100vh;display:flex;align-items:center;justify-content:center;background:#020d24;color:#fff;font-family:Arial,Helvetica,sans-serif;padding:2rem}.card{max-width:620px;text-align:center}.seal{width:74px;height:74px;margin:0 auto 2rem;border:1px solid rgba(193,161,90,.5);border-radius:50%;display:flex;align-items:center;justify-content:center;color:#c1a15a;font-weight:700;font-size:1.05rem;letter-spacing:2px}.kicker{color:#c1a15a;font-size:.72rem;letter-spacing:.28em;text-transform:uppercase;margin:0 0 .75rem}h1{font-size:clamp(1.9rem,5vw,3rem);margin:0 0 1rem;line-height:1.1}p{color:rgba(255,255,255,.75);line-height:1.7;margin:0 0 2rem}.mail{color:rgba(255,255,255,.5);font-size:.9rem;margin:0;margin-bottom:0}a{color:#c1a15a;text-decoration:none}.bar{width:64px;height:2px;background:#c1a15a;margin:0 auto 1.5rem}</style>
</head>
<body><div class="card">
<div class="seal">IMUN</div>
<p class="kicker">Indian MUN · 10–11 October 2026</p>
<h1>Registration paused — an update is coming</h1>
<div class="bar" aria-hidden="true"></div>
<p>The secretariat is finalising changes to the conference format and the delegate fee. Online registration is temporarily paused. Please check back shortly — the updated details will be posted here as soon as they are confirmed.</p>
<p class="mail">Questions? Write to <a href="mailto:imun.official@gmail.com">imun.official@gmail.com</a></p>
</div></body>
</html>`;

  return new NextResponse(html, {
    status: 503,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Retry-After": "86400",
      "Cache-Control": "no-store",
      "Content-Security-Policy":
        "default-src 'none'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; frame-ancestors 'none'",
    },
  });
}

/** Paths that must stay live during maintenance. */
function alwaysLive(pathname: string): boolean {
  return (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/api/admin") ||
    pathname.startsWith("/assets/") ||
    pathname === "/favicon.ico" ||
    pathname === "/icon.png" ||
    pathname === "/apple-icon.png" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    pathname === "/manifest.webmanifest"
  );
}

export function proxy(request: NextRequest) {
  if (process.env.SITE_MAINTENANCE?.trim().toLowerCase() === "true" && !alwaysLive(request.nextUrl.pathname)) {
    return maintenanceNotice();
  }

  // Two UUIDs give a 244-bit entropy nonce using Web Crypto, which is
  // available in both the Edge and Node middleware runtimes.
  const nonce = `${crypto.randomUUID()}${crypto.randomUUID()}`
    .replaceAll("-", "")
    .toString();

  // Allow Google Analytics hosts only when a measurement ID is configured, so
  // the production CSP stays tight for deployments without analytics.
  const gaEnabled = /^(G|UA)-[A-Za-z0-9-]+$/.test(process.env.NEXT_PUBLIC_GA_ID?.trim() ?? "");
  const gaScript = gaEnabled ? " https://www.googletagmanager.com" : "";
  const gaConnect = gaEnabled
    ? " https://www.google-analytics.com https://region1.google-analytics.com https://www.googletagmanager.com"
    : "";
  const gaImg = gaEnabled ? " https://www.google-analytics.com https://www.googletagmanager.com" : "";

  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}'${gaScript}`,
    // No nonce here on purpose: a nonce would make browsers ignore
    // 'unsafe-inline', and React sets inline styles (e.g. transition-delay)
    // that are then blocked. Inline styles are far lower risk than scripts.
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob:${gaImg}`,
    "font-src 'self'",
    `connect-src 'self'${gaConnect}`,
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