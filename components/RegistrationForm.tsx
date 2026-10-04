"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  munCountOptions,
  munHistoryFormat,
  type RegistrationInput,
} from "@/lib/validation/registration";
import { committees } from "@/lib/config/committees";
import { feeAmountFor, registrationRoundFor, site } from "@/lib/config/site";
import { track } from "@/lib/analytics";

type Values = {
  fullName: string;
  email: string;
  contactNumber: string;
  schoolName: string;
  grade: string;
  munCount: string;
  munHistory: string;
  committeePref1: string;
  committeePref2: string;
  committeePref3: string;
  countryPreference: string;
  specialRequest: string;
  paymentOrderId: string;
  paymentReference: string;
  declarationAccurate: boolean;
  declarationRules: boolean;
};

const initialValues: Values = {
  fullName: "",
  email: "",
  contactNumber: "",
  schoolName: "",
  grade: "",
  munCount: "0",
  munHistory: "",
  committeePref1: "",
  committeePref2: "",
  committeePref3: "",
  countryPreference: "",
  specialRequest: "",
  paymentOrderId: "",
  paymentReference: "",
  declarationAccurate: false,
  declarationRules: false,
};

type Errors = Partial<Record<keyof Values, string>>;

const DRAFT_KEY = "iemun:registration:Draft:v1";
/**
 * The delegate's in-flight payment. Server-side this lives in a stored draft;
 * locally we keep only the resume token so a return visit (or a second tab)
 * knows there is something to check.
 */
const INTENT_KEY = "iemun:registration:intent:v1";
type PendingIntent = { token: string; orderId: string; at: number };

