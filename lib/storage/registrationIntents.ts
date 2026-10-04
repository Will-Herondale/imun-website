/**
 * Postgres-backed store for server-side registration drafts ("intents").
 *
 * Why this exists: the previous flow only persisted a delegate's answers when
 * the browser POSTed `/api/registrations` *after* paying. Close the tab, lose
 * connectivity, or time out on the confirmation poll and the money arrived but
 * the answers never did — the exact failure that lost three registrations.
 *
 * An intent removes the browser from the critical path entirely:
 *   1. `POST /api/registrations/intents` validates and stores the answers here,
 *      then creates the FamGateway order bound to this draft.
 *   2. The payment webhook (server-to-server, retried by FamGateway) turns a
 *      confirmed order into a real registration using these stored answers.
 *   3. The delegate's return page reads the same draft, so a different device,
 *      a fresh tab, or no tab at all still ends up registered.
 *
 * The resume token is a 256-bit random secret; only its SHA-256 hash is stored,
 * so a database leak cannot be replayed as a registration.
 */
import { neon } from "@neondatabase/serverless";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { RegistrationInput } from "@/lib/validation/registration";

/** Lifecycle of a stored draft. */
export type IntentState =
  /** Answers saved, payment not yet confirmed. */
  | "awaiting_payment"
  /** Answers saved, payment confirmed, registration written. */
  | "completed"
  /** The delegate's window lapsed without payment (order expired). */
  | "payment_expired"
  /** A newer draft replaced this one. */
  | "superseded"
  /** The delegate abandoned the flow; answers kept briefly for resume. */
  | "abandoned";

export type RegistrationIntent = {
  id: string;
  email: string;
  fullName: string;
  orderId: string;
  payload: RegistrationInput;
  state: IntentState;
  registrationId: string;
  paymentStatus: string;
  utr: string;
  payer: string;
  /** Lease token held by the finalizer currently writing this draft. */
  claimToken: string;
  /** When that lease was taken, so a dead writer's claim can go stale. */
  claimedAt: number | null;
  /** Amount the delegate was told to pay for this round. */
  quotedAmount: number;
  createdAt: string;
  updatedAt: string;
  completedAt: string;
};

export type RegistrationIntentStore = {
  ensure(): Promise<void>;
  /** Persists validated answers and returns the draft plus its resume token. */
  create(input: {
    email: string;
    fullName: string;
    payload: RegistrationInput;
    /** Fee quoted to this delegate, so a later price change cannot strand a
     * payment that was made against the quoted amount. */
    amount: number;
  }): Promise<{ intent: RegistrationIntent; token: string }>;
  /** Binds the FamGateway order created for this draft. */
  bindOrder(id: string, orderId: string): Promise<void>;
  /** Looks a draft up by its (hashed) resume token. */
  findByToken(token: string): Promise<RegistrationIntent | null>;
  /** Looks a draft up by its FamGateway order id — the webhook's lookup key. */
  findByOrderId(orderId: string): Promise<RegistrationIntent | null>;
  /**
   * Atomically takes ownership of finalisation for a draft and returns the
   * lease token, or `null` when another writer holds it.
   *
   * The lease (not a bare state flip) is what makes this safe: `complete` and
   * `release` only act for the holder of the token, so the delegate's 3-second
   * poll and the webhook cannot pull the rug out from under each other. A claim
   * abandoned by a process that died mid-request goes stale after
   * `CLAIM_STALE_SECONDS` and can be taken over, which is what stops a paid
   * order from being stranded forever.
   */
  claimCompletion(id: string): Promise<string | null>;
  /** Marks the draft complete once the registration row exists. */
  complete(
    id: string,
    claimToken: string,
    result: { registrationId: string; paymentStatus: string; utr: string; payer: string }
  ): Promise<boolean>;
  /** Returns a claimed draft to `awaiting_payment` so a later retry can win. */
  release(id: string, claimToken: string): Promise<void>;
  setState(id: string, state: IntentState): Promise<void>;
  /** Supersedes this delegate's other open drafts (one live payment at a time). */
  supersedeOtherOpen(email: string, keepId: string): Promise<void>;
  /** Recently abandoned drafts for the secretariat's "unfinished" view. */
  listUnfinished(limit?: number): Promise<RegistrationIntent[]>;
  countByState(): Promise<Record<string, number>>;
  /** Housekeeping: drops drafts older than the retention window. */
  purgeOlderThan(days: number): Promise<void>;
};

type Sql = ReturnType<typeof neon>;
type Row = Record<string, unknown>;

/** Drafts are personal data; keep them short-lived. */
export const INTENT_RETENTION_DAYS = 7;

/**
 * How long a finalisation claim stays valid before another writer may take it
 * over. Comfortably longer than writing one row, short enough that a delegate
 * is never left waiting on a dead request.
 */
export const CLAIM_STALE_SECONDS = 60;

let client: Sql | null = null;
let ensurePromise: Promise<void> | null = null;
let testOverride: RegistrationIntentStore | null = null;

