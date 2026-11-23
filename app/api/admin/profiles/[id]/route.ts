import type { NextRequest } from "next/server";
import { jsonError, jsonOk, readAdminSession } from "@/lib/api";
import { deleteProfile, updateProfile } from "@/lib/content/profiles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await readAdminSession();
  if (!session) return jsonError("Not authenticated.", 401, { code: "UNAUTHENTICATED" });
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { name?: string; mode?: "standby" | "full"; content?: unknown };
  const profile = await updateProfile(id, body, session.email);
  if (!profile) return jsonError("Profile not found.", 404, { code: "NOT_FOUND" });
  return jsonOk({ profile });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await readAdminSession();
  if (!session) return jsonError("Not authenticated.", 401, { code: "UNAUTHENTICATED" });
  const { id } = await params;
  const ok = await deleteProfile(id);
  if (!ok) return jsonError("Cannot delete active or missing profile.", 400, { code: "CANNOT_DELETE" });
  return jsonOk({ deleted: true });
}
