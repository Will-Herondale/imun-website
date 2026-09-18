import type { NextRequest } from "next/server";
import { clearSessionCookie, jsonOk } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  void request;
  return clearSessionCookie(jsonOk({ authenticated: false }));
}