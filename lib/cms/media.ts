import { neon } from "@neondatabase/serverless";
import { randomUUID } from "node:crypto";
import { ensureProfilesSchema } from "@/lib/content/profiles";

type Sql = ReturnType<typeof neon>;
type Row = Record<string, unknown>;

let client: Sql | null = null;

function getSql(): Sql {
  const url =
    process.env.NETLIFY_DATABASE_URL?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    process.env.POSTGRES_URL?.trim();
  if (!url) throw new Error("Postgres is not configured.");
  if (!client) client = neon(url);
  return client;
}

export type MediaAsset = {
  id: string;
  profileId: string;
  filename: string;
  mimeType: string;
  byteSize: number;
  createdAt: string;
  createdBy: string;
  url: string;
};

function toAsset(row: Row): MediaAsset {
  const id = String(row.id);
  return {
    id,
    profileId: String(row.profile_id),
    filename: String(row.filename),
    mimeType: String(row.mime_type),
    byteSize: Number(row.byte_size),
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at ?? ""),
    createdBy: String(row.created_by ?? ""),
    url: `/api/media/${id}`,
  };
}

export async function saveMedia(input: {
  profileId: string;
  filename: string;
  mimeType: string;
  bytes: Uint8Array;
  createdBy: string;
}): Promise<MediaAsset> {
  await ensureProfilesSchema();
  const id = randomUUID();
  const base64 = Buffer.from(input.bytes).toString("base64");
  await getSql()`
    INSERT INTO site_media (id, profile_id, filename, mime_type, byte_size, file_data, created_by)
    VALUES (${id}, ${input.profileId}, ${input.filename.slice(0, 180)}, ${input.mimeType}, ${input.bytes.byteLength}, ${base64}, ${input.createdBy})
  `;
  return {
    id,
    profileId: input.profileId,
    filename: input.filename.slice(0, 180),
    mimeType: input.mimeType,
    byteSize: input.bytes.byteLength,
    createdAt: new Date().toISOString(),
    createdBy: input.createdBy,
    url: `/api/media/${id}`,
  };
}

export async function listMedia(profileId: string): Promise<MediaAsset[]> {
  await ensureProfilesSchema();
  const rows = (await getSql()`
    SELECT id, profile_id, filename, mime_type, byte_size, created_at, created_by
    FROM site_media WHERE profile_id = ${profileId} ORDER BY created_at DESC
  `) as Row[];
  return rows.map(toAsset);
}

export async function readMedia(id: string): Promise<{ mimeType: string; filename: string; base64: string } | null> {
  await ensureProfilesSchema();
  const rows = (await getSql()`
    SELECT mime_type, filename, file_data FROM site_media WHERE id = ${id} LIMIT 1
  `) as Row[];
  if (!rows[0]) return null;
  return {
    mimeType: String(rows[0].mime_type),
    filename: String(rows[0].filename),
    base64: String(rows[0].file_data),
  };
}
