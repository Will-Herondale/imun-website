"use client";

import { useState } from "react";
import { committees } from "@/lib/config/committees";
import {
  allocationStatusOptions,
  type AllocationStatus,
  type RegistrationRecord,
} from "@/lib/validation/registration";

const STATUS_LABELS: Record<AllocationStatus, string> = {
  pending: "Pending review",
  allocated: "Allocated",
  waitlisted: "Waitlisted",
  rejected: "Not selected",
};

export function AllocationEditor({
  record,
  onSaved,
}: {
  record: RegistrationRecord;
  onSaved: (record: RegistrationRecord) => void;
}) {
  const [status, setStatus] = useState<AllocationStatus>(record.allocationStatus);
  const [committee, setCommittee] = useState(record.allocatedCommittee);
  const [portfolio, setPortfolio] = useState(record.allocatedPortfolio);
  const [notes, setNotes] = useState(record.allocationNotes);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function save() {
    if (busy) return;
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch(`/api/admin/registrations/${encodeURIComponent(record.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          allocationStatus: status,
          allocatedCommittee: committee,
          allocatedPortfolio: portfolio,
          allocationNotes: notes,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        record?: RegistrationRecord;
        error?: string;
      };
      if (!res.ok || !data.record) throw new Error(data.error ?? "Could not save.");
      setSaved(true);
      onSaved(data.record);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border-t border-steel-200 bg-steel-50/60 px-6 py-6">
      <p className="eyebrow-doc">Allocation</p>
      <p className="mt-2 text-[0.85rem] text-steel-500">
        Assign this delegate to a committee and record their portfolio. Saved
        allocations appear on the public Allocations page once released.
      </p>

      <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label className="field-label" htmlFor="alloc-status">Status</label>
          <select
            id="alloc-status"
            className="select"
            value={status}
            onChange={(e) => { setStatus(e.target.value as AllocationStatus); setSaved(false); }}
          >
            {allocationStatusOptions.map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="field-label" htmlFor="alloc-committee">Committee</label>
          <select
            id="alloc-committee"
            className="select"
            value={committee}
            onChange={(e) => { setCommittee(e.target.value); setSaved(false); }}
          >
            <option value="">Not assigned</option>
            {committees.map((c) => (
              <option key={c.code} value={c.code}>{c.code} — {c.name}</option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2">
          <label className="field-label" htmlFor="alloc-portfolio">Portfolio / country</label>
          <input
            id="alloc-portfolio"
            className="input"
            maxLength={80}
            placeholder={record.countryPreference || "e.g. United States"}
            value={portfolio}
            onChange={(e) => { setPortfolio(e.target.value); setSaved(false); }}
          />
          {record.countryPreference ? (
            <button
              type="button"
              className="mt-2 text-[0.8rem] font-semibold text-navy-700 underline decoration-azure-600 underline-offset-2 hover:text-navy-500"
              onClick={() => { setPortfolio(record.countryPreference); setSaved(false); }}
            >
              Use their preference: {record.countryPreference}
            </button>
          ) : null}
        </div>

        <div className="sm:col-span-2">
          <label className="field-label" htmlFor="alloc-notes">Secretariat notes (private)</label>
          <textarea
            id="alloc-notes"
            className="input min-h-[5rem]"
            maxLength={1000}
            value={notes}
            onChange={(e) => { setNotes(e.target.value); setSaved(false); }}
          />
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button type="button" onClick={save} disabled={busy} className="btn btn-primary disabled:cursor-not-allowed disabled:opacity-60">
          {busy ? "Saving…" : "Save allocation"}
        </button>
        {saved ? <span className="text-[0.85rem] font-semibold text-[#1f6b34]">Saved.</span> : null}
        {error ? <span className="text-[0.85rem] text-[#8a1e15]" role="alert">{error}</span> : null}
      </div>
    </div>
  );
}
