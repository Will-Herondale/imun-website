import { neon } from "@neondatabase/serverless";
import { randomUUID } from "node:crypto";
import { defaultSiteContent, type SiteContent } from "./defaults";

export type ProfileMode = "standby" | "full";

export type SiteProfile = {
  id: string;
  name: string;
  mode: ProfileMode;
  content: SiteContent; // standby/home/contact/seo content
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
};

type Sql = ReturnType<typeof neon>;
type Row = Record<string, unknown>;

let client: Sql | null = null;
let ensurePromise: Promise<void> | null = null;

function connectionString(): string {
  const url =
    process.env.NETLIFY_DATABASE_URL?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    process.env.POSTGRES_URL?.trim();
  if (!url) throw new Error("Postgres is not configured.");
  return url;
}
function getSql(): Sql {
  if (!client) client = neon(connectionString());
  return client;
}

async function runEnsure(): Promise<void> {
  const sql = getSql();
  await sql`
    CREATE TABLE IF NOT EXISTS site_profiles (
      id uuid PRIMARY KEY,
      name text NOT NULL,
      mode text NOT NULL DEFAULT 'standby',
      is_active boolean NOT NULL DEFAULT false,
      data jsonb NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      updated_by text NOT NULL DEFAULT ''
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS site_profiles_active_idx ON site_profiles (is_active)`;
  // Migrate legacy site_content into a profile if profiles empty
  const countRows = (await sql`SELECT count(*)::int AS n FROM site_profiles`) as Row[];
  const n = Number(countRows[0]?.n ?? 0);
  if (n === 0) {
    const legacy = (await sql`SELECT value FROM site_content WHERE key='main' LIMIT 1`) as Row[];
    const legacyContent = legacy[0]?.value ?? defaultSiteContent;
    const standbyId = randomUUID();
    const fullId = randomUUID();
    const now = new Date().toISOString();
    await sql`
      INSERT INTO site_profiles (id, name, mode, is_active, data, created_at, updated_at, updated_by)
      VALUES (${standbyId}, ${"Standby (current)"}, ${"standby"}, true, ${JSON.stringify(legacyContent)}::jsonb, ${now}, ${now}, ${"system"})
    `;
    await sql`
      INSERT INTO site_profiles (id, name, mode, is_active, data, created_at, updated_at, updated_by)
      VALUES (${fullId}, ${"Full 2026 site"}, ${"full"}, false, ${JSON.stringify(defaultSiteContent)}::jsonb, ${now}, ${now}, ${"system"})
    `;
  }
}

async function ensureSchema(): Promise<void> {
  if (!ensurePromise) {
    ensurePromise = runEnsure().catch((e) => {
      ensurePromise = null;
      throw e;
    });
  }
  return ensurePromise;
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
function mergeDefaults<T>(defaults: T, value: unknown): T {
  if (Array.isArray(defaults)) return (Array.isArray(value) ? value : defaults) as T;
  if (isObject(defaults)) {
    const v = isObject(value) ? value : {};
    const out: Record<string, unknown> = {};
    for (const [k, d] of Object.entries(defaults as Record<string, unknown>)) out[k] = mergeDefaults(d, v[k]);
    return out as T;
  }
  return (value === undefined ? defaults : (value as T)) as T;
}

function trim(s: unknown, max: number) {
  return String(s ?? "").trim().slice(0, max);
}
export function sanitizeContent(input: unknown): SiteContent {
  const c = mergeDefaults(defaultSiteContent, input);
  return {
    standby: {
      kicker: trim(c.standby.kicker, 80),
      headline: trim(c.standby.headline, 120),
      headlineAccent: trim(c.standby.headlineAccent, 120),
      body: trim(c.standby.body, 800),
      ctaLabel: trim(c.standby.ctaLabel, 60),
      ctaHref: trim(c.standby.ctaHref, 300),
      statusLabel: trim(c.standby.statusLabel, 80),
    },
    contact: {
      email: trim(c.contact.email, 120),
      phone: trim(c.contact.phone, 40),
      instagram: trim(c.contact.instagram, 200),
    },
    announcement: { enabled: Boolean(c.announcement.enabled), text: trim(c.announcement.text, 240) },
    footerNote: trim(c.footerNote, 120),
    seo: { title: trim(c.seo.title, 120), description: trim(c.seo.description, 300) },
  };
}

function rowToProfile(row: Row): SiteProfile {
  return {
    id: String(row.id),
    name: String(row.name ?? ""),
    mode: (String(row.mode) === "full" ? "full" : "standby") as ProfileMode,
    content: sanitizeContent(row.data),
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at ?? ""),
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at ?? ""),
    updatedBy: String(row.updated_by ?? ""),
  };
}

