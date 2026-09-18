import { jsonError, jsonOk, readAdminSession } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await readAdminSession();
  if (!session) return jsonError("Not authenticated.", 401, { code: "UNAUTHENTICATED" });
  return jsonOk({ authenticated: true, email: session.email, csrf: session.csrf });
}