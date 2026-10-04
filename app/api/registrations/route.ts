import type { NextRequest } from "next/server";
import {
  MAX_BODY_BYTES,
  registrationSchema,
  sanitizePayload,
  type PaymentFields,
} from "@/lib/validation/registration";
import { activeStore } from "@/lib/storage";
import { orphanStore } from "@/lib/storage/paymentOrphans";
import { intentStore } from "@/lib/storage/registrationIntents";
import { finalizeFromOrderId } from "@/lib/registrations/finalize";
import { feeAmountFor } from "@/lib/config/site";
import { famgatewayConfigured, verifyPaymentOrder } from "@/lib/payments/famgateway";
import { isRegistrationOpen } from "@/lib/registration-control";
import { checkRateLimit, LIMITS } from "@/lib/security/rateLimit";
import { clientIpFrom } from "@/lib/utils/request";
import { jsonError, jsonOk } from "@/lib/api";
import { log } from "@/lib/log";
import { isMaintenance, maintenanceJsonResponse } from "@/lib/maintenance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (isMaintenance()) {
    return maintenanceJsonResponse();
  }

  if (!isRegistrationOpen()) {
    return jsonError("Registration is currently closed. Please check back after the form reopens.", 409, {
      code: "REGISTRATION_CLOSED",
    });
  }

  const ip = clientIpFrom(request);
  const rl = checkRateLimit(
    `reg:${ip}`,
    LIMITS.registrations.limit,
    LIMITS.registrations.windowMs
  );
  if (!rl.allowed) {
    return jsonError("You have submitted this form too many times. Please wait a few minutes and try again.", 429, {
      code: "RATE_LIMITED",
      retryAfterSeconds: Math.max(1, rl.retryAfterSeconds),
    });
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return jsonError("This endpoint expects a JSON body.", 415, { code: "UNSUPPORTED_MEDIA" });
  }

  const rawText = await request.text().catch(() => "");
  if (Buffer.byteLength(rawText, "utf8") > MAX_BODY_BYTES) {
    return jsonError("Request body is too large.", 413, { code: "PAYLOAD_TOO_LARGE" });
  }

  let raw: unknown;
  try {
    raw = JSON.parse(rawText);
  } catch {
    return jsonError("Request body is not valid JSON.", 400, { code: "INVALID_JSON" });
  }

  /* Server-side sanitisation of every string field before validation. */
  const sanitized = sanitizePayload(
    raw !== null && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : null
  );
  const parsed = registrationSchema.safeParse(sanitized);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".");
      if (key && !fields[key]) fields[key] = issue.message;
    }
    return jsonError("One or more fields are invalid.", 422, { code: "VALIDATION_ERROR", fields });
  }

  const data = parsed.data;

  /** Honeypot: bots fill hidden fields. Respond positively, persist nothing. */
  if (data.website) {
    log.info("registration honeypot triggered", { ip });
    return jsonOk({ accepted: true, id: "IGNORED" }, { status: 201 });
  }

  /**
   * Resolve payment BEFORE persisting. A FamGateway order id is re-verified
   * server-to-server (never trusted from the browser) and the credited amount
   * must match the fee quoted for this round.
   *
   * There is no self-reported fallback: a typed UTR cannot be verified, so it
   * must not grant a seat. Offline/cash payments are added by the secretariat
   * from the admin console after they have confirmed the transfer.
   */
  if (!data.paymentOrderId) {
    return jsonError(
      "We could not verify a payment for this registration. Please pay the delegate fee using the checkout on the registration page, then submit again.",
      402,
      { code: "PAYMENT_REQUIRED" }
    );
  }

  if (!famgatewayConfigured()) {
    return jsonError("Automated payment is temporarily unavailable. Please try again shortly.", 503, {
      code: "PAYMENTS_UNAVAILABLE",
    });
  }

  /**
   * If this order belongs to a stored draft, the registration is completed
   * from those saved answers (the same code path the webhook and the
   * confirmation page use). Re-sending the payload from the browser must
   * never create a second row or report a spurious failure.
   */
  const intent = await intentStore()
    .findByOrderId(data.paymentOrderId)
    .catch(() => null);

  if (intent) {
    const outcome = await finalizeFromOrderId(data.paymentOrderId);
    if (outcome.status === "registered") {
      return jsonOk(
        {
          accepted: true,
          duplicate: outcome.duplicate,
          id: outcome.registrationId,
          paymentStatus: outcome.paymentStatus,
        },
        { status: 201 }
      );
    }
    if (outcome.status === "pending_payment") {
      return jsonError("Your payment has not been confirmed yet. Complete the payment, then submit again.", 402, {
        code: "PAYMENT_PENDING",
      });
    }
    if (outcome.status === "amount_mismatch") {
      return jsonError(
        `We received ₹${outcome.amount || 0} but the fee for this round is ₹${outcome.expected}. Please contact the secretariat.`,
        422,
        {
          code: "PAYMENT_AMOUNT_MISMATCH",
          fields: { paymentOrderId: "Payment amount does not match the delegate fee." },
        }
      );
    }
    if (outcome.status !== "no_draft") {
      return jsonError("We could not complete your registration just now. Please try again shortly.", 503, {
        code: "REGISTRATION_UNAVAILABLE",
      });
    }
    /* No draft after all (legacy order): fall through to the inline check. */
  }

  const verified = await verifyPaymentOrder(data.paymentOrderId);
  if (!verified) {
    return jsonError("We could not confirm that payment. Please retry in a moment.", 502, {
      code: "PAYMENT_VERIFY_FAILED",
    });
  }
  if (verified.status !== "success") {
    return jsonError("Your payment has not been confirmed yet. Complete the payment, then submit again.", 402, {
      code: "PAYMENT_PENDING",
    });
  }
  const expected = feeAmountFor();
  if (verified.amount !== expected) {
    return jsonError(
      `We received ₹${verified.amount || 0} but the fee for this round is ₹${expected}. Please contact the secretariat.`,
      422,
      {
        code: "PAYMENT_AMOUNT_MISMATCH",
        fields: { paymentOrderId: "Payment amount does not match the delegate fee." },
      }
    );
  }
  const alreadyUsed = await activeStore().findByPaymentOrderId(data.paymentOrderId);
  if (alreadyUsed) {
    return jsonError("This payment has already been used for another registration.", 409, {
      code: "PAYMENT_ALREADY_USED",
    });
  }
  const payment: PaymentFields = {
    paymentStatus: "paid",
    paymentOrderId: data.paymentOrderId,
    paymentUtr: verified.utr,
    paymentPayer: verified.payerName,
    paidAt: new Date().toISOString(),
  };

  try {
    const result = await activeStore().create(data, payment);
    log.info(`registration ${result.duplicate ? "duplicate (did not persist)" : "persisted"}`, {
      id: result.record.id,
      paymentStatus: result.record.paymentStatus,
    });
    // The delegate completed a previously orphaned payment: clear the flag so
    // the payment reconciliation list reflects reality. Best-effort.
    if (data.paymentOrderId) {
      await orphanStore()
        .resolve(data.paymentOrderId)
        .catch(() => {
          log.warn("failed to clear payment orphan", { orderId: data.paymentOrderId });
        });
    }
    return jsonOk(
      {
        accepted: true,
        duplicate: result.duplicate,
        id: result.record.id,
        paymentStatus: result.record.paymentStatus,
      },
      { status: 201 }
    );
  } catch (err) {
    log.error("registration storage failure", { error: err instanceof Error ? err.name : "unknown" });
    return jsonError("Your submission could not be saved right now. Please try again shortly.", 503, {
      code: "STORAGE_UNAVAILABLE",
    });
  }
}