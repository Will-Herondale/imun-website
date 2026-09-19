import type { NextRequest } from "next/server";
import { readAdminSession, jsonError, jsonOk } from "@/lib/api";
import { activeStore } from "@/lib/storage";
import { filterRegistrations, paginate, type AdminQuery } from "@/lib/admin-filter";
import { log } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await readAdminSession();
  if (!session) return jsonError("Not authenticated.", 401, { code: "UNAUTHENTICATED" });

  const params = request.nextUrl.searchParams;
  const query: AdminQuery = {
    search: params.get("search") ?? undefined,
    committee: params.get("committee") ?? undefined,
    status: params.get("status") ?? undefined,
    sort: params.get("sort") ?? undefined,
    dir: params.get("dir") === "asc" ? "asc" : "desc",
  };
  const page = Number(params.get("page") ?? 1);
  const pageSize = Number(params.get("pageSize") ?? 25);

  try {
    const rows = await activeStore().list();
    const filtered = filterRegistrations(rows, query);
    const result = paginate(filtered, page, pageSize);
    // `grandTotal` is the unfiltered count, so the dashboard can tell "nothing
    // registered yet" apart from "nothing matches the current filters".
    return jsonOk({ ...result, grandTotal: rows.length });
  } catch (err) {
    log.error("admin list failed", { error: err instanceof Error ? err.name : "unknown" });
    return jsonError("Could not load registrations.", 503, { code: "STORAGE_UNAVAILABLE" });
  }
}