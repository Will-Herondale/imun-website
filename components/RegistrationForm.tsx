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
const PAYMENT_KEY = "iemun:payment:orderId:v1";

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
  const [manualMode, setManualMode] = useState(false);
  const [paymentNotice, setPaymentNotice] = useState<string | null>(null);
  const [awaitingPayment, setAwaitingPayment] = useState(false);
  const formRef = useRef<HTMLFormElement | null>(null);
  const autoSubmittedRef = useRef(false);
  const startedRef = useRef(false);
  const submitRegistrationRef = useRef<((override?: Partial<Values>) => Promise<void>) | null>(null);

  // Draft recovery (device-local, never synced).
  useEffect(() => {
    if (result) return;
    try {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify(values));
    } catch {
      /* storage full or unavailable — ignore */
    }
  }, [values, result]);

  useEffect(() => {
    if (manualMode) track("payment_manual_fallback");
  }, [manualMode]);

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
    if (!paymentsLive && !v.paymentOrderId) {
      const ref = v.paymentReference.trim();
      if (ref.length < 6) errs.paymentReference = "Enter the payment reference / UTR from your payment confirmation.";
      else if (!/^[A-Za-z0-9][A-Za-z0-9\-/ .]{5,39}$/.test(ref)) errs.paymentReference = "Payment reference contains invalid characters.";
    }
    return errs;
  }, [paymentsLive]);

  const submitRegistration = useCallback(
    async (override?: Partial<Values>) => {
      if (submitting || result) return;
      const v = { ...values, ...override };

      const manualRef = v.paymentReference.trim();
      if (!v.paymentOrderId && manualMode && manualRef.length > 0 && !/^[A-Za-z0-9][A-Za-z0-9\-/ .]{5,39}$/.test(manualRef)) {
        setErrors((e) => ({ ...e, paymentReference: "Payment reference contains invalid characters." }));
        setTouched((t) => ({ ...t, paymentReference: true }));
        return;
      }

      const honeypot = new FormData(formRef.current ?? undefined)
        .get("website")
        ?.toString()
        .trim();

      setSubmitting(true);
      setSubmitError(null);
      try {
        const payload: RegistrationInput & { website?: string } = {
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
          website: honeypot,
        };
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
            window.localStorage.removeItem(PAYMENT_KEY);
          } catch {
            /* ignore */
          }
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
    [values, submitting, result, manualMode]
  );

  useEffect(() => {
    submitRegistrationRef.current = submitRegistration;
  }, [submitRegistration]);

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

    // Manual-only mode, an already-verified order id, or a manual UTR → submit.
    if (!paymentsLive || values.paymentOrderId || values.paymentReference.trim()) {
      await submitRegistration();
      return;
    }

    // Otherwise start the automated secure checkout.
    setSubmitting(true);
    try {
      const res = await fetch("/api/payments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: values.fullName }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        orderId?: string;
        checkoutUrl?: string;
        error?: string;
      };
      if (res.ok && data.orderId && data.checkoutUrl) {
        try {
          window.localStorage.setItem(PAYMENT_KEY, data.orderId);
        } catch {
          /* storage unavailable — the order id is also returned after redirect via polling */
        }
        track("payment_initiated", {
          value: feeAmountFor(),
          currency: "INR",
          round: registrationRoundFor().label,
        });
        window.location.assign(data.checkoutUrl);
        return;
      }
      // Automated payment not available — reveal the manual fallback.
      setManualMode(true);
      setPaymentNotice(
        res.status === 503
          ? "Online checkout is temporarily unavailable. Pay the fee from any UPI app and enter the transaction ID / UTR below."
          : data.error ?? "We could not start the online payment. Pay from any UPI app and enter the transaction ID / UTR below."
      );
    } catch {
      setManualMode(true);
      setPaymentNotice(
        "We could not start the online payment. Pay the fee from any UPI app and enter the transaction ID / UTR below."
      );
    } finally {
      setSubmitting(false);
    }
  }

  // Returning from the hosted checkout: confirm the order, then submit.
  useEffect(() => {
    if (result || autoSubmittedRef.current) return;
    let orderId = "";
    try {
      orderId = window.localStorage.getItem(PAYMENT_KEY) ?? "";
    } catch {
      return;
    }
    if (!orderId) return;
    autoSubmittedRef.current = true;

    let cancelled = false;
    const poll = async () => {
      setAwaitingPayment(true);
      for (let attempt = 0; attempt < 60 && !cancelled; attempt += 1) {
        try {
          const res = await fetch(`/api/payments/status?orderId=${encodeURIComponent(orderId)}`);
          if (res.ok) {
            const data = (await res.json()) as { status?: string };
            if (data.status === "success") {
              setValues((v) => ({ ...v, paymentOrderId: orderId, paymentReference: "" }));
              setAwaitingPayment(false);
              await submitRegistrationRef.current?.({
                paymentOrderId: orderId,
                paymentReference: "",
              });
              return;
            }
            if (data.status === "expired") break;
          }
        } catch {
          /* transient — keep polling */
        }
        await new Promise((r) => setTimeout(r, 4000));
      }
      if (cancelled) return;
      setAwaitingPayment(false);
      try {
        window.localStorage.removeItem(PAYMENT_KEY);
      } catch {
        /* ignore */
      }
      setPaymentNotice("We could not confirm that payment. If money left your account, contact the secretariat; otherwise try again.");
    };
    void poll();
    return () => {
      cancelled = true;
    };
    // Intentionally runs once on mount.
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
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-brass-700">Payment recorded — awaiting verification</p>
              <p className="mt-3 max-w-xl text-[0.92rem] leading-relaxed text-steel-600">
                {values.paymentReference.trim() ? (
                  <>
                    We have logged your payment reference{" "}
                    <span className="font-mono font-semibold text-navy-900">{values.paymentReference}</span> for
                    verification against the wallet.{" "}
                  </>
                ) : null}
                Your seat is confirmed once the secretariat matches the transfer.
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
                Paying another way? You can send the fee to{" "}
                <span className="font-mono font-semibold text-navy-900">{site.payment.walletId}</span> and record the
                transaction ID / UTR instead.
              </p>
            </>
          ) : (
            <>
              <p className="mt-3 max-w-2xl text-[0.92rem] leading-relaxed text-steel-600">
                {site.payment.setupNotice}
              </p>
              <dl className="mt-5 flex flex-wrap items-baseline gap-x-10 gap-y-3">
                <div>
                  <dt className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-steel-500">Pay from</dt>
                  <dd className="mt-1.5 font-semibold text-navy-900">Any UPI app</dd>
                </div>
                <div>
                  <dt className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-steel-500">Wallet ID</dt>
                  <dd className="mt-1.5 font-mono text-[0.95rem] font-semibold text-navy-900">{site.payment.walletId}</dd>
                </div>
              </dl>
            </>
          )}
        </div>

        {awaitingPayment ? (
          <div className="mt-6 flex items-start gap-3 border border-brass-500/40 bg-brass-50/60 p-4 text-[0.9rem] text-navy-800" role="status" aria-live="polite">
            <span className="mt-0.5 inline-block h-4 w-4 animate-spin rounded-full border-2 border-brass-500/40 border-t-brass-600" aria-hidden="true" />
            <span>Waiting for your payment to be confirmed — please don&apos;t close this tab.</span>
          </div>
        ) : null}

        {paymentNotice ? (
          <div className="mt-6 rounded-[3px] border border-brass-500/40 bg-brass-50/60 p-4 text-[0.9rem] text-brass-800" role="status">
            {paymentNotice}
          </div>
        ) : null}

        <div className="mt-6 sm:max-w-md">
          <label className="field-label" htmlFor="f-paymentReference">
            13. UPI transaction ID / UTR{" "}
            {!paymentsLive || manualMode ? (
              <span aria-hidden="true" className="text-[#b42318]">*</span>
            ) : (
              <span className="text-steel-500">(optional if you use the secure checkout)</span>
            )}
          </label>
          <input
            id="f-paymentReference" name="paymentReference" type="text" autoComplete="off"
            className="input font-mono" value={values.paymentReference} placeholder="e.g. 412345678901"
            onChange={(e) => set("paymentReference", e.target.value)}
            onBlur={() => markTouched("paymentReference")}
            aria-invalid={touched.paymentReference && errors.paymentReference ? true : undefined}
            aria-describedby={errors.paymentReference ? "err-paymentReference" : "hint-paymentReference"}
          />
          <span id="hint-paymentReference" className="field-hint">
            Shown in your UPI app&apos;s payment confirmation (UTRs are usually 12 digits).
            {paymentsLive && !manualMode ? " Leave blank if you use the secure checkout." : ""}
          </span>
          {touched.paymentReference && errors.paymentReference ? <p id="err-paymentReference" className="field-error" role="alert">{errors.paymentReference}</p> : null}
        </div>
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
              14. I confirm that the information provided above is accurate.
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
              15. I agree to follow the rules and regulations of IMUN.
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
          <button type="submit" disabled={submitting} className="btn btn-primary min-w-[13rem] disabled:cursor-not-allowed disabled:opacity-60">
            {submitting ? (
              <>
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />
                {awaitingPayment ? "Verifying payment…" : "Please wait…"}
              </>
            ) : !paymentsLive || values.paymentOrderId || values.paymentReference.trim() ? (
              "Submit registration"
            ) : (
              `Pay ₹${feeAmountFor().toLocaleString("en-IN")} & submit`
            )}
          </button>
          <p className="text-[0.8rem] text-steel-500">
            You can submit this form only once per email address.
          </p>
        </div>
        <p className="mt-5 text-[0.8rem] leading-relaxed text-steel-400">
          Information collected here is used solely to administer your IMUN registration and is not shared
          beyond the organiser&apos;s secretariat. A draft of your responses is stored on this device so that
          you can recover them if you close the page; it is deleted when your registration is accepted.
          See the <a href="/privacy" className="underline decoration-brass-600 underline-offset-2">privacy notice</a>.
        </p>
      </div>
    </form>
  );
}