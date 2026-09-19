/**
 * Postgres (Neon) repository for delegate registrations.
 *
 * Storage choice: serverless Postgres (Neon) via @neondatabase/serverless.
 *   - One small table covers the full conference dataset, same shape as the
 *     Azure Table Storage repository.
 *   - Deterministic duplicate prevention: `email_key` (a truncated SHA-256 of
 *     the normalised email) is UNIQUE, so a second submission for the same
 *     email is rejected by the database and returns the existing record.
 *   - This driver is selected automatically when a connection string is
 *     present (see lib/storage/index.ts) and is the production driver on
 *     Netlify; the Azure driver remains for local/Azurite development.
 *
 * Connection string resolution order:
 *   1. NETLIFY_DATABASE_URL  — injected by Netlify's Neon extension
 *   2. DATABASE_URL
 *   3. POSTGRES_URL
 */
import { neon } from "@neondatabase/serverless";
import { createHash, randomUUID } from "node:crypto";
import { feeAmountFor } from "@/lib/config/site";
import {
  emptyAllocation,
  emptyPayment,
  type AllocationFields,
  type AllocationStatus,
  type MunCount,
  type PaymentFields,
  type PaymentStatus,
  type RegistrationInput,
  type RegistrationRecord,
} from "@/lib/validation/registration";
import type { CreateResult, RegistrationStore } from "./registrationTable";

type Sql = ReturnType<typeof neon>;
type Row = Record<string, unknown>;

let client: Sql | null = null;
let ensurePromise: Promise<void> | null = null;

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

function emailKey(email: string): string {
  return createHash("sha256").update(email.toLowerCase().trim()).digest("hex").slice(0, 32);
}

function toIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  return typeof value === "string" ? value : "";
}

function rowToRecord(row: Row): RegistrationRecord {
  return {
    id: String(row.id ?? ""),
    createdAt: toIso(row.created_at),
    status: "submitted",
    feeAmount: Number(row.fee_amount ?? 0),
    fullName: String(row.full_name ?? ""),
    email: String(row.email ?? ""),
    contactNumber: String(row.contact_number ?? ""),
    schoolName: String(row.school_name ?? ""),
    grade: String(row.grade ?? ""),
    munCount: (row.mun_count ?? "0") as MunCount,
    munHistory: String(row.mun_history ?? ""),
    committeePref1: String(row.committee_pref1 ?? ""),
    committeePref2: String(row.committee_pref2 ?? ""),
    committeePref3: String(row.committee_pref3 ?? ""),
    countryPreference: String(row.country_preference ?? ""),
    specialRequest: String(row.special_request ?? ""),
    paymentOrderId: String(row.payment_order_id ?? ""),
    paymentReference: String(row.payment_reference ?? ""),
    declarationAccurate: (row.declaration_accurate ?? "") as "Yes",
    declarationRules: (row.declaration_rules ?? "") as "Yes",
    allocationStatus: (row.allocation_status as AllocationStatus) ?? "pending",
    allocatedCommittee: String(row.allocated_committee ?? ""),
    allocatedPortfolio: String(row.allocated_portfolio ?? ""),
    allocationNotes: String(row.allocation_notes ?? ""),
    updatedAt: String(row.updated_at ?? ""),
    paymentStatus: (row.payment_status as PaymentStatus) ?? "pending",
    paymentUtr: String(row.payment_utr ?? ""),
    paymentPayer: String(row.payment_payer ?? ""),
    paidAt: toIso(row.paid_at),
  };
}

