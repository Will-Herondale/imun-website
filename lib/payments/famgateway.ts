/**
 * FamGateway client (https://famgateway.in) — automated UPI verification.
 *
 * FamGateway is a non-custodial bridge for personal @fam UPI wallets: it is
 * given an API key (server-side only) plus an app password for the Gmail inbox
 * that receives Fam credit emails, and exposes order creation, status checks
 * and HMAC-signed webhooks.
 *
 * All calls here are server-to-server, so the API key never reaches the browser.
 * The browser only ever navigates to the returned `checkoutUrl`.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { log } from "@/lib/log";

const DEFAULT_BASE = "https://famgateway.in";
const TIMEOUT_MS = 8000;

function baseUrl(): string {
  return process.env.FAMGATEWAY_BASE_URL?.trim().replace(/\/+$/, "") || DEFAULT_BASE;
}

export function famgatewayApiKey(): string {
  return process.env.FAMGATEWAY_API_KEY?.trim() ?? "";
}

export function famgatewayConfigured(): boolean {
  return famgatewayApiKey().length > 0;
}

export type PaymentOrder = {
  orderId: string;
  amount: number;
  payableAmount: number;
  qrUrl: string;
  checkoutUrl: string;
  upiIntent: string;
};

export type VerifiedPayment = {
  status: "success" | "pending" | "expired";
  amount: number;
  utr: string;
  payerName: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function num(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

async function call(path: string, init: RequestInit): Promise<Record<string, unknown> | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${baseUrl()}${path}`, {
      ...init,
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) {
      log.warn("famgateway request failed", { path, status: res.status });
      return null;
    }
    const json = (await res.json()) as unknown;
    return isRecord(json) ? json : null;
  } catch (err) {
    log.warn("famgateway request error", {
      path,
      error: err instanceof Error ? err.name : "unknown",
    });
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Creates a dynamic UPI order; returns null when FamGateway is unavailable. */
export async function createPaymentOrder(
  amount: number,
  opts: { customerName?: string; redirectUrl?: string; webhookUrl?: string } = {}
): Promise<PaymentOrder | null> {
  if (!famgatewayConfigured()) return null;

  const json = await call("/api/create-order", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Api-Key": famgatewayApiKey() },
    body: JSON.stringify({
      amount,
      customer_name: opts.customerName,
      redirect_url: opts.redirectUrl,
      webhook_url: opts.webhookUrl,
    }),
  });

  const data = isRecord(json?.data) ? json.data : null;
  if (!data) return null;

  const orderId = str(data.order_id);
  const checkoutUrl = str(data.checkout_url);
  if (!orderId || !checkoutUrl) return null;

  return {
    orderId,
    amount: num(data.amount),
    payableAmount: num(data.payable_amount),
    qrUrl: str(data.qr_url),
    checkoutUrl,
    upiIntent: str(data.upi_intent),
  };
}

/** Authoritative server-to-server status check for an order. */
export async function verifyPaymentOrder(orderId: string): Promise<VerifiedPayment | null> {
  if (!famgatewayConfigured() || !orderId) return null;

  const qs = new URLSearchParams({ api_key: famgatewayApiKey(), order_id: orderId });
  const json = await call(`/api/verify-order.php?${qs.toString()}`, { method: "GET" });
  if (!json) return null;

  const statusRaw = str(json.status).toLowerCase();
  const status: VerifiedPayment["status"] =
    statusRaw === "success" ? "success" : statusRaw === "expired" ? "expired" : "pending";

  const data = isRecord(json.data) ? json.data : json;
  return {
    status,
    amount: num(data.amount),
    utr: str(data.utr),
    payerName: str(data.sender_name),
  };
}

/** Verifies the `X-FamGateway-Signature` HMAC-SHA256 webhook header. */
export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  const key = famgatewayApiKey();
  if (!key || !signature) return false;
  const expected = createHmac("sha256", key).update(rawBody).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}
