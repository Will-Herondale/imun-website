import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createHmac } from "node:crypto";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/payments/webhook/route";
import {
  overrideStoreForTests,
  type RegistrationStore,
} from "@/lib/storage";
import {
  emptyAllocation,
  emptyPayment,
  type PaymentFields,
  type RegistrationInput,
  type RegistrationRecord,
} from "@/lib/validation/registration";
import {
  overrideOrphanStoreForTests,
  type PaymentOrphanStore,
} from "@/lib/storage/paymentOrphans";

function fakeStore(opts: { registeredOrderId?: string } = {}): RegistrationStore {
  const registeredOrderId = opts.registeredOrderId ?? "";
  return {
    async ensure() {},
    async create(input: RegistrationInput, payment?: PaymentFields) {
      return {
        record: {
          ...emptyAllocation(),
          ...emptyPayment(),
          ...input,
          ...payment,
          id: "recd-1",
          createdAt: new Date().toISOString(),
          status: "submitted" as const,
          feeAmount: 500,
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
    async findByPaymentOrderId(orderId: string) {
      return orderId === registeredOrderId ? ({} as RegistrationRecord) : null;
    },
    async list() {
      return [];
    },
    async count() {
      return 0;
    },
    async update() {
      return null;
    },
  };
}

function fakeOrphanStore() {
  const recorded: Array<{ orderId: string; amount: number; utr: string; payer: string }> = [];
  const resolved: string[] = [];
  const store: PaymentOrphanStore = {
    async ensure() {},
    async recordPaidOrphan(input) {
      recorded.push(input);
    },
    async listUnresolved() {
      return [];
    },
    async countUnresolved() {
      return recorded.length - resolved.length;
    },
    async resolve(orderId) {
      resolved.push(orderId);
    },
  };
  return { store, recorded, resolved };
}

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

describe("POST /api/payments/webhook", () => {
  beforeEach(() => {
    vi.stubEnv("FAMGATEWAY_API_KEY", API_KEY);
    overrideStoreForTests(fakeStore());
    overrideOrphanStoreForTests(fakeOrphanStore().store);
  });
  afterEach(() => {
    overrideStoreForTests(null);
    overrideOrphanStoreForTests(null);
    vi.unstubAllEnvs();
  });

  it("records an orphan when a paid order has no linked registration", async () => {
    const { store, recorded } = fakeOrphanStore();
    overrideOrphanStoreForTests(store);
    const body = JSON.stringify({
      order_id: "fg_orphan_1",
      status: "success",
      amount: 500,
      utr: "UTR111222333",
      sender_name: "Aarav",
    });
    const res = await post(body, sign(body));
    expect(res.status).toBe(200);
    expect(recorded).toHaveLength(1);
    expect(recorded[0]).toMatchObject({
      orderId: "fg_orphan_1",
      amount: 500,
      utr: "UTR111222333",
      payer: "Aarav",
    });
  });

  it("does not record an orphan when the order already has a registration", async () => {
    const { store, recorded } = fakeOrphanStore();
    overrideStoreForTests(fakeStore({ registeredOrderId: "fg_used" }));
    overrideOrphanStoreForTests(store);
    const body = JSON.stringify({ order_id: "fg_used", status: "success" });
    const res = await post(body, sign(body));
    expect(res.status).toBe(200);
    expect(recorded).toHaveLength(0);
  });

  it("ignores non-success statuses", async () => {
    const { store, recorded } = fakeOrphanStore();
    overrideOrphanStoreForTests(store);
    const body = JSON.stringify({ order_id: "fg_pending", status: "pending" });
    const res = await post(body, sign(body));
    expect(res.status).toBe(200);
    expect(recorded).toHaveLength(0);
  });

  it("rejects an invalid signature (401)", async () => {
    const body = JSON.stringify({ order_id: "fg_x", status: "success" });
    const res = await post(body, "deadbeef");
    expect(res.status).toBe(401);
  });
});