async function runEnsure(): Promise<void> {
  const sql = getSql();
  await sql`
    CREATE TABLE IF NOT EXISTS registrations (
      id uuid PRIMARY KEY,
      email_key char(32) UNIQUE NOT NULL,
      email text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      fee_amount integer NOT NULL DEFAULT 0,
      full_name text NOT NULL,
      contact_number text NOT NULL,
      school_name text NOT NULL,
      grade text NOT NULL,
      mun_count text NOT NULL,
      mun_history text NOT NULL DEFAULT '',
      committee_pref1 text NOT NULL,
      committee_pref2 text NOT NULL,
      committee_pref3 text NOT NULL,
      country_preference text NOT NULL DEFAULT '',
      special_request text NOT NULL DEFAULT '',
      payment_order_id text NOT NULL DEFAULT '',
      payment_reference text NOT NULL DEFAULT '',
      payment_status text NOT NULL DEFAULT 'pending',
      payment_utr text NOT NULL DEFAULT '',
      payment_payer text NOT NULL DEFAULT '',
      paid_at timestamptz,
      declaration_accurate text NOT NULL,
      declaration_rules text NOT NULL,
      allocation_status text NOT NULL DEFAULT 'pending',
      allocated_committee text NOT NULL DEFAULT '',
      allocated_portfolio text NOT NULL DEFAULT '',
      allocation_notes text NOT NULL DEFAULT '',
      updated_at text NOT NULL DEFAULT ''
    )
  `;
  // Additive migration: CREATE TABLE IF NOT EXISTS will not add new columns to
  // an existing table, so each later column is added explicitly here.
  await sql`
    ALTER TABLE registrations
    ADD COLUMN IF NOT EXISTS payment_reference text NOT NULL DEFAULT ''
  `;
  await sql`
    ALTER TABLE registrations
    ADD COLUMN IF NOT EXISTS fee_amount integer NOT NULL DEFAULT 0
  `;
  await sql`
    ALTER TABLE registrations
    ADD COLUMN IF NOT EXISTS payment_order_id text NOT NULL DEFAULT ''
  `;
  await sql`
    ALTER TABLE registrations
    ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'pending'
  `;
  await sql`
    ALTER TABLE registrations
    ADD COLUMN IF NOT EXISTS payment_utr text NOT NULL DEFAULT ''
  `;
  await sql`
    ALTER TABLE registrations
    ADD COLUMN IF NOT EXISTS payment_payer text NOT NULL DEFAULT ''
  `;
  await sql`
    ALTER TABLE registrations
    ADD COLUMN IF NOT EXISTS paid_at timestamptz
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS registrations_created_at_idx
    ON registrations (created_at)
  `;
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS registrations_payment_order_id_key
    ON registrations (payment_order_id) WHERE payment_order_id <> ''
  `;
}

function ensureSchema(): Promise<void> {
  if (!ensurePromise) {
    ensurePromise = runEnsure().catch((err) => {
      ensurePromise = null;
      throw err;
    });
  }
  return ensurePromise;
}

export const postgresStore: RegistrationStore = {
  async ensure() {
    await ensureSchema();
  },

  async create(input: RegistrationInput, payment?: PaymentFields): Promise<CreateResult> {
    await ensureSchema();
    const record: RegistrationRecord = {
      ...emptyAllocation(),
      ...emptyPayment(),
      ...input,
      ...payment,
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      status: "submitted",
      feeAmount: feeAmountFor(),
    };

    const rows = (await getSql()`
      INSERT INTO registrations (
        id, email_key, email, created_at, fee_amount, full_name, contact_number, school_name,
        grade, mun_count, mun_history, committee_pref1, committee_pref2,
        committee_pref3, country_preference, special_request,
        payment_order_id, payment_reference, payment_status, payment_utr, payment_payer, paid_at,
        declaration_accurate,
        declaration_rules, allocation_status, allocated_committee,
        allocated_portfolio, allocation_notes, updated_at
      ) VALUES (
        ${record.id}, ${emailKey(record.email)}, ${record.email}, ${record.createdAt},
        ${record.feeAmount},
        ${record.fullName}, ${record.contactNumber}, ${record.schoolName},
        ${record.grade}, ${record.munCount}, ${record.munHistory},
        ${record.committeePref1}, ${record.committeePref2}, ${record.committeePref3},
        ${record.countryPreference}, ${record.specialRequest},
        ${record.paymentOrderId}, ${record.paymentReference}, ${record.paymentStatus},
        ${record.paymentUtr}, ${record.paymentPayer}, ${record.paidAt || null},
        ${record.declarationAccurate}, ${record.declarationRules},
        ${record.allocationStatus}, ${record.allocatedCommittee},
        ${record.allocatedPortfolio}, ${record.allocationNotes}, ${record.updatedAt}
      )
      ON CONFLICT (email_key) DO NOTHING
      RETURNING *
    `) as Row[];

    if (rows.length > 0) return { record: rowToRecord(rows[0]), duplicate: false };

    const existing = await this.findByEmail(record.email);
    if (existing) return { record: existing, duplicate: true };
    throw new Error("Postgres insert conflicts with an existing row but the record could not be read.");
  },

  async findById(id: string): Promise<RegistrationRecord | null> {
    await ensureSchema();
    const rows = (await getSql()`
      SELECT * FROM registrations WHERE id = ${id} LIMIT 1
    `) as Row[];
    return rows[0] ? rowToRecord(rows[0]) : null;
  },

  async findByEmail(email: string): Promise<RegistrationRecord | null> {
    await ensureSchema();
    const rows = (await getSql()`
      SELECT * FROM registrations WHERE email_key = ${emailKey(email)} LIMIT 1
    `) as Row[];
    return rows[0] ? rowToRecord(rows[0]) : null;
  },

  async findByPaymentOrderId(orderId: string): Promise<RegistrationRecord | null> {
    if (!orderId) return null;
    await ensureSchema();
    const rows = (await getSql()`
      SELECT * FROM registrations WHERE payment_order_id = ${orderId} LIMIT 1
    `) as Row[];
    return rows[0] ? rowToRecord(rows[0]) : null;
  },

  async list(): Promise<RegistrationRecord[]> {
    await ensureSchema();
    const rows = (await getSql()`
      SELECT * FROM registrations ORDER BY created_at ASC
    `) as Row[];
    return rows.map(rowToRecord);
  },

  async count(): Promise<number> {
    await ensureSchema();
    const rows = (await getSql()`
      SELECT count(*)::int AS n FROM registrations
    `) as Row[];
    return Number(rows[0]?.n ?? 0);
  },

  async update(id: string, patch: Partial<AllocationFields>): Promise<RegistrationRecord | null> {
    await ensureSchema();
    const existing = await this.findById(id);
    if (!existing) return null;
    const updatedAt = new Date().toISOString();
    const merged = { ...existing, ...patch, updatedAt };

    const rows = (await getSql()`
      UPDATE registrations SET
        allocation_status = ${merged.allocationStatus},
        allocated_committee = ${merged.allocatedCommittee},
        allocated_portfolio = ${merged.allocatedPortfolio},
        allocation_notes = ${merged.allocationNotes},
        updated_at = ${updatedAt}
      WHERE id = ${id}
      RETURNING *
    `) as Row[];
    return rows[0] ? rowToRecord(rows[0]) : null;
  },
};
