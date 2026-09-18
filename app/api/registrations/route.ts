import type { NextRequest } from "next/server";
import {
  MAX_BODY_BYTES,
  registrationSchema,
  sanitizePayload,
} from "@/lib/validation/registration";
import { activeStore } from "@/lib/storage/registrationTable";
import { isRegistrationOpen } from "@/lib/registration-control";
import { checkRateLimit, LIMITS } from "@/lib/security/rateLimit";
import { clientIpFrom } from "@/lib/utils/request";
import { jsonError, jsonOk } from "@/lib/api";
import { log } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!isRegistrationOpen()) {
    return jsonError("Registration is currently closed. Please check back after the form reopens.", 409, {
      code: "REGISTRATION_CLOSED",
    });
  }

  const ip = clientIpFrom(request);
  const rl = checkRateLimit(
    `reg:${ip}`,
    LIMITS.registrations.limit,
    LIMITS.registrations.windowMs
  );
  if (!rl.allowed) {
    return jsonError("You have submitted this form too many times. Please wait a few minutes and try again.", 429, {
      code: "RATE_LIMITED",
      retryAfterSeconds: Math.max(1, rl.retryAfterSeconds),
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

  /* Server-side sanitisation of every string field before validation. */
  const sanitized = sanitizePayload(
    raw !== null && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : null
  );
  const parsed = registrationSchema.safeParse(sanitized);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".");
      if (key && !fields[key]) fields[key] = issue.message;
    }
    return jsonError("One or more fields are invalid.", 422, { code: "VALIDATION_ERROR", fields });
  }

  const data = parsed.data;

  /** Honeypot: bots fill hidden fields. Respond positively, persist nothing. */
  if (data.website) {
    log.info("registration honeypot triggered", { ip });
    return jsonOk({ accepted: true, id: "IGNORED" }, { status: 201 });
  }

  try {
    const result = await activeStore().create(data);
    log.info(`registration ${result.duplicate ? "duplicate (did not persist)" : "persisted"}`, {
      id: result.record.id,
    });
    return jsonOk(
      { accepted: true, duplicate: result.duplicate, id: result.record.id },
      { status: 201 }
    );
  } catch (err) {
    log.error("registration storage failure", { error: err instanceof Error ? err.name : "unknown" });
    return jsonError("Your submission could not be saved right now. Please try again shortly.", 503, {
      code: "STORAGE_UNAVAILABLE",
    });
  }
}