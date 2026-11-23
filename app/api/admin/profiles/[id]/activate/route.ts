import type { NextRequest } from "next/server";
import { jsonError, jsonOk, readAdminSession } from "@/lib/api";
import { activateProfile } from "@/lib/content/profiles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await readAdminSession();
  if (!session) return jsonError("Not authenticated.", 401, { code: "UNAUTHENTICATED" });
  const { id } = await params;
  const ok = await activateProfile(id, session.email);
  if (!ok) return jsonError("Profile not found.", 404, { code: "NOT_FOUND" });
  return jsonOk({ activeId: id });
}
