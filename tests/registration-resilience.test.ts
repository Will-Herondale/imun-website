/**
 * Adversarial tests for the registration → payment → registration flow.
 *
 * Every case here is a way the flow could quietly lose a delegate's money or
 * answers: a payment that arrives for the wrong amount, a draft whose order was
 * never opened, two delegates in flight at once, a finalizer that died holding
 * the draft, an order that expired, and a draft the delegate already replaced.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createHmac } from "node:crypto";
import { NextRequest } from "next/server";
import { POST as webhookPOST } from "@/app/api/payments/webhook/route";
import { POST as completePOST } from "@/app/api/registrations/complete/route";
import { overrideStoreForTests } from "@/lib/storage";
import { overrideOrphanStoreForTests } from "@/lib/storage/paymentOrphans";
import { overrideIntentStoreForTests } from "@/lib/storage/registrationIntents";
import {
  fakeIntentStore,
  fakeOrphanStore,
  fakeRegistrationStore,
  stubGateway,
} from "@/tests/support/fakes";

const API_KEY = "test-api-key";

function sign(body: string): string {
  return createHmac("sha256", API_KEY).update(body).digest("hex");
}

function postWebhook(payload: Record<string, unknown>): Promise<Response> {
  const body = JSON.stringify(payload);
  return webhookPOST(
    new NextRequest("http://localhost/api/payments/webhook", {
      method: "POST",
      headers: { "x-famgateway-signature": sign(body) },
      body,
    })
  );
}

function postComplete(token: string): Promise<Response> {
  return completePOST(
    new NextRequest("http://localhost/api/registrations/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
  );
}

const paidEvent = (orderId: string, amount = 500, utr = "UTR_ADV_001") => ({
  event: "payment.success",
  order_id: orderId,
  status: "success",
  amount,
  utr,
  sender_name: "Aarav Sharma",
});

describe("registration flow resilience", () => {
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

  it("1. recovers a draft left claimed by a finalizer that died before writing the registration", async () => {
    const { store: intents, byId } = fakeIntentStore([
      { orderId: "fg_stuck_1", token: "tok-stuck-1", state: "completed" },
    ]);
    overrideIntentStoreForTests(intents);
    const { store: registrations, created } = fakeRegistrationStore();
    overrideStoreForTests(registrations);
    stubGateway({ fg_stuck_1: { status: "success", amount: 500, utr: "UTR_STUCK" } });

    const res = await postWebhook(paidEvent("fg_stuck_1", 500, "UTR_STUCK"));

    /* Without reclaiming the abandoned claim the delegate's paid order would
     * report `in_flight` forever and never register. */
    expect(res.status).toBe(200);
    expect(created).toHaveLength(1);
    expect([...byId.values()][0].registrationId).toBe("recd-1");
  });

  it("2. still registers a paid order whose draft was already superseded by a newer attempt", async () => {
    const { store: intents } = fakeIntentStore([
      { orderId: "fg_old_1", token: "tok-old-1", state: "superseded" },
    ]);
    overrideIntentStoreForTests(intents);
    const { store: registrations, created } = fakeRegistrationStore();
    overrideStoreForTests(registrations);
    stubGateway({ fg_old_1: { status: "success", amount: 500 } });

    const res = await postWebhook(paidEvent("fg_old_1"));

    /* The delegate started a second registration, then paid the first. That
     * money is real and must still buy a seat. */
    expect(res.status).toBe(200);
    expect(created).toHaveLength(1);
    expect(created[0].payment.paymentOrderId).toBe("fg_old_1");
  });

  it("3. Payment confirmed but amount != fee: no registration, payment stays visible to the admin", async () => {
    const { store: intents } = fakeIntentStore([
      { orderId: "fg_amt_mismatch_1", token: "tok-amt-mismatch-1" },
    ]);
    overrideIntentStoreForTests(intents);
    const { store: registrations, created } = fakeRegistrationStore();
    overrideStoreForTests(registrations);
    const { store: orphans, recorded, resolved } = fakeOrphanStore();
    overrideOrphanStoreForTests(orphans);
    stubGateway({
      fg_amt_mismatch_1: { status: "success", amount: 200, utr: "UTR_AMT_1" },
    });

    const res = await postWebhook(paidEvent("fg_amt_mismatch_1", 200, "UTR_AMT_1"));

    /* Terminal, so 200: retrying cannot change it and the secretariat works
     * from the unresolved orphan. */
    expect(res.status).toBe(200);
    expect(created).toHaveLength(0);
    expect(recorded.length).toBeGreaterThan(0);
    expect(resolved).toHaveLength(0);
  });

  it("4. a draft whose order was never opened must not crash the completion endpoint", async () => {
    const { store: intents } = fakeIntentStore([{ orderId: "", token: "tok-no-order-1" }]);
    overrideIntentStoreForTests(intents);
    const { store: registrations, created } = fakeRegistrationStore();
    overrideStoreForTests(registrations);

    const res = await postComplete("tok-no-order-1");

    expect(res.status).toBe(200);
    const data = (await res.json()) as { state: string };
    expect(data.state).toBe("checking");
    expect(created).toHaveLength(0);
  });

  it("5. two delegates in flight: finishing one must never touch the other's registration", async () => {
    const { store: intents } = fakeIntentStore([
      { orderId: "fg_del1_1", token: "tok-del1-1", email: "del1@example.com" },
      { orderId: "fg_del2_1", token: "tok-del2-1", email: "del2@example.com" },
    ]);
    overrideIntentStoreForTests(intents);
    const { store: registrations, created } = fakeRegistrationStore();
    overrideStoreForTests(registrations);
    overrideOrphanStoreForTests(fakeOrphanStore().store);
    stubGateway({ fg_del1_1: { status: "success", amount: 500, utr: "UTR_D1" } });

    const res = await postWebhook(paidEvent("fg_del1_1", 500, "UTR_D1"));

    expect(res.status).toBe(200);
    expect(created).toHaveLength(1);
    expect(created[0].input.email).toBe("del1@example.com");
  });

  it("6. simultaneous webhook deliveries for one order still write exactly one registration", async () => {
    const { store: intents } = fakeIntentStore([{ orderId: "fg_race_1", token: "tok-race-1" }]);
    overrideIntentStoreForTests(intents);
    const { store: registrations, created } = fakeRegistrationStore();
    overrideStoreForTests(registrations);
    stubGateway({ fg_race_1: { status: "success", amount: 500 } });

    await Promise.all([
      postWebhook(paidEvent("fg_race_1")),
      postWebhook(paidEvent("fg_race_1")),
      postWebhook(paidEvent("fg_race_1")),
    ]);

    expect(created).toHaveLength(1);
  });

  it("7. an expired order reports payment_expired and creates nothing", async () => {
    const { store: intents, byId } = fakeIntentStore([
      { orderId: "fg_expired_1", token: "tok-expired-1" },
    ]);
    overrideIntentStoreForTests(intents);
    const { store: registrations, created } = fakeRegistrationStore();
    overrideStoreForTests(registrations);
    stubGateway({ fg_expired_1: { status: "expired", amount: 0 } });

    const res = await postComplete("tok-expired-1");
    const data = (await res.json()) as { state: string };

    expect(res.status).toBe(200);
    expect(data.state).toBe("payment_expired");
    expect(created).toHaveLength(0);
    expect([...byId.values()][0].state).toBe("payment_expired");
  });

  it("8. an unpaid superseded order tells the delegate to start again instead of hanging", async () => {
    const { store: intents } = fakeIntentStore([
      { orderId: "fg_sup_unpaid", token: "tok-sup-unpaid", state: "superseded" },
    ]);
    overrideIntentStoreForTests(intents);
    overrideStoreForTests(fakeRegistrationStore().store);
    stubGateway({ fg_sup_unpaid: { status: "pending", amount: 0 } });

    const res = await postComplete("tok-sup-unpaid");
    const data = (await res.json()) as { state: string };

    expect(res.status).toBe(200);
    expect(data.state).toBe("superseded");
  });

  it("9. a second paid order for an already-registered email folds into the existing registration", async () => {
    const { store: intents } = fakeIntentStore([
      { orderId: "fg_second_pay", token: "tok-second" },
    ]);
    overrideIntentStoreForTests(intents);
    const registrations = fakeRegistrationStore();
    overrideStoreForTests(registrations.store);
    await registrations.store.create(
      { ...registrations.created[0]?.input, email: "aarav.sharma@example.com" } as never,
      { paymentStatus: "paid", paymentOrderId: "fg_first" } as never
    );
    stubGateway({ fg_second_pay: { status: "success", amount: 500 } });

    const res = await postWebhook(paidEvent("fg_second_pay"));
    const data = (await res.json()) as { received?: boolean };

    /* One registration per email is the rule, so the delegate keeps their seat
     * and the webhook reports success rather than erroring. */
    expect(res.status).toBe(200);
    expect(data.received).toBe(true);
    expect(registrations.created).toHaveLength(1);
  });
});