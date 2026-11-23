"use client";

import { useState } from "react";
import type { SiteProfile } from "@/lib/content/profiles";
import type {
  CmsBlock,
  CmsBlockType,
  CmsPage,
  SiteCms,
} from "@/lib/cms/types";

const pageLabels: Record<string, string> = {
  home: "Home",
  about: "About",
  conference: "Conference",
  committees: "Committees",
  faq: "FAQ",
  contact: "Contact",
  updates: "Updates",
  privacy: "Privacy",
};

const blockLabels: Record<CmsBlockType, string> = {
  hero: "Hero",
  richText: "Rich text",
  imageText: "Image + text",
  stats: "Stats",
  cards: "Cards",
  faq: "FAQ",
  cta: "Call to action",
  gallery: "Image gallery",
  tabs: "Tabs",
};

function newId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `block-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function newBlock(type: CmsBlockType): CmsBlock {
  const id = newId();
  switch (type) {
    case "hero":
      return { id, type, kicker: "Section label", title: "Your page headline", titleAccent: "with emphasis", body: "Add the page introduction here.", primaryCtaLabel: "Primary action", primaryCtaHref: "/" };
    case "richText":
      return { id, type, heading: "Section heading", body: "Write the section content here.\n\nUse a blank line to start a new paragraph." };
    case "imageText":
      return { id, type, heading: "Image and text section", body: "Describe this section here.", imageUrl: "", imageAlt: "", imageSide: "right", ctaLabel: "", ctaHref: "" };
    case "stats":
      return { id, type, heading: "At a glance", items: [{ label: "Label", value: "Value", hint: "Optional context" }] };
    case "cards":
      return { id, type, heading: "Card section", body: "", columns: 3, items: [{ title: "Card title", body: "Card description.", tag: "" }] };
    case "faq":
      return { id, type, heading: "Frequently asked questions", items: [{ question: "Question", answer: "Answer" }] };
    case "cta":
      return { id, type, heading: "Ready to participate?", body: "Add a short closing message.", primaryCtaLabel: "Learn more", primaryCtaHref: "/" };
    case "gallery":
      return { id, type, heading: "Gallery", items: [{ imageUrl: "", alt: "", caption: "" }] };
    case "tabs":
      return { id, type, heading: "More information", items: [{ label: "Tab one", content: "Tab content." }] };
  }
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string | undefined;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[0.72rem] font-semibold uppercase tracking-[0.1em] text-steel-500">{label}</span>
      <input
        type={type}
        value={value ?? ""}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-[3px] border border-steel-200 bg-white px-3 py-2 text-[0.9rem] text-navy-900 outline-none focus:border-brass-500"
      />
    </label>
  );
}

function Area({
  label,
  value,
  onChange,
  rows = 4,
}: {
  label: string;
  value: string | undefined;
  onChange: (value: string) => void;
  rows?: number;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[0.72rem] font-semibold uppercase tracking-[0.1em] text-steel-500">{label}</span>
      <textarea
        rows={rows}
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-[3px] border border-steel-200 bg-white px-3 py-2 text-[0.9rem] leading-relaxed text-navy-900 outline-none focus:border-brass-500"
      />
    </label>
  );
}

function ImageField({
  label,
  value,
  onChange,
  profileId,
}: {
  label: string;
  value: string | undefined;
  onChange: (value: string) => void;
  profileId: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch(`/api/admin/profiles/${profileId}/media`, { method: "POST", body: form });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Upload failed");
      onChange(data.asset.url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Field label={label} value={value} onChange={onChange} placeholder="https://… or /assets/…" />
      <label className="inline-flex cursor-pointer items-center rounded-[3px] border border-steel-200 px-2.5 py-1.5 text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-steel-600 hover:border-navy-700 hover:text-navy-900">
        {uploading ? "Uploading…" : "Upload image"}
        <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" disabled={uploading} onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); event.currentTarget.value = ""; }} />
      </label>
      <p className="text-[0.72rem] text-steel-400">Paste a public image URL/path, or upload JPEG, PNG, WebP or GIF up to 3 MB. Uploaded images are stored with this profile.</p>
      {error ? <p className="text-[0.75rem] text-[#8a1e15]">{error}</p> : null}
      {value ? (
        <div className="h-28 w-44 overflow-hidden bg-steel-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="" className="h-full w-full object-cover" />
        </div>
      ) : null}
    </div>
  );
}

function SmallButton({
  children,
  onClick,
  danger = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button type="button" onClick={onClick} className={`rounded-[3px] border px-2.5 py-1.5 text-[0.72rem] font-semibold uppercase tracking-[0.08em] ${danger ? "border-[#d8aaa5] text-[#8a1e15] hover:bg-[#fff5f3]" : "border-steel-200 text-steel-600 hover:border-navy-700 hover:text-navy-900"}`}>
      {children}
    </button>
  );
}

function ItemActions({
  index,
  total,
  onMove,
  onRemove,
}: {
  index: number;
  total: number;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <SmallButton onClick={() => onMove(-1)}>{index === 0 ? "First" : "↑"}</SmallButton>
      <SmallButton onClick={() => onMove(1)}>{index === total - 1 ? "Last" : "↓"}</SmallButton>
      <SmallButton danger onClick={onRemove}>Remove</SmallButton>
    </div>
  );
}

function BlockFields({
  block,
  update,
  profileId,
}: {
  block: CmsBlock;
  update: (patch: Partial<CmsBlock>) => void;
  profileId: string;
}) {
  switch (block.type) {
    case "hero":
      return (
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Kicker" value={block.kicker} onChange={(value) => update({ kicker: value })} />
          <ImageField profileId={profileId} label="Hero image" value={block.imageUrl} onChange={(value) => update({ imageUrl: value })} />
          <Field label="Title" value={block.title} onChange={(value) => update({ title: value })} />
          <Field label="Title accent" value={block.titleAccent} onChange={(value) => update({ titleAccent: value })} />
          <div className="md:col-span-2"><Area label="Body" value={block.body} onChange={(value) => update({ body: value })} /></div>
          <Field label="Primary button label" value={block.primaryCtaLabel} onChange={(value) => update({ primaryCtaLabel: value })} />
          <Field label="Primary button link" value={block.primaryCtaHref} onChange={(value) => update({ primaryCtaHref: value })} />
          <Field label="Secondary button label" value={block.secondaryCtaLabel} onChange={(value) => update({ secondaryCtaLabel: value })} />
          <Field label="Secondary button link" value={block.secondaryCtaHref} onChange={(value) => update({ secondaryCtaHref: value })} />
        </div>
      );
    case "richText":
      return <div className="space-y-4"><Field label="Heading" value={block.heading} onChange={(value) => update({ heading: value })} /><Area label="Content" value={block.body} rows={8} onChange={(value) => update({ body: value })} /></div>;
    case "imageText":
      return (
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Heading" value={block.heading} onChange={(value) => update({ heading: value })} />
          <label className="block"><span className="mb-1 block text-[0.72rem] font-semibold uppercase tracking-[0.1em] text-steel-500">Image side</span><select value={block.imageSide ?? "right"} onChange={(event) => update({ imageSide: event.target.value as "left" | "right" })} className="w-full rounded-[3px] border border-steel-200 px-3 py-2 text-[0.9rem]"><option value="left">Left</option><option value="right">Right</option></select></label>
          <div className="md:col-span-2"><Area label="Content" value={block.body} rows={7} onChange={(value) => update({ body: value })} /></div>
          <ImageField profileId={profileId} label="Image" value={block.imageUrl} onChange={(value) => update({ imageUrl: value })} />
          <Field label="Image alt text" value={block.imageAlt} onChange={(value) => update({ imageAlt: value })} />
          <Field label="Button label" value={block.ctaLabel} onChange={(value) => update({ ctaLabel: value })} />
          <Field label="Button link" value={block.ctaHref} onChange={(value) => update({ ctaHref: value })} />
        </div>
      );
    case "stats":
      return <div className="space-y-4"><Field label="Heading" value={block.heading} onChange={(value) => update({ heading: value })} /><div className="space-y-3">{block.items.map((item, index) => <div key={index} className="border border-steel-200 p-4"><div className="grid gap-3 md:grid-cols-3"><Field label="Label" value={item.label} onChange={(value) => update({ items: block.items.map((x, i) => i === index ? { ...x, label: value } : x) })} /><Field label="Value" value={item.value} onChange={(value) => update({ items: block.items.map((x, i) => i === index ? { ...x, value } : x) })} /><Field label="Hint" value={item.hint} onChange={(value) => update({ items: block.items.map((x, i) => i === index ? { ...x, hint: value } : x) })} /></div><div className="mt-3"><ItemActions index={index} total={block.items.length} onMove={(direction) => update({ items: moveItem(block.items, index, direction) })} onRemove={() => update({ items: block.items.filter((_, i) => i !== index) })} /></div></div>)}</div><SmallButton onClick={() => update({ items: [...block.items, { label: "Label", value: "Value", hint: "" }] })}>+ Add stat</SmallButton></div>;
    case "cards":
       return <div className="space-y-4"><div className="grid gap-4 md:grid-cols-2"><Field label="Heading" value={block.heading} onChange={(value) => update({ heading: value })} /><label className="block"><span className="mb-1 block text-[0.72rem] font-semibold uppercase tracking-[0.1em] text-steel-500">Columns</span><select value={block.columns ?? 3} onChange={(event) => update({ columns: Number(event.target.value) as 2 | 3 | 4 })} className="w-full rounded-[3px] border border-steel-200 px-3 py-2 text-[0.9rem]"><option value="2">2</option><option value="3">3</option><option value="4">4</option></select></label></div><Area label="Intro text" value={block.body} onChange={(value) => update({ body: value })} /><div className="space-y-3">{block.items.map((item, index) => <div key={index} className="border border-steel-200 p-4"><div className="grid gap-3 md:grid-cols-2"><Field label="Tag" value={item.tag} onChange={(value) => update({ items: updateAt(block.items, index, { tag: value }) })} /><Field label="Title" value={item.title} onChange={(value) => update({ items: updateAt(block.items, index, { title: value }) })} /><div className="md:col-span-2"><Area label="Body" value={item.body} onChange={(value) => update({ items: updateAt(block.items, index, { body: value }) })} /></div><ImageField profileId={profileId} label="Card image" value={item.imageUrl} onChange={(value) => update({ items: updateAt(block.items, index, { imageUrl: value }) })} /><Field label="Card link" value={item.href} onChange={(value) => update({ items: updateAt(block.items, index, { href: value }) })} /></div><div className="mt-3"><ItemActions index={index} total={block.items.length} onMove={(direction) => update({ items: moveItem(block.items, index, direction) })} onRemove={() => update({ items: block.items.filter((_, i) => i !== index) })} /></div></div>)}</div><SmallButton onClick={() => update({ items: [...block.items, { title: "Card title", body: "Card description." }] })}>+ Add card</SmallButton></div>;
    case "faq":
      return <div className="space-y-4"><Field label="Heading" value={block.heading} onChange={(value) => update({ heading: value })} /><div className="space-y-3">{block.items.map((item, index) => <div key={index} className="border border-steel-200 p-4"><div className="grid gap-3"><Field label="Question" value={item.question} onChange={(value) => update({ items: updateAt(block.items, index, { question: value }) })} /><Area label="Answer" value={item.answer} onChange={(value) => update({ items: updateAt(block.items, index, { answer: value }) })} /></div><div className="mt-3"><ItemActions index={index} total={block.items.length} onMove={(direction) => update({ items: moveItem(block.items, index, direction) })} onRemove={() => update({ items: block.items.filter((_, i) => i !== index) })} /></div></div>)}</div><SmallButton onClick={() => update({ items: [...block.items, { question: "Question", answer: "Answer" }] })}>+ Add question</SmallButton></div>;
    case "cta":
      return <div className="grid gap-4 md:grid-cols-2"><div className="md:col-span-2"><Field label="Heading" value={block.heading} onChange={(value) => update({ heading: value })} /></div><div className="md:col-span-2"><Area label="Body" value={block.body} onChange={(value) => update({ body: value })} /></div><Field label="Primary button label" value={block.primaryCtaLabel} onChange={(value) => update({ primaryCtaLabel: value })} /><Field label="Primary button link" value={block.primaryCtaHref} onChange={(value) => update({ primaryCtaHref: value })} /><Field label="Secondary button label" value={block.secondaryCtaLabel} onChange={(value) => update({ secondaryCtaLabel: value })} /><Field label="Secondary button link" value={block.secondaryCtaHref} onChange={(value) => update({ secondaryCtaHref: value })} /></div>;
    case "gallery":
       return <div className="space-y-4"><Field label="Heading" value={block.heading} onChange={(value) => update({ heading: value })} /><div className="space-y-3">{block.items.map((item, index) => <div key={index} className="border border-steel-200 p-4"><div className="grid gap-3 md:grid-cols-2"><ImageField profileId={profileId} label="Image" value={item.imageUrl} onChange={(value) => update({ items: updateAt(block.items, index, { imageUrl: value }) })} /><Field label="Alt text" value={item.alt} onChange={(value) => update({ items: updateAt(block.items, index, { alt: value }) })} /><Field label="Caption" value={item.caption} onChange={(value) => update({ items: updateAt(block.items, index, { caption: value }) })} /></div><div className="mt-3"><ItemActions index={index} total={block.items.length} onMove={(direction) => update({ items: moveItem(block.items, index, direction) })} onRemove={() => update({ items: block.items.filter((_, i) => i !== index) })} /></div></div>)}</div><SmallButton onClick={() => update({ items: [...block.items, { imageUrl: "", alt: "", caption: "" }] })}>+ Add image</SmallButton></div>;
    case "tabs":
      return <div className="space-y-4"><Field label="Heading" value={block.heading} onChange={(value) => update({ heading: value })} /><div className="space-y-3">{block.items.map((item, index) => <div key={index} className="border border-steel-200 p-4"><div className="grid gap-3"><Field label="Tab label" value={item.label} onChange={(value) => update({ items: updateAt(block.items, index, { label: value }) })} /><Area label="Tab content" value={item.content} onChange={(value) => update({ items: updateAt(block.items, index, { content: value }) })} /></div><div className="mt-3"><ItemActions index={index} total={block.items.length} onMove={(direction) => update({ items: moveItem(block.items, index, direction) })} onRemove={() => update({ items: block.items.filter((_, i) => i !== index) })} /></div></div>)}</div><SmallButton onClick={() => update({ items: [...block.items, { label: "New tab", content: "Tab content." }] })}>+ Add tab</SmallButton></div>;
  }
}

function updateAt<T>(items: T[], index: number, patch: Partial<T>): T[] {
  return items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item);
}

function moveItem<T>(items: T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction;
  if (target < 0 || target >= items.length) return items;
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

function BlockCard({
  block,
  index,
  total,
  profileId,
  update,
  onMove,
  onDuplicate,
  onRemove,
}: {
  block: CmsBlock;
  index: number;
  total: number;
  profileId: string;
  update: (patch: Partial<CmsBlock>) => void;
  onMove: (direction: -1 | 1) => void;
  onDuplicate: () => void;
  onRemove: () => void;
}) {
  return (
    <section className="border border-steel-200 bg-white shadow-[var(--shadow-card)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-steel-200 bg-steel-50 px-5 py-4">
        <div>
          <p className="eyebrow-doc">Block {index + 1}</p>
          <h3 className="mt-1 font-display text-[1.25rem] font-medium text-navy-900">{blockLabels[block.type]}</h3>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-[0.78rem] text-steel-600"><input type="checkbox" checked={Boolean(block.hidden)} onChange={(event) => update({ hidden: event.target.checked })} /> Hidden</label>
          <SmallButton onClick={() => onMove(-1)}>{index === 0 ? "First" : "↑"}</SmallButton>
          <SmallButton onClick={() => onMove(1)}>{index === total - 1 ? "Last" : "↓"}</SmallButton>
          <SmallButton onClick={onDuplicate}>Duplicate</SmallButton>
          <SmallButton danger onClick={onRemove}>Delete</SmallButton>
        </div>
      </div>
      <div className="space-y-5 p-5">
        <BlockFields block={block} profileId={profileId} update={update} />
      </div>
    </section>
  );
}

export function CmsEditor({ profile }: { profile: SiteProfile }) {
  const [cms, setCms] = useState<SiteCms>(profile.cms);
  const [pageSlug, setPageSlug] = useState("home");
  const [newType, setNewType] = useState<CmsBlockType>("richText");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const page: CmsPage = cms.pages[pageSlug] ?? { slug: pageSlug, title: pageLabels[pageSlug] ?? pageSlug, blocks: [] };

  function setPage(patch: Partial<CmsPage>) {
    setCms((current) => ({ ...current, pages: { ...current.pages, [pageSlug]: { ...page, ...patch } } }));
    setSaved(false);
  }

  function updateBlock(index: number, patch: Partial<CmsBlock>) {
    setPage({ blocks: page.blocks.map((block, blockIndex) => blockIndex === index ? { ...block, ...patch } as CmsBlock : block) });
  }

  async function save() {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const response = await fetch(`/api/admin/profiles/${profile.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cms }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not save CMS pages");
      if (data.profile?.cms) setCms(data.profile.cms as SiteCms);
      setSaved(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save CMS pages");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[4px] border border-[#e5cfa0] bg-[#fdf9f0] p-4 text-[0.85rem] leading-relaxed text-[#6b4f14]">
        <strong>Full-page CMS:</strong> select a page, add and reorder blocks, then save. A page with at least one visible or hidden block uses the CMS renderer; an empty page keeps its original coded layout. Images can use public URLs, paths such as <code>/assets/brand/iemun-og.png</code>, or the built-in per-profile upload control.
      </div>

      <div className="flex flex-wrap items-end gap-3 border border-steel-200 bg-white p-5 shadow-[var(--shadow-card)]">
        <label className="min-w-[13rem] flex-1"><span className="mb-1 block text-[0.72rem] font-semibold uppercase tracking-[0.1em] text-steel-500">Page</span><select value={pageSlug} onChange={(event) => { setPageSlug(event.target.value); setSaved(false); }} className="w-full rounded-[3px] border border-steel-200 px-3 py-2 text-[0.9rem]">{Object.keys(pageLabels).map((slug) => <option key={slug} value={slug}>{pageLabels[slug]}</option>)}</select></label>
        <label className="min-w-[13rem] flex-1"><span className="mb-1 block text-[0.72rem] font-semibold uppercase tracking-[0.1em] text-steel-500">Page title</span><input value={page.title} onChange={(event) => setPage({ title: event.target.value })} className="w-full rounded-[3px] border border-steel-200 px-3 py-2 text-[0.9rem]" /></label>
        <button type="button" className="btn btn-primary disabled:opacity-60" disabled={saving} onClick={save}>{saving ? "Saving…" : "Save CMS changes"}</button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <select value={newType} onChange={(event) => setNewType(event.target.value as CmsBlockType)} className="rounded-[3px] border border-steel-200 bg-white px-3 py-2 text-[0.9rem]">{(Object.keys(blockLabels) as CmsBlockType[]).map((type) => <option key={type} value={type}>{blockLabels[type]}</option>)}</select>
        <button type="button" className="btn btn-outline" onClick={() => setPage({ blocks: [...page.blocks, newBlock(newType)] })}>+ Add block</button>
        <span className="text-[0.82rem] text-steel-500">{page.blocks.length} block{page.blocks.length === 1 ? "" : "s"} · changes are not public until saved</span>
      </div>

      {page.blocks.length === 0 ? <div className="border border-dashed border-steel-300 bg-white p-8 text-center text-[0.9rem] text-steel-500">This page currently uses its original coded layout. Add a block to take control of this page in the CMS.</div> : null}
      {page.blocks.map((block, index) => (
        <BlockCard
          key={block.id}
          block={block}
          index={index}
          total={page.blocks.length}
          profileId={profile.id}
          update={(patch) => updateBlock(index, patch)}
          onMove={(direction) => setPage({ blocks: moveItem(page.blocks, index, direction) })}
          onDuplicate={() => setPage({ blocks: [...page.blocks.slice(0, index + 1), { ...block, id: newId() }, ...page.blocks.slice(index + 1)] })}
          onRemove={() => setPage({ blocks: page.blocks.filter((_, blockIndex) => blockIndex !== index) })}
        />
      ))}

      <div className="flex items-center gap-4">
        <button type="button" className="btn btn-primary disabled:opacity-60" disabled={saving} onClick={save}>{saving ? "Saving…" : "Save CMS changes"}</button>
        {saved ? <span className="text-[0.85rem] text-[#1f6b34]">Saved. Activate this profile to publish it.</span> : null}
        {error ? <span className="text-[0.85rem] text-[#8a1e15]">{error}</span> : null}
      </div>
    </div>
  );
}
