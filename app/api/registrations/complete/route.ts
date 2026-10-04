import type { NextRequest } from "next/server";
import { intentStore } from "@/lib/storage/registrationIntents";
import { jsonError, jsonOk } from "@/lib/api";
import { finalizeFromOrderId } from "@/lib/registrations/finalize";
import { feeAmountFor } from "@/lib/config/site";
import { checkRateLimit, LIMITS } from "@/lib/security/rateLimit";
import { clientIpFrom } from "@/lib/utils/request";
import { isMaintenance, maintenanceJsonResponse } from "@/lib/maintenance";
import { log } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Poll ceiling: ~4 checks/second sustained for 10 minutes. */
const MAX_TOKEN = 128;

/** A confirmation poll only ever carries a token. */
const MAX_BODY_BYTES = 1024;

/** States this endpoint reports back to the confirmation page. */
type CompleteResponseState =
  | "registered"
  | "checking"
  | "awaiting_payment"
  | "payment_expired"
  | "superseded"
  | "amount_mismatch";

/**
 * Reads the resume token from the JSON body, falling back to the query string.
 *
 * The token is the only credential this endpoint has, so it is length-capped
 * before it ever reaches the database.
 */
async function readToken(request: NextRequest): Promise<string> {
  /* Check the declared length before buffering: this endpoint is unauthenticated
   * apart from the token, so it must not let a caller make the server hold an
   * arbitrary body. */
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
    return "";
  }
  const body = await request.json().catch(() => null) as { token?: unknown } | null;
  if (body && typeof body.token === "string") return body.token.trim().slice(0, MAX_TOKEN);
  return (new URL(request.url).searchParams.get("token") ?? "").trim().slice(0, MAX_TOKEN);
}

/**
 * Step 2 of registration: confirm the payment and report the outcome.
 *
 * Called by the delegate's return page. The webhook is the primary finaliser;
 * this endpoint is the fallback that also works — it re-verifies the order
 * server-side and writes the registration from the stored draft, so the
 * delegate never has to trust their own browser to finish the job.
 *
 * Idempotent by construction: repeated calls return the same answer, and the
 * draft's atomic claim guarantees a single registration row.
 */
async function handler(request: NextRequest): Promise<Response> {
  if (isMaintenance()) {
    return maintenanceJsonResponse();
  }

  const ip = clientIpFrom(request);
  const ipLimit = checkRateLimit(`reg:complete:${ip}`, LIMITS.intents.limit, LIMITS.intents.windowMs);
  if (!ipLimit.allowed) {
    return jsonError("Too many checks. Please wait a moment.", 429, {
      code: "RATE_LIMITED",
      retryAfterSeconds: Math.max(1, ipLimit.retryAfterSeconds),
    });
  }

  const contentType = request.headers.get("content-type") ?? "";
  /* JSON is the documented shape; the query fallback keeps the endpoint usable
   * from a plain link (and is what a cached navigation would hit). */
  if (contentType && !contentType.toLowerCase().includes("application/json") && !new URL(request.url).searchParams.get("token")) {
    return jsonError("This endpoint expects a JSON body.", 415, { code: "UNSUPPORTED_MEDIA" });
  }

  const token = await readToken(request);
  if (!token) {
    return jsonError("This link is incomplete.", 400, { code: "MISSING_TOKEN" });
  }

  const tokenLimit = checkRateLimit(`reg:complete:token:${token}`, LIMITS.intents.limit, LIMITS.intents.windowMs);
  if (!tokenLimit.allowed) {
    return jsonError("Too many checks for this registration link.", 429, {
      code: "RATE_LIMITED",
      retryAfterSeconds: Math.max(1, tokenLimit.retryAfterSeconds),
    });
  }

  let intent;
  try {
    intent = await intentStore().findByToken(token);
  } catch (err) {
    log.error("intent lookup failed", { error: err instanceof Error ? err.name : "unknown" });
    return jsonError("We could not check that registration right now. Please try again shortly.", 503, {
      code: "STORAGE_UNAVAILABLE",
    });
  }

  if (!intent) {
    return jsonError("We could not find that registration link.", 404, { code: "NO_SUCH_INTENT" });
  }

  const summary = {
    email: intent.email,
    fullName: intent.fullName,
    feeAmount: feeAmountFor(),
  };

  /* A finished draft needs no gateway round-trip. */
  if (intent.state === "completed" && intent.registrationId) {
    return jsonOk({
      ...summary,
      state: "registered",
      registrationId: intent.registrationId,
      paymentStatus: intent.paymentStatus || "paid",
      utr: intent.utr,
    });
  }

  /* A retired draft whose order never opened cannot be paid — nothing to check. */
  if (intent.state === "superseded" && !intent.orderId) {
    return jsonOk({ ...summary, state: "superseded" });
  }
  if (intent.state === "payment_expired" && !intent.orderId) {
    return jsonOk({ ...summary, state: "payment_expired" });
  }

  if (!intent.orderId) {
    /* Created but the order never opened — treat as retryable. */
    return jsonOk({ ...summary, state: "checking" });
  }

  /*
   * Superseded drafts are still verified on purpose: the delegate may have paid
   * the earlier order before starting again, and money that arrived must become
   * a registration. Only an unpaid retired order is reported back as retired.
   */
  const outcome = await finalizeFromOrderId(intent.orderId);

  switch (outcome.status) {
    case "registered":
      return jsonOk({
        ...summary,
        state: "registered",
        registrationId: outcome.registrationId,
        paymentStatus: outcome.paymentStatus,
        utr: outcome.utr,
      });
    case "pending_payment": {
      /* Only a gateway-confirmed-unpaid order reports as retired; anything else
       * is still legitimately in flight. */
      const state: CompleteResponseState =
        intent.state === "superseded"
          ? "superseded"
          : intent.state === "payment_expired"
            ? "payment_expired"
            : "awaiting_payment";
      return jsonOk({ ...summary, state });
    }
    case "payment_expired":
      return jsonOk({ ...summary, state: "payment_expired" });
    case "amount_mismatch":
      return jsonOk({
        ...summary,
        state: "amount_mismatch",
        received: outcome.amount,
        expected: outcome.expected,
      });
    default:
      /* Transient problem — the delegate should keep waiting, and the webhook
       * will land the registration even if this poll never succeeds. */
      return jsonOk({ ...summary, state: "checking" });
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  return handler(request);
}

export async function GET(request: NextRequest): Promise<Response> {
  const response = await handler(request);
  /* Never let a token-bearing response be cached by a proxy or the back button. */
  response.headers.set("Cache-Control", "no-store, max-age=0");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}