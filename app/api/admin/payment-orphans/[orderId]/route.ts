import type { NextRequest } from "next/server";
import { readAdminSession, jsonError, jsonOk } from "@/lib/api";
import { orphanStore } from "@/lib/storage/paymentOrphans";
import { log } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Marks a "paid but not registered" payment as handled so the secretariat can
 * clear it from the reconciliation list after chasing the delegate offline.
 */
export async function POST(_request: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  const session = await readAdminSession();
  if (!session) return jsonError("Not authenticated.", 401, { code: "UNAUTHENTICATED" });

  const { orderId } = await params;
  if (!orderId || orderId.length > 100) {
    return jsonError("Invalid order id.", 400, { code: "BAD_REQUEST" });
  }

  try {
    await orphanStore().resolve(orderId);
    return jsonOk({ resolved: true, orderId });
  } catch (err) {
    log.error("orphan resolve failed", { error: err instanceof Error ? err.name : "unknown" });
    return jsonError("Could not resolve the payment.", 503, { code: "STORAGE_UNAVAILABLE" });
  }
}