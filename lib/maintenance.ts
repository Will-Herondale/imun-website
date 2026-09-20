import { NextResponse } from "next/server";

/**
 * Maintenance mode is driven purely by the SITE_MAINTENANCE environment
 * variable (set/removed in the hosting panel — no redeploy of code needed).
 * The public pages are paused at the proxy; these guards cover the delegate
 * APIs too, so a tab already open cannot submit while registration is paused.
 */
export function isMaintenance(): boolean {
  return process.env.SITE_MAINTENANCE?.trim().toLowerCase() === "true";
}

export function maintenanceJsonResponse(): NextResponse {
  return NextResponse.json(
    {
      ok: false,
      error:
        "Registration is temporarily paused while the secretariat finalises the conference details. Please check back shortly.",
      code: "MAINTENANCE",
    },
    { status: 503 }
  );
}