export async function listProfiles(): Promise<{ profiles: SiteProfile[]; activeId: string | null }> {
  await ensureSchema();
  const rows = (await getSql()`SELECT * FROM site_profiles ORDER BY created_at ASC`) as Row[];
  const profiles = rows.map(rowToProfile);
  const active = rows.find((r) => r.is_active === true);
  return { profiles, activeId: active ? String(active.id) : profiles[0]?.id ?? null };
}

export async function getActiveProfile(): Promise<SiteProfile> {
  try {
    await ensureSchema();
    const rows = (await getSql()`SELECT * FROM site_profiles WHERE is_active = true LIMIT 1`) as Row[];
    if (rows[0]) return rowToProfile(rows[0]);
    const any = (await getSql()`SELECT * FROM site_profiles ORDER BY created_at ASC LIMIT 1`) as Row[];
    if (any[0]) return rowToProfile(any[0]);
  } catch {
    /* fall through */
  }
  return {
    id: "default",
    name: "Standby",
    mode: "standby",
    content: defaultSiteContent,
    createdAt: "",
    updatedAt: "",
    updatedBy: "",
  };
}

export async function createProfile(input: { name: string; mode: ProfileMode; content?: unknown; fromId?: string }, by: string): Promise<SiteProfile> {
  await ensureSchema();
  let content = sanitizeContent(input.content ?? defaultSiteContent);
  if (input.fromId) {
    const src = (await getSql()`SELECT data FROM site_profiles WHERE id=${input.fromId} LIMIT 1`) as Row[];
    if (src[0]) content = sanitizeContent(src[0].data);
  }
  const id = randomUUID();
  const now = new Date().toISOString();
  await getSql()`
    INSERT INTO site_profiles (id, name, mode, is_active, data, created_at, updated_at, updated_by)
    VALUES (${id}, ${trim(input.name, 80) || "New profile"}, ${input.mode === "full" ? "full" : "standby"}, false, ${JSON.stringify(content)}::jsonb, ${now}, ${now}, ${by})
  `;
  return { id, name: trim(input.name, 80) || "New profile", mode: input.mode, content, createdAt: now, updatedAt: now, updatedBy: by };
}

export async function updateProfile(id: string, patch: { name?: string; mode?: ProfileMode; content?: unknown }, by: string): Promise<SiteProfile | null> {
  await ensureSchema();
  const rows = (await getSql()`SELECT * FROM site_profiles WHERE id=${id} LIMIT 1`) as Row[];
  if (!rows[0]) return null;
  const existing = rowToProfile(rows[0]);
  const next: SiteProfile = {
    ...existing,
    name: patch.name !== undefined ? trim(patch.name, 80) : existing.name,
    mode: patch.mode !== undefined ? (patch.mode === "full" ? "full" : "standby") : existing.mode,
    content: patch.content !== undefined ? sanitizeContent(patch.content) : existing.content,
    updatedAt: new Date().toISOString(),
    updatedBy: by,
  };
  await getSql()`
    UPDATE site_profiles SET name=${next.name}, mode=${next.mode}, data=${JSON.stringify(next.content)}::jsonb, updated_at=${next.updatedAt}, updated_by=${by}
    WHERE id=${id}
  `;
  return next;
}

export async function activateProfile(id: string, by: string): Promise<boolean> {
  await ensureSchema();
  const rows = (await getSql()`SELECT id FROM site_profiles WHERE id=${id} LIMIT 1`) as Row[];
  if (!rows[0]) return false;
  await getSql()`UPDATE site_profiles SET is_active=false`;
  await getSql()`UPDATE site_profiles SET is_active=true, updated_at=now(), updated_by=${by} WHERE id=${id}`;
  return true;
}

export async function deleteProfile(id: string): Promise<boolean> {
  await ensureSchema();
  const rows = (await getSql()`SELECT is_active FROM site_profiles WHERE id=${id} LIMIT 1`) as Row[];
  if (!rows[0]) return false;
  if (rows[0].is_active) return false; // cannot delete active
  await getSql()`DELETE FROM site_profiles WHERE id=${id}`;
  return true;
}