function connectionString(): string {
  const url =
    process.env.NETLIFY_DATABASE_URL?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    process.env.POSTGRES_URL?.trim();
  if (!url) {
    throw new Error(
      "Postgres is not configured. Set NETLIFY_DATABASE_URL (Netlify Neon extension) or DATABASE_URL."
    );
  }
  return url;
}

function getSql(): Sql {
  if (!client) client = neon(connectionString());
  return client;
}

/** sha256 hex of the resume token; the plaintext token is never stored. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token.trim()).digest("hex");
}

/** A fresh 256-bit resume token (43 base64url characters). */
export function newResumeToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Lease token for one finalisation attempt. */
function newClaimToken(): string {
  return randomBytes(16).toString("hex");
}

function toIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  return typeof value === "string" ? value : "";
}

const STATES: readonly IntentState[] = [
  "awaiting_payment",
  "completed",
  "payment_expired",
  "superseded",
  "abandoned",
];

function rowToIntent(row: Row): RegistrationIntent {
  const rawState = String(row.state ?? "awaiting_payment");
  const state = (STATES as readonly string[]).includes(rawState)
    ? (rawState as IntentState)
    : "awaiting_payment";
  const payload =
    row.payload && typeof row.payload === "object" && !Array.isArray(row.payload)
      ? (row.payload as RegistrationInput)
      : ({} as RegistrationInput);
  return {
    id: String(row.id ?? ""),
    email: String(row.email ?? ""),
    fullName: String(row.full_name ?? ""),
    orderId: String(row.order_id ?? ""),
    payload,
    state,
    registrationId: String(row.registration_id ?? ""),
    paymentStatus: String(row.payment_status ?? ""),
    utr: String(row.utr ?? ""),
    payer: String(row.payer ?? ""),
    claimToken: String(row.claim_token ?? ""),
    claimedAt: row.claimed_at ? new Date(row.claimed_at as string | Date).getTime() : null,
    quotedAmount: Number(row.quoted_amount ?? 0),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
    completedAt: toIso(row.completed_at),
  };
}

