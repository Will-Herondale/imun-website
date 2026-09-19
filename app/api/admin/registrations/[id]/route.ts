import type { NextRequest } from "next/server";
import { readAdminSession, jsonError, jsonOk } from "@/lib/api";
import { activeStore } from "@/lib/storage";
import { allocationUpdateSchema } from "@/lib/validation/registration";
import { log } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 8 * 1024;

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await readAdminSession();
  if (!session) return jsonError("Not authenticated.", 401, { code: "UNAUTHENTICATED" });

  const { id } = await params;
  try {
    const record = await activeStore().findById(id);
    if (!record) return jsonError("Registration not found.", 404, { code: "NOT_FOUND" });
    return jsonOk({ record });
  } catch (err) {
    log.error("admin detail failed", { error: err instanceof Error ? err.name : "unknown" });
    return jsonError("Could not load the registration.", 503, { code: "STORAGE_UNAVAILABLE" });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await readAdminSession();
  if (!session) return jsonError("Not authenticated.", 401, { code: "UNAUTHENTICATED" });

  const { id } = await params;
  const text = await request.text().catch(() => "");
  if (!text.trim() || Buffer.byteLength(text, "utf8") > MAX_BODY_BYTES) {
    return jsonError("Invalid request.", 400, { code: "BAD_REQUEST" });
  }

  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return jsonError("Invalid JSON.", 400, { code: "INVALID_JSON" });
  }

  const parsed = allocationUpdateSchema.safeParse(raw);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      if (!fields[key]) fields[key] = issue.message;
    }
    return jsonError("Check the highlighted fields.", 422, { code: "VALIDATION", fields });
  }

  try {
    const record = await activeStore().update(id, parsed.data);
    if (!record) return jsonError("Registration not found.", 404, { code: "NOT_FOUND" });
    return jsonOk({ record });
  } catch (err) {
    log.error("admin allocation update failed", { error: err instanceof Error ? err.name : "unknown" });
    return jsonError("Could not save the allocation.", 503, { code: "STORAGE_UNAVAILABLE" });
  }
}