import { neon } from "@neondatabase/serverless";
import { defaultSiteContent, type SiteContent } from "./defaults";

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

async function runEnsure(): Promise<void> {
  const sql = getSql();
  await sql`
    CREATE TABLE IF NOT EXISTS site_content (
      key text PRIMARY KEY,
      value jsonb NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now(),
      updated_by text NOT NULL DEFAULT ''
    )
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

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function mergeDefaults<T>(defaults: T, value: unknown): T {
  if (Array.isArray(defaults)) {
    return (Array.isArray(value) ? value : defaults) as T;
  }
  if (isObject(defaults)) {
    const v = isObject(value) ? value : {};
    const out: Record<string, unknown> = {};
    for (const [k, d] of Object.entries(defaults as Record<string, unknown>)) {
      out[k] = mergeDefaults(d, v[k]);
    }
    return out as T;
  }
  return (value === undefined ? defaults : (value as T));
}

export async function getSiteContent(): Promise<SiteContent> {
  try {
    await ensureSchema();
    const rows = (await getSql()`
      SELECT value FROM site_content WHERE key = 'main' LIMIT 1
    `) as Row[];
    const raw = rows[0]?.value;
    return mergeDefaults(defaultSiteContent, raw);
  } catch {
    return defaultSiteContent;
  }
}

export async function saveSiteContent(
  content: SiteContent,
  updatedBy: string
): Promise<void> {
  await ensureSchema();
  await getSql()`
    INSERT INTO site_content (key, value, updated_at, updated_by)
    VALUES ('main', ${JSON.stringify(content)}::jsonb, now(), ${updatedBy})
    ON CONFLICT (key) DO UPDATE SET
      value = EXCLUDED.value,
      updated_at = now(),
      updated_by = EXCLUDED.updated_by
  `;
}

export function sanitizeSiteContent(input: unknown): SiteContent {
  const c = mergeDefaults(defaultSiteContent, input);
  const trim = (s: unknown, max: number) => String(s ?? "").trim().slice(0, max);
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
    announcement: {
      enabled: Boolean(c.announcement.enabled),
      text: trim(c.announcement.text, 240),
    },
    footerNote: trim(c.footerNote, 120),
    seo: {
      title: trim(c.seo.title, 120),
      description: trim(c.seo.description, 300),
    },
  };
}