async function runEnsure(): Promise<void> {
  const sql = getSql();
  await sql`
    CREATE TABLE IF NOT EXISTS registration_intents (
      id uuid PRIMARY KEY,
      token_hash text UNIQUE NOT NULL,
      email text NOT NULL,
      full_name text NOT NULL DEFAULT '',
      order_id text,
      payload jsonb NOT NULL,
      state text NOT NULL DEFAULT 'awaiting_payment',
      registration_id text NOT NULL DEFAULT '',
      payment_status text NOT NULL DEFAULT '',
      utr text NOT NULL DEFAULT '',
      payer text NOT NULL DEFAULT '',
      claim_token text NOT NULL DEFAULT '',
      claimed_at timestamptz,
      quoted_amount numeric NOT NULL DEFAULT 0,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      completed_at timestamptz
    )
  `;
  /* The table predates the finalisation lease, so add the lease columns to a
   * database that already has it. */
  await sql`
    ALTER TABLE registration_intents ADD COLUMN IF NOT EXISTS claim_token text NOT NULL DEFAULT ''
  `;
  await sql`
    ALTER TABLE registration_intents ADD COLUMN IF NOT EXISTS claimed_at timestamptz
  `;
  await sql`
    ALTER TABLE registration_intents ADD COLUMN IF NOT EXISTS quoted_amount numeric NOT NULL DEFAULT 0
  `;
  // Partial unique index: an order can back at most one draft.
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS registration_intents_order_idx
    ON registration_intents (order_id) WHERE order_id IS NOT NULL
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS registration_intents_open_idx
    ON registration_intents (email, updated_at DESC)
    WHERE state IN ('awaiting_payment', 'payment_expired')
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS registration_intents_created_idx
    ON registration_intents (created_at DESC)
  `;
}

async function ensureSchema(): Promise<void> {
  if (!ensurePromise) {
    ensurePromise = runEnsure().catch((err) => {
      ensurePromise = null;
      throw err;
    });
  }
  return ensurePromise;
}

export const postgresIntentStore: RegistrationIntentStore = {
  async ensure() {
    await ensureSchema();
  },

  async create({ email, fullName, payload, amount }) {
    await ensureSchema();
    const id = randomUUID();
    const token = newResumeToken();
    await getSql()`
      INSERT INTO registration_intents (id, token_hash, email, full_name, payload, quoted_amount)
      VALUES (${id}, ${hashToken(token)}, ${email}, ${fullName}, ${JSON.stringify(payload)}, ${Number(amount) || 0})
    `;
    const intent = await this.findByToken(token);
    /* istanbul ignore next — the insert above guarantees a row. */
    if (!intent) throw new Error("registration intent could not be read back after insert");
    return { intent, token };
  },

  async bindOrder(id, orderId) {
    await ensureSchema();
    await getSql()`
      UPDATE registration_intents
      SET order_id = ${orderId}, updated_at = now()
      WHERE id = ${id}
    `;
  },

  async findByToken(token) {
    await ensureSchema();
    if (!token || token.length > 128) return null;
    const rows = (await getSql()`
      SELECT * FROM registration_intents WHERE token_hash = ${hashToken(token)} LIMIT 1
    `) as Row[];
    return rows[0] ? rowToIntent(rows[0]) : null;
  },

  async findByOrderId(orderId) {
    await ensureSchema();
    if (!orderId || orderId.length > 40) return null;
    const rows = (await getSql()`
      SELECT * FROM registration_intents WHERE order_id = ${orderId} LIMIT 1
    `) as Row[];
    return rows[0] ? rowToIntent(rows[0]) : null;
  },

  async claimCompletion(id) {
    await ensureSchema();
    /*
     * One atomic statement decides everything:
     *   - an open draft (awaiting / superseded / expired) is claimable, because
     *     those orders may still be paid and money that arrived must become a
     *     registration;
     *   - a `completed` draft with no registration row is claimable only once
     *     its lease has gone stale, i.e. the previous writer died.
     * `superseded` is deliberately claimable: the delegate may have paid the
     * older order before starting a newer attempt, and that money is real.
     */
    const token = newClaimToken();
    const rows = (await getSql()`
      UPDATE registration_intents
      SET state = 'completed',
          claim_token = ${token},
          claimed_at = now(),
          updated_at = now()
      WHERE id = ${id}
        AND (
          state IN ('awaiting_payment', 'superseded', 'payment_expired')
          OR (
            state = 'completed'
            AND registration_id = ''
            AND (claimed_at IS NULL OR claimed_at < now() - make_interval(secs => ${CLAIM_STALE_SECONDS}))
          )
        )
      RETURNING id
    `) as Row[];
    return rows.length === 1 ? token : null;
  },

  async complete(id, claimToken, result) {
    await ensureSchema();
    /* Returns false when the lease was taken over mid-write, so the caller knows
     * not to report success on a draft that is not actually marked done. */
    const rows = (await getSql()`
      UPDATE registration_intents
      SET state = 'completed',
          registration_id = ${result.registrationId},
          payment_status = ${result.paymentStatus},
          utr = ${result.utr},
          payer = ${result.payer},
          claim_token = '',
          claimed_at = NULL,
          completed_at = now(),
          updated_at = now()
      WHERE id = ${id} AND claim_token = ${claimToken}
      RETURNING id
    `) as Row[];
    return rows.length === 1;
  },

  async release(id, claimToken) {
    await ensureSchema();
    await getSql()`
      UPDATE registration_intents
      SET state = 'awaiting_payment',
          claim_token = '',
          claimed_at = NULL,
          updated_at = now()
      WHERE id = ${id}
        AND claim_token = ${claimToken}
        AND registration_id = ''
    `;
  },

  async setState(id, state) {
    await ensureSchema();
    /* Never demote a draft that is completed or currently being written: the
     * return page reads this state, and a stray transition would tell a delegate
     * with a registration row that they do not have one. */
    await getSql()`
      UPDATE registration_intents
      SET state = ${state}, updated_at = now()
      WHERE id = ${id}
        AND claim_token = ''
        AND (registration_id = '' OR state <> 'completed')
    `;
  },

  async supersedeOtherOpen(email, keepId) {
    await ensureSchema();
    await getSql()`
      UPDATE registration_intents
      SET state = 'superseded', updated_at = now()
      WHERE email = ${email} AND id <> ${keepId} AND state IN ('awaiting_payment', 'payment_expired')
    `;
  },

  async listUnfinished(limit = 50) {
    await ensureSchema();
    const capped = Math.max(1, Math.min(200, Math.trunc(limit) || 50));
    const rows = (await getSql()`
      SELECT * FROM registration_intents
      WHERE state IN ('awaiting_payment', 'payment_expired')
      ORDER BY updated_at DESC
      LIMIT ${capped}
    `) as Row[];
    return rows.map(rowToIntent);
  },

  async countByState() {
    await ensureSchema();
    const rows = (await getSql()`
      SELECT state, count(*)::int AS n FROM registration_intents GROUP BY state
    `) as Row[];
    const out: Record<string, number> = {};
    for (const row of rows) out[String(row.state ?? "unknown")] = Number(row.n ?? 0);
    return out;
  },

  async purgeOlderThan(days) {
    await ensureSchema();
    const safeDays = Math.max(1, Math.trunc(days) || INTENT_RETENTION_DAYS);
    // Settled drafts (completed, superseded, abandoned, expired) go first.
    await getSql()`
      DELETE FROM registration_intents
      WHERE created_at < now() - make_interval(days => ${safeDays})
        AND state <> 'awaiting_payment'
    `;
    /*
     * Still-open drafts are kept for three retention windows. An order the
     * delegate walked away from can still be paid later, and keeping the stored
     * answers is the only way that payment can become a registration instead of
     * an unexplained credit. Bounded, but deliberately more generous than the
     * normal window.
     */
    await getSql()`
      DELETE FROM registration_intents
      WHERE created_at < now() - make_interval(days => ${safeDays * 3})
    `;
  },
};

/** Test seam: swap a fake intent store while keeping the same module surface. */
export function overrideIntentStoreForTests(store: RegistrationIntentStore | null): void {
  testOverride = store;
}

/** The active intent store (test override wins when set). */
export function intentStore(): RegistrationIntentStore {
  return testOverride ?? postgresIntentStore;
}