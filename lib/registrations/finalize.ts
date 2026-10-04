/**
 * Turns a confirmed FamGateway payment into a stored registration.
 *
 * Every path that can observe a successful payment funnels through
 * `finalizeFromOrderId`: the payment webhook (primary), the delegate's return
 * page (fallback), and any later retry. The draft is claimed atomically first,
 * so however many of those fire — and however close together — exactly one
 * registration row is written.
 */
import { activeStore } from "@/lib/storage";
import { orphanStore } from "@/lib/storage/paymentOrphans";
import { intentStore } from "@/lib/storage/registrationIntents";
import { feeAmountFor } from "@/lib/config/site";
import { famgatewayConfigured, verifyPaymentOrder } from "@/lib/payments/famgateway";
import { log } from "@/lib/log";

export type FinalizeOutcome =
  /** The registration exists (created now, earlier, or by a concurrent retry). */
  | { status: "registered"; registrationId: string; duplicate: boolean; paymentStatus: string; utr: string; payer: string; email: string; fullName: string }
  /** Payment not confirmed yet. */
  | { status: "pending_payment" }
  /** The order is dead (expired/cancelled) — the delegate was never charged. */
  | { status: "payment_expired" }
  /** Confirmed, but the credited amount is not this round's fee. */
  | { status: "amount_mismatch"; amount: number; expected: number }
  /** No stored draft references this order — the caller should record an orphan. */
  | { status: "no_draft" }
  /** Gateway, configuration or storage problem — safe to retry later. */
  | { status: "unavailable"; reason: string };

/**
 * Drops the "paid, not registered" flag for an order that is now registered.
 *
 * Called on every terminal `registered` outcome, not just the one that wrote
 * the row: FamGateway retries non-2xx deliveries, and each retry re-records the
 * orphan, so a delegate who registered on attempt one would otherwise sit in
 * the admin queue forever.
 */
async function clearOrphan(orderId: string): Promise<void> {
  await orphanStore()
    .resolve(orderId)
    .catch(() => {
      log.warn("failed to clear payment orphan", { orderId });
    });
}

/**
 * Idempotently registers the delegate behind `orderId`.
 *
 * Never throws: callers are webhooks and browser polls, and both need a stable
 * answer to return. Failures surface as `unavailable` so the webhook's retry
 * queue can pick them up.
 */
