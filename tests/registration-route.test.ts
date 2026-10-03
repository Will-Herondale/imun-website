import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/registrations/route";
import {
  overrideStoreForTests,
  type RegistrationStore,
} from "@/lib/storage";
import {
  overrideOrphanStoreForTests,
  type PaymentOrphanStore,
} from "@/lib/storage/paymentOrphans";
import {
  emptyAllocation,
  emptyPayment,
  type PaymentFields,
  type RegistrationInput,
} from "@/lib/validation/registration";

function fakeStore(): RegistrationStore & { created: RegistrationInput[] } {
  const created: RegistrationInput[] = [];
  return {
    created,
    async ensure() {},
    async create(input, payment?: PaymentFields) {
      created.push(input);
      return {
        record: {
          ...emptyAllocation(),
          ...emptyPayment(),
          ...input,
          ...payment,
          id: "recd-123",
          createdAt: new Date().toISOString(),
          status: "submitted",
          feeAmount: 1600,
        },
        duplicate: false,
      };
    },
    async findById() {
      return null;
    },
    async findByEmail() {
      return null;
    },
    async findByPaymentOrderId() {
      return null;
    },
    async list() {
      return created.map((c, i) => ({
        ...emptyAllocation(),
        ...emptyPayment(),
        ...c,
        id: `recd-${i}`,
        createdAt: new Date().toISOString(),
        status: "submitted" as const,
        feeAmount: 1600,
      }));
    },
    async count() {
      return created.length;
    },
    async update() {
      return null;
    },
  };
}

const goodPayload = {
  fullName: "Aarav Sharma",
  email: "aarav.sharma@example.com",
  contactNumber: "98765 43210",
  schoolName: "St Xavier's Collegiate School",
  grade: "11",
  munCount: "1",
  munHistory: "Harvest MUN | 2026 | DISEC | Delegate | Special Mention",
  committeePref1: "DISEC",
  committeePref2: "UNHRC",
  committeePref3: "AIPPM",
  countryPreference: "India",
  specialRequest: "",
  paymentReference: "UTR123456789012",
  declarationAccurate: "Yes",
  declarationRules: "Yes",
  website: "",
};

let ipCounter = 1;

function fakeOrphanStore() {
  const resolved: string[] = [];
  const store: PaymentOrphanStore = {
    async ensure() {},
    async recordPaidOrphan() {},
    async listUnresolved() {
      return [];
    },
    async countUnresolved() {
      return 0;
    },
    async resolve(orderId) {
      resolved.push(orderId);
    },
  };
  return { store, resolved };
}

function post(body: string | object, header?: Record<string, string>): Promise<Response> {
  const payload = typeof body === "string" ? body : JSON.stringify(body);
  // Unique X-Forwarded-For per call so in-memory per-IP rate limits never
  // leak between tests in this file.
  const ip = `203.0.113.${ipCounter++}`;
  const request = new NextRequest("http://localhost/api/registrations", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip, ...header },
    body: payload,
  });
  return POST(request);
}

describe("POST /api/registrations", () => {
  beforeEach(() => {
    overrideStoreForTests(fakeStore());
    overrideOrphanStoreForTests(null);
  });
  afterEach(() => {
    overrideStoreForTests(null);
    overrideOrphanStoreForTests(null);
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("stores a valid submission and returns 201", async () => {
    const res = await post(goodPayload);
    expect(res.status).toBe(201);
    const data = (await res.json()) as { ok: boolean; duplicate: boolean };
    expect(data.ok).toBe(true);
    expect(data.duplicate).toBe(false);
  });

  it("rejects when registration is closed (409)", async () => {
    vi.stubEnv("REGISTRATION_OPEN", "false");
    const res = await post(goodPayload);
    expect(res.status).toBe(409);
    const data = (await res.json()) as { code: string };
    expect(data.code).toBe("REGISTRATION_CLOSED");
  });

  it("pauses submissions during maintenance (503)", async () => {
    vi.stubEnv("SITE_MAINTENANCE", "true");
    const res = await post(goodPayload);
    expect(res.status).toBe(503);
    const data = (await res.json()) as { code: string };
    expect(data.code).toBe("MAINTENANCE");
  });

  it("accepts honeypot submissions without persisting (201, no save)", async () => {
    const store = fakeStore();
    overrideStoreForTests(store);
    const res = await post({ ...goodPayload, website: "http://spam.example" });
    expect(res.status).toBe(201);
    expect(store.created).toHaveLength(0);
  });

  it("rejects invalid payloads with field-level errors (422)", async () => {
    const res = await post({ ...goodPayload, email: "nope", declarationRules: "No" });
    expect(res.status).toBe(422);
    const data = (await res.json()) as { fields?: Record<string, string> };
    expect(data.fields?.email).toBeDefined();
    expect(data.fields?.declarationRules).toBeDefined();
  });

  it("rejects an automated payment order id when payments are unconfigured (503)", async () => {
    const res = await post({
      ...goodPayload,
      paymentReference: "",
      paymentOrderId: "fg_test_order",
    });
    expect(res.status).toBe(503);
    const data = (await res.json()) as { code: string };
    expect(data.code).toBe("PAYMENTS_UNAVAILABLE");
  });

  it("clears the payment orphan when an automated order is used (201)", async () => {
    vi.stubEnv("FAMGATEWAY_API_KEY", "test-key");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          status: "success",
          data: { amount: 500, utr: "UTR998877", sender_name: "Aarav" },
        }),
      }))
    );
    const { store, resolved } = fakeOrphanStore();
    overrideOrphanStoreForTests(store);
    const res = await post({
      ...goodPayload,
      paymentReference: "",
      paymentOrderId: "fg_order_resolve",
    });
    expect(res.status).toBe(201);
    expect(resolved).toEqual(["fg_order_resolve"]);
  });

  it("rejects oversized bodies (413)", async () => {
    const res = await post(JSON.stringify({ ...goodPayload, specialRequest: "x".repeat(70000) }));
    expect(res.status).toBe(413);
  });

  it("rejects non-JSON content type (415)", async () => {
    const res = await post(goodPayload, { "content-type": "text/plain" });
    expect(res.status).toBe(415);
  });
});