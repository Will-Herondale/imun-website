/**
 * Shared in-memory doubles for the registration test-suite.
 *
 * `fakeIntentStore` mirrors the production semantics that matter to callers:
 * tokens are opaque, `claimCompletion` is a one-shot atomic gate, and
 * `complete`/`release` move the record between states.
 */
import { randomUUID } from "node:crypto";
import { vi } from "vitest";
import type {
  IntentState,
  RegistrationIntent,
  RegistrationIntentStore,
} from "@/lib/storage/registrationIntents";
import { CLAIM_STALE_SECONDS } from "@/lib/storage/registrationIntents";
import type {
  PaymentFields,
  RegistrationInput,
  RegistrationRecord,
} from "@/lib/validation/registration";
import { emptyAllocation, emptyPayment } from "@/lib/validation/registration";
import type { PaymentOrphanStore } from "@/lib/storage/paymentOrphans";
import type { RegistrationStore } from "@/lib/storage";

export const SAMPLE_PAYLOAD: RegistrationInput = {
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
  paymentOrderId: "",
  paymentReference: "",
  declarationAccurate: "Yes",
  declarationRules: "Yes",
};

/** What the browser actually posts: the delegate's answers plus the honeypot. */
export function sampleBody(overrides: Record<string, unknown> = {}) {
  return { ...SAMPLE_PAYLOAD, website: "", ...overrides };
}

export function fakeIntentStore(
  seed: Array<{
    orderId?: string;
    email?: string;
    token?: string;
    state?: IntentState;
    quotedAmount?: number;
  }> = []
) {
  const byId = new Map<string, RegistrationIntent>();
  const tokenToId = new Map<string, string>();
  const orderToId = new Map<string, string>();
  let created = 0;
  let claimSeq = 0;

  const insert = (
    id: string,
    token: string,
    orderId: string,
    state: IntentState,
    email: string,
    payload: RegistrationInput,
    quotedAmount = 500
  ) => {
    const intent: RegistrationIntent = {
      id,
      email,
      fullName: payload.fullName,
      orderId,
      payload,
      state,
      registrationId: "",
      paymentStatus: "",
      utr: "",
      payer: "",
      claimToken: "",
      claimedAt: null,
      quotedAmount,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completedAt: "",
    };
    byId.set(id, intent);
    tokenToId.set(token, id);
    if (orderId) orderToId.set(orderId, id);
    return intent;
  };

  for (const s of seed) {
    const id = randomUUID();
    insert(
      id,
      s.token ?? `tok-${s.orderId || id}`,
      s.orderId ?? "",
      s.state ?? "awaiting_payment",
      s.email ?? SAMPLE_PAYLOAD.email,
      { ...SAMPLE_PAYLOAD, ...(s.email ? { email: s.email } : {}) },
      s.quotedAmount
    );
  }

  const store: RegistrationIntentStore = {
    async ensure() {},
    async create({ email, fullName, payload, amount }) {
      const id = randomUUID();
      const token = `tok-${++created}-${id}`;
      /* Production stores the submitted name on the draft itself, and pins the
       * fee that was quoted at the moment of creation. */
      const intent = insert(
        id,
        token,
        "",
        "awaiting_payment",
        email,
        { ...payload, fullName },
        amount ?? 500
      );
      return { intent: { ...intent }, token };
    },
    async bindOrder(id, orderId) {
      const intent = byId.get(id);
      if (!intent) return;
      intent.orderId = orderId;
      orderToId.set(orderId, id);
    },
    async findByToken(token) {
      const id = tokenToId.get(token);
      const intent = id ? byId.get(id) : undefined;
      return intent ? { ...intent } : null;
    },
    async findByOrderId(orderId) {
      const id = orderToId.get(orderId);
      const intent = id ? byId.get(id) : undefined;
      return intent ? { ...intent } : null;
    },
    async claimCompletion(id) {
      const intent = byId.get(id);
      if (!intent) return null;
      /* Mirrors the production guard: open drafts are claimable, and a
       * `completed` draft with no registration row can be taken over only once
       * its lease has gone stale. */
      const open =
        intent.state === "awaiting_payment" ||
        intent.state === "superseded" ||
        intent.state === "payment_expired";
      const staleTakeover =
        intent.state === "completed" &&
        !intent.registrationId &&
        (!intent.claimedAt || Date.now() - intent.claimedAt > CLAIM_STALE_SECONDS * 1000);
      if (!open && !staleTakeover) return null;
      const token = `claim-${++claimSeq}`;
      intent.claimToken = token;
      intent.claimedAt = Date.now();
      intent.state = "completed";
      return token;
    },
    async complete(id, claimToken, result) {
      const intent = byId.get(id);
      if (!intent || intent.claimToken !== claimToken) return false;
      intent.state = "completed";
      intent.registrationId = result.registrationId;
      intent.paymentStatus = result.paymentStatus;
      intent.utr = result.utr;
      intent.payer = result.payer;
      intent.claimToken = "";
      intent.claimedAt = null;
      intent.completedAt = new Date().toISOString();
      return true;
    },
    async release(id, claimToken) {
      const intent = byId.get(id);
      if (intent && intent.claimToken === claimToken && !intent.registrationId) {
        intent.state = "awaiting_payment";
        intent.claimToken = "";
        intent.claimedAt = null;
      }
    },
    async setState(id, state) {
      const intent = byId.get(id);
      /* Mirrors the production WHERE clause: a live claim owns the draft, and a
       * completed draft with a registration row is never walked back. */
      if (!intent) return;
      if (intent.claimToken) return;
      if (intent.registrationId && intent.state === "completed") return;
      intent.state = state;
    },
    async supersedeOtherOpen(email, keepId) {
      for (const intent of byId.values()) {
        if (
          intent.email === email &&
          intent.id !== keepId &&
          (intent.state === "awaiting_payment" || intent.state === "payment_expired") &&
          !intent.registrationId
        ) {
          intent.state = "superseded";
        }
      }
    },
    async listUnfinished() {
      return [...byId.values()].filter((i) => i.state === "awaiting_payment" || i.state === "payment_expired");
    },
    async countByState() {
      const out: Record<string, number> = {};
      for (const intent of byId.values()) out[intent.state] = (out[intent.state] ?? 0) + 1;
      return out;
    },
    async purgeOlderThan() {},
  };

  return { store, byId, tokenToId, orderToId };
}

