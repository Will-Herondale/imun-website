import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import {
  POST as createIntent,
  GET as readIntent,
} from "@/app/api/registrations/intents/route";
import { POST as completeIntent, GET as completeViaGet } from "@/app/api/registrations/complete/route";
import { overrideStoreForTests } from "@/lib/storage";
import { overrideOrphanStoreForTests } from "@/lib/storage/paymentOrphans";
import { overrideIntentStoreForTests } from "@/lib/storage/registrationIntents";
import {
  fakeIntentStore,
  fakeOrphanStore,
  fakeRegistrationStore,
  sampleBody,
} from "@/tests/support/fakes";

let ipCounter = 1;
let emailCounter = 1;

function nextIp(): string {
  return `198.51.100.${ipCounter++}`;
}

function body(overrides: Record<string, unknown> = {}) {
  return sampleBody(overrides);
}

/** Captures what the intent route sends to FamGateway, then answers it. */
function stubGatewayCreate(answer: { ok?: boolean; orderId?: string } = {}) {
  const calls: Array<Record<string, unknown>> = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: string, init?: RequestInit) => {
      calls.push(init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : {});
      if (answer.ok === false) return { ok: false, status: 502, json: async () => ({}) };
      const orderId = answer.orderId ?? "fg_created_01";
      return {
        ok: true,
        status: 200,
        json: async () => ({
          status: "success",
          data: {
            order_id: orderId,
            amount: "500",
            payable_amount: "500",
            checkout_url: `https://famgateway.in/pay.php?order_id=${orderId}`,
          },
        }),
      };
    })
  );
  return calls;
}

function stubGatewayVerify(
  responses: Record<string, { status: string; amount: number; utr?: string; sender_name?: string } | "unavailable">
) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      const match = String(url).match(/order_id=([^&]+)/);
      const orderId = match ? decodeURIComponent(match[1]) : "";
      const hit = responses[orderId];
      if (!hit || hit === "unavailable") return { ok: false, status: 500, json: async () => ({}) };
      return {
        ok: true,
        status: 200,
        json: async () => ({
          status: hit.status,
          data: { amount: hit.amount, utr: hit.utr ?? "UTR777777777", sender_name: hit.sender_name ?? "Aarav Sharma" },
        }),
      };
    })
  );
}

function postIntent(payload: unknown, headers: Record<string, string> = {}): Promise<Response> {
  return createIntent(
    new NextRequest("http://localhost/api/registrations/intents", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": nextIp(), ...headers },
      body: typeof payload === "string" ? payload : JSON.stringify(payload),
    })
  );
}

function postComplete(token: string, headers: Record<string, string> = {}): Promise<Response> {
  return completeIntent(
    new NextRequest("http://localhost/api/registrations/complete", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": nextIp(), ...headers },
      body: JSON.stringify({ token }),
    })
  );
}

