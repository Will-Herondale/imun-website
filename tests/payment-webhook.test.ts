import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createHmac } from "node:crypto";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/payments/webhook/route";
import { overrideStoreForTests } from "@/lib/storage";
import { overrideOrphanStoreForTests } from "@/lib/storage/paymentOrphans";
import { overrideIntentStoreForTests } from "@/lib/storage/registrationIntents";
import {
  SAMPLE_PAYLOAD,
  fakeIntentStore,
  fakeOrphanStore,
  fakeRegistrationStore,
  stubGateway,
} from "@/tests/support/fakes";
import { emptyPayment } from "@/lib/validation/registration";

const API_KEY = "test-api-key";

function sign(body: string): string {
  return createHmac("sha256", API_KEY).update(body).digest("hex");
}

function post(body: string, signature?: string): Promise<Response> {
  const request = new NextRequest("http://localhost/api/payments/webhook", {
    method: "POST",
    headers: signature ? { "x-famgateway-signature": signature } : {},
    body,
  });
  return POST(request);
}

const paidBody = (orderId: string) =>
  JSON.stringify({
    event: "payment.success",
    order_id: orderId,
    status: "success",
    amount: 500,
    utr: "UTR111222333",
    sender_name: "Aarav Sharma",
  });

describe("POST /api/payments/webhook", () => {
  beforeEach(() => {
    vi.stubEnv("FAMGATEWAY_API_KEY", API_KEY);
    overrideStoreForTests(fakeRegistrationStore().store);
    overrideOrphanStoreForTests(fakeOrphanStore().store);
    overrideIntentStoreForTests(fakeIntentStore().store);
  });

  afterEach(() => {
    overrideStoreForTests(null);
    overrideOrphanStoreForTests(null);
    overrideIntentStoreForTests(null);
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("creates the registration from the stored draft when the delegate's browser is gone", async () => {
    const { store: intents } = fakeIntentStore([{ orderId: "fg_draft_1", token: "tok-draft-1" }]);
    overrideIntentStoreForTests(intents);
    const { store: registrations, created } = fakeRegistrationStore();
    overrideStoreForTests(registrations);
    const { store: orphans, recorded, resolved } = fakeOrphanStore();
    overrideOrphanStoreForTests(orphans);
    stubGateway({ fg_draft_1: { status: "success", amount: 500, utr: "UTR111222333" } });

    const body = paidBody("fg_draft_1");
    const res = await post(body, sign(body));

    expect(res.status).toBe(200);
    /* The whole point: no browser round-trip, one registration written. */
    expect(created).toHaveLength(1);
    expect(created[0].input.email).toBe("aarav.sharma@example.com");
    expect(created[0].payment.paymentStatus).toBe("paid");
    expect(created[0].payment.paymentOrderId).toBe("fg_draft_1");
    expect(created[0].payment.paymentUtr).toBe("UTR111222333");
    /* Money is flagged first, then cleared — it is never unaccounted for. */
    expect(recorded.map((r) => r.orderId)).toEqual(["fg_draft_1"]);
    expect(resolved).toEqual(["fg_draft_1"]);
  });

  it("is idempotent: a repeated webhook never writes a second registration", async () => {
    const { store: intents } = fakeIntentStore([{ orderId: "fg_draft_2", token: "tok-draft-2" }]);
    overrideIntentStoreForTests(intents);
    const { store: registrations, created } = fakeRegistrationStore();
    overrideStoreForTests(registrations);
    overrideOrphanStoreForTests(fakeOrphanStore().store);
    stubGateway({ fg_draft_2: { status: "success", amount: 500 } });

    const body = paidBody("fg_draft_2");
    await post(body, sign(body));
    await post(body, sign(body));
    await post(body, sign(body));

    expect(created).toHaveLength(1);
  });

  it("records an orphan when no draft references the payment", async () => {
    const { store: registrations, created } = fakeRegistrationStore();
    overrideStoreForTests(registrations);
    const { store: orphans, recorded, resolved } = fakeOrphanStore();
    overrideOrphanStoreForTests(orphans);
    stubGateway({ fg_orphan_1: { status: "success", amount: 500 } });

    const body = paidBody("fg_orphan_1");
    const res = await post(body, sign(body));

    /* 503, not 200: a delivery can beat the intent's order binding, and
     * answering "done" there would leave the payment resting on the delegate's
     * browser still being open. The orphan row keeps it visible meanwhile. */
    expect(res.status).toBe(503);
    expect(recorded).toHaveLength(1);
    expect(recorded[0]).toMatchObject({
      orderId: "fg_orphan_1",
      amount: 500,
      utr: "UTR111222333",
      payer: "Aarav Sharma",
    });
    expect(resolved).toHaveLength(0);
    expect(created).toHaveLength(0);
  });

  it("keeps the orphan when the amount does not match the fee", async () => {
    const { store: intents } = fakeIntentStore([{ orderId: "fg_wrong_amount", token: "tok-wrong" }]);
    overrideIntentStoreForTests(intents);
    const { store: registrations, created } = fakeRegistrationStore();
    overrideStoreForTests(registrations);
    const { store: orphans, recorded, resolved } = fakeOrphanStore();
    overrideOrphanStoreForTests(orphans);
    stubGateway({ fg_wrong_amount: { status: "success", amount: 250 } });

    const body = paidBody("fg_wrong_amount");
    const res = await post(body, sign(body));

    expect(res.status).toBe(200);
    expect(created).toHaveLength(0);
    expect(recorded).toHaveLength(1);
    expect(resolved).toHaveLength(0);
  });

  it("answers 503 when the gateway is unreachable so FamGateway retries the delivery", async () => {
    const { store: intents } = fakeIntentStore([{ orderId: "fg_gateway_down", token: "tok-down" }]);
    overrideIntentStoreForTests(intents);
    const { store: registrations, created } = fakeRegistrationStore();
    overrideStoreForTests(registrations);
    const { store: orphans, recorded, resolved } = fakeOrphanStore();
    overrideOrphanStoreForTests(orphans);
    stubGateway({ fg_gateway_down: "unavailable" });

    const body = paidBody("fg_gateway_down");
    const res = await post(body, sign(body));

    /* Acknowledging a transient failure with 200 would mark the delivery done
     * and strand a real payment, so it has to be reported as retryable. */
    expect(res.status).toBe(503);
    expect(created).toHaveLength(0);
    expect(recorded).toHaveLength(1);
    expect(resolved).toHaveLength(0);
  });

  it("releases the draft claim when storage fails so a retry can still land", async () => {
    const { store: intents, byId } = fakeIntentStore([{ orderId: "fg_store_fail", token: "tok-store" }]);
    overrideIntentStoreForTests(intents);
    const registrations = fakeRegistrationStore();
    registrations.store.create = async () => {
      throw new Error("table unavailable");
    };
    overrideStoreForTests(registrations.store);
    overrideOrphanStoreForTests(fakeOrphanStore().store);
    stubGateway({ fg_store_fail: { status: "success", amount: 500 } });

    const body = paidBody("fg_store_fail");
    const res = await post(body, sign(body));
    expect(res.status).toBe(503);

    const intent = [...byId.values()][0];
    expect(intent.state).toBe("awaiting_payment");

    /* Second delivery succeeds once storage recovers. */
    const good = fakeRegistrationStore();
    overrideStoreForTests(good.store);
    await post(body, sign(body));
    expect(good.created).toHaveLength(1);
  });

  it("clears the orphan on every retry, so a registered delegate never reappears in the queue", async () => {
    const { store: intents, byId } = fakeIntentStore([{ orderId: "fg_retry_1", token: "tok-retry-1" }]);
    overrideIntentStoreForTests(intents);
    const { store: registrations, created } = fakeRegistrationStore();
    overrideStoreForTests(registrations);
    const { store: orphans } = fakeOrphanStore();
    overrideOrphanStoreForTests(orphans);
    stubGateway({ fg_retry_1: { status: "success", amount: 500 } });

    const body = paidBody("fg_retry_1");
    /* First delivery registers but is answered 503 (e.g. another writer held the
     * lease), so FamGateway retries — and each retry re-records the orphan. */
    const firstIntent = [...byId.values()][0];
    firstIntent.state = "completed";
    firstIntent.claimedAt = Date.now();

    await post(body, sign(body));
    expect(await orphans.countUnresolved()).toBe(1);

    /* Delivery two runs once that lease goes stale and completes the job. */
    firstIntent.claimedAt = Date.now() - 10 * 60 * 1000;
    const res = await post(body, sign(body));

    expect(res.status).toBe(200);
    expect(created).toHaveLength(1);
    /* Without resolving on the replay path, this delegate would sit in the
     * admin "paid, not registered" queue forever. */
    expect(await orphans.countUnresolved()).toBe(0);
  });

  it("ignores non-success statuses", async () => {
    const { store: orphans, recorded } = fakeOrphanStore();
    overrideOrphanStoreForTests(orphans);
    stubGateway({ fg_pending: { status: "pending", amount: 0 } });
    const body = JSON.stringify({ order_id: "fg_pending", status: "pending" });
    const res = await post(body, sign(body));
    expect(res.status).toBe(200);
    expect(recorded).toHaveLength(0);
  });

  it("rejects an invalid signature (401) and persists nothing", async () => {
    const { store: registrations, created } = fakeRegistrationStore();
    overrideStoreForTests(registrations);
    const { store: orphans, recorded } = fakeOrphanStore();
    overrideOrphanStoreForTests(orphans);
    stubGateway({ fg_x: { status: "success", amount: 500 } });
    const res = await post(paidBody("fg_x"), "deadbeef");
    expect(res.status).toBe(401);
    expect(created).toHaveLength(0);
    expect(recorded).toHaveLength(0);
  });

  /* A delegate who paid the old price must still be registered after the fee
   * changes; otherwise their money is held against a draft that can never
   * match the live fee. */
  it("registers against the fee the draft quoted, not today's fee", async () => {
    const { store: intents } = fakeIntentStore([
      { orderId: "fg_old_price", token: "tok-old", quotedAmount: 700 },
    ]);
    overrideIntentStoreForTests(intents);
    const { store: registrations, created } = fakeRegistrationStore();
    overrideStoreForTests(registrations);
    const { store: orphans, resolved } = fakeOrphanStore();
    overrideOrphanStoreForTests(orphans);
    stubGateway({ fg_old_price: { status: "success", amount: 700 } });

    const body = JSON.stringify({
      event: "payment.success",
      order_id: "fg_old_price",
      status: "success",
      amount: 700,
      utr: "UTR999888777",
      sender_name: "Aarav Sharma",
    });
    const res = await post(body, sign(body));

    expect(res.status).toBe(200);
    expect(created).toHaveLength(1);
    expect(resolved).toEqual(["fg_old_price"]);
  });

  /* A second paid order for an already-registered delegate is unallocated
   * money: the secretariat likely owes a refund, so it must stay visible in
   * the reconciliation queue rather than be quietly marked resolved. */
  it("keeps the orphan when the payment is folded into another order's registration", async () => {
    const { store: intents } = fakeIntentStore([
      { orderId: "fg_second_pay", token: "tok-second" },
    ]);
    overrideIntentStoreForTests(intents);
    /* This delegate already has a registration from an earlier round. */
    const registrations = fakeRegistrationStore();
    await registrations.store.create(SAMPLE_PAYLOAD, {
      ...emptyPayment(),
      paymentStatus: "paid",
      paymentOrderId: "fg_first_round",
    });
    const before = registrations.created.length;
    overrideStoreForTests(registrations.store);
    const { store: orphans } = fakeOrphanStore();
    overrideOrphanStoreForTests(orphans);
    stubGateway({ fg_second_pay: { status: "success", amount: 500 } });

    const body = paidBody("fg_second_pay");
    const res = await post(body, sign(body));

    expect(res.status).toBe(200);
    /* Reused the existing row rather than writing a second registration. */
    expect(registrations.created).toHaveLength(before);
    /* The money is still unallocated, so it must stay in the queue for a
     * refund decision. */
    expect(await orphans.countUnresolved()).toBe(1);
  });

  /* Answering 200 when the orphan row could not be written would hide an
   * unallocated payment from the queue entirely. */
  it("registers the delegate but answers 503 when the orphan row cannot be written", async () => {
    const { store: intents } = fakeIntentStore([{ orderId: "fg_no_orphan", token: "tok-no-orphan" }]);
    overrideIntentStoreForTests(intents);
    const { store: registrations, created } = fakeRegistrationStore();
    overrideStoreForTests(registrations);
    const orphans = fakeOrphanStore();
    const realRecord = orphans.store.recordPaidOrphan;
    orphans.store.recordPaidOrphan = async () => {
      throw new Error("orphan table unavailable");
    };
    overrideOrphanStoreForTests(orphans.store);
    stubGateway({ fg_no_orphan: { status: "success", amount: 500 } });

    const body = paidBody("fg_no_orphan");
    const res = await post(body, sign(body));

    /* The delegate is registered — losing the seat is worse than a late queue
     * entry — but the answer is 503 so the retry fixes the bookkeeping. */
    expect(res.status).toBe(503);
    expect(created).toHaveLength(1);
    expect(orphans.recorded).toHaveLength(0);

    /* Retry: the queue is writable again, so the row lands and is then
     * resolved, leaving nothing outstanding. */
    orphans.store.recordPaidOrphan = realRecord;
    const retry = await post(body, sign(body));

    expect(retry.status).toBe(200);
    expect(orphans.recorded).toHaveLength(1);
    expect(await orphans.store.countUnresolved()).toBe(0);
    /* Idempotent: the retry reused the row written by the first delivery. */
    expect(created).toHaveLength(1);
  });

  /* The registration row is written before the draft is marked complete, so a
   * lease lost in that window must not be reported as success. */
  it("answers 503 when the claim is lost before the draft can be completed", async () => {
    const { store: intents, byId } = fakeIntentStore([{ orderId: "fg_lost_lease", token: "tok-lost" }]);
    const real = intents.complete.bind(intents);
    /* Simulate a stale-lease takeover landing between create and complete. */
    intents.complete = async (id, claimToken, result) => {
      const intent = byId.get(id);
      if (intent) {
        intent.claimToken = "";
        intent.claimedAt = null;
        intent.state = "awaiting_payment";
      }
      return real(id, claimToken, result);
    };
    overrideIntentStoreForTests(intents);
    const { store: registrations, created } = fakeRegistrationStore();
    overrideStoreForTests(registrations);
    const { store: orphans } = fakeOrphanStore();
    overrideOrphanStoreForTests(orphans);
    stubGateway({ fg_lost_lease: { status: "success", amount: 500 } });

    const body = paidBody("fg_lost_lease");
    const res = await post(body, sign(body));

    expect(res.status).toBe(503);
    /* The registration exists, but the draft was not marked done, so the retry
     * re-runs and reuses the same row instead of writing a second one. */
    expect(created).toHaveLength(1);
    expect(await orphans.countUnresolved()).toBe(1);
  });
});