"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { AllocationStatus, PaymentStatus, RegistrationRecord } from "@/lib/validation/registration";
import { allocationStatusLabels } from "@/lib/allocations";
import { committeeName } from "@/lib/display";
import { committees } from "@/lib/config/committees";
import { AllocationMatrix } from "@/components/admin/AllocationMatrix";
import { AllocationEditor } from "@/components/admin/AllocationEditor";

type ListResponse = {
  ok: boolean;
  items: RegistrationRecord[];
  total: number;
  pages: number;
  page: number;
  grandTotal: number;
};

const PAGE_SIZE = 25;

const badgeClass: Record<AllocationStatus, string> = {
  allocated: "border-[#9ec5a4] bg-[#eef7ef] text-[#1f6b34]",
  waitlisted: "border-[#e5cfa0] bg-[#fdf6e6] text-[#8a6215]",
  rejected: "border-[#e5b3af] bg-[#fef3f2] text-[#8a1e15]",
  pending: "border-steel-300 bg-steel-100 text-steel-600",
};

const paymentStatusLabels: Record<PaymentStatus, string> = {
  paid: "Verified",
  unverified: "Unverified",
  pending: "Pending",
  failed: "Failed",
};

const paymentBadgeClass: Record<PaymentStatus, string> = {
  paid: "border-[#9ec5a4] bg-[#eef7ef] text-[#1f6b34]",
  unverified: "border-[#e5cfa0] bg-[#fdf6e6] text-[#8a6215]",
  pending: "border-steel-300 bg-steel-100 text-steel-600",
  failed: "border-[#e5b3af] bg-[#fef3f2] text-[#8a1e15]",
};