export async function finalizeFromOrderId(orderId: string): Promise<FinalizeOutcome> {
  const order = orderId?.trim();
  if (!order) return { status: "no_draft" };

  const drafts = intentStore();

  let intent;
  try {
    intent = await drafts.findByOrderId(order);
  } catch (err) {
    log.error("intent lookup failed", { orderId: order, error: err instanceof Error ? err.name : "unknown" });
    return { status: "unavailable", reason: "intent_lookup" };
  }

  /* No stored answers for this payment: the money exists but nobody captured
   * the delegate's details. Record an orphan so the secretariat can chase it. */
  if (!intent) return { status: "no_draft" };

  /* Already finished — replay the stored result so repeated calls agree. */
  if (intent.state === "completed" && intent.registrationId) {
    await clearOrphan(order);
    return {
      status: "registered",
      registrationId: intent.registrationId,
      duplicate: true,
      paymentStatus: intent.paymentStatus || "paid",
      utr: intent.utr,
      payer: intent.payer,
      email: intent.email,
      fullName: intent.fullName,
    };
  }

  if (!famgatewayConfigured()) {
    return { status: "unavailable", reason: "payments_unavailable" };
  }

  let verified;
  try {
    verified = await verifyPaymentOrder(order);
  } catch (err) {
    log.error("payment verification threw", { orderId: order, error: err instanceof Error ? err.name : "unknown" });
    return { status: "unavailable", reason: "verify_failed" };
  }
  if (!verified) return { status: "unavailable", reason: "verify_failed" };
  if (verified.status !== "success") {
    /* A dead order can be retired, but only after the answers have been read —
     * and the draft stays claimable above, so a payment that lands late is
     * still honoured. */
    if (verified.status === "expired") {
      await drafts
        .setState(intent.id, "payment_expired")
        .catch(() => undefined);
      return { status: "payment_expired" };
    }
    return { status: "pending_payment" };
  }

  /* Compare against the fee this draft quoted, not today's fee: a delegate who
   * was charged the old price must still register after a price change. */
  const expected = intent.quotedAmount > 0 ? intent.quotedAmount : feeAmountFor();
  if (verified.amount !== expected) {
    return { status: "amount_mismatch", amount: verified.amount || 0, expected };
  }

/*
 * One writer per draft. The lease is the lock: `claimCompletion` only hands
 * back a token when this caller owns the draft, so a concurrent webhook and the
 * delegate's 3-second poll cannot both write a registration — and a claim left
 * behind by a dead request goes stale on its own and is taken over rather than
 * blocking the delegate forever.
 */
let claim: string | null = null;
try {
  claim = await drafts.claimCompletion(intent.id);
} catch (err) {
  log.error("intent claim failed", { orderId: order, error: err instanceof Error ? err.name : "unknown" });
  return { status: "unavailable", reason: "claim_failed" };
}
if (!claim) {
  const settled = await drafts.findByOrderId(order).catch(() => null);
  if (settled?.state === "completed" && settled.registrationId) {
    await clearOrphan(order);
    return {
      status: "registered",
      registrationId: settled.registrationId,
      duplicate: true,
      paymentStatus: settled.paymentStatus || "paid",
      utr: settled.utr,
      payer: settled.payer,
      email: settled.email,
      fullName: settled.fullName,
    };
  }
  /* Another finalizer holds a live lease; the caller may retry. */
  return { status: "unavailable", reason: "in_flight" };
}

  const payment = {
    paymentStatus: "paid" as const,
    paymentOrderId: order,
    paymentUtr: verified.utr,
    paymentPayer: verified.payerName,
    paidAt: new Date().toISOString(),
  };

  try {
    /* A registration for this order can only exist if a previous attempt got as
     * far as the store; reuse it rather than double-charging the delegate's
     * one-per-email allowance. */
    const existingForOrder = await activeStore().findByPaymentOrderId(order);
    if (existingForOrder) {
      const landed = await drafts.complete(intent.id, claim, {
        registrationId: existingForOrder.id,
        paymentStatus: existingForOrder.paymentStatus,
        utr: verified.utr,
        payer: verified.payerName,
      });
      if (!landed) {
        await drafts
          .release(intent.id, claim)
          .catch(() => {
            log.warn("failed to release intent claim", { orderId: order });
          });
        return { status: "unavailable", reason: "in_flight" };
      }
      await clearOrphan(order);
      return {
        status: "registered",
        registrationId: existingForOrder.id,
        duplicate: true,
        paymentStatus: existingForOrder.paymentStatus,
        utr: verified.utr,
        payer: verified.payerName,
        email: intent.email,
        fullName: intent.fullName,
      };
    }

    const result = await activeStore().create(intent.payload, payment);

    const landed = await drafts.complete(intent.id, claim, {
      registrationId: result.record.id,
      paymentStatus: result.record.paymentStatus,
      utr: verified.utr,
      payer: verified.payerName,
    });

    if (!landed) {
      /* The lease was stolen before completion could be recorded. A retry will
       * find the winner's record, so return "unavailable" to stop the current
       * webhook from claiming success. */
      await drafts
        .release(intent.id, claim)
        .catch(() => {
          log.warn("failed to release intent claim", { orderId: order });
        });
      return { status: "unavailable", reason: "in_flight" };
    }

    /* The delegate's answers now have a registration, so this order is
     * accounted for — unless the payment was folded into a *different*
     * order's registration (see the duplicate branch below), where the money
     * is still unallocated and must stay in the reconciliation queue. */
    if (!result.duplicate) await clearOrphan(order);

    log.info("registration finalised from payment", {
      orderId: order,
      id: result.record.id,
      duplicate: result.duplicate,
    });

    if (result.duplicate) {
      /* The delegate's email already had a registration from another round.
       * One registration per email is the rule, so this payment is folded into
       * the existing row rather than refused — but the payment itself stays in
       * the reconciliation queue, because the secretariat likely owes a refund
       * and only they can decide that. */
      log.warn("paid order matched an existing registration", {
        orderId: order,
        registrationId: result.record.id,
      });
    }

    return {
      status: "registered",
      registrationId: result.record.id,
      duplicate: result.duplicate,
      paymentStatus: result.record.paymentStatus,
      utr: verified.utr,
      payer: verified.payerName,
      email: intent.email,
      fullName: intent.fullName,
    };
  } catch (err) {
    /* Hand the lease back so a retry (webhook queue, return page) can win. */
    await drafts
      .release(intent.id, claim)
      .catch(() => {
        log.warn("failed to release intent claim", { orderId: order });
      });
    log.error("registration finalisation failed", {
      orderId: order,
      error: err instanceof Error ? err.name : "unknown",
    });
    return { status: "unavailable", reason: "storage_failed" };
  }
}