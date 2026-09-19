import type { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/api";
import { verifyWebhookSignature } from "@/lib/payments/famgateway";
import { log } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Receives FamGateway payment notifications (HMAC-SHA256 signed with the API
 * key, header `X-FamGateway-Signature`).
 *
 * Registrations are created only after the server re-verifies the order, so
 * this endpoint exists for audit + reconciliation: a paid notification with no
 * registration yet means the delegate closed the tab before submitting.
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
  const status = typeof payload.status === "string" ? payload.status : "";
  log.info("famgateway webhook received", { orderId, status });

  return jsonOk({ received: true });
}
