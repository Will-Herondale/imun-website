import type { NextRequest } from "next/server";
import { readAdminSession, jsonError, jsonOk } from "@/lib/api";
import { activeStore } from "@/lib/storage";
import { orphanStore } from "@/lib/storage/paymentOrphans";
import { filterRegistrations, paginate, type AdminQuery } from "@/lib/admin-filter";
import {
  MAX_BODY_BYTES,
  adminRegistrationSchema,
  sanitizePayload,
  type PaymentFields,
  type RegistrationInput,
} from "@/lib/validation/registration";
import { log } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await readAdminSession();
  if (!session) return jsonError("Not authenticated.", 401, { code: "UNAUTHENTICATED" });

  const params = request.nextUrl.searchParams;
  const query: AdminQuery = {
    search: params.get("search") ?? undefined,
    committee: params.get("committee") ?? undefined,
    status: params.get("status") ?? undefined,
    sort: params.get("sort") ?? undefined,
    dir: params.get("dir") === "asc" ? "asc" : "desc",
  };
  const page = Number(params.get("page") ?? 1);
  const pageSize = Number(params.get("pageSize") ?? 25);

  try {
    const rows = await activeStore().list();
    const filtered = filterRegistrations(rows, query);
    const result = paginate(filtered, page, pageSize);
    // `grandTotal` is the unfiltered count, so the dashboard can tell "nothing
    // registered yet" apart from "nothing matches the current filters".
    // Orphans are payments received without a linked registration; flagging
    // them is the whole point of the reconciliation list.
    const [orphans, orphanCount] = await Promise.all([
      orphanStore().listUnresolved().catch(() => []),
      orphanStore().countUnresolved().catch(() => 0),
    ]);
    return jsonOk({ ...result, grandTotal: rows.length, orphans, orphanCount });
  } catch (err) {
    log.error("admin list failed", { error: err instanceof Error ? err.name : "unknown" });
    return jsonError("Could not load registrations.", 503, { code: "STORAGE_UNAVAILABLE" });
  }
}

/**
 * Adds a delegate the secretariat has already registered out of band (a bank
 * transfer, a walk-in, someone who never completed the form).
 *
 * This is the single sanctioned way to create a row without a verified
 * FamGateway payment, and it is behind the admin session: the organiser has
 * seen the credit themselves. It does NOT open the public form — that path
 * still requires a verified payment (see `app/api/registrations/route.ts`).
 */
export async function POST(request: NextRequest) {
  const session = await readAdminSession();
  if (!session) return jsonError("Not authenticated.", 401, { code: "UNAUTHENTICATED" });

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return jsonError("This endpoint expects a JSON body.", 415, { code: "UNSUPPORTED_MEDIA" });
  }

  const rawText = await request.text().catch(() => "");
  if (!rawText.trim() || Buffer.byteLength(rawText, "utf8") > MAX_BODY_BYTES) {
    return jsonError("Invalid request.", 400, { code: "BAD_REQUEST" });
  }

  let raw: unknown;
  try {
    raw = JSON.parse(rawText);
  } catch {
    return jsonError("Invalid JSON.", 400, { code: "INVALID_JSON" });
  }

  const sanitized = sanitizePayload(
    raw !== null && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : null
  );
  const parsed = adminRegistrationSchema.safeParse(sanitized);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".") || "form";
      if (!fields[key]) fields[key] = issue.message;
    }
    return jsonError("Check the highlighted fields.", 422, { code: "VALIDATION", fields });
  }

  const data = parsed.data;
  const input: RegistrationInput = {
    fullName: data.fullName,
    email: data.email,
    contactNumber: data.contactNumber,
    schoolName: data.schoolName,
    grade: data.grade,
    munCount: data.munCount,
    munHistory: data.munHistory,
    committeePref1: data.committeePref1,
    committeePref2: data.committeePref2,
    committeePref3: data.committeePref3,
    countryPreference: data.countryPreference,
    specialRequest: data.specialRequest,
    // No order id: the organiser confirmed this money outside the gateway.
    paymentOrderId: "",
    paymentReference: "",
    declarationAccurate: "Yes",
    declarationRules: "Yes",
  };
  const payment: PaymentFields = {
    paymentStatus: data.paymentStatus,
    paymentOrderId: "",
    paymentUtr: data.paymentUtr,
    paymentPayer: data.paymentPayer,
    paidAt: data.paymentStatus === "paid" ? new Date().toISOString() : "",
  };

  try {
    const result = await activeStore().create(input, payment);
    // The store never writes a second row for an email it already has.
    if (result.duplicate) {
      return jsonError("That email already has a registration.", 409, {
        code: "DUPLICATE_EMAIL",
        existingId: result.record.id,
      });
    }
    log.info("registration added from admin console", {
      id: result.record.id,
      email: result.record.email,
      paymentStatus: result.record.paymentStatus,
      by: session.email,
    });
    return jsonOk({ record: result.record }, { status: 201 });
  } catch (err) {
    log.error("admin create failed", { error: err instanceof Error ? err.name : "unknown" });
    return jsonError("Could not save the registration.", 503, { code: "STORAGE_UNAVAILABLE" });
  }
}