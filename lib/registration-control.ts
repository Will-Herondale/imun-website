/**
 * Runtime registration control. The environment variable REGISTRATION_OPEN
 * (settable in Azure App Service without redeploying) overrides the value in
 * lib/config/site.ts. Because the API consults this function on every
 * submission, closing registration is enforced server-side — never only in
 * the UI.
 */
import { site } from "@/lib/config/site";

export function isRegistrationOpen(): boolean {
  const env = process.env.REGISTRATION_OPEN?.trim().toLowerCase();
  if (env === "true") return true;
  if (env === "false") return false;
  return site.registrationOpen;
}

export function registrationStatus(): { open: boolean; label: string } {
  const open = isRegistrationOpen();
  return {
    open,
    label: open ? site.registrationLabel || "Registration open — seats limited" : "Registration closed",
  };
}