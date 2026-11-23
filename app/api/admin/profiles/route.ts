import type { NextRequest } from "next/server";
import { jsonError, jsonOk, readAdminSession } from "@/lib/api";
import { createProfile, listProfiles } from "@/lib/content/profiles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await readAdminSession();
  if (!session) return jsonError("Not authenticated.", 401, { code: "UNAUTHENTICATED" });
  return jsonOk(await listProfiles());
}

export async function POST(req: NextRequest) {
  const session = await readAdminSession();
  if (!session) return jsonError("Not authenticated.", 401, { code: "UNAUTHENTICATED" });
  const body = (await req.json().catch(() => ({}))) as { name?: string; mode?: "standby" | "full"; fromId?: string; content?: unknown };
  const profile = await createProfile(
    { name: body.name ?? "New profile", mode: body.mode === "full" ? "full" : "standby", fromId: body.fromId, content: body.content },
    session.email
  );
  return jsonOk({ profile }, { status: 201 });
}
