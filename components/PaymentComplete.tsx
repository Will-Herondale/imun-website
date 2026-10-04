"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { site } from "@/lib/config/site";
import { track } from "@/lib/analytics";

type CompleteState =
  | "checking"
  | "awaiting_payment"
  | "registered"
  | "amount_mismatch"
  | "payment_expired"
  | "superseded"
  | "not_found"
  | "unavailable";

type Detail = {
  state: CompleteState;
  email?: string;
  fullName?: string;
  feeAmount?: number;
  utr?: string;
  paymentStatus?: string;
  registrationId?: string;
  received?: number;
  expected?: number;
};

/** Poll cadence: brisk at first, then relaxed so a long wait is not chatty. */
const FAST_MS = 3000;
const SLOW_MS = 6000;
const POLL_BUDGET_MS = 15 * 60 * 1000;
const REASSURE_AFTER_MS = 12 * 1000;

/** States after which polling stops for good. */
const TERMINAL: ReadonlySet<CompleteState> = new Set<CompleteState>([
  "registered",
  "amount_mismatch",
  "payment_expired",
  "superseded",
  "not_found",
]);

/**
 * The delegate's post-payment page.
 *
 * Payment confirmation is authoritative on the server, so this page only polls
 * for the outcome: it can neither lose a registration nor invent one. Even if
 * the delegate closes the tab at any point, the payment webhook writes the
 * registration from the stored draft.
 */
