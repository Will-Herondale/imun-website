import type { NextRequest } from "next/server";
import {
  MAX_BODY_BYTES,
  registrationDraftSchema,
  sanitizePayload,
  type RegistrationInput,
} from "@/lib/validation/registration";
import { feeAmountFor } from "@/lib/config/site";
import { createPaymentOrder, famgatewayConfigured } from "@/lib/payments/famgateway";
import { intentStore, INTENT_RETENTION_DAYS } from "@/lib/storage/registrationIntents";
import { isRegistrationOpen } from "@/lib/registration-control";
import { checkRateLimit, LIMITS } from "@/lib/security/rateLimit";
import { clientIpFrom } from "@/lib/utils/request";
import { jsonError, jsonOk } from "@/lib/api";
import { log } from "@/lib/log";
import { isMaintenance, maintenanceJsonResponse } from "@/lib/maintenance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_TOKEN = 128;

function siteOrigin(request: NextRequest): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");
  return new URL(request.url).origin;
}

/**
 * Rejects cross-site form posts.
 *
 * The route only accepts JSON, which browsers will not send cross-origin
 * without a CORS preflight this app never answers — this is belt-and-braces
 * against CSRF and against a leaked token being replayed from elsewhere. The
 * check is skipped when no Origin header is present (non-browser clients).
 */
function crossOriginPost(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  const expected = new URL(siteOrigin(request)).host;
  try {
    return new URL(origin).host !== expected;
  } catch {
    return true;
  }
}

/**
 * Step 1 of registration: store the delegate's answers and open a payment.
 *
 * The answers are validated and persisted *before* the delegate leaves for the
 * checkout, so the payment itself is enough to complete the registration later
 * — no browser round-trip required. See lib/storage/registrationIntents.ts.
 */
export async function POST(request: NextRequest) {
  if (isMaintenance()) {
    return maintenanceJsonResponse();
  }

  if (!isRegistrationOpen()) {
    return jsonError("Registration is currently closed. Please check back after the form reopens.", 409, {
      code: "REGISTRATION_CLOSED",
    });
  }

  const ip = clientIpFrom(request);
  const rl = checkRateLimit(`reg:intent:${ip}`, LIMITS.registrations.limit, LIMITS.registrations.windowMs);
  if (!rl.allowed) {
    return jsonError("You have submitted this form too many times. Please wait a few minutes and try again.", 429, {
      code: "RATE_LIMITED",
      retryAfterSeconds: Math.max(1, rl.retryAfterSeconds),
    });
  }

  /*
   * Backstop against a client that rotates its `X-Forwarded-For` header to slip
   * past the per-IP limit above: every accepted intent costs one stored PII row
   * and one real FamGateway order, so cap the site-wide rate too. Sized far
   * above a genuine registration rush.
   */
  const globalRl = checkRateLimit("reg:intent:global", LIMITS.intents.limit, LIMITS.intents.windowMs);
  if (!globalRl.allowed) {
    log.warn("global intent rate limit hit");
    return jsonError("Registration is receiving an unusual number of requests. Please try again shortly.", 429, {
      code: "RATE_LIMITED",
      retryAfterSeconds: Math.max(1, globalRl.retryAfterSeconds),
    });
  }

  if (crossOriginPost(request)) {
    return jsonError("Request origin could not be verified.", 403, { code: "BAD_ORIGIN" });
  }

  if (!famgatewayConfigured()) {
    return jsonError("Automated payment is temporarily unavailable.", 503, {
      code: "PAYMENTS_UNAVAILABLE",
    });
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return jsonError("This endpoint expects a JSON body.", 415, { code: "UNSUPPORTED_MEDIA" });
  }

  const rawText = await request.text().catch(() => "");
  if (Buffer.byteLength(rawText, "utf8") > MAX_BODY_BYTES) {
    return jsonError("Request body is too large.", 413, { code: "PAYLOAD_TOO_LARGE" });
  }

  let raw: unknown;
  try {
    raw = JSON.parse(rawText);
  } catch {
    return jsonError("Request body is not valid JSON.", 400, { code: "INVALID_JSON" });
  }

  const sanitized = sanitizePayload(
    raw !== null && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : null
  );
  const parsed = registrationDraftSchema.safeParse(sanitized);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".");
      if (key && !fields[key]) fields[key] = issue.message;
    }
    return jsonError("One or more fields are invalid.", 422, { code: "VALIDATION_ERROR", fields });
  }

  const data = parsed.data;
  const quoted = feeAmountFor();

  /** Honeypot: bots fill hidden fields. Respond positively, persist nothing. */
  if (data.website) {
    log.info("registration honeypot triggered", { ip });
    return jsonOk({ accepted: true }, { status: 201 });
  }

  const payload: RegistrationInput = {
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
    paymentOrderId: "",
    paymentReference: "",
    declarationAccurate: "Yes",
    declarationRules: "Yes",
  };

  /* One open payment per delegate: a second attempt retires the first. */
  const emailRl = checkRateLimit(
    `reg:intent:email:${data.email}`,
    LIMITS.registrations.limit,
    LIMITS.registrations.windowMs
  );
  if (!emailRl.allowed) {
    return jsonError(
      "You have started too many registrations for this email address. Please try again shortly.",
      429,
      { code: "RATE_LIMITED", retryAfterSeconds: Math.max(1, emailRl.retryAfterSeconds) }
    );
  }

  const drafts = intentStore();
  let intentId: string;
  let token: string;
  try {
    const created = await drafts.create({ email: data.email, fullName: data.fullName, payload, amount: quoted });
    intentId = created.intent.id;
    token = created.token;
    await drafts.supersedeOtherOpen(data.email, intentId);
  } catch (err) {
    log.error("intent store failure", { error: err instanceof Error ? err.name : "unknown" });
    return jsonError("We could not save your details right now. Please try again shortly.", 503, {
      code: "STORAGE_UNAVAILABLE",
    });
  }

  const origin = siteOrigin(request);

  try {
    const order = await createPaymentOrder(quoted, {
      customerName: data.fullName,
      /* The return page carries the resume token, so a delegate who closes the
       * tab can still land back on their own registration. */
      redirectUrl: `${origin}/registration/complete?token=${encodeURIComponent(token)}`,
      webhookUrl: `${origin}/api/payments/webhook`,
    });

    /* istanbul ignore next — createPaymentOrder returns null rather than throwing. */
    if (!order) {
      await drafts.setState(intentId, "abandoned").catch(() => undefined);
      return jsonError("We could not start the payment right now. Please try again shortly.", 502, {
        code: "PAYMENT_CREATE_FAILED",
      });
    }

    await drafts.bindOrder(intentId, order.orderId);

    /* Opportunistic housekeeping — answers are personal data. */
    void drafts
      .purgeOlderThan(INTENT_RETENTION_DAYS)
      .catch(() => undefined);

    log.info("registration intent created", { orderId: order.orderId });

    return jsonOk(
      {
        token,
        orderId: order.orderId,
        amount: order.amount,
        payableAmount: order.payableAmount,
        checkoutUrl: order.checkoutUrl,
      },
      { status: 201 }
    );
  } catch (err) {
    log.error("payment order creation failed", { error: err instanceof Error ? err.name : "unknown" });
    await drafts.setState(intentId, "abandoned").catch(() => undefined);
    return jsonError("We could not start the payment right now. Please try again shortly.", 502, {
      code: "PAYMENT_CREATE_FAILED",
    });
  }
}

