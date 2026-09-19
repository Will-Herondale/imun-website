import type { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/api";
import { famgatewayConfigured, verifyPaymentOrder } from "@/lib/payments/famgateway";
import { checkRateLimit, LIMITS } from "@/lib/security/rateLimit";
import { clientIpFrom } from "@/lib/utils/request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Server-side status probe for a FamGateway order. The browser polls this while
 * the delegate pays; the authoritative check happens here (never client-side).
 */
export async function GET(request: NextRequest) {
  const ip = clientIpFrom(request);
  const rl = checkRateLimit(`pay:status:${ip}`, LIMITS.payments.limit, LIMITS.payments.windowMs);
  if (!rl.allowed) {
    return jsonError("Too many requests.", 429, {
      code: "RATE_LIMITED",
      retryAfterSeconds: Math.max(1, rl.retryAfterSeconds),
    });
  }

  if (!famgatewayConfigured()) {
    return jsonError("Automated payment is temporarily unavailable.", 503, {
      code: "PAYMENTS_UNAVAILABLE",
    });
  }

  const orderId = new URL(request.url).searchParams.get("orderId")?.trim() ?? "";
  if (!orderId || orderId.length > 40) {
    return jsonError("A valid orderId is required.", 400, { code: "INVALID_ORDER" });
  }

  const verified = await verifyPaymentOrder(orderId);
  if (!verified) {
    return jsonError("We could not confirm the payment status right now.", 502, {
      code: "PAYMENT_VERIFY_FAILED",
    });
  }

  return jsonOk({
    status: verified.status,
    amount: verified.amount,
    utr: verified.status === "success" ? verified.utr : "",
  });
}
