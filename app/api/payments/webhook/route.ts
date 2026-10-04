import type { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/api";
import { verifyWebhookSignature } from "@/lib/payments/famgateway";
import { orphanStore } from "@/lib/storage/paymentOrphans";
import { finalizeFromOrderId } from "@/lib/registrations/finalize";
import { log } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Generous for a JSON payment event, tiny next to a memory-exhaustion body. */
const MAX_WEBHOOK_BYTES = 64 * 1024;

/**
 * Receives FamGateway payment notifications (HMAC-SHA256 signed with the API
 * key, header `X-FamGateway-Signature`).
 *
 * This is the load-bearing path: when it fires, the registration is written
 * from the delegate's stored draft without any involvement from their browser.
 */
export async function POST(request: NextRequest) {
  /* Reject an oversized body from the declared length before buffering it, so
   * an unauthenticated caller cannot make the server hold arbitrary bytes in
   * memory. The signature covers the raw body, so the cap has to be generous
   * enough for a legitimate FamGateway payload. */
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > MAX_WEBHOOK_BYTES) {
    return jsonError("Payload too large.", 413, { code: "PAYLOAD_TOO_LARGE" });
  }

  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, "utf8") > MAX_WEBHOOK_BYTES) {
    return jsonError("Payload too large.", 413, { code: "PAYLOAD_TOO_LARGE" });
  }

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
   * Reconciliation.
   *
   * A confirmed payment normally belongs to a stored registration draft (see
   * lib/storage/registrationIntents.ts), in which case this webhook writes the
   * registration itself — the delegate's browser is not involved at all, so
   * closing the tab after paying can no longer lose a registration.
   *
   * The orphan flag is recorded first and cleared on success, so money is
   * never silently unaccounted for: if finalisation fails (gateway hiccup,
   * database outage) the payment still shows up in the admin panel, and
   * FamGateway's retry queue will fire this webhook again.
   */
  if (orderId && (status === "success" || status === "paid")) {
    /**
     * Record the money first, always. Every path below either clears this row
     * (the delegate is registered) or leaves it for the secretariat, so a paid
     * order is never invisible — not even if this request dies immediately
     * afterwards.
     */
    let orphanRecorded = false;
    try {
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
      orphanRecorded = true;
    } catch (err) {
      log.error("orphan record failed", { orderId, error: err instanceof Error ? err.name : "unknown" });
    }

    /**
     * The HTTP status is load-bearing. FamGateway retries non-2xx deliveries a
     * few times over the following half hour, and those retries are the only
     * safety net when our own database is briefly unavailable — so anything
     * that could still resolve with time has to be reported as a server error.
     * Acknowledging it with 200 would strand a real payment.
     *
     * A wrong amount is the exception: retrying cannot change it, so it is
     * acknowledged and left in the admin queue.
     */
    let retryable = !orphanRecorded;
    if (!orphanRecorded) {
      /* Without this row the payment exists nowhere at all, so no outcome can
       * be treated as final — retry until the secretariat's queue is writable. */
      log.error("payment could not be recorded for reconciliation", { orderId });
    }
    try {
      const outcome = await finalizeFromOrderId(orderId);
      if (outcome.status === "registered") {
        log.info("registration created by webhook", { orderId, id: outcome.registrationId });
      } else if (outcome.status === "no_draft") {
        /*
         * Usually terminal — money from an older flow, or a delegate whose draft
         * has already been purged. But a delivery can also beat the intent's
         * order binding by a second, and answering 200 then would rely on the
         * delegate's browser still being open. Retrying is cheap and the orphan
         * row keeps the payment visible either way.
         */
        retryable = true;
        log.warn("famgateway paid without a stored registration draft", { orderId });
      } else if (outcome.status === "amount_mismatch") {
        log.error("paid amount does not match the registration fee", {
          orderId,
          received: outcome.amount,
          expected: outcome.expected,
        });
      } else {
        /* `unavailable` (gateway or storage hiccup, another writer's live
         * lease) and `pending_payment` (FamGateway's own status has not caught
         * up yet) both resolve with time. */
        retryable = true;
        log.warn("webhook finalisation deferred", { orderId, outcome: outcome.status });
      }
    } catch (err) {
      retryable = true;
      log.error("webhook finalisation failed", { orderId, error: err instanceof Error ? err.name : "unknown" });
    }

    if (retryable) {
      return jsonError("Payment received; registration is still being finalised.", 503, {
        code: "RETRYABLE",
        orderId,
      });
    }
  }

  return jsonOk({ received: true });
}