export function RegistrationsDashboard({ email }: { email: string }) {
  const router = useRouter();
  const [tab, setTab] = useState<"registrations" | "allocations">("registrations");
  const [refreshKey, setRefreshKey] = useState(0);
  const [items, setItems] = useState<RegistrationRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [grandTotal, setGrandTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [committee, setCommittee] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState("createdAt");
  const [dir, setDir] = useState<"asc" | "desc">("desc");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const load = useCallback(
    async (params: { search: string; committee: string; status: string; page: number; sort: string; dir: "asc" | "desc" }) => {
      setLoading(true);
      setError(null);
      try {
        const qs = new URLSearchParams({
          search: params.search,
          committee: params.committee,
          status: params.status,
          sort: params.sort,
          dir: params.dir,
          page: String(params.page),
          pageSize: String(PAGE_SIZE),
        });
        const res = await fetch(`/api/admin/registrations?${qs}`, { cache: "no-store" });
        if (res.status === 401) {
          router.push("/admin/login");
          return;
        }
        const data = (await res.json().catch(() => ({}))) as ListResponse;
        if (!res.ok) throw new Error("Could not load registrations.");
        setItems(data.items ?? []);
        setTotal(data.total ?? 0);
        setGrandTotal(data.grandTotal ?? data.total ?? 0);
        setPages(data.pages ?? 1);
        setPage(data.page ?? 1);
      } catch {
        setError("Could not load registrations. Try again.");
      } finally {
        setLoading(false);
      }
    },
    [router]
  );

  const searchTimeout = useRef<number | null>(null);

  // Reload when search/committee/status/sort/page change (debounced for text input).
  useEffect(() => {
    if (searchTimeout.current) window.clearTimeout(searchTimeout.current);
    searchTimeout.current = window.setTimeout(() => {
      load({ search, committee, status, page, sort, dir });
    }, 250);
    return () => {
      if (searchTimeout.current) window.clearTimeout(searchTimeout.current);
    };
  }, [search, committee, status, page, sort, dir, load]);

  function toggleSort(column: string) {
    if (sort === column) {
      setDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSort(column);
      setDir("asc");
    }
    setPage(1);
  }

  const handleSaved = useCallback((updated: RegistrationRecord) => {
    setItems((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    setRefreshKey((k) => k + 1);
  }, []);

  async function logout() {
    try {
      await fetch("/api/admin/logout", { method: "POST" });
    } finally {
      router.push("/admin/login");
      router.refresh();
    }
  }

  const sortIcon = (column: string) =>
    sort !== column ? (
      <span aria-hidden="true" className="text-steel-300">↕</span>
    ) : dir === "asc" ? (
      <span aria-hidden="true">↑</span>
    ) : (
      <span aria-hidden="true">↓</span>
    );

  return (
    <div>
      <div className="border-b border-steel-200 bg-white">
        <div className="container-site flex flex-wrap items-center justify-between gap-4 py-5">
          <div>
            <p className="kicker flex items-center gap-3">
              <span aria-hidden="true" className="inline-block h-1.5 w-1.5 rounded-full bg-brass-600" />
              Organisers&apos; area
            </p>
            <h1 className="mt-3 font-display text-[1.8rem] font-medium text-navy-900">
              {tab === "registrations" ? "Registrations" : "Allocation matrix"}
            </h1>
          </div>
          <div className="flex items-center gap-4 text-[0.85rem] text-steel-500">
            <span>{email}</span>
            <button type="button" onClick={logout} className="font-semibold text-navy-700 underline decoration-brass-600 underline-offset-2 hover:text-navy-500">
              Sign out
            </button>
          </div>
        </div>
        <div className="container-site">
          <div className="flex gap-1" role="tablist" aria-label="Admin sections">
            {([
              ["registrations", "Registrations"],
              ["allocations", "Allocation matrix"],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={tab === key}
                onClick={() => setTab(key)}
                className={`-mb-px border-b-2 px-4 py-3 text-[0.9rem] font-semibold transition-colors ${
                  tab === key
                    ? "border-brass-600 text-navy-900"
                    : "border-transparent text-steel-500 hover:text-navy-700"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="container-site">
        {tab === "allocations" ? (
          <AllocationMatrix refreshKey={refreshKey} />
        ) : (
          <div className="py-6">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="min-w-[14rem] flex-1">
                <label className="sr-only" htmlFor="q-search">Search registrations</label>
                <input
                  ref={inputRef}
                  id="q-search"
                  type="search"
                  placeholder="Search name, email, school, country…"
                  className="input"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
              <div className="w-44">
                <label className="sr-only" htmlFor="q-committee">Filter by committee</label>
                <select id="q-committee" className="select" value={committee} onChange={(e) => { setCommittee(e.target.value); setPage(1); }}>
                  <option value="">All committees</option>
                  {committees.map((c) => (
                    <option key={c.code} value={c.code}>{c.code}</option>
                  ))}
                </select>
              </div>
              <div className="w-44">
                <label className="sr-only" htmlFor="q-status">Filter by allocation status</label>
                <select id="q-status" className="select" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
                  <option value="">All statuses</option>
                  {(Object.keys(allocationStatusLabels) as AllocationStatus[]).map((s) => (
                    <option key={s} value={s}>{allocationStatusLabels[s]}</option>
                  ))}
                </select>
              </div>
              <a
                href={`/api/admin/registrations/export?search=${encodeURIComponent(search)}&committee=${encodeURIComponent(committee)}&status=${encodeURIComponent(status)}`}
                className="btn btn-outline"
                download
              >
                Export CSV
              </a>
            </div>

            {error ? (
              <p className="mt-6 rounded-[3px] border border-[#e5b3af] bg-[#fef3f2] p-4 text-[0.92rem] text-[#8a1e15]" role="alert">
                {error}
              </p>
            ) : null}

            {/* Table */}
            <div className="mt-6 overflow-x-auto border border-steel-200 bg-white shadow-[var(--shadow-card)]">
              <table className="admin-table min-w-[70rem]">
                <caption className="sr-only">Delegate registrations. {total} records.</caption>
                <thead>
                  <tr>
                    <th><button type="button" onClick={() => toggleSort("createdAt")} className="inline-flex items-center gap-1.5">Received {sortIcon("createdAt")}</button></th>
                    <th><button type="button" onClick={() => toggleSort("fullName")} className="inline-flex items-center gap-1.5">Delegate {sortIcon("fullName")}</button></th>
                    <th>Email</th>
                    <th><button type="button" onClick={() => toggleSort("schoolName")} className="inline-flex items-center gap-1.5">School {sortIcon("schoolName")}</button></th>
                    <th>Grade</th>
                    <th>MUNs</th>
                    <th>Committee preferences</th>
                    <th><button type="button" onClick={() => toggleSort("countryPreference")} className="inline-flex items-center gap-1.5">Country {sortIcon("countryPreference")}</button></th>
                    <th>Payment</th>
                    <th><button type="button" onClick={() => toggleSort("feeAmount")} className="inline-flex items-center gap-1.5">Fee {sortIcon("feeAmount")}</button></th>
                    <th>Allocation</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={11} className="py-10 text-center text-[0.9rem] text-steel-400">Loading registrations…</td>
                    </tr>
                  ) : items.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-10 text-center text-[0.9rem] text-steel-400">
                        {grandTotal === 0
                          ? "No registrations yet."
                          : "No registrations match your filters."}
                      </td>
                    </tr>
                  ) : (
                    items.map((r) => (
                      <tr key={r.id} className="cursor-pointer" onClick={() => setDetailId(r.id)}>
                        <td className="whitespace-nowrap text-[0.8rem] text-steel-500">{new Date(r.createdAt).toLocaleString("en-IN")}</td>
                        <td className="font-semibold text-navy-900">{r.fullName}</td>
                        <td className="text-steel-600">{r.email}</td>
                        <td className="text-steel-600">{r.schoolName}</td>
                        <td>{r.grade}</td>
                        <td>{r.munCount}</td>
                        <td>
                          <span className="inline-flex flex-wrap gap-1">
                            {[r.committeePref1, r.committeePref2, r.committeePref3].map((c, i) => (
                              <span key={c} className={`rounded-[3px] border px-1.5 py-0.5 text-[0.72rem] ${i === 0 ? "border-navy-300 bg-navy-50 text-navy-700" : "border-steel-200 text-steel-500"}`} title={committeeName(c)}>
                                {c}<span className="sr-only"> — {committeeName(c)}</span>
                              </span>
                            ))}
                          </span>
                        </td>
                        <td className="text-steel-600">{r.countryPreference || "—"}</td>
                        <td>
                          <span className="inline-flex flex-col gap-1">
                            <span className={`inline-flex w-fit rounded-[3px] border px-1.5 py-0.5 text-[0.72rem] font-semibold ${paymentBadgeClass[r.paymentStatus] ?? paymentBadgeClass.pending}`}>
                              {paymentStatusLabels[r.paymentStatus] ?? r.paymentStatus}
                            </span>
                            <span className="font-mono text-[0.72rem] text-steel-500">
                              {r.paymentUtr || r.paymentReference || "—"}
                            </span>
                          </span>
                        </td>
                        <td className="whitespace-nowrap text-steel-600">₹{r.feeAmount.toLocaleString("en-IN")}</td>
                        <td>
                          <span className="inline-flex flex-col gap-1">
                            <span className={`inline-flex w-fit rounded-[3px] border px-1.5 py-0.5 text-[0.72rem] font-semibold ${badgeClass[r.allocationStatus]}`}>
                              {allocationStatusLabels[r.allocationStatus]}
                            </span>
                            {r.allocationStatus === "allocated" && r.allocatedCommittee ? (
                              <span className="text-[0.75rem] text-steel-500">
                                {r.allocatedCommittee}{r.allocatedPortfolio ? ` · ${r.allocatedPortfolio}` : ""}
                              </span>
                            ) : null}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-[0.85rem] text-steel-500">
              <p>
                {total === 0 ? "No records" : `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, total)} of ${total} records`}
              </p>
              <div className="flex items-center gap-2">
                <button type="button" disabled={page <= 1 || loading} onClick={() => setPage((p) => Math.max(1, p - 1))} className="btn btn-outline !px-4 !py-2 disabled:opacity-40">
                  Previous
                </button>
                <span>Page {page} of {pages}</span>
                <button type="button" disabled={page >= pages || loading} onClick={() => setPage((p) => Math.min(pages, p + 1))} className="btn btn-outline !px-4 !py-2 disabled:opacity-40">
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {detailId ? (
        <RegistrationDetail id={detailId} onClose={() => setDetailId(null)} onSaved={handleSaved} />
      ) : null}
    </div>
  );
}

function RegistrationDetail({
  id,
  onClose,
  onSaved,
}: {
  id: string;
  onClose: () => void;
  onSaved: (record: RegistrationRecord) => void;
}) {
  const [record, setRecord] = useState<RegistrationRecord | null>(null);
  const [missing, setMissing] = useState(false);
  const [loading, setLoading] = useState(true);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    let alive = true;
    fetch(`/api/admin/registrations/${encodeURIComponent(id)}`, { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error();
        const data = (await res.json()) as { record: RegistrationRecord };
        if (alive) { setRecord(data.record); setLoading(false); }
      })
      .catch(() => {
        if (alive) { setMissing(true); setLoading(false); }
      });
    return () => {
      alive = false;
    };
  }, [id]);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const rows: Array<[string, string]> = record
    ? [
        ["Full name", record.fullName],
        ["Email", record.email],
        ["Contact number", record.contactNumber],
        ["School", record.schoolName],
        ["Grade / class", record.grade],
        ["Prior MUNs", record.munCount],
        ["MUN history", record.munHistory || "—"],
        ["Committee preference 1", `${record.committeePref1} — ${committeeName(record.committeePref1)}`],
        ["Committee preference 2", `${record.committeePref2} — ${committeeName(record.committeePref2)}`],
        ["Committee preference 3", `${record.committeePref3} — ${committeeName(record.committeePref3)}`],
        ["Preferred country / portfolio", record.countryPreference || "—"],
        ["Special request", record.specialRequest || "—"],
        ["Payment status", paymentStatusLabels[record.paymentStatus] ?? record.paymentStatus],
        ["Payment reference", record.paymentReference || "—"],
        ["Payment UTR", record.paymentUtr || "—"],
        ["Payment order ID", record.paymentOrderId || "—"],
        ["Payment payer", record.paymentPayer || "—"],
        ["Paid at", record.paidAt ? new Date(record.paidAt).toLocaleString("en-IN") : "—"],
        ["Expected fee", `₹${record.feeAmount.toLocaleString("en-IN")}`],
        ["Received at", new Date(record.createdAt).toLocaleString("en-IN")],
        ["Record ID", record.id],
      ]
    : [];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-navy-950/55 p-4" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-label="Registration details" className="max-h-[85dvh] w-full max-w-2xl overflow-y-auto bg-white shadow-[var(--shadow-lift)]">
        <div className="flex items-center justify-between border-b border-steel-200 px-6 py-4">
          <h2 className="font-display text-[1.3rem] font-medium text-navy-900">Registration details</h2>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Close details" className="btn btn-outline !px-3 !py-2">
            Close
          </button>
        </div>
        <div className="px-6 py-6">
          {loading ? (
            <p className="text-[0.9rem] text-steel-400">Loading…</p>
          ) : missing || !record ? (
            <p className="text-[0.9rem] text-[#8a1e15]">Record not found.</p>
          ) : (
            <dl className="divide-y divide-steel-100">
              {rows.map(([label, value]) => (
                <div key={label} className="grid grid-cols-1 gap-1 py-3 sm:grid-cols-[220px_1fr] sm:gap-6">
                  <dt className="eyebrow-doc !text-steel-500">{label}</dt>
                  <dd className="break-words text-[0.95rem] text-navy-900">{value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
        {record ? (
          <AllocationEditor
            key={record.id}
            record={record}
            onSaved={(updated) => {
              setRecord(updated);
              onSaved(updated);
            }}
          />
        ) : null}
      </div>
    </div>
  );
}
