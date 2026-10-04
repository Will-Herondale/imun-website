/**
 * Opt-in integration test for the real Postgres intent store.
 *
 * The unit suite runs against in-memory doubles, so the actual SQL — JSONB
 * round-tripping, the partial unique index on `order_id`, the atomic claim's
 * `UPDATE … RETURNING`, `make_interval(days => $1)` — would otherwise only ever
 * be exercised in production, on a delegate's registration.
 *
 * Skipped unless explicitly enabled, and it only ever touches rows it created
 * itself:
 *
 *   RUN_DB_INTEGRATION=1 NETLIFY_DATABASE_URL=postgresql://… npx vitest run tests/postgres-integration.test.ts
 */
import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { neon } from "@neondatabase/serverless";
import {
  postgresIntentStore,
  CLAIM_STALE_SECONDS,
  INTENT_RETENTION_DAYS,
} from "@/lib/storage/registrationIntents";
import { SAMPLE_PAYLOAD } from "@/tests/support/fakes";

const enabled = process.env.RUN_DB_INTEGRATION === "1";
const db = process.env.NETLIFY_DATABASE_URL?.trim() || process.env.DATABASE_URL?.trim();

/** Unique per run, so a rerun can never collide with a leftover row. */
const stamp = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
const emailA = `pg-intent-a-${stamp}@example.com`;
const emailB = `pg-intent-b-${stamp}@example.com`;

const created: string[] = [];
/** Built lazily: without a database URL this file must still collect and skip. */
let client: ReturnType<typeof neon> | null = null;
function sql(): ReturnType<typeof neon> {
  if (!client) {
    if (!db) throw new Error("NETLIFY_DATABASE_URL is required for the integration suite");
    client = neon(db);
  }
  return client;
}

async function cleanup(): Promise<void> {
  const ids = [...created];
  created.length = 0;
  for (const id of ids) {
    await sql()`DELETE FROM registration_intents WHERE id = ${id}`;
  }
}