function readPendingIntent(): PendingIntent | null {
  try {
    const raw = window.localStorage.getItem(INTENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PendingIntent>;
    if (typeof parsed?.token !== "string" || !parsed.token) return null;
    return {
      token: parsed.token,
      orderId: typeof parsed.orderId === "string" ? parsed.orderId : "",
      at: typeof parsed.at === "number" ? parsed.at : 0,
    };
  } catch {
    return null;
  }
}

function clearPendingIntent(): void {
  try {
    window.localStorage.removeItem(INTENT_KEY);
  } catch {
    /* storage unavailable — the server-side draft is the source of truth */
  }
}

const DESCRIPTION_TIP =
  "Only the fields marked required (*) must be completed. The MUN experience list is optional — first-time delegates leave it blank.";

export function RegistrationForm({ paymentsLive = false }: { paymentsLive?: boolean }) {
  const [values, setValues] = useState<Values>(() => {
    if (typeof window === "undefined") return initialValues;
    try {
      const raw = window.localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<Values>;
        return { ...initialValues, ...saved };
      }
    } catch {
      /* private mode / storage unavailable — proceed fresh */
    }
    return initialValues;
  });
  const [errors, setErrors] = useState<Errors>({});
  const [touched, setTouched] = useState<Partial<Record<keyof Values, boolean>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<{ duplicate: boolean; paymentStatus: string } | null>(null);
  const [paymentNotice, setPaymentNotice] = useState<string | null>(null);
  const [pendingIntent, setPendingIntent] = useState<PendingIntent | null>(null);
  const [restored, setRestored] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);
  const startedRef = useRef(false);

  // Draft recovery (device-local, never synced).
  useEffect(() => {
    if (result) return;
    try {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify(values));
    } catch {
      /* storage full or unavailable — ignore */
    }
  }, [values, result]);

  const set = useCallback(<K extends keyof Values>(key: K, value: Values[K]) => {
    if (!startedRef.current) {
      startedRef.current = true;
      track("registration_form_start");
    }
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  }, []);

  const markTouched = useCallback((key: keyof Values) => {
    setTouched((t) => ({ ...t, [key]: true }));
  }, []);

  /**
   * The single body every path sends. The automated path posts this to
   * /api/registrations/intents (payment fields are ignored there); the
   * post-payment fallback posts it to /api/registrations together with the
   * order id the checkout returned.
   */
  const payloadFor = useCallback((v: Values): RegistrationInput => {
    return {
      fullName: v.fullName,
      email: v.email,
      contactNumber: v.contactNumber,
      schoolName: v.schoolName,
      grade: v.grade,
      munCount: v.munCount as RegistrationInput["munCount"],
      munHistory: v.munHistory,
      committeePref1: v.committeePref1,
      committeePref2: v.committeePref2,
      committeePref3: v.committeePref3,
      countryPreference: v.countryPreference,
      specialRequest: v.specialRequest,
      paymentOrderId: v.paymentOrderId,
      paymentReference: v.paymentReference,
      declarationAccurate: "Yes",
      declarationRules: "Yes",
    };
  }, []);

  const validateClient = useCallback((v: Values): Errors => {
    const errs: Errors = {};
    if (v.fullName.trim().length < 3) errs.fullName = "Enter your full name.";
    if (!/^[A-Za-z][A-Za-z .'’-]*$/.test(v.fullName.trim())) errs.fullName = "Name contains invalid characters.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email.trim())) errs.email = "Enter a valid email address.";
    const digits = v.contactNumber.replace(/[\s\-()]/g, "");
    if (!/^(?:\+?91|0)?[6-9]\d{9}$/.test(digits)) errs.contactNumber = "Enter a valid 10-digit Indian mobile number.";
    if (v.schoolName.trim().length < 2) errs.schoolName = "School name is required.";
    if (v.grade.trim().length < 1) errs.grade = "Grade or class is required.";
    if (v.munCount === "0" && v.munHistory.trim()) errs.munHistory = "You indicated no prior conferences; remove the experience list.";
    if (!v.committeePref1) errs.committeePref1 = "Select a first preference.";
    if (!v.committeePref2) errs.committeePref2 = "Select a second preference.";
    if (!v.committeePref3) errs.committeePref3 = "Select a third preference.";
    const prefs = [v.committeePref1, v.committeePref2, v.committeePref3].filter(Boolean);
    if (prefs.length === 3 && new Set(prefs).size !== 3) {
      errs.committeePref2 = "Each preference must be different.";
      errs.committeePref3 = "Each preference must be different.";
    }
    if (!v.declarationAccurate) errs.declarationAccurate = "You must confirm that the information is accurate.";
    if (!v.declarationRules) errs.declarationRules = "You must agree to follow the rules and regulations of IMUN.";
    return errs;
  }, []);

  const submitRegistration = useCallback(
    async (override?: Partial<Values>) => {
      if (submitting || result) return;
      const v = { ...values, ...override };

      const honeypot = new FormData(formRef.current ?? undefined)
        .get("website")
        ?.toString()
        .trim();

      setSubmitting(true);
      setSubmitError(null);
      try {
        const payload = { ...payloadFor(v), website: honeypot };
        const res = await fetch("/api/registrations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
          fields?: Record<string, string>;
          duplicate?: boolean;
          paymentStatus?: string;
          code?: string;
        };
        if (res.ok) {
          const outcome = String(data.paymentStatus ?? "");
          if (!data.duplicate) {
            if (outcome === "paid") {
              track("purchase", {
                transaction_id: v.paymentOrderId,
                value: feeAmountFor(),
                currency: "INR",
                items: [{ item_name: registrationRoundFor().label }],
              });
            } else {
              track("registration_submitted", { payment_status: outcome || "none" });
            }
          }
          setResult({ duplicate: Boolean(data.duplicate), paymentStatus: outcome });
          try {
            window.localStorage.removeItem(DRAFT_KEY);
          } catch {
            /* ignore */
          }
          clearPendingIntent();
          return;
        }
        if (res.status === 422 && data.fields) {
          const mapped: Errors = {};
          for (const [k, msg] of Object.entries(data.fields)) {
            if (k in initialValues) mapped[k as keyof Values] = msg;
          }
          setErrors(mapped);
        }
        setSubmitError(data.error ?? "Your registration could not be completed. Please try again.");
      } catch {
        setSubmitError("We could not reach the server. Check your connection and try again.");
      } finally {
        setSubmitting(false);
      }
    },
    [values, submitting, result, payloadFor]
  );

  /** Honeypot value from the hidden field; bots fill it, humans never see it. */
  const readHoneypot = useCallback((): string => {
    if (typeof document === "undefined") return "";
    return new FormData(formRef.current ?? undefined)
      .get("website")
      ?.toString()
      .trim() ?? "";
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting || result) return;

    const errs = validateClient(values);
    setErrors(errs);
    setSubmitError(null);
    if (Object.keys(errs).length > 0) {
      setTouched(Object.keys(errs).reduce((acc, k) => ({ ...acc, [k]: true }), {}));
      const first = Object.keys(errs)[0] as keyof Values;
      const el = formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`);
      el?.focus();
      return;
    }

/* Without a working gateway there is nothing to verify, so the form cannot
     * accept a registration at all — a self-reported reference is not proof. */
    if (!paymentsLive) {
      setSubmitError(
        "Online checkout is unavailable right now, so we cannot verify a payment. Please try again shortly or contact the secretariat."
      );
      return;
    }

    /* An order id in hand means the delegate already paid: finish that
     * registration directly instead of opening a second order. */
    if (values.paymentOrderId) {
      await submitRegistration();
      return;
    }

    /**
     * Step 1 of the automated path: the server validates and stores these
     * answers, then opens the UPI order. Once the payment is confirmed the
     * registration is written from the stored copy, so closing this tab (or
     * losing the network) can no longer lose a registration.
     */
    setSubmitting(true);
    try {
      const res = await fetch("/api/registrations/intents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payloadFor(values), website: readHoneypot() }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        token?: string;
        orderId?: string;
        checkoutUrl?: string;
        error?: string;
        fields?: Record<string, string>;
        code?: string;
        retryAfterSeconds?: number;
      };

      if (res.ok && data.token && data.checkoutUrl) {
        setPendingIntent({ token: data.token, orderId: data.orderId ?? "", at: Date.now() });
        try {
          window.localStorage.setItem(
            INTENT_KEY,
            JSON.stringify({ token: data.token, orderId: data.orderId ?? "", at: Date.now() })
          );
        } catch {
          /* storage unavailable — the token also rides home in the redirect URL */
        }
        track("payment_initiated", {
          value: feeAmountFor(),
          currency: "INR",
          round: registrationRoundFor().label,
        });
        window.location.assign(data.checkoutUrl);
        return;
      }

      /* Field-level problems are shown inline instead of bouncing the delegate. */
      if (res.status === 422 && data.fields) {
        const mapped: Errors = {};
        for (const [k, msg] of Object.entries(data.fields)) {
          if (k in initialValues) mapped[k as keyof Values] = msg;
        }
        setErrors(mapped);
        setTouched(Object.keys(mapped).reduce((acc, k) => ({ ...acc, [k]: true }), {}));
        setPaymentNotice("Some details need fixing before we can take the payment — they are marked below.");
        const first = Object.keys(mapped)[0] as keyof Values | undefined;
        if (first) formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
        return;
      }

      if (res.status === 429) {
        const wait = Math.max(1, Math.round(data.retryAfterSeconds ?? 60));
        setPaymentNotice(
          `You have tried this a few times already. Please wait about ${wait} seconds and try again — your answers are saved.`
        );
        return;
      }

      // Registration paused (maintenance): show the notice, no manual fallback.
      if (res.status === 503 && data.code === "MAINTENANCE") {
        setPaymentNotice(data.error ?? "Registration is temporarily paused. Please check back shortly.");
        return;
      }

      /* Checkout could not be opened. The answers are already saved on this device,
       * so the delegate can simply try again — there is deliberately no
       * "type your own reference" escape hatch, because that cannot be
       * verified. */
      setPaymentNotice(
        res.status === 503
          ? "Online checkout is temporarily unavailable. Your answers are saved — please try again in a few minutes."
          : data.error ?? "We could not open the checkout. Your answers are saved — please try again in a few minutes."
      );
    } catch {
      setPaymentNotice(
        "We could not reach the payment service. Your answers are saved — please check your connection and try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  /**
   * Mount-time work: surface an unfinished payment from a previous visit and
   * restore a saved draft when the delegate is sent back from the confirmation
   * page. Deferred by a tick so these updates land after the first paint.
   */
  useEffect(() => {
    if (result) return;
    let cancelled = false;

    const hydrate = async () => {
      await Promise.resolve();
      if (cancelled) return;

      const pending = readPendingIntent();
      if (pending) setPendingIntent(pending);

      let resume = "";
      try {
        resume = new URLSearchParams(window.location.search).get("resume")?.trim() ?? "";
      } catch {
        resume = "";
      }
      if (!resume || resume.length > 128) return;

      try {
        const res = await fetch(`/api/registrations/intents?token=${encodeURIComponent(resume)}`);
        const data = (await res.json().catch(() => ({}))) as {
          draft?: Partial<Values>;
          state?: string;
          registered?: boolean;
        };
        if (cancelled || !res.ok || !data.draft) return;
        if (data.registered) {
          setRestored("This registration is already complete — no further action is needed.");
          return;
        }
        setValues((v) => ({ ...v, ...(data.draft as Partial<Values>) }));
        setRestored("We restored the details you saved earlier. Check them over, then continue to payment.");
        clearPendingIntent();
        setPendingIntent(null);
      } catch {
        /* nothing to restore — the delegate simply retypes */
      }
    };

    void hydrate();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const usedCommittees = useMemo(
    () => new Set([values.committeePref1, values.committeePref2, values.committeePref3].filter(Boolean)),
    [values.committeePref1, values.committeePref2, values.committeePref3]
  );

  if (result) {
    return (
      <section
        className="border border-steel-200 bg-steel-50 p-8 md:p-12"
        role="status"
        aria-live="polite"
      >
        <p className="kicker flex items-center gap-3">
          <span aria-hidden="true" className="inline-block h-px w-8 bg-brass-600/70" />
          Registration received
        </p>
        <h2 className="mt-4 text-[clamp(1.8rem,4vw,2.6rem)] font-medium text-navy-900">
          {result.duplicate ? "You have already registered" : "Thank you for registering"}
        </h2>
        <p className="mt-4 max-w-xl leading-relaxed text-steel-600">
          {result.duplicate
            ? "Our records show that a registration already exists for this email address. If you did not submit it, or need to correct anything, write to the secretariat using the contact details on the Contact page."
            : "Your details have been recorded. The secretariat will contact you at the email address you provided once committee allotments are prepared. Please keep the same email address active."}
        </p>
        <div className="mt-8 border border-brass-500/30 bg-brass-50/60 p-6">
          {result.paymentStatus === "paid" ? (
            <>
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-brass-700">Payment verified</p>
              <p className="mt-3 max-w-xl text-[0.92rem] leading-relaxed text-steel-600">
                We have verified your payment of ₹{feeAmountFor().toLocaleString("en-IN")} against the wallet. Your
                seat is confirmed — the secretariat will email your committee allotment.
              </p>
            </>
          ) : (
            <>
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-brass-700">
                Payment being verified
              </p>
              <p className="mt-3 max-w-xl text-[0.92rem] leading-relaxed text-steel-600">
                We are still confirming your payment with the provider. Your seat is held, and the secretariat will
                email your committee allotment once the payment clears.
              </p>
            </>
          )}
        </div>
        <div className="mt-6 border-t border-steel-200 pt-6 text-[0.85rem] text-steel-500">
          The secretariat will contact you at the email address you provided once
          committee allotments are prepared.
        </div>
      </section>
    );
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate>
      <p className="mb-8 text-[0.9rem] text-steel-500">{DESCRIPTION_TIP}</p>

      <fieldset>
        <legend className="flex w-full items-center gap-4 border-b border-steel-200 pb-4">
          <span aria-hidden="true" className="font-display text-[1.4rem] leading-none text-brass-600">
            01
          </span>
          <span className="font-display text-[1.5rem] font-medium text-navy-900 sm:text-[1.7rem]">
            Basic information
          </span>
        </legend>

        <div className="mt-6 grid gap-x-6 gap-y-5 sm:grid-cols-2">
          <div className="sm:col-span-1">
            <label className="field-label" htmlFor="f-fullName">1. Full Name <span aria-hidden="true" className="text-[#b42318]">*</span></label>
            <input
              id="f-fullName" name="fullName" type="text" autoComplete="name"
              className="input" value={values.fullName} required
              onChange={(e) => set("fullName", e.target.value)}
              onBlur={(e) => { markTouched("fullName"); if (e.target.value.trim()) setTouched((t) => ({ ...t, fullName: true })); }}
              aria-invalid={touched.fullName && errors.fullName ? true : undefined}
              aria-describedby={errors.fullName ? "err-fullName" : "hint-fullName"}
            />
            <span id="hint-fullName" className="field-hint">As it should appear on your certificate.</span>
            {touched.fullName && errors.fullName ? <p id="err-fullName" className="field-error" role="alert">{errors.fullName}</p> : null}
          </div>

          <div>
            <label className="field-label" htmlFor="f-email">2. Email Address <span aria-hidden="true" className="text-[#b42318]">*</span></label>
            <input
              id="f-email" name="email" type="email" autoComplete="email" inputMode="email"
              className="input" value={values.email} required
              onChange={(e) => set("email", e.target.value)}
              onBlur={() => markTouched("email")}
              aria-invalid={touched.email && errors.email ? true : undefined}
              aria-describedby={errors.email ? "err-email" : "hint-email"}
            />
            <span id="hint-email" className="field-hint">Allotments and updates are sent here.</span>
            {touched.email && errors.email ? <p id="err-email" className="field-error" role="alert">{errors.email}</p> : null}
          </div>

          <div>
            <label className="field-label" htmlFor="f-contactNumber">3. Contact Number <span aria-hidden="true" className="text-[#b42318]">*</span></label>
            <input
              id="f-contactNumber" name="contactNumber" type="tel" autoComplete="tel-national" inputMode="tel"
              className="input" value={values.contactNumber} required placeholder="e.g. 98XXXXXXXX"
              onChange={(e) => set("contactNumber", e.target.value)}
              onBlur={() => markTouched("contactNumber")}
              aria-invalid={touched.contactNumber && errors.contactNumber ? true : undefined}
              aria-describedby={errors.contactNumber ? "err-contactNumber" : "hint-contactNumber"}
            />
            <span id="hint-contactNumber" className="field-hint">Indian mobile number (10 digits, may start with +91).</span>
            {touched.contactNumber && errors.contactNumber ? <p id="err-contactNumber" className="field-error" role="alert">{errors.contactNumber}</p> : null}
          </div>

          <div>
            <label className="field-label" htmlFor="f-schoolName">4. School Name <span aria-hidden="true" className="text-[#b42318]">*</span></label>
            <input
              id="f-schoolName" name="schoolName" type="text" autoComplete="organization"
              className="input" value={values.schoolName} required
              onChange={(e) => set("schoolName", e.target.value)}
              onBlur={() => markTouched("schoolName")}
              aria-invalid={touched.schoolName && errors.schoolName ? true : undefined}
              aria-describedby={errors.schoolName ? "err-schoolName" : undefined}
            />
            {touched.schoolName && errors.schoolName ? <p id="err-schoolName" className="field-error" role="alert">{errors.schoolName}</p> : null}
          </div>

          <div className="sm:col-span-2 sm:max-w-xs">
            <label className="field-label" htmlFor="f-grade">5. Grade / Class <span aria-hidden="true" className="text-[#b42318]">*</span></label>
            <input
              id="f-grade" name="grade" type="text" autoComplete="off"
              className="input" value={values.grade} required placeholder="e.g. Class 11"
              onChange={(e) => set("grade", e.target.value)}
              onBlur={() => markTouched("grade")}
              aria-invalid={touched.grade && errors.grade ? true : undefined}
              aria-describedby={errors.grade ? "err-grade" : undefined}
            />
            {touched.grade && errors.grade ? <p id="err-grade" className="field-error" role="alert">{errors.grade}</p> : null}
          </div>
        </div>
      </fieldset>

      <fieldset className="mt-14">
        <legend className="flex w-full items-center gap-4 border-b border-steel-200 pb-4">
          <span aria-hidden="true" className="font-display text-[1.4rem] leading-none text-brass-600">
            02
          </span>
          <span className="font-display text-[1.5rem] font-medium text-navy-900 sm:text-[1.7rem]">
            Model UN experience
          </span>
        </legend>

        <div className="mt-6 grid gap-x-6 gap-y-5">
          <div className="sm:max-w-xs">
            <label className="field-label" htmlFor="f-munCount">6. How many MUNs have you attended? <span aria-hidden="true" className="text-[#b42318]">*</span></label>
            <select
              id="f-munCount" name="munCount" className="select" value={values.munCount} required
              onChange={(e) => set("munCount", e.target.value)}
              onBlur={() => markTouched("munCount")}
            >
              {munCountOptions.map((o) => (
                <option key={o} value={o}>{o === "0" ? "None — this is my first MUN" : o}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="field-label" htmlFor="f-munHistory">7. List the MUN conferences you have participated in</label>
            <textarea
              id="f-munHistory" name="munHistory" rows={5}
              className="textarea font-mono text-[0.85rem]"
              value={values.munHistory}
              placeholder={`One conference per line, strictly as:\n${munHistoryFormat}`}
              onChange={(e) => set("munHistory", e.target.value)}
              onBlur={() => markTouched("munHistory")}
              aria-invalid={touched.munHistory && errors.munHistory ? true : undefined}
              aria-describedby={errors.munHistory ? "err-munHistory" : "hint-munHistory"}
            />
            <span id="hint-munHistory" className="field-hint">
              Use exactly this format, one conference per line:
              <code className="mt-1 block rounded-[3px] bg-steel-100 px-2 py-1 text-[0.75rem]">
                {munHistoryFormat}
              </code>
              Example line: <code className="inline-block rounded bg-steel-100 px-1.5">Sample MUN | 2025 | DISEC | USA | Best Delegate</code>
            </span>
            {touched.munHistory && errors.munHistory ? <p id="err-munHistory" className="field-error" role="alert">{errors.munHistory}</p> : null}
          </div>
        </div>
      </fieldset>

      <fieldset className="mt-14">
        <legend className="flex w-full items-center gap-4 border-b border-steel-200 pb-4">
          <span aria-hidden="true" className="font-display text-[1.4rem] leading-none text-brass-600">
            03
          </span>
          <span className="font-display text-[1.5rem] font-medium text-navy-900 sm:text-[1.7rem]">
            Committee preferences
          </span>
        </legend>

        <div className="mt-6 grid gap-x-6 gap-y-5 sm:grid-cols-3">
          {(
            [
              ["committeePref1", "8. First Committee Preference"],
              ["committeePref2", "9. Second Committee Preference"],
              ["committeePref3", "10. Third Committee Preference"],
            ] as const
          ).map(([key, label]) => (
            <div key={key}>
              <label className="field-label" htmlFor={`f-${key}`}>{label} <span aria-hidden="true" className="text-[#b42318]">*</span></label>
              <select
                id={`f-${key}`} name={key} className="select" value={values[key]} required
                onChange={(e) => set(key, e.target.value)}
                onBlur={() => markTouched(key)}
                aria-invalid={touched[key] && errors[key] ? true : undefined}
                aria-describedby={errors[key] ? `err-${key}` : `hint-${key}`}
              >
                <option value="" disabled>Select a committee…</option>
                {committees.map((c) => (
                  <option key={c.code} value={c.code} disabled={usedCommittees.has(c.code) && values[key] !== c.code} data-code={c.code}>
                    {c.name}
                  </option>
                ))}
              </select>
              <span id={`hint-${key}`} className="field-hint">Ranked 1st → 3rd. <code>[{committees.find((c) => c.code === values[key])?.code ?? "—"}]</code></span>
              {touched[key] && errors[key] ? <p id={`err-${key}`} className="field-error" role="alert">{errors[key]}</p> : null}
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-x-6 gap-y-5 sm:grid-cols-2">
          <div>
            <label className="field-label" htmlFor="f-countryPreference">11. Preferred Country / Portfolio</label>
            <input
              id="f-countryPreference" name="countryPreference" type="text" autoComplete="off"
              className="input" value={values.countryPreference}
              onChange={(e) => set("countryPreference", e.target.value)}
              placeholder="e.g. India, Germany, Rwanda…"
            />
            <span className="field-hint">Optional. Leave blank to be assigned a portfolio.</span>
          </div>
          <div>
            <label className="field-label" htmlFor="f-specialRequest">12. Any specific committee or portfolio request?</label>
            <textarea
              id="f-specialRequest" name="specialRequest" rows={3}
              className="textarea" value={values.specialRequest}
              onChange={(e) => set("specialRequest", e.target.value)}
            />
            <span className="field-hint">Optional. Requests are considered but not guaranteed.</span>
          </div>
        </div>
      </fieldset>

      <fieldset className="mt-14">
        <legend className="flex w-full items-center gap-4 border-b border-steel-200 pb-4">
          <span aria-hidden="true" className="font-display text-[1.4rem] leading-none text-brass-600">
            04
          </span>
          <span className="font-display text-[1.5rem] font-medium text-navy-900 sm:text-[1.7rem]">
            Payment
          </span>
        </legend>

        <div className="mt-6 border border-brass-500/30 bg-brass-50/60 p-6">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-brass-700">
            {registrationRoundFor().label} — delegate fee ₹{feeAmountFor().toLocaleString("en-IN")}
          </p>
          {paymentsLive ? (
            <>
              <p className="mt-3 max-w-2xl text-[0.92rem] leading-relaxed text-steel-600">
                When you submit, you&apos;ll be taken to a secure UPI checkout to pay ₹
                {feeAmountFor().toLocaleString("en-IN")} from any UPI app (Google Pay, PhonePe, Paytm,{" "}
                {site.payment.provider} or any other). You return here automatically and your seat is confirmed the
                moment the payment is verified.
              </p>
              <p className="mt-3 max-w-2xl text-[0.85rem] leading-relaxed text-steel-500">
                Your answers are saved on our servers before you pay, so your registration completes even if you
                close this page. A seat is only granted once the payment is verified with our payment provider —
                we cannot accept a self-reported transaction reference.
              </p>
            </>
          ) : (
            <>
              <p className="mt-3 max-w-2xl text-[0.92rem] leading-relaxed text-steel-600">
                {site.payment.setupNotice}
              </p>
              <p className="mt-3 max-w-2xl text-[0.85rem] leading-relaxed text-steel-500">
                Registrations are paused until the checkout is available, because we only confirm a seat against a
                verified payment. Please check back shortly.
              </p>
            </>
          )}
        </div>

        {restored ? (
          <div className="mt-6 border border-brass-500/40 bg-brass-50/60 p-4 text-[0.9rem] text-navy-800" role="status">
            {restored}
          </div>
        ) : null}

        {pendingIntent ? (
          <div className="mt-6 border border-steel-200 bg-steel-50 p-4 text-[0.9rem] text-navy-800" role="status">
            <p>
              You have a payment in progress.{" "}
              <a
                href={`/registration/complete?token=${encodeURIComponent(pendingIntent.token)}`}
                className="font-semibold text-navy-700 underline decoration-brass-600 underline-offset-2"
              >
                Check its status
              </a>{" "}
              — if you have already paid, your registration completes on its own and this page will
              confirm it.
            </p>
            <button
              type="button"
              onClick={() => {
                clearPendingIntent();
                setPendingIntent(null);
              }}
              className="mt-3 text-[0.85rem] font-semibold text-steel-600 underline decoration-steel-400 underline-offset-2"
            >
              Dismiss and start a new registration
            </button>
          </div>
        ) : null}

        {paymentNotice ? (
          <div className="mt-6 rounded-[3px] border border-brass-500/40 bg-brass-50/60 p-4 text-[0.9rem] text-brass-800" role="status">
            {paymentNotice}
          </div>
        ) : null}
      </fieldset>

      <fieldset className="mt-14">
        <legend className="flex w-full items-center gap-4 border-b border-steel-200 pb-4">
          <span aria-hidden="true" className="font-display text-[1.4rem] leading-none text-brass-600">
            05
          </span>
          <span className="font-display text-[1.5rem] font-medium text-navy-900 sm:text-[1.7rem]">
            Declaration
          </span>
        </legend>

        <div className="mt-6 space-y-4">
          <div className="flex items-start gap-3">
            <input
              id="f-declarationAccurate" name="declarationAccurate" type="checkbox"
              className="mt-1 h-5 w-5 accent-[#0e284c]" checked={values.declarationAccurate}
              onChange={(e) => set("declarationAccurate", e.target.checked)}
              onBlur={() => markTouched("declarationAccurate")}
              aria-invalid={touched.declarationAccurate && errors.declarationAccurate ? true : undefined}
              aria-describedby={errors.declarationAccurate ? "err-declarationAccurate" : undefined}
            />
            <label htmlFor="f-declarationAccurate" className="text-[0.95rem] leading-relaxed text-navy-800">
              13. I confirm that the information provided above is accurate.
              <span aria-hidden="true" className="text-[#b42318]"> *</span>
            </label>
          </div>
          {touched.declarationAccurate && errors.declarationAccurate ? (
            <p id="err-declarationAccurate" className="field-error" role="alert">{errors.declarationAccurate}</p>
          ) : null}

          <div className="flex items-start gap-3">
            <input
              id="f-declarationRules" name="declarationRules" type="checkbox"
              className="mt-1 h-5 w-5 accent-[#0e284c]" checked={values.declarationRules}
              onChange={(e) => set("declarationRules", e.target.checked)}
              onBlur={() => markTouched("declarationRules")}
              aria-invalid={touched.declarationRules && errors.declarationRules ? true : undefined}
              aria-describedby={errors.declarationRules ? "err-declarationRules" : undefined}
            />
            <label htmlFor="f-declarationRules" className="text-[0.95rem] leading-relaxed text-navy-800">
              14. I agree to follow the rules and regulations of IMUN.
              <span aria-hidden="true" className="text-[#b42318]"> *</span>
            </label>
          </div>
          {touched.declarationRules && errors.declarationRules ? (
            <p id="err-declarationRules" className="field-error" role="alert">{errors.declarationRules}</p>
          ) : null}
        </div>
      </fieldset>

      {/* Honeypot — hidden from real users and assistive tech. */}
      <div className="absolute -left-[9999px] top-[-9999px]" aria-hidden="true">
        <label htmlFor="f-website">Leave this field empty</label>
        <input id="f-website" name="website" type="text" tabIndex={-1} autoComplete="off" value="" readOnly />
      </div>

      <div className="mt-12 border-t border-steel-200 pt-8">
        {submitError ? (
          <div className="mb-6 rounded-[3px] border border-[#e5b3af] bg-[#fef3f2] p-4 text-[0.92rem] text-[#8a1e15]" role="alert">
            {submitError}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-4">
          <button
            type="submit"
            disabled={submitting || !paymentsLive}
            className="btn btn-primary min-w-[13rem] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? (
              <>
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />
                Please wait…
              </>
            ) : values.paymentOrderId ? (
              "Submit registration"
            ) : (
              `Pay ₹${feeAmountFor().toLocaleString("en-IN")} & register`
            )}
          </button>
          <p className="text-[0.8rem] text-steel-500">
            {paymentsLive
              ? "You can submit this form only once per email address."
              : "Registration is paused until online checkout is available."}
          </p>
        </div>
        <p className="mt-5 text-[0.8rem] leading-relaxed text-steel-400">
          Information collected here is used solely to administer your IMUN registration and is not shared
          beyond the organiser&apos;s secretariat. A draft of your responses is stored on this device, and
          your answers are saved on our servers before you pay so that your registration can be completed
          the moment your payment is confirmed — even if you close this page. That server-side copy is
          deleted on a short automatic cycle, whether or not you go on to pay.
          See the <a href="/privacy" className="underline decoration-brass-600 underline-offset-2">privacy notice</a>.
        </p>
      </div>
    </form>
  );
}