export function PaymentComplete({ token }: { token: string }) {
  /* An empty token can never match a draft, so start in the terminal state
   * rather than flashing "checking" for a link that was never valid. */
  const [detail, setDetail] = useState<Detail>(() => ({ state: token ? "checking" : "not_found" }));
  const [reassured, setReassured] = useState(false);
  const stateRef = useRef<CompleteState>(token ? "checking" : "not_found");
  const trackedRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const check = useCallback(async () => {
    try {
      const res = await fetch("/api/registrations/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (res.ok) {
        const data = (await res.json().catch(() => ({}))) as Partial<Detail>;
        const next = (data.state ?? "checking") as CompleteState;
        stateRef.current = next;
        setDetail((prev) => ({ ...prev, ...(data as Detail), state: next }));
        return;
      }
      if (res.status === 404) {
        stateRef.current = "not_found";
        setDetail((prev) => ({ ...prev, state: "not_found" }));
        return;
      }
      /* 429 / 5xx are transient: stay in the checking state and retry. */
    } catch {
      /* Offline or interrupted request — the loop simply tries again. */
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;

    let cancelled = false;
    const startedAt = Date.now();

    const tick = async () => {
      await check();
      if (cancelled) return;

      const elapsed = Date.now() - startedAt;
      if (elapsed > REASSURE_AFTER_MS) setReassured(true);

      if (TERMINAL.has(stateRef.current)) return;

      if (elapsed > POLL_BUDGET_MS) {
        stateRef.current = "unavailable";
        setDetail((prev) => ({ ...prev, state: "unavailable" }));
        return;
      }

      /* One self-rescheduling timer, cleared on unmount. Nothing re-creates it:
       * `reassured` is deliberately not a dependency, because restarting this
       * effect on that state change would leave the old timer running. */
      timeoutRef.current = setTimeout(tick, elapsed > REASSURE_AFTER_MS ? SLOW_MS : FAST_MS);
    };

    void tick();

    /* Returning to the tab (e.g. from a UPI app) should not wait out a timer. */
    const onVisible = () => {
      if (document.visibilityState === "visible" && !TERMINAL.has(stateRef.current)) void check();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onVisible);

    return () => {
      cancelled = true;
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onVisible);
    };
  }, [token, check]);

  useEffect(() => {
    if (detail.state !== "registered" || trackedRef.current) return;
    trackedRef.current = true;
    track("registration_submitted", { payment_status: detail.paymentStatus ?? "paid" });
    /* The registration is done: drop the local copies so a later visit to the
     * form does not greet the delegate with a stale "unfinished payment". */
    try {
      window.localStorage.removeItem("iemun:registration:intent:v1");
      window.localStorage.removeItem("iemun:registration:Draft:v1");
    } catch {
      /* storage unavailable */
    }
  }, [detail.state, detail.paymentStatus]);

  const inr = (n: number) => `${site.registrationFee.currency} ${n.toLocaleString("en-IN")}`;
  const fee = detail.feeAmount ?? 0;
  const firstName = detail.fullName ? detail.fullName.trim().split(/\s+/)[0] : "";

  return (
    <section
      className="border border-steel-200 bg-white p-8 shadow-[var(--shadow-card)] md:p-12"
      role="status"
      aria-live="polite"
    >
      {detail.state === "registered" ? (
        <>
          <p className="kicker flex items-center gap-3">
            <span aria-hidden="true" className="inline-block h-px w-8 bg-brass-600/70" />
            Registration confirmed
          </p>
          <h2 className="mt-4 font-display text-[clamp(1.8rem,4vw,2.6rem)] font-medium text-navy-900">
            You are registered{firstName ? `, ${firstName}` : ""}.
          </h2>
          <p className="mt-4 max-w-xl leading-relaxed text-steel-600">
            Your payment has been verified and your seat is reserved. Keep the reference below to
            hand — the secretariat will share your committee allotment at{" "}
            <span className="font-semibold text-navy-900">{detail.email ?? "your address"}</span>.
          </p>
          <dl className="mt-8 grid max-w-xl gap-x-10 gap-y-4 border border-brass-500/30 bg-brass-50/60 p-6 sm:grid-cols-2">
            <div>
              <dt className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-brass-700">Fee paid</dt>
              <dd className="mt-1.5 font-display text-[1.1rem] font-medium text-navy-900">{inr(fee)}</dd>
            </div>
            <div>
              <dt className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-brass-700">Reference (UTR)</dt>
              <dd className="mt-1.5 font-mono text-[0.95rem] font-semibold text-navy-900">
                {detail.utr || "Recorded"}
              </dd>
            </div>
          </dl>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link href="/conference" className="btn btn-outline">Conference details</Link>
            <Link href="/" className="btn btn-outline">Back to home</Link>
          </div>
        </>
      ) : null}

      {detail.state === "checking" || detail.state === "awaiting_payment" ? (
        <>
          <p className="kicker flex items-center gap-3">
            <span aria-hidden="true" className="inline-block h-2 w-2 animate-pulse rounded-full bg-brass-600" />
            Confirming your payment
          </p>
          <h2 className="mt-4 font-display text-[clamp(1.8rem,4vw,2.6rem)] font-medium text-navy-900">
            Please wait a moment.
          </h2>
          <p className="mt-4 max-w-xl leading-relaxed text-steel-600">
            We are matching your payment to your registration. This normally takes a few seconds
            after your UPI app reports success.
          </p>
          <div className="mt-8 flex items-center gap-3 text-steel-600">
            <span
              aria-hidden="true"
              className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-brass-500/40 border-t-brass-600"
            />
            <span className="text-[0.95rem]">Checking…</span>
          </div>
          {reassured ? (
            <div className="mt-8 border border-steel-200 bg-steel-50 p-6">
              <p className="text-[0.95rem] leading-relaxed text-navy-800">
                <strong className="font-semibold">You can close this tab.</strong> Your answers are
                already saved on our servers and your seat is held. We will finish your registration
                the moment the payment lands — reopen this page any time to check.
              </p>
            </div>
          ) : null}
        </>
      ) : null}

      {detail.state === "amount_mismatch" ? (
        <>
          <p className="kicker flex items-center gap-3">
            <span aria-hidden="true" className="inline-block h-2 w-2 rounded-full bg-[#b42318]" />
            Payment needs review
          </p>
          <h2 className="mt-4 font-display text-[clamp(1.8rem,4vw,2.6rem)] font-medium text-navy-900">
            The amount does not match the delegate fee.
          </h2>
          <p className="mt-4 max-w-xl leading-relaxed text-steel-600">
            We received {inr(detail.received ?? 0)} but the fee for this round is{" "}
            {inr(detail.expected ?? fee)}. Nothing is lost — your answers are saved and the
            secretariat can settle the difference with you.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link href="/contact" className="btn btn-primary">Contact the secretariat</Link>
          </div>
        </>
      ) : null}

      {detail.state === "payment_expired" || detail.state === "superseded" ? (
        <>
          <p className="kicker flex items-center gap-3">
            <span aria-hidden="true" className="inline-block h-2 w-2 rounded-full bg-steel-400" />
            Payment window closed
          </p>
          <h2 className="mt-4 font-display text-[clamp(1.8rem,4vw,2.6rem)] font-medium text-navy-900">
            You were not charged.
          </h2>
          <p className="mt-4 max-w-xl leading-relaxed text-steel-600">
            This payment window lapsed before we received your payment, so you were not charged.
            Everything you typed has been kept — continue and you will be back at the payment step
            with your answers in place.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link href={`/registration?resume=${encodeURIComponent(token)}`} className="btn btn-primary">
              Continue my registration
            </Link>
            <Link href="/contact" className="btn btn-outline">Contact the secretariat</Link>
          </div>
        </>
      ) : null}

      {detail.state === "not_found" ? (
        <>
          <p className="kicker flex items-center gap-3">
            <span aria-hidden="true" className="inline-block h-2 w-2 rounded-full bg-steel-400" />
            Link not recognised
          </p>
          <h2 className="mt-4 font-display text-[clamp(1.8rem,4vw,2.6rem)] font-medium text-navy-900">
            We could not find that registration.
          </h2>
          <p className="mt-4 max-w-xl leading-relaxed text-steel-600">
            This confirmation link is incomplete or has expired. If you have already paid, write to
            the secretariat with your name and email — the payment is recorded on our side and we
            will match it to your registration.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link href="/registration" className="btn btn-primary">Start a registration</Link>
            <Link href="/contact" className="btn btn-outline">Contact the secretariat</Link>
          </div>
        </>
      ) : null}

      {detail.state === "unavailable" ? (
        <>
          <p className="kicker flex items-center gap-3">
            <span aria-hidden="true" className="inline-block h-2 w-2 rounded-full bg-brass-600" />
            Still confirming
          </p>
          <h2 className="mt-4 font-display text-[clamp(1.8rem,4vw,2.6rem)] font-medium text-navy-900">
            This is taking longer than usual.
          </h2>
          <p className="mt-4 max-w-xl leading-relaxed text-steel-600">
            Your answers are saved and your payment is recorded on our side, so your registration is
            safe — we are simply still waiting on the bank confirmation. Reload this page to check
            again, or contact the secretariat and we will confirm your seat manually.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link href="/contact" className="btn btn-primary">Contact the secretariat</Link>
            <Link href="/registration" className="btn btn-outline">Registration form</Link>
          </div>
        </>
      ) : null}
    </section>
  );
}