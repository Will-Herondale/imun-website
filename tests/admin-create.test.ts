import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/admin/registrations/route";
import { createAdminSession } from "@/lib/auth/session";
import { overrideStoreForTests, type RegistrationStore } from "@/lib/storage";
import {
  emptyAllocation,
  emptyPayment,
  type PaymentFields,
  type RegistrationInput,
  type RegistrationRecord,
} from "@/lib/validation/registration";

/* `readAdminSession` reads the cookie through next/headers, which only exists
 * inside a running Next request. Swap in a cookie jar this suite controls. */
const jar = vi.hoisted(() => ({ token: null as string | null }));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      jar.token && name === "iemun_admin" ? { name, value: jar.token } : undefined,
  }),
}));

type Created = { input: RegistrationInput; payment?: PaymentFields };

function buildRecord(input: RegistrationInput, payment: PaymentFields | undefined, id: string): RegistrationRecord {
  return {
    ...emptyAllocation(),
    ...emptyPayment(),
    ...input,
    ...payment,
    id,
    createdAt: new Date().toISOString(),
    status: "submitted",
    feeAmount: 500,
  };
}

function fakeStore(opts: { duplicateId?: string } = {}) {
  const created: Created[] = [];
  const store: RegistrationStore & { created: Created[] } = {
    created,
    async ensure() {},
    async create(input, payment) {
      if (opts.duplicateId) return { record: buildRecord(input, payment, opts.duplicateId), duplicate: true };
      created.push({ input, payment });
      return { record: buildRecord(input, payment, "reg-admin-1"), duplicate: false };
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
        ...c.input,
        ...c.payment,
        id: `reg-${i}`,
        createdAt: new Date().toISOString(),
        status: "submitted" as const,
        feeAmount: 500,
      }));
    },
    async count() {
      return created.length;
    },
    async update() {
      return null;
    },
  };
  return store;
}

const validPayload = {
  fullName: "Aarav Sharma",
  email: "aarav.admin@example.com",
  contactNumber: "9876543210",
  schoolName: "St Xavier's Collegiate School",
  grade: "11",
  munCount: "1",
  munHistory: "Harvest MUN | 2026 | DISEC | Delegate | Special Mention",
  committeePref1: "DISEC",
  committeePref2: "UNHRC",
  committeePref3: "AIPPM",
  countryPreference: "India",
  specialRequest: "",
  paymentStatus: "paid",
  paymentUtr: "UTR123456789012",
  paymentPayer: "Ravi Sharma",
};

function post(body: unknown, headers: Record<string, string> = {}) {
  return POST(
    new NextRequest("http://localhost/api/admin/registrations", {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: typeof body === "string" ? body : JSON.stringify(body),
    })
  );
}

beforeEach(() => {
  vi.stubEnv("ADMIN_SESSION_SECRET", "s".repeat(40));
  jar.token = createAdminSession("organiser@iemun.example").token;
});

afterEach(() => {
  jar.token = null;
  overrideStoreForTests(null);
  vi.unstubAllEnvs();
});

describe("POST /api/admin/registrations", () => {
  it("refuses an unauthenticated caller (401)", async () => {
    jar.token = null;
    const store = fakeStore();
    overrideStoreForTests(store);
    const res = await post(validPayload);
    expect(res.status).toBe(401);
    expect(store.created).toHaveLength(0);
  });

  it("creates a delegate and records the confirmed payment", async () => {
    const store = fakeStore();
    overrideStoreForTests(store);
    const res = await post(validPayload);
    expect(res.status).toBe(201);
    const data = (await res.json()) as { ok: boolean; record: RegistrationRecord };
    expect(data.ok).toBe(true);
    expect(data.record.fullName).toBe("Aarav Sharma");

    expect(store.created).toHaveLength(1);
    const { input, payment } = store.created[0];
    expect(input.declarationAccurate).toBe("Yes");
    expect(input.declarationRules).toBe("Yes");
    expect(input.paymentOrderId).toBe("");
    expect(payment?.paymentStatus).toBe("paid");
    expect(payment?.paymentUtr).toBe("UTR123456789012");
    expect(payment?.paidAt).not.toBe("");
  });

  it("treats a missing payment status as paid, and a pending seat as unpaid", async () => {
    const store = fakeStore();
    overrideStoreForTests(store);
    const { paymentStatus, ...withoutStatus } = validPayload;
    expect(paymentStatus).toBe("paid");
    const ok = await post(withoutStatus);
    expect(ok.status).toBe(201);
    expect(store.created[0].payment?.paymentStatus).toBe("paid");
    expect(store.created[0].payment?.paidAt).not.toBe("");

    const pending = await post({ ...validPayload, email: "second@example.com", paymentStatus: "pending" });
    expect(pending.status).toBe(201);
    expect(store.created[1].payment?.paymentStatus).toBe("pending");
    expect(store.created[1].payment?.paidAt).toBe("");
  });

  it("rejects an invalid payload without storing anything (422)", async () => {
    const store = fakeStore();
    overrideStoreForTests(store);
    const res = await post({ ...validPayload, email: "nope" });
    expect(res.status).toBe(422);
    const data = (await res.json()) as { fields?: Record<string, string> };
    expect(data.fields?.email).toBeDefined();
    expect(store.created).toHaveLength(0);
  });

  it("cannot be used to inject server-managed fields (422)", async () => {
    const store = fakeStore();
    overrideStoreForTests(store);
    const res = await post({
      ...validPayload,
      feeAmount: 0,
      paymentOrderId: "fg_whatever",
      website: "http://spam",
      declarationRules: "No",
      allocationStatus: "allocated",
    });
    expect(res.status).toBe(422);
    const data = (await res.json()) as { fields?: Record<string, string> };
    expect(data.fields?.form).toMatch(/Unrecognized key/i);
    expect(store.created).toHaveLength(0);
  });

  it("refuses a second registration for the same email (409)", async () => {
    const store = fakeStore({ duplicateId: "reg-existing" });
    overrideStoreForTests(store);
    const res = await post(validPayload);
    expect(res.status).toBe(409);
    const data = (await res.json()) as { code?: string; existingId?: string };
    expect(data.code).toBe("DUPLICATE_EMAIL");
    expect(data.existingId).toBe("reg-existing");
  });

  it("rejects a non-JSON body (415) and a broken one (400)", async () => {
    overrideStoreForTests(fakeStore());
    const wrongType = await post("{}", { "content-type": "text/plain" });
    expect(wrongType.status).toBe(415);
    const broken = await post("{not json");
    expect(broken.status).toBe(400);
  });

  it("requires three distinct, valid committee preferences", async () => {
    const store = fakeStore();
    overrideStoreForTests(store);
    const res = await post({ ...validPayload, committeePref2: "DISEC" });
    expect(res.status).toBe(422);
    const data = (await res.json()) as { fields?: Record<string, string> };
    expect(data.fields?.committeePrefs).toBeDefined();
    expect(store.created).toHaveLength(0);
  });
});
