import { getActiveProfile } from "./profiles";

export const EVENT_ROUTES = [
  "/about",
  "/conference",
  "/committees",
  "/allocations",
  "/registration",
  "/registration/complete",
  "/faq",
  "/contact",
  "/updates",
];

export async function getSiteMode() {
  const profile = await getActiveProfile();
  return { mode: profile.mode, profile };
}

export function isEventRoute(pathname: string): boolean {
  return EVENT_ROUTES.some((r) => pathname === r || pathname.startsWith(r + "/"));
}
