/**
 * Thin wrapper around Google Analytics (gtag). Safe to call anywhere: it is a
 * no-op when analytics is not configured or during server rendering.
 */
type GtagParams = Record<string, unknown>;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

export function track(event: string, params: GtagParams = {}): void {
  if (typeof window === "undefined") return;
  if (typeof window.gtag !== "function") return;
  window.gtag("event", event, params);
}
