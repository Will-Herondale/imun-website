"use client";

import { useCallback, useEffect, useState } from "react";
import type { SiteProfile } from "@/lib/content/profiles";
import { SiteContentEditor } from "@/components/admin/SiteContentEditor";

type ProfileListResponse = { ok: boolean; profiles: SiteProfile[]; activeId: string | null; error?: string };

export function SiteProfilesPanel() {
  const [profiles, setProfiles] = useState<SiteProfile[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [mode, setMode] = useState<"standby" | "full">("standby");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/profiles", { cache: "no-store" });
      const data = (await res.json()) as ProfileListResponse;
      if (!res.ok) throw new Error(data.error || "Failed to load profiles");
      setProfiles(data.profiles);
      setActiveId(data.activeId);
      setSelectedId((cur) => (cur && data.profiles.some((p) => p.id === cur) ? cur : data.activeId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load profiles");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]); // eslint-disable-line react-hooks/set-state-in-effect -- initial data fetch

  async function createProfile() {
    setBusy(true); setError(null);
    try {
      const res = await fetch("/api/admin/profiles", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name || "New profile", mode, fromId: activeId ?? undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Create failed");
      setName("");
      await load();
      setSelectedId(data.profile.id);
    } catch (e) { setError(e instanceof Error ? e.message : "Create failed"); }
    finally { setBusy(false); }
  }

  async function activate(id: string) {
    setBusy(true); setError(null);
    try {
      const res = await fetch(`/api/admin/profiles/${id}/activate`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Activate failed");
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Activate failed"); }
    finally { setBusy(false); }
  }

  async function remove(id: string) {
    if (!confirm("Delete this profile?")) return;
    setBusy(true); setError(null);
    try {
      const res = await fetch(`/api/admin/profiles/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed");
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Delete failed"); }
    finally { setBusy(false); }
  }

  const selected = profiles.find((p) => p.id === selectedId) ?? profiles.find((p) => p.id === activeId) ?? null;

  if (loading) return <p className="text-[0.9rem] text-steel-500">Loading profiles…</p>;

  return (
    <div className="space-y-8 py-8">
      <div className="rounded-[4px] border border-[#e5cfa0] bg-[#fdf9f0] p-4 text-[0.85rem] text-[#6b4f14]">
        <strong>Profiles/presets:</strong> activate a profile to switch what the public website shows. <strong>Standby</strong> shows the one-page coming-soon site. <strong>Full</strong> shows the full event website (home, about, committees, registration, etc.). Event pages auto-redirect to home while a standby profile is active. Content edits save to the selected active profile&apos;s editable fields.
      </div>

      <section className="border border-steel-200 bg-white p-6 shadow-[var(--shadow-card)]">
        <div className="flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="mb-1 block text-[0.75rem] font-semibold uppercase tracking-[0.12em] text-steel-500">New profile name</span>
            <input className="rounded-[3px] border border-steel-200 px-3 py-2 text-[0.92rem]" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. IMUN 2027" />
          </label>
          <label className="block">
            <span className="mb-1 block text-[0.75rem] font-semibold uppercase tracking-[0.12em] text-steel-500">Mode</span>
            <select className="rounded-[3px] border border-steel-200 px-3 py-2 text-[0.92rem]" value={mode} onChange={(e) => setMode(e.target.value as "standby" | "full")}>
              <option value="standby">Standby</option>
              <option value="full">Full site</option>
            </select>
          </label>
          <button type="button" className="btn btn-primary disabled:opacity-60" disabled={busy} onClick={createProfile}>Create profile (copy active)</button>
        </div>
        {error ? <p className="mt-3 text-[0.85rem] text-[#8a1e15]">{error}</p> : null}

        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-[0.88rem]">
            <thead><tr className="border-b border-steel-200 text-steel-500"><th className="py-2 pr-3">Profile</th><th className="py-2 pr-3">Mode</th><th className="py-2 pr-3">Status</th><th className="py-2 pr-3">Updated</th><th className="py-2">Actions</th></tr></thead>
            <tbody>
              {profiles.map((p) => (
                <tr key={p.id} className={`border-b border-steel-100 ${selectedId === p.id ? "bg-steel-50" : ""}`}>
                  <td className="py-2 pr-3 font-medium text-navy-900">{p.name}</td>
                  <td className="py-2 pr-3">{p.mode === "full" ? "Full site" : "Standby"}</td>
                  <td className="py-2 pr-3">{p.id === activeId ? <span className="font-semibold text-[#1f6b34]">Active</span> : "Inactive"}</td>
                  <td className="py-2 pr-3 text-steel-500">{p.updatedAt ? new Date(p.updatedAt).toLocaleString("en-IN") : "—"}</td>
                  <td className="py-2 flex gap-2">
                    <button type="button" className="btn btn-outline !px-3 !py-1.5" onClick={() => setSelectedId(p.id)}>Edit</button>
                    {p.id !== activeId ? <button type="button" className="btn btn-primary !px-3 !py-1.5 disabled:opacity-60" disabled={busy} onClick={() => activate(p.id)}>Activate</button> : null}
                    {p.id !== activeId ? <button type="button" className="btn btn-outline !px-3 !py-1.5 !text-[#8a1e15]" disabled={busy} onClick={() => remove(p.id)}>Delete</button> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-4 font-display text-[1.35rem] font-medium text-navy-900">
          Editing: {selected?.name ?? "—"} {selected?.id === activeId ? <span className="text-[0.8rem] font-sans font-semibold uppercase tracking-[0.12em] text-[#1f6b34]">(active)</span> : <span className="text-[0.8rem] font-sans text-steel-500">(inactive — activate to publish)</span>}
        </h2>
        {selected ? <SiteContentEditor profileId={selected.id} /> : null}
      </section>
    </div>
  );
}
