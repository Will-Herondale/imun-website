/**
 * Postgres-backed store for "paid but not yet registered" payments.
 *
 * When FamGateway confirms a payment but no registration row references that
 * order id, the delegate paid at the checkout and then never completed the
 * final submit (closed the tab, the confirmation poll timed out, or the submit
 * errored). Without this store the secretariat would never see the money. The
 * payment webhook records orphans here and the admin dashboard surfaces them so
 * they can be chased before they disappear.
 *
 * An orphan is automatically cleared when the delegate's registration POST
 * eventually succeeds with that order id (see app/api/registrations/route.ts),
 * or dismissed manually from the admin panel.
 */
import { neon } from "@neondatabase/serverless";
import { randomUUID } from "node:crypto";

export type PaymentOrphan = {
  id: string;
  orderId: string;
  amount: number;
  utr: string;
  payer: string;
  status: "paid";
  receivedAt: string;
  createdAt: string;
  resolvedAt: string;
};

export type PaymentOrphanStore = {
  ensure(): Promise<void>;
  recordPaidOrphan(input: { orderId: string; amount: number; utr: string; payer: string }): Promise<void>;
  listUnresolved(): Promise<PaymentOrphan[]>;
  countUnresolved(): Promise<number>;
  resolve(orderId: string): Promise<void>;
};

type Sql = ReturnType<typeof neon>;
type Row = Record<string, unknown>;

let client: Sql | null = null;
let ensurePromise: Promise<void> | null = null;
let testOverride: PaymentOrphanStore | null = null;

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

function toIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  return typeof value === "string" ? value : "";
}

function rowToOrphan(row: Row): PaymentOrphan {
  return {
    id: String(row.id ?? ""),
    orderId: String(row.order_id ?? ""),
    amount: Number(row.amount ?? 0),
    utr: String(row.utr ?? ""),
    payer: String(row.payer ?? ""),
    status: "paid",
    receivedAt: toIso(row.received_at),
    createdAt: toIso(row.created_at),
    resolvedAt: toIso(row.resolved_at),
  };
}

async function runEnsure(): Promise<void> {
  const sql = getSql();
  await sql`
    CREATE TABLE IF NOT EXISTS payment_orphans (
      id uuid PRIMARY KEY,
      order_id text UNIQUE NOT NULL,
      amount integer NOT NULL DEFAULT 0,
      utr text NOT NULL DEFAULT '',
      payer text NOT NULL DEFAULT '',
      status text NOT NULL DEFAULT 'paid',
      received_at timestamptz NOT NULL DEFAULT now(),
      created_at timestamptz NOT NULL DEFAULT now(),
      resolved_at timestamptz
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS payment_orphans_unresolved_idx
    ON payment_orphans (received_at DESC) WHERE resolved_at IS NULL
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

export const postgresOrphanStore: PaymentOrphanStore = {
  async ensure() {
    await ensureSchema();
  },

  async recordPaidOrphan(input) {
    await ensureSchema();
    await getSql()`
      INSERT INTO payment_orphans (id, order_id, amount, utr, payer, status)
      VALUES (${randomUUID()}, ${input.orderId}, ${input.amount}, ${input.utr}, ${input.payer}, 'paid')
      ON CONFLICT (order_id) DO UPDATE SET
        amount = EXCLUDED.amount,
        utr = EXCLUDED.utr,
        payer = EXCLUDED.payer,
        status = 'paid',
        received_at = now(),
        resolved_at = NULL
    `;
  },

  async listUnresolved() {
    await ensureSchema();
    const rows = (await getSql()`
      SELECT * FROM payment_orphans
      WHERE resolved_at IS NULL
      ORDER BY received_at DESC
    `) as Row[];
    return rows.map(rowToOrphan);
  },

  async countUnresolved() {
    await ensureSchema();
    const rows = (await getSql()`
      SELECT count(*)::int AS n FROM payment_orphans WHERE resolved_at IS NULL
    `) as Row[];
    return Number(rows[0]?.n ?? 0);
  },

  async resolve(orderId) {
    await ensureSchema();
    await getSql()`
      UPDATE payment_orphans
      SET resolved_at = now()
      WHERE order_id = ${orderId} AND resolved_at IS NULL
    `;
  },
};

/** Test seam: swap a fake orphan store while keeping the same module surface. */
export function overrideOrphanStoreForTests(store: PaymentOrphanStore | null): void {
  testOverride = store;
}

/** The active orphan store (test override wins when set). */
export function orphanStore(): PaymentOrphanStore {
  return testOverride ?? postgresOrphanStore;
}