describe("POST /api/registrations/intents", () => {
  beforeEach(() => {
    vi.stubEnv("FAMGATEWAY_API_KEY", "test-key");
    vi.stubEnv("REGISTRATION_OPEN", "true");
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

  it("stores the answers, opens the order and returns a resume token", async () => {
    const calls = stubGatewayCreate({ orderId: "fg_intent_1" });
    const res = await postIntent(body({ email: `a${emailCounter++}@example.com` }));
    expect(res.status).toBe(201);
    const data = (await res.json()) as { token: string; orderId: string; checkoutUrl: string };

    expect(data.token).toMatch(/^[A-Za-z0-9_-]{20,}$/);
    expect(data.orderId).toBe("fg_intent_1");
    expect(data.checkoutUrl).toContain("fg_intent_1");

    /* The return URL must carry the resume token so a closed tab can come back. */
    const redirect = String(calls[0]?.redirect_url ?? "");
    expect(redirect).toContain("/registration/complete?token=");
    expect(redirect).toContain(encodeURIComponent(data.token));
    expect(String(calls[0]?.webhook_url ?? "")).toContain("/api/payments/webhook");
  });

  it("persists the draft before the delegate leaves for the checkout", async () => {
    const intents = fakeIntentStore();
    overrideIntentStoreForTests(intents.store);
    stubGatewayCreate({ orderId: "fg_intent_2" });
    const email = `b${emailCounter++}@example.com`;

    const res = await postIntent(body({ email }));
    const data = (await res.json()) as { token: string };

    const stored = await intents.store.findByToken(data.token);
    expect(stored).not.toBeNull();
    expect(stored?.email).toBe(email);
    expect(stored?.orderId).toBe("fg_intent_2");
    expect(stored?.state).toBe("awaiting_payment");
    expect(stored?.payload.committeePref1).toBe("DISEC");
  });

  it("rejects invalid answers with field errors and stores nothing", async () => {
    const intents = fakeIntentStore();
    overrideIntentStoreForTests(intents.store);
    stubGatewayCreate();
    const res = await postIntent(body({ email: "not-an-email", declarationRules: "No" }));
    expect(res.status).toBe(422);
    const data = (await res.json()) as { fields: Record<string, string>; code: string };
    expect(data.code).toBe("VALIDATION_ERROR");
    expect(data.fields.email).toBeDefined();
    expect(data.fields.declarationRules).toBeDefined();
    expect(await intents.store.listUnfinished()).toHaveLength(0);
  });

  it("applies the cross-field rules to a draft (duplicate preferences are refused)", async () => {
    const intents = fakeIntentStore();
    overrideIntentStoreForTests(intents.store);
    stubGatewayCreate();
    const res = await postIntent(body({ committeePref2: "DISEC" }));
    expect(res.status).toBe(422);
    const data = (await res.json()) as { fields: Record<string, string> };
    expect(data.fields.committeePrefs).toMatch(/different/i);
    expect(await intents.store.listUnfinished()).toHaveLength(0);
  });

  it("refuses a draft whose MUN history contradicts the experience count", async () => {
    const intents = fakeIntentStore();
    overrideIntentStoreForTests(intents.store);
    stubGatewayCreate();
    const res = await postIntent(body({ munCount: "0", munHistory: "Some MUN | 2026 | DISEC | USA | Award" }));
    expect(res.status).toBe(422);
    const data = (await res.json()) as { fields: Record<string, string> };
    expect(data.fields.munHistory).toBeDefined();
  });

  it("accepts honeypot submissions without storing anything", async () => {
    const intents = fakeIntentStore();
    overrideIntentStoreForTests(intents.store);
    stubGatewayCreate();
    const res = await postIntent(body({ website: "http://spam.example" }));
    expect(res.status).toBe(201);
    expect(await intents.store.listUnfinished()).toHaveLength(0);
  });

  it("accepts a body that omits the honeypot entirely", async () => {
    /* A client that never renders the hidden input must still register: only a
     * *filled* honeypot is a bot signal, so absence is not an error. */
    const intents = fakeIntentStore();
    overrideIntentStoreForTests(intents.store);
    stubGatewayCreate();
    const withoutHoneypot: Record<string, unknown> = { ...body() };
    delete withoutHoneypot.website;
    const res = await postIntent(withoutHoneypot);
    expect(res.status).toBe(201);
    expect(await intents.store.listUnfinished()).toHaveLength(1);
  });

  it("rejects a cross-site post (403)", async () => {
    const res = await postIntent(body(), { origin: "https://evil.example" });
    expect(res.status).toBe(403);
    expect(((await res.json()) as { code: string }).code).toBe("BAD_ORIGIN");
  });

  it("accepts a same-origin post", async () => {
    stubGatewayCreate();
    const res = await postIntent(body({ email: `ok${emailCounter++}@example.com` }), {
      origin: "http://localhost",
    });
    expect(res.status).toBe(201);
  });

  it("rejects non-JSON content types (415)", async () => {
    const res = await postIntent(body(), { "content-type": "text/plain" });
    expect(res.status).toBe(415);
  });

  it("pauses during maintenance (503) and when registration is closed (409)", async () => {
    vi.stubEnv("SITE_MAINTENANCE", "true");
    expect((await postIntent(body())).status).toBe(503);

    vi.stubEnv("SITE_MAINTENANCE", "false");
    vi.stubEnv("REGISTRATION_OPEN", "false");
    expect((await postIntent(body())).status).toBe(409);
  });

  it("reports payments unavailable when the gateway key is missing (503)", async () => {
    vi.stubEnv("FAMGATEWAY_API_KEY", "");
    const res = await postIntent(body());
    expect(res.status).toBe(503);
    expect(((await res.json()) as { code: string }).code).toBe("PAYMENTS_UNAVAILABLE");
  });

  it("retires a delegate's previous open draft so only one payment is live", async () => {
    const intents = fakeIntentStore();
    overrideIntentStoreForTests(intents.store);
    const email = `dup${emailCounter++}@example.com`;

    stubGatewayCreate({ orderId: "fg_first" });
    const first = (await (await postIntent(body({ email }))).json()) as { token: string };
    stubGatewayCreate({ orderId: "fg_second" });
    await postIntent(body({ email }));

    expect((await intents.store.findByToken(first.token))?.state).toBe("superseded");
    const open = await intents.store.listUnfinished();
    expect(open).toHaveLength(1);
    expect(open[0].orderId).toBe("fg_second");
  });

  it("retires the draft when the payment order cannot be opened (502)", async () => {
    const intents = fakeIntentStore();
    overrideIntentStoreForTests(intents.store);
    stubGatewayCreate({ ok: false });
    const res = await postIntent(body({ email: `fail${emailCounter++}@example.com` }));
    expect(res.status).toBe(502);
    const all = [...intents.byId.values()];
    expect(all).toHaveLength(1);
    expect(all[0].state).toBe("abandoned");
  });

  it("rate-limits repeated attempts from one address (429)", async () => {
    stubGatewayCreate();
    const ip = nextIp();
    const statuses: number[] = [];
    for (let i = 0; i < 5; i += 1) {
      const res = await postIntent(body({ email: `rl${emailCounter++}@example.com` }), {
        "x-forwarded-for": ip,
      });
      statuses.push(res.status);
    }
    expect(statuses[0]).toBe(201);
    expect(statuses).toContain(429);
  });
});

describe("GET /api/registrations/intents", () => {
  beforeEach(() => {
    overrideIntentStoreForTests(fakeIntentStore().store);
  });
  afterEach(() => {
    overrideIntentStoreForTests(null);
    vi.unstubAllGlobals();
  });

  it("returns a stored draft for its token, with no-store headers", async () => {
    const { store: intents } = fakeIntentStore([{ orderId: "fg_read_1", token: "tok-read-1" }]);
    overrideIntentStoreForTests(intents);
    const res = await readIntent(
      new NextRequest("http://localhost/api/registrations/intents?token=tok-read-1")
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toContain("no-store");
    const data = (await res.json()) as { draft: { email: string }; registered: boolean };
    expect(data.registered).toBe(false);
    expect(data.draft.email).toBe("aarav.sharma@example.com");
  });

  it("404s an unknown or missing token", async () => {
    const missing = await readIntent(new NextRequest("http://localhost/api/registrations/intents"));
    expect(missing.status).toBe(400);
    const unknown = await readIntent(
      new NextRequest("http://localhost/api/registrations/intents?token=nope")
    );
    expect(unknown.status).toBe(404);
  });
});

describe("POST /api/registrations/complete", () => {
  beforeEach(() => {
    vi.stubEnv("FAMGATEWAY_API_KEY", "test-key");
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

  it("writes the registration when only the delegate's return page ever checks", async () => {
    const { store: intents } = fakeIntentStore([{ orderId: "fg_page_1", token: "tok-page-1" }]);
    overrideIntentStoreForTests(intents);
    const { store: registrations, created } = fakeRegistrationStore();
    overrideStoreForTests(registrations);
    stubGatewayVerify({ fg_page_1: { status: "success", amount: 500, utr: "UTR121212121" } });

    const res = await postComplete("tok-page-1");
    expect(res.status).toBe(200);
    const data = (await res.json()) as { state: string; utr: string; paymentStatus: string };
    expect(data.state).toBe("registered");
    expect(data.utr).toBe("UTR121212121");
    expect(data.paymentStatus).toBe("paid");
    expect(created).toHaveLength(1);
    expect(created[0].payment.paymentOrderId).toBe("fg_page_1");
  });

  it("reports the payment as still pending without writing anything", async () => {
    const { store: intents } = fakeIntentStore([{ orderId: "fg_page_2", token: "tok-page-2" }]);
    overrideIntentStoreForTests(intents);
    const { store: registrations, created } = fakeRegistrationStore();
    overrideStoreForTests(registrations);
    stubGatewayVerify({ fg_page_2: { status: "pending", amount: 0 } });

    const res = await postComplete("tok-page-2");
    expect(((await res.json()) as { state: string }).state).toBe("awaiting_payment");
    expect(created).toHaveLength(0);
  });

  it("replays a finished registration without touching the gateway", async () => {
    const fake = fakeIntentStore([{ orderId: "fg_page_3", token: "tok-page-3" }]);
    const intentId = [...fake.byId.keys()][0];
    /* Complete it through the real lease path, as a finalizer would. */
    const lease = (await fake.store.claimCompletion(intentId)) as string;
    await fake.store.complete(intentId, lease, {
      registrationId: "recd-existing",
      paymentStatus: "paid",
      utr: "UTR999999999",
      payer: "Aarav",
    });
    overrideIntentStoreForTests(fake.store);
    const { store: registrations, created } = fakeRegistrationStore();
    overrideStoreForTests(registrations);

    const res = await postComplete("tok-page-3");
    const data = (await res.json()) as { state: string; registrationId: string };
    expect(data.state).toBe("registered");
    expect(data.registrationId).toBe("recd-existing");
    expect(created).toHaveLength(0);
  });

  it("flags a payment that does not match the fee instead of registering", async () => {
    const { store: intents } = fakeIntentStore([{ orderId: "fg_page_4", token: "tok-page-4" }]);
    overrideIntentStoreForTests(intents);
    const { store: registrations, created } = fakeRegistrationStore();
    overrideStoreForTests(registrations);
    stubGatewayVerify({ fg_page_4: { status: "success", amount: 200 } });

    const res = await postComplete("tok-page-4");
    const data = (await res.json()) as { state: string; received: number; expected: number };
    expect(data.state).toBe("amount_mismatch");
    expect(data.received).toBe(200);
    expect(data.expected).toBe(500);
    expect(created).toHaveLength(0);
  });

  it("keeps checking (never fails) when the gateway is unreachable", async () => {
    const { store: intents } = fakeIntentStore([{ orderId: "fg_page_5", token: "tok-page-5" }]);
    overrideIntentStoreForTests(intents);
    stubGatewayVerify({ fg_page_5: "unavailable" });

    const res = await postComplete("tok-page-5");
    expect(res.status).toBe(200);
    expect(((await res.json()) as { state: string }).state).toBe("checking");
  });

  it("verifies a retired draft's order before reporting it unpaid", async () => {
    const { store: intents } = fakeIntentStore([
      { orderId: "fg_page_6", token: "tok-page-6", state: "superseded" },
      { orderId: "fg_page_7", token: "tok-page-7", state: "payment_expired" },
    ]);
    overrideIntentStoreForTests(intents);
    /* A superseded draft is only reported as retired once the gateway confirms
     * the old order was never paid — otherwise a delegate who paid the first
     * attempt would be told to pay again. */
    stubGatewayVerify({
      fg_page_6: { status: "pending", amount: 0 },
      fg_page_7: { status: "pending", amount: 0 },
    });
    expect(((await (await postComplete("tok-page-6")).json()) as { state: string }).state).toBe("superseded");
    expect(((await (await postComplete("tok-page-7")).json()) as { state: string }).state).toBe(
      "payment_expired"
    );
  });

  it("rejects a missing or unknown token", async () => {
    const missing = await completeIntent(
      new NextRequest("http://localhost/api/registrations/complete", {
        method: "POST",
        headers: { "content-type": "application/json", "x-forwarded-for": nextIp() },
        body: JSON.stringify({}),
      })
    );
    expect(missing.status).toBe(400);
    expect((await postComplete("does-not-exist")).status).toBe(404);
  });

  it("is safe over GET and marks the response uncacheable", async () => {
    const { store: intents } = fakeIntentStore([{ orderId: "fg_page_8", token: "tok-page-8" }]);
    overrideIntentStoreForTests(intents);
    const { store: registrations, created } = fakeRegistrationStore();
    overrideStoreForTests(registrations);
    stubGatewayVerify({ fg_page_8: { status: "success", amount: 500 } });

    const res = await completeViaGet(
      new NextRequest("http://localhost/api/registrations/complete?token=tok-page-8", {
        headers: { "x-forwarded-for": nextIp() },
      })
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toContain("no-store");
    expect(res.headers.get("referrer-policy")).toBe("no-referrer");
    expect(created).toHaveLength(1);
  });

  it("never registers the same order twice under concurrent polling", async () => {
    const { store: intents } = fakeIntentStore([{ orderId: "fg_page_9", token: "tok-page-9" }]);
    overrideIntentStoreForTests(intents);
    const { store: registrations, created } = fakeRegistrationStore();
    overrideStoreForTests(registrations);
    stubGatewayVerify({ fg_page_9: { status: "success", amount: 500 } });

    const results = await Promise.all([
      postComplete("tok-page-9"),
      postComplete("tok-page-9"),
      postComplete("tok-page-9"),
    ]);
    for (const res of results) expect(res.status).toBe(200);
    expect(created).toHaveLength(1);
  });
});