"use client";

import { useEffect, useState } from "react";
import type { SiteContent } from "@/lib/content/defaults";

type Props = {
  profileId?: string;
  onSaved?: () => void;
};

function Field({
  label,
  value,
  onChange,
  textarea,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  textarea?: boolean;
  type?: string;
}) {
  const cls =
    "w-full rounded-[3px] border border-steel-200 bg-white px-3 py-2 text-[0.92rem] text-navy-900 outline-none focus:border-brass-500";
  return (
    <label className="block">
      <span className="mb-1 block text-[0.75rem] font-semibold uppercase tracking-[0.12em] text-steel-500">
        {label}
      </span>
      {textarea ? (
        <textarea className={cls} rows={4} value={value} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input className={cls} type={type} value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </label>
  );
}

export function SiteContentEditor({ profileId, onSaved }: Props) {
  const [content, setContent] = useState<SiteContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let alive = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset loading state when profileId changes
    setLoading(true);
    setError(null);
    const url = profileId ? `/api/admin/profiles` : "/api/admin/content";
    fetch(url, { cache: "no-store" })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Failed to load");
        if (!alive) return;
        if (profileId) {
          const p = (d.profiles as Array<{ id: string; content: SiteContent }>).find((x) => x.id === profileId);
          if (!p) throw new Error("Profile not found");
          setContent(p.content);
        } else {
          setContent(d.content);
        }
      })
      .catch((e) => alive && setError(e.message))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [profileId]);

  async function save() {
    if (!content) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const url = profileId ? `/api/admin/profiles/${profileId}` : "/api/admin/content";
      const method = profileId ? "PUT" : "PUT";
      const body = profileId ? { content } : { content };
      const r = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "Save failed");
      setContent(d.content ?? d.profile?.content ?? content);
      setSaved(true);
      onSaved?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-[0.9rem] text-steel-500">Loading site content…</p>;
  if (error && !content) return <p className="text-[0.9rem] text-[#8a1e15]">{error}</p>;
  if (!content) return null;

  const set = <K extends keyof SiteContent>(key: K, value: SiteContent[K]) =>
    setContent({ ...content, [key]: value });

  return (
    <div className="space-y-8">
      <div className="rounded-[4px] border border-[#e5cfa0] bg-[#fdf9f0] p-4 text-[0.85rem] text-[#6b4f14]">
        <strong>Full CMS editor scope:</strong> this editor controls live standby-page content (headline, body, CTA, contact, announcement, SEO). Changes save to the database and appear on the public site after save (pages render dynamically). For structural/layout/code changes, the secretariat should still request a code deploy.
      </div>

      <section className="border border-steel-200 bg-white p-6 shadow-[var(--shadow-card)]">
        <h2 className="mb-4 font-display text-[1.25rem] font-medium text-navy-900">Standby hero</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Kicker" value={content.standby.kicker} onChange={(v) => set("standby", { ...content.standby, kicker: v })} />
          <Field label="Status label" value={content.standby.statusLabel} onChange={(v) => set("standby", { ...content.standby, statusLabel: v })} />
          <Field label="Headline" value={content.standby.headline} onChange={(v) => set("standby", { ...content.standby, headline: v })} />
          <Field label="Headline accent (italic)" value={content.standby.headlineAccent} onChange={(v) => set("standby", { ...content.standby, headlineAccent: v })} />
          <div className="md:col-span-2">
            <Field label="Body" textarea value={content.standby.body} onChange={(v) => set("standby", { ...content.standby, body: v })} />
          </div>
          <Field label="CTA label" value={content.standby.ctaLabel} onChange={(v) => set("standby", { ...content.standby, ctaLabel: v })} />
          <Field label="CTA href (mailto: or URL)" value={content.standby.ctaHref} onChange={(v) => set("standby", { ...content.standby, ctaHref: v })} />
        </div>
      </section>

      <section className="border border-steel-200 bg-white p-6 shadow-[var(--shadow-card)]">
        <h2 className="mb-4 font-display text-[1.25rem] font-medium text-navy-900">Contact & footer</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Email" type="email" value={content.contact.email} onChange={(v) => set("contact", { ...content.contact, email: v })} />
          <Field label="Phone (digits)" value={content.contact.phone} onChange={(v) => set("contact", { ...content.contact, phone: v })} />
          <Field label="Instagram URL" value={content.contact.instagram} onChange={(v) => set("contact", { ...content.contact, instagram: v })} />
          <Field label="Footer note" value={content.footerNote} onChange={(v) => set("footerNote", v)} />
        </div>
      </section>

      <section className="border border-steel-200 bg-white p-6 shadow-[var(--shadow-card)]">
        <h2 className="mb-4 font-display text-[1.25rem] font-medium text-navy-900">Announcement bar</h2>
        <label className="mb-4 flex items-center gap-2 text-[0.9rem] text-navy-900">
          <input
            type="checkbox"
            checked={content.announcement.enabled}
            onChange={(e) => set("announcement", { ...content.announcement, enabled: e.target.checked })}
          />
          Show announcement on standby page
        </label>
        <Field label="Announcement text" value={content.announcement.text} onChange={(v) => set("announcement", { ...content.announcement, text: v })} />
      </section>

      <section className="border border-steel-200 bg-white p-6 shadow-[var(--shadow-card)]">
        <h2 className="mb-4 font-display text-[1.25rem] font-medium text-navy-900">SEO</h2>
        <div className="grid gap-4">
          <Field label="Page title" value={content.seo.title} onChange={(v) => set("seo", { ...content.seo, title: v })} />
          <Field label="Meta description" textarea value={content.seo.description} onChange={(v) => set("seo", { ...content.seo, description: v })} />
        </div>
      </section>

      <div className="flex items-center gap-4">
        <button type="button" onClick={save} disabled={saving} className="btn btn-primary disabled:opacity-60">
          {saving ? "Saving…" : "Save site content"}
        </button>
        {saved ? <span className="text-[0.85rem] text-[#1f6b34]">Saved. Public site will show changes on next load.</span> : null}
        {error ? <span className="text-[0.85rem] text-[#8a1e15]">{error}</span> : null}
      </div>
    </div>
  );
}
