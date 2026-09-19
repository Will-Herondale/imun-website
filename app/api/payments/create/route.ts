import type { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/api";
import { feeAmountFor } from "@/lib/config/site";
import { createPaymentOrder, famgatewayConfigured } from "@/lib/payments/famgateway";
import { checkRateLimit, LIMITS } from "@/lib/security/rateLimit";
import { clientIpFrom } from "@/lib/utils/request";
import { log } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function originFrom(request: NextRequest): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");
  return new URL(request.url).origin;
}

/**
 * Creates a FamGateway UPI order for the current round's delegate fee.
 *
 * The API key stays server-side; the browser only receives the hosted checkout
 * URL and the order id used to poll for confirmation.
 */
export async function POST(request: NextRequest) {
  const ip = clientIpFrom(request);
  const rl = checkRateLimit(`pay:create:${ip}`, LIMITS.payments.limit, LIMITS.payments.windowMs);
  if (!rl.allowed) {
    return jsonError("Too many payment attempts. Please wait a few minutes.", 429, {
      code: "RATE_LIMITED",
      retryAfterSeconds: Math.max(1, rl.retryAfterSeconds),
    });
  }

  if (!famgatewayConfigured()) {
    return jsonError("Automated payment is temporarily unavailable.", 503, {
      code: "PAYMENTS_UNAVAILABLE",
    });
  }

  const amount = feeAmountFor();
  const origin = originFrom(request);

  let customerName = "";
  try {
    const body = (await request.json()) as unknown;
    if (body && typeof body === "object" && typeof (body as { name?: unknown }).name === "string") {
      customerName = (body as { name: string }).name.trim().slice(0, 120);
    }
  } catch {
    /* body is optional */
  }

  const order = await createPaymentOrder(amount, {
    customerName,
    redirectUrl: `${origin}/registration`,
    webhookUrl: `${origin}/api/payments/webhook`,
  });

  if (!order) {
    log.warn("payment order creation failed", { ip });
    return jsonError("We could not start the payment right now. Please try again shortly.", 502, {
      code: "PAYMENT_CREATE_FAILED",
    });
  }

  return jsonOk({
    orderId: order.orderId,
    amount: order.amount,
    payableAmount: order.payableAmount,
    checkoutUrl: order.checkoutUrl,
    qrUrl: order.qrUrl,
    upiIntent: order.upiIntent,
  });
}
