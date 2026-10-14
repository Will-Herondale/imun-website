"use client";

import { useEffect, useRef, useState } from "react";
import { committees } from "@/lib/config/committees";
import {
  munCountOptions,
  munHistoryFormat,
  type MunCount,
  type RegistrationRecord,
} from "@/lib/validation/registration";

/** The statuses an organiser can assign by hand — `failed` is gateway-managed. */
type AdminPaymentStatus = "paid" | "unverified" | "pending";

const PAYMENT_LABELS: Record<AdminPaymentStatus, string> = {
  paid: "Paid — transfer confirmed",
  unverified: "Unverified — transfer still to be checked",
  pending: "Pending — not paid yet",
};

type Props = {
  onClose: () => void;
  /** Called after the server created the row. */
  onCreated: (record: RegistrationRecord) => void;
  /** Called when the email already has a record, so the caller can show it. */
  onOpenExisting: (id: string) => void;
};

export function AddDelegateDialog({ onClose, onCreated, onOpenExisting }: Props) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [grade, setGrade] = useState("");
  const [munCount, setMunCount] = useState<MunCount>("0");
  const [munHistory, setMunHistory] = useState("");
  const [committeePref1, setPref1] = useState("");
  const [committeePref2, setPref2] = useState("");
  const [committeePref3, setPref3] = useState("");
  const [countryPreference, setCountry] = useState("");
  const [specialRequest, setSpecial] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<AdminPaymentStatus>("paid");
  const [paymentUtr, setPaymentUtr] = useState("");
  const [paymentPayer, setPaymentPayer] = useState("");

  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [existingId, setExistingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const onCloseRef = useRef(onClose);
  const busyRef = useRef(false);
  useEffect(() => {
    onCloseRef.current = onClose;
  });
  useEffect(() => {
    busyRef.current = busy;
  }, [busy]);

  /* Mount-only: the parent passes a fresh onClose on every render, so using it
     as an effect dep re-fired focus() mid-typing and jumped the dialog back
     to the top. */
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busyRef.current) onCloseRef.current();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    setFields({});
    setExistingId(null);
    try {
      const res = await fetch("/api/admin/registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          email,
          contactNumber,
          schoolName,
          grade,
          munCount,
          munHistory,
          committeePref1,
          committeePref2,
          committeePref3,
          countryPreference,
          specialRequest,
          paymentStatus,
          paymentUtr,
          paymentPayer,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        record?: RegistrationRecord;
        fields?: Record<string, string>;
        existingId?: string;
        error?: string;
      };
      if (res.status === 201 && data.record) {
        onCreated(data.record);
        return;
      }
      if (res.status === 401) {
        setError("Your session has expired. Sign in again to continue.");
        return;
      }
      if (res.status === 409 && data.existingId) {
        setExistingId(data.existingId);
        setError(data.error ?? "That email already has a registration.");
        return;
      }
      if (res.status === 422 && data.fields) {
        setFields(data.fields);
        setError(data.error ?? "Check the highlighted fields.");
        return;
      }
      setError(data.error ?? "Could not save this registration. Try again.");
    } catch {
      setError("Could not save this registration. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const err = (name: string) =>
    fields[name] ? (
      <span className="mt-1 block text-[0.78rem] text-[#8a1e15]" role="alert">
        {fields[name]}
      </span>
    ) : null;

  const committeeSelect = (
    id: string,
    label: string,
    value: string,
    onChange: (v: string) => void
  ) => (
    <div>
      <label className="field-label" htmlFor={id}>{label}</label>
      <select
        id={id}
        className="select"
        aria-invalid={fields[id] ? "true" : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Not chosen</option>
        {committees.map((c) => (
          <option key={c.code} value={c.code}>{c.code} — {c.name}</option>
        ))}
      </select>
      {err(id)}
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-navy-950/55 p-4"
      role="presentation"
      onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-delegate-title"
        className="max-h-[calc(100svh-2rem)] w-full max-w-3xl overflow-y-auto bg-white shadow-[var(--shadow-lift)]"
      >
        <div className="flex items-center justify-between border-b border-steel-200 px-6 py-4">
          <div>
            <p className="kicker">Organisers&apos; area</p>
            <h2 id="add-delegate-title" className="mt-2 font-display text-[1.3rem] font-medium text-navy-900">
              Add a delegate
            </h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
            className="btn btn-outline !px-3 !py-2 disabled:opacity-50"
          >
            Close
          </button>
        </div>

        <form onSubmit={submit}>
          <div className="px-6 py-6">
            <p className="text-[0.85rem] leading-relaxed text-steel-500">
              Use this for delegates you have registered yourself — a bank transfer you
              checked, a walk-in, or someone who never finished the form. Their answers
              and payment details are saved exactly as you enter them, and they appear
              in the list like any other registration.
            </p>

            {error ? (
              <div className="mt-4 rounded-[3px] border border-[#e5b3af] bg-[#fef3f2] p-4" role="alert">
                <p className="text-[0.9rem] font-semibold text-[#8a1e15]">{error}</p>
                {existingId ? (
                  <button
                    type="button"
                    className="mt-2 text-[0.85rem] font-semibold text-navy-700 underline decoration-brass-600 underline-offset-2 hover:text-navy-500"
                    onClick={() => onOpenExisting(existingId)}
                  >
                    Open the existing registration
                  </button>
                ) : null}
              </div>
            ) : null}

            <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label className="field-label" htmlFor="fullName">Full name</label>
                <input id="fullName" className="input" maxLength={120} autoComplete="off"
                  aria-invalid={fields.fullName ? "true" : undefined}
                  value={fullName} onChange={(e) => setFullName(e.target.value)} />
                {err("fullName")}
              </div>
              <div>
                <label className="field-label" htmlFor="email">Email address</label>
                <input id="email" type="email" className="input" maxLength={254} autoComplete="off"
                  aria-invalid={fields.email ? "true" : undefined}
                  value={email} onChange={(e) => setEmail(e.target.value)} />
                {err("email")}
              </div>
              <div>
                <label className="field-label" htmlFor="contactNumber">Contact number</label>
                <input id="contactNumber" className="input" maxLength={20} autoComplete="off" inputMode="tel"
                  aria-invalid={fields.contactNumber ? "true" : undefined}
                  value={contactNumber} onChange={(e) => setContactNumber(e.target.value)} />
                {err("contactNumber")}
              </div>
              <div>
                <label className="field-label" htmlFor="schoolName">School name</label>
                <input id="schoolName" className="input" maxLength={150} autoComplete="off"
                  aria-invalid={fields.schoolName ? "true" : undefined}
                  value={schoolName} onChange={(e) => setSchoolName(e.target.value)} />
                {err("schoolName")}
              </div>
              <div>
                <label className="field-label" htmlFor="grade">Grade / class</label>
                <input id="grade" className="input" maxLength={30} autoComplete="off"
                  aria-invalid={fields.grade ? "true" : undefined}
                  value={grade} onChange={(e) => setGrade(e.target.value)} />
                {err("grade")}
              </div>
              <div>
                <label className="field-label" htmlFor="munCount">Prior MUN conferences</label>
                <select id="munCount" className="select" value={munCount}
                  onChange={(e) => setMunCount(e.target.value as MunCount)}>
                  {munCountOptions.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                {err("munCount")}
              </div>

              <div className="sm:col-span-2">
                <label className="field-label" htmlFor="munHistory">MUN history</label>
                <textarea id="munHistory" className="input min-h-[4.5rem]" maxLength={2400}
                  placeholder={munHistoryFormat}
                  aria-invalid={fields.munHistory ? "true" : undefined}
                  value={munHistory} onChange={(e) => setMunHistory(e.target.value)} />
                <span className="mt-1 block text-[0.78rem] text-steel-500">
                  One per line: {munHistoryFormat}. Leave empty if they have attended none.
                </span>
                {err("munHistory")}
              </div>

              {committeeSelect("committeePref1", "First committee preference", committeePref1, setPref1)}
              {committeeSelect("committeePref2", "Second committee preference", committeePref2, setPref2)}
              {committeeSelect("committeePref3", "Third committee preference", committeePref3, setPref3)}
              <div>
                <label className="field-label" htmlFor="countryPreference">Preferred country / portfolio</label>
                <input id="countryPreference" className="input" maxLength={80} autoComplete="off"
                  aria-invalid={fields.countryPreference ? "true" : undefined}
                  value={countryPreference} onChange={(e) => setCountry(e.target.value)} />
                {err("countryPreference")}
              </div>

              <div className="sm:col-span-2">
                <label className="field-label" htmlFor="specialRequest">Any specific committee or portfolio request?</label>
                <textarea id="specialRequest" className="input min-h-[4rem]" maxLength={1200}
                  value={specialRequest} onChange={(e) => setSpecial(e.target.value)} />
                {err("specialRequest")}
              </div>

              <div className="sm:col-span-2 border-t border-steel-200 pt-5">
                <p className="eyebrow-doc">Payment</p>
                <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-3">
                  <div>
                    <label className="field-label" htmlFor="paymentStatus">Payment status</label>
                    <select id="paymentStatus" className="select" value={paymentStatus}
                      onChange={(e) => setPaymentStatus(e.target.value as AdminPaymentStatus)}>
                      {(Object.keys(PAYMENT_LABELS) as AdminPaymentStatus[]).map((s) => (
                        <option key={s} value={s}>{PAYMENT_LABELS[s]}</option>
                      ))}
                    </select>
                    {err("paymentStatus")}
                  </div>
                  <div>
                    <label className="field-label" htmlFor="paymentUtr">Payment reference / UTR</label>
                    <input id="paymentUtr" className="input" maxLength={40} autoComplete="off"
                      placeholder="From the credit message"
                      aria-invalid={fields.paymentUtr ? "true" : undefined}
                      value={paymentUtr} onChange={(e) => setPaymentUtr(e.target.value)} />
                    {err("paymentUtr")}
                  </div>
                  <div>
                    <label className="field-label" htmlFor="paymentPayer">Sent by</label>
                    <input id="paymentPayer" className="input" maxLength={80} autoComplete="off"
                      placeholder="Payer name, if different"
                      aria-invalid={fields.paymentPayer ? "true" : undefined}
                      value={paymentPayer} onChange={(e) => setPaymentPayer(e.target.value)} />
                    {err("paymentPayer")}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Pinned to the bottom of the dialog's scroll area so the actions
              stay reachable on a phone without scrolling past the form. */}
          <div className="sticky bottom-0 flex flex-wrap items-center gap-3 border-t border-steel-200 bg-steel-50 px-6 py-4">
            <button
              type="submit"
              disabled={busy}
              className="btn btn-primary disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? "Saving…" : "Save delegate"}
            </button>
            <button type="button" onClick={onClose} disabled={busy} className="btn btn-outline disabled:opacity-50">
              Cancel
            </button>
            {fields.form ? (
              <span className="text-[0.85rem] text-[#8a1e15]" role="alert">{fields.form}</span>
            ) : null}
          </div>
        </form>
      </div>
    </div>
  );
}