/** Token of the nth draft created through `store.create`, for assertions. */
export function fakeRegistrationStore(opts: { feeAmount?: number } = {}) {
  const created: Array<{ input: RegistrationInput; payment: PaymentFields }> = [];
  const byEmail = new Map<string, RegistrationRecord>();
  const byOrder = new Map<string, RegistrationRecord>();
  let seq = 0;

  const store: RegistrationStore = {
    async ensure() {},
    async create(input, payment) {
      const existing = byEmail.get(input.email);
      if (existing) return { record: existing, duplicate: true };
      const record: RegistrationRecord = {
        ...emptyAllocation(),
        ...emptyPayment(),
        ...input,
        ...payment,
        id: `recd-${++seq}`,
        createdAt: new Date().toISOString(),
        status: "submitted",
        feeAmount: opts.feeAmount ?? 500,
      };
      created.push({ input, payment: payment ?? emptyPayment() });
      byEmail.set(input.email, record);
      if (record.paymentOrderId) byOrder.set(record.paymentOrderId, record);
      return { record, duplicate: false };
    },
    async findById(id) {
      return [...byEmail.values()].find((r) => r.id === id) ?? null;
    },
    async findByEmail(email) {
      return byEmail.get(email) ?? null;
    },
    async findByPaymentOrderId(orderId) {
      return byOrder.get(orderId) ?? null;
    },
    async list() {
      return [...byEmail.values()];
    },
    async count() {
      return byEmail.size;
    },
    async update() {
      return null;
    },
  };

  return { store, created, byEmail, byOrder };
}

export function fakeOrphanStore() {
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
      return recorded.filter((r) => !resolved.includes(r.orderId)).length;
    },
    async resolve(orderId) {
      resolved.push(orderId);
    },
  };
  return { store, recorded, resolved };
}

/** Stubs FamGateway's server-to-server verification. */
export function stubGateway(responses: Record<string, { status: string; amount: number; utr?: string; sender_name?: string } | "unavailable">) {
  const seen: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      const match = String(url).match(/order_id=([^&]+)/);
      const orderId = match ? decodeURIComponent(match[1]) : "";
      seen.push(orderId);
      const hit = responses[orderId];
      if (!hit || hit === "unavailable") {
        return { ok: false, status: 500, json: async () => ({}) };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          status: hit.status,
          data: { amount: hit.amount, utr: hit.utr ?? "UTR000000000", sender_name: hit.sender_name ?? "Aarav Sharma" },
        }),
      };
    })
  );
  return seen;
}

/** Stubs FamGateway's order creation. */
export function stubCreateOrder(order: { orderId?: string; checkoutUrl?: string } = {}) {
  const orderId = order.orderId ?? "fg_test_0001";
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : {};
      void body;
      return {
        ok: true,
        status: 200,
        json: async () => ({
          status: "success",
          data: {
            order_id: orderId,
            amount: "500",
            payable_amount: "500",
            checkout_url: order.checkoutUrl ?? `https://famgateway.in/pay.php?order_id=${orderId}`,
            qr_url: "https://famgateway.in/api/qr-image.php?order_id=" + orderId,
            upi_intent: "upi://pay?pa=x%40fam&am=500.00",
          },
        }),
      };
    })
  );
  return orderId;
}