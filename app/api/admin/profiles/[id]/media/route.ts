import type { NextRequest } from "next/server";
import { jsonError, jsonOk, readAdminSession } from "@/lib/api";
import { listMedia, saveMedia } from "@/lib/cms/media";
import { ensureProfilesSchema } from "@/lib/content/profiles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 3 * 1024 * 1024;
const MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await readAdminSession();
  if (!session) return jsonError("Not authenticated.", 401, { code: "UNAUTHENTICATED" });
  const { id } = await params;
  return jsonOk({ media: await listMedia(id) });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await readAdminSession();
  if (!session) return jsonError("Not authenticated.", 401, { code: "UNAUTHENTICATED" });
  const { id } = await params;
  await ensureProfilesSchema();
  const form = await request.formData();
  const value = form.get("file");
  if (!(value instanceof File)) return jsonError("Choose an image file.", 400, { code: "FILE_REQUIRED" });
  if (!MIME_TYPES.has(value.type)) return jsonError("Only JPEG, PNG, WebP and GIF images are supported.", 415, { code: "UNSUPPORTED_MEDIA_TYPE" });
  if (value.size > MAX_BYTES) return jsonError("Images must be 3 MB or smaller.", 413, { code: "FILE_TOO_LARGE" });
  const asset = await saveMedia({
    profileId: id,
    filename: value.name,
    mimeType: value.type,
    bytes: new Uint8Array(await value.arrayBuffer()),
    createdBy: session.email,
  });
  return jsonOk({ asset }, { status: 201 });
}
