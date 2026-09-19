/**
 * Canonical origin for the deployed site. Read from NEXT_PUBLIC_SITE_URL so the
 * same build works locally, on previews and in production; falls back to the
 * live domain so canonical/structured-data URLs stay correct even if the
 * variable is missing.
 */
export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://imunindia.com").replace(/\/$/, "");

/** Absolute URL for a site-relative path. */
export function absoluteUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${siteUrl}${path.startsWith("/") ? path : `/${path}`}`;
}
