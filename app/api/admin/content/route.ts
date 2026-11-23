import type { NextRequest } from "next/server";
import { jsonError, jsonOk, readAdminSession } from "@/lib/api";
import { getActiveProfile, sanitizeContent, updateProfile } from "@/lib/content/profiles";
import { log } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await readAdminSession();
  if (!session) return jsonError("Not authenticated.", 401, { code: "UNAUTHENTICATED" });
  const profile = await getActiveProfile();
  return jsonOk({ content: profile.content, profile: { id: profile.id, name: profile.name, mode: profile.mode } });
}

export async function PUT(request: NextRequest) {
  const session = await readAdminSession();
  if (!session) return jsonError("Not authenticated.", 401, { code: "UNAUTHENTICATED" });

  const text = await request.text().catch(() => "");
  if (Buffer.byteLength(text, "utf8") > 256 * 1024) {
    return jsonError("Payload too large.", 413, { code: "PAYLOAD_TOO_LARGE" });
  }
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return jsonError("Invalid JSON.", 400, { code: "INVALID_JSON" });
  }

  const active = await getActiveProfile();
  const content = sanitizeContent((raw as { content?: unknown })?.content ?? raw);
  const updated = await updateProfile(active.id, { content }, session.email);
  log.info("site content updated", { by: session.email, profile: active.id });
  return jsonOk({ content: updated?.content ?? content, profile: { id: active.id, name: active.name, mode: active.mode } });
}
