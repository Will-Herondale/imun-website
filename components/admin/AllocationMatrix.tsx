"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { AllocationSummary } from "@/lib/allocations";

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="border border-steel-200 bg-white p-5 shadow-[var(--shadow-card)]">
      <p className="eyebrow-doc !text-steel-500">{label}</p>
      <p className="mt-3 font-display text-[1.9rem] font-medium leading-none text-navy-900">{value}</p>
      {hint ? <p className="mt-2 text-[0.8rem] text-steel-400">{hint}</p> : null}
    </div>
  );
}

export function AllocationMatrix({ refreshKey }: { refreshKey: number }) {
  const router = useRouter();
  const [summary, setSummary] = useState<AllocationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/allocations", { cache: "no-store" });
      if (res.status === 401) {
        router.push("/admin/login");
        return;
      }
      const data = (await res.json().catch(() => ({}))) as { summary?: AllocationSummary };
      if (!res.ok || !data.summary) throw new Error();
      setSummary(data.summary);
    } catch {
      setError("Could not load the allocation matrix. Try again.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load, refreshKey]);

  if (loading && !summary) {
    return <p className="py-10 text-center text-[0.9rem] text-steel-400">Loading allocation matrix…</p>;
  }
  if (error || !summary) {
    return (
      <p className="mt-6 rounded-[3px] border border-[#e5b3af] bg-[#fef3f2] p-4 text-[0.92rem] text-[#8a1e15]" role="alert">
        {error ?? "Could not load the allocation matrix."}
      </p>
    );
  }

  const { totals, committees, schools } = summary;

  return (
    <div className="py-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Registrations" value={String(totals.total)} />
        <StatCard label="Allocated" value={String(totals.allocated)} />
        <StatCard label="Pending" value={String(totals.pending)} />
        <StatCard label="Waitlisted" value={String(totals.waitlisted)} />
        <StatCard label="Not selected" value={String(totals.rejected)} />
        <StatCard
          label="Seats filled"
          value={`${totals.seatsFilled}/${totals.seats}`}
          hint={`${totals.fillRate}% · ${totals.seatsRemaining} left`}
        />
      </div>

      <div className="mt-8 overflow-x-auto border border-steel-200 bg-white shadow-[var(--shadow-card)]">
        <table className="admin-table min-w-[62rem]">
          <caption className="sr-only">Committee allocation matrix: seats, allocations and preference demand.</caption>
          <thead>
            <tr>
              <th>Committee</th>
              <th className="text-right">Seats</th>
              <th className="text-right">Allocated</th>
              <th className="text-right">Remaining</th>
              <th className="text-right">Waitlist</th>
              <th className="text-right">1st pref</th>
              <th className="text-right">2nd pref</th>
              <th className="text-right">3rd pref</th>
              <th className="text-right">Total demand</th>
              <th>Fill</th>
            </tr>
          </thead>
          <tbody>
            {committees.map((c) => {
              const pct = c.seats > 0 ? Math.min(100, Math.round((c.allocated / c.seats) * 100)) : 0;
              const over = c.allocated > c.seats;
              return (
                <tr key={c.code}>
                  <td className="whitespace-nowrap">
                    <span className="font-semibold text-navy-900">{c.code}</span>
                    <span className="ml-2 text-[0.85rem] text-steel-500">{c.name}</span>
                  </td>
                  <td className="text-right">{c.seats}</td>
                  <td className="text-right font-semibold text-navy-900">{c.allocated}</td>
                  <td className={`text-right ${over ? "font-semibold text-[#8a1e15]" : ""}`}>{c.remaining}</td>
                  <td className="text-right text-steel-500">{c.waitlisted || "—"}</td>
                  <td className="text-right">{c.pref1}</td>
                  <td className="text-right">{c.pref2}</td>
                  <td className="text-right">{c.pref3}</td>
                  <td className="text-right text-steel-500">{c.demand}</td>
                  <td>
                    <span className="flex items-center gap-2">
                      <span className="block h-1.5 w-24 overflow-hidden rounded-full bg-steel-100">
                        <span
                          className={`block h-full ${over ? "bg-[#b4462f]" : "bg-azure-600"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </span>
                      <span className="text-[0.78rem] text-steel-500">{pct}%</span>
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-8 border border-steel-200 bg-white shadow-[var(--shadow-card)]">
        <div className="border-b border-steel-200 px-5 py-4">
          <h2 className="font-display text-[1.15rem] font-medium text-navy-900">By school</h2>
        </div>
        <div className="max-h-[22rem] overflow-y-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th>School</th>
                <th className="text-right">Registrations</th>
                <th className="text-right">Allocated</th>
              </tr>
            </thead>
            <tbody>
              {schools.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-[0.9rem] text-steel-400">No registrations yet.</td>
                </tr>
              ) : (
                schools.map((s) => (
                  <tr key={s.school}>
                    <td className="text-navy-900">{s.school}</td>
                    <td className="text-right">{s.total}</td>
                    <td className="text-right font-semibold text-navy-900">{s.allocated}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
