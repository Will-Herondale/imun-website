import type { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/api";
import { verifyWebhookSignature } from "@/lib/payments/famgateway";
import { activeStore } from "@/lib/storage";
import { orphanStore } from "@/lib/storage/paymentOrphans";
import { log } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Receives FamGateway payment notifications (HMAC-SHA256 signed with the API
 * key, header `X-FamGateway-Signature`).
 *
 * Registrations are created only after the server re-verifies the order, so
 * a paid notification with no registration yet means the delegate closed the
 * tab before submitting. Those payments are recorded as reconciliation orphans
 * for the admin dashboard instead of being silently lost.
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-famgateway-signature");

  if (!verifyWebhookSignature(rawBody, signature)) {
    log.warn("famgateway webhook signature rejected");
    return jsonError("Invalid signature.", 401, { code: "INVALID_SIGNATURE" });
  }

  let payload: Record<string, unknown> = {};
  try {
    const parsed = JSON.parse(rawBody) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      payload = parsed as Record<string, unknown>;
    }
  } catch {
    return jsonError("Invalid JSON.", 400, { code: "INVALID_JSON" });
  }

  const orderId = typeof payload.order_id === "string" ? payload.order_id : "";
  const status = typeof payload.status === "string" ? payload.status.toLowerCase() : "";
  log.info("famgateway webhook received", { orderId, status });

  /**
   * Reconciliation: a confirmed payment that no registration row references
   * yet is flagged so the secretariat can chase the delegate. Best-effort —
   * never fails the webhook ack over an audit failure.
   */
  if (orderId && (status === "success" || status === "paid")) {
    try {
      const existing = await activeStore().findByPaymentOrderId(orderId);
      if (!existing) {
        await orphanStore().recordPaidOrphan({
          orderId,
          amount: Number(payload.amount ?? 0),
          utr: typeof payload.utr === "string" ? payload.utr : "",
          payer:
            typeof payload.sender_name === "string"
              ? payload.sender_name
              : typeof payload.payer === "string"
                ? payload.payer
                : "",
        });
        log.warn("famgateway paid without linked registration", { orderId });
      }
    } catch (err) {
      log.warn("famgateway webhook audit failed", {
        orderId,
        error: err instanceof Error ? err.name : "unknown",
      });
    }
  }

  return jsonOk({ received: true });
}