/**
 * Reads back a stored draft so a delegate who abandoned (or never finished)
 * checkout can resume instead of retyping everything.
 *
 * Read-only: it never finalises anything, it just hands the delegate's own
 * answers back to their own browser. The unguessable token is the only
 * credential, so the response is sent no-store / no-referrer.
 */
export async function GET(request: NextRequest) {
  if (isMaintenance()) {
    return maintenanceJsonResponse();
  }

  const ip = clientIpFrom(request);
  const rl = checkRateLimit(`reg:intent:read:${ip}`, LIMITS.intents.limit, LIMITS.intents.windowMs);
  if (!rl.allowed) {
    return jsonError("Too many requests. Please wait a moment.", 429, {
      code: "RATE_LIMITED",
      retryAfterSeconds: Math.max(1, rl.retryAfterSeconds),
    });
  }

  const token = (new URL(request.url).searchParams.get("token") ?? "").trim().slice(0, MAX_TOKEN);
  if (!token) {
    return jsonError("This link is incomplete.", 400, { code: "MISSING_TOKEN" });
  }

  let intent;
  try {
    intent = await intentStore().findByToken(token);
  } catch {
    return jsonError("We could not load that registration right now. Please try again shortly.", 503, {
      code: "STORAGE_UNAVAILABLE",
    });
  }

  if (!intent) {
    return jsonError("We could not find that registration link.", 404, { code: "NO_SUCH_INTENT" });
  }

  return jsonOk(
    {
      state: intent.state,
      registered: intent.state === "completed" && Boolean(intent.registrationId),
      fullName: intent.fullName,
      email: intent.email,
      draft: intent.payload,
      createdAt: intent.createdAt,
    },
    { headers: { "Cache-Control": "no-store, max-age=0", "Referrer-Policy": "no-referrer" } }
  );
}