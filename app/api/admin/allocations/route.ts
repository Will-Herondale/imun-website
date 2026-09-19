import { readAdminSession, jsonError, jsonOk } from "@/lib/api";
import { activeStore } from "@/lib/storage";
import { buildAllocationSummary } from "@/lib/allocations";
import { log } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await readAdminSession();
  if (!session) return jsonError("Not authenticated.", 401, { code: "UNAUTHENTICATED" });

  try {
    const rows = await activeStore().list();
    return jsonOk({ summary: buildAllocationSummary(rows) });
  } catch (err) {
    log.error("admin allocations summary failed", { error: err instanceof Error ? err.name : "unknown" });
    return jsonError("Could not load allocations.", 503, { code: "STORAGE_UNAVAILABLE" });
  }
}
