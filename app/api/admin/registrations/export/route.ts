import type { NextRequest } from "next/server";
import { readAdminSession, jsonError } from "@/lib/api";
import { activeStore } from "@/lib/storage/registrationTable";
import {
  EXPORT_HEADERS,
  filterRegistrations,
  recordToCsvRow,
  type AdminQuery,
} from "@/lib/admin-filter";
import { toCsv, exportFileName } from "@/lib/utils/csv";
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
  };

  try {
    const rows = await activeStore().list();
    const filtered = filterRegistrations(rows, query);
    const body = filtered.map((r) => {
      const row = recordToCsvRow(r)[0] as Record<string, unknown>;
      return EXPORT_HEADERS.map((h) => row[h]);
    });
    const csv = toCsv([...EXPORT_HEADERS], body);

    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${exportFileName()}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    log.error("admin export failed", { error: err instanceof Error ? err.name : "unknown" });
    return jsonError("Could not export registrations.", 503, { code: "STORAGE_UNAVAILABLE" });
  }
}