describe.skipIf(!enabled || !db)("postgres intent store (integration)", () => {
  beforeAll(async () => {
    await postgresIntentStore.ensure();
  });

  /* Self-clean after every test, not just at the end: a failing assertion must
   * never leave synthetic drafts sitting in the real database. */
  afterEach(async () => {
    await cleanup();
  });

  afterAll(async () => {
    await cleanup();
  });

  it("creates a draft, finds it by token and by order, and never stores the token", async () => {
    const { intent, token } = await postgresIntentStore.create({
      email: emailA,
      fullName: "Postgres Tester",
      payload: { ...SAMPLE_PAYLOAD, email: emailA, fullName: "Postgres Tester" },
      amount: 500,
    });
    created.push(intent.id);

    expect(token).toHaveLength(43);
    /* The quoted fee is pinned to the draft, so a later price change cannot
     * strand a payment that was made against this quote. */
    expect(intent.quotedAmount).toBe(500);
    expect(intent.state).toBe("awaiting_payment");
    /* JSONB must survive the round-trip intact. */
    expect(intent.payload.email).toBe(emailA);
    expect(intent.payload.committeePref1).toBe(SAMPLE_PAYLOAD.committeePref1);

    const byToken = await postgresIntentStore.findByToken(token);
    expect(byToken?.id).toBe(intent.id);
    /* Only the hash is persisted, so a database leak cannot be replayed. */
    expect(JSON.stringify(byToken)).not.toContain(token);

    const orderId = `pg_order_${stamp}`;
    await postgresIntentStore.bindOrder(intent.id, orderId);
    const byOrder = await postgresIntentStore.findByOrderId(orderId);
    expect(byOrder?.id).toBe(intent.id);
  });

  it("refuses to bind one order to two drafts (partial unique index)", async () => {
    const first = await postgresIntentStore.create({
      email: emailA,
      fullName: "Postgres Tester",
      payload: { ...SAMPLE_PAYLOAD, email: emailA }, amount: 500,
    });
    created.push(first.intent.id);
    const orderId = `pg_dup_${stamp}`;
    await postgresIntentStore.bindOrder(first.intent.id, orderId);

    const second = await postgresIntentStore.create({
      email: emailB,
      fullName: "Postgres Second",
      payload: { ...SAMPLE_PAYLOAD, email: emailB }, amount: 500,
    });
    created.push(second.intent.id);

    await expect(postgresIntentStore.bindOrder(second.intent.id, orderId)).rejects.toThrow();
  });

  it("claims a draft exactly once and replays the settled result", async () => {
    const { intent, token } = await postgresIntentStore.create({
      email: emailA,
      fullName: "Postgres Tester",
      payload: { ...SAMPLE_PAYLOAD, email: emailA }, amount: 500,
    });
    created.push(intent.id);

    const lease = await postgresIntentStore.claimCompletion(intent.id);
    expect(lease).toBeTruthy();
    /* The second writer loses the race instead of double-registering. */
    expect(await postgresIntentStore.claimCompletion(intent.id)).toBeNull();

    await postgresIntentStore.complete(intent.id, lease as string, {
      registrationId: "pg-recd-1",
      paymentStatus: "paid",
      utr: "UTR_PG_1",
      payer: "Postgres Tester",
    });

    const settled = await postgresIntentStore.findByToken(token);
    expect(settled?.state).toBe("completed");
    expect(settled?.registrationId).toBe("pg-recd-1");
    expect(settled?.utr).toBe("UTR_PG_1");
    expect(settled?.completedAt).not.toBe("");
  });

  it("releases a claim that never produced a registration, so a retry can win", async () => {
    const { intent, token } = await postgresIntentStore.create({
      email: emailA,
      fullName: "Postgres Tester",
      payload: { ...SAMPLE_PAYLOAD, email: emailA }, amount: 500,
    });
    created.push(intent.id);

    const lease = await postgresIntentStore.claimCompletion(intent.id);
    expect(lease).toBeTruthy();
    await postgresIntentStore.release(intent.id, lease as string);

    const after = await postgresIntentStore.findByToken(token);
    expect(after?.state).toBe("awaiting_payment");
    /* This is the crash-recovery path the finalizer relies on. */
    expect(await postgresIntentStore.claimCompletion(intent.id)).toBeTruthy();
  });

  it("refuses to let a second writer steal a live lease", async () => {
    const { intent, token } = await postgresIntentStore.create({
      email: emailA,
      fullName: "Postgres Tester",
      payload: { ...SAMPLE_PAYLOAD, email: emailA }, amount: 500,
    });
    created.push(intent.id);

    const lease = await postgresIntentStore.claimCompletion(intent.id);
    expect(lease).toBeTruthy();

    /* A concurrent webhook/poll must not be able to take over or release a
     * claim that is still being written. */
    expect(await postgresIntentStore.claimCompletion(intent.id)).toBeNull();
    await postgresIntentStore.release(intent.id, "not-the-real-token");
    const held = await postgresIntentStore.findByToken(token);
    expect(held?.claimToken).toBe(lease);

    /* …but once the lease has gone stale it can be taken over, so a request
     * that died mid-write never strands a paid delegate. */
    await sql()`
      UPDATE registration_intents
      SET claimed_at = now() - make_interval(secs => ${CLAIM_STALE_SECONDS + 10})
      WHERE id = ${intent.id}
    `;
    expect(await postgresIntentStore.claimCompletion(intent.id)).toBeTruthy();
  });

  it("supersedes an older open draft but leaves it claimable, because it may still be paid", async () => {
    const older = await postgresIntentStore.create({
      email: emailA,
      fullName: "Postgres Tester",
      payload: { ...SAMPLE_PAYLOAD, email: emailA }, amount: 500,
    });
    created.push(older.intent.id);
    const newer = await postgresIntentStore.create({
      email: emailA,
      fullName: "Postgres Tester",
      payload: { ...SAMPLE_PAYLOAD, email: emailA }, amount: 500,
    });
    created.push(newer.intent.id);

    await postgresIntentStore.supersedeOtherOpen(emailA, newer.intent.id);

    const olderRow = (await sql()`
      SELECT state FROM registration_intents WHERE id = ${older.intent.id}
    `) as Array<{ state: string }>;
    expect(olderRow[0]?.state).toBe("superseded");
    expect(await postgresIntentStore.claimCompletion(older.intent.id)).toBeTruthy();
  });

  it("purges settled drafts on schedule but spares still-open ones", async () => {
    const settled = await postgresIntentStore.create({
      email: emailB,
      fullName: "Postgres Second",
      payload: { ...SAMPLE_PAYLOAD, email: emailB }, amount: 500,
    });
    created.push(settled.intent.id);
    await postgresIntentStore.setState(settled.intent.id, "abandoned");

    const open = await postgresIntentStore.create({
      email: emailB,
      fullName: "Postgres Second",
      payload: { ...SAMPLE_PAYLOAD, email: emailB }, amount: 500,
    });
    created.push(open.intent.id);

    /* Backdate both well past the normal retention window. */
    const backdate = INTENT_RETENTION_DAYS + 2;
    await sql()`
      UPDATE registration_intents
      SET created_at = now() - make_interval(days => ${backdate})
      WHERE id IN (${settled.intent.id}, ${open.intent.id})
    `;

    await postgresIntentStore.purgeOlderThan(INTENT_RETENTION_DAYS);

    const rows = (await sql()`
      SELECT id, state FROM registration_intents
      WHERE id IN (${settled.intent.id}, ${open.intent.id})
    `) as Array<{ id: string; state: string }>;

    /* Abandoned draft is gone. */
    expect(rows.map((r) => r.id)).not.toContain(settled.intent.id);
    /* The open one survives: an order the delegate walked away from can still
     * be paid, and these answers are the only way that money becomes a seat. */
    expect(rows.map((r) => r.id)).toContain(open.intent.id);
  });

  it("eventually drops open drafts at the retention ceiling", async () => {
    const open = await postgresIntentStore.create({
      email: emailB,
      fullName: "Postgres Second",
      payload: { ...SAMPLE_PAYLOAD, email: emailB }, amount: 500,
    });
    created.push(open.intent.id);

    const backdate = INTENT_RETENTION_DAYS * 3 + 1;
    await sql()`
      UPDATE registration_intents
      SET created_at = now() - make_interval(days => ${backdate})
      WHERE id = ${open.intent.id}
    `;

    await postgresIntentStore.purgeOlderThan(INTENT_RETENTION_DAYS);

    const rows = (await sql()`
      SELECT id FROM registration_intents WHERE id = ${open.intent.id}
    `) as Array<{ id: string }>;
    expect(rows).toHaveLength(0);
  });

  it("lists only unfinished drafts and counts by state", async () => {
    const open = await postgresIntentStore.create({
      email: emailB,
      fullName: "Postgres Second",
      payload: { ...SAMPLE_PAYLOAD, email: emailB }, amount: 500,
    });
    created.push(open.intent.id);
    const done = await postgresIntentStore.create({
      email: emailB,
      fullName: "Postgres Second",
      payload: { ...SAMPLE_PAYLOAD, email: emailB }, amount: 500,
    });
    created.push(done.intent.id);
    await postgresIntentStore.setState(done.intent.id, "completed");

    const unfinished = await postgresIntentStore.listUnfinished();
    expect(unfinished.map((i) => i.id)).toContain(open.intent.id);
    expect(unfinished.map((i) => i.id)).not.toContain(done.intent.id);

    const counts = await postgresIntentStore.countByState();
    expect(Object.values(counts).reduce((a, b) => a + b, 0)).toBeGreaterThanOrEqual(1);
  });
});

