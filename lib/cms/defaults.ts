import { randomUUID } from "node:crypto";
import type {
  CardItem,
  CmsBlock,
  CmsPage,
  FaqItem,
  GalleryItem,
  SiteCms,
  StatItem,
  TabItem,
} from "./types";

function id() { return randomUUID(); }

export function emptyPage(slug: string, title: string): CmsPage {
  return { slug, title, blocks: [] };
}

export function defaultCms(): SiteCms {
  return {
    pages: {
      // Empty pages intentionally fall back to the existing coded conference
      // pages. Adding the first block in the CMS opts that page into the
      // editable block renderer without making the initial rollout destructive.
      home: emptyPage("home", "Home"),
      about: emptyPage("about", "About"),
      conference: emptyPage("conference", "Conference"),
      committees: emptyPage("committees", "Committees"),
      faq: emptyPage("faq", "FAQ"),
      contact: emptyPage("contact", "Contact"),
      updates: emptyPage("updates", "Updates"),
      privacy: emptyPage("privacy", "Privacy"),
    },
  };
}

function text(value: unknown, max: number, fallback = ""): string {
  return String(value ?? fallback).trim().slice(0, max);
}

function safeUrl(value: unknown, max = 500): string {
  const candidate = text(value, max);
  if (!candidate) return "";
  if (/^(?:https?:\/\/|mailto:|tel:|\/|#)/i.test(candidate)) return candidate;
  return "";
}

function blockId(value: unknown): string {
  const candidate = text(value, 80).replace(/[^a-zA-Z0-9_-]/g, "-");
  return candidate || id();
}

function itemList<T>(value: unknown, normalize: (item: Record<string, unknown>) => T, max: number): T[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item))
    .slice(0, max)
    .map(normalize);
}

function sanitizeBlock(value: unknown): CmsBlock | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const source = value as Record<string, unknown>;
  const base = { id: blockId(source.id), hidden: Boolean(source.hidden) };
  switch (source.type) {
    case "hero":
      return {
        ...base,
        type: "hero",
        kicker: text(source.kicker, 100),
        title: text(source.title, 180),
        titleAccent: text(source.titleAccent, 180),
        body: text(source.body, 1200),
        primaryCtaLabel: text(source.primaryCtaLabel, 80),
        primaryCtaHref: safeUrl(source.primaryCtaHref),
        secondaryCtaLabel: text(source.secondaryCtaLabel, 80),
        secondaryCtaHref: safeUrl(source.secondaryCtaHref),
        imageUrl: safeUrl(source.imageUrl, 800),
      };
    case "richText":
      return { ...base, type: "richText", heading: text(source.heading, 180), body: text(source.body, 6000) };
    case "imageText":
      return {
        ...base,
        type: "imageText",
        heading: text(source.heading, 180),
        body: text(source.body, 4000),
        imageUrl: safeUrl(source.imageUrl, 800),
        imageAlt: text(source.imageAlt, 180),
        imageSide: source.imageSide === "left" ? "left" : "right",
        ctaLabel: text(source.ctaLabel, 80),
        ctaHref: safeUrl(source.ctaHref),
      };
    case "stats":
      return {
        ...base,
        type: "stats",
        heading: text(source.heading, 180),
        items: itemList<StatItem>(source.items, (item) => ({
          label: text(item.label, 120),
          value: text(item.value, 120),
          hint: text(item.hint, 240),
        }), 12),
      };
    case "cards":
      return {
        ...base,
        type: "cards",
        heading: text(source.heading, 180),
        body: text(source.body, 1000),
        columns: source.columns === 2 || source.columns === 4 ? source.columns : 3,
        items: itemList<CardItem>(source.items, (item) => ({
          title: text(item.title, 180),
          body: text(item.body, 1200),
          imageUrl: safeUrl(item.imageUrl, 800),
          href: safeUrl(item.href),
          tag: text(item.tag, 80),
        }), 24),
      };
    case "faq":
      return {
        ...base,
        type: "faq",
        heading: text(source.heading, 180),
        items: itemList<FaqItem>(source.items, (item) => ({
          question: text(item.question, 240),
          answer: text(item.answer, 3000),
        }), 30),
      };
    case "cta":
      return {
        ...base,
        type: "cta",
        heading: text(source.heading, 240),
        body: text(source.body, 1200),
        primaryCtaLabel: text(source.primaryCtaLabel, 80),
        primaryCtaHref: safeUrl(source.primaryCtaHref),
        secondaryCtaLabel: text(source.secondaryCtaLabel, 80),
        secondaryCtaHref: safeUrl(source.secondaryCtaHref),
      };
    case "gallery":
      return {
        ...base,
        type: "gallery",
        heading: text(source.heading, 180),
        items: itemList<GalleryItem>(source.items, (item) => ({
          imageUrl: safeUrl(item.imageUrl, 800),
          alt: text(item.alt, 180),
          caption: text(item.caption, 240),
        }), 30),
      };
    case "tabs":
      return {
        ...base,
        type: "tabs",
        heading: text(source.heading, 180),
        items: itemList<TabItem>(source.items, (item) => ({
          label: text(item.label, 120),
          content: text(item.content, 4000),
        }), 20),
      };
    default:
      return null;
  }
}

export function ensureCms(input: unknown): SiteCms {
  const base = defaultCms();
  if (!input || typeof input !== "object") return base;
  const pages = (input as { pages?: unknown }).pages;
  if (!pages || typeof pages !== "object") return base;
  const out: SiteCms = { pages: { ...base.pages } };
  for (const [slug, val] of Object.entries(pages as Record<string, unknown>)) {
    if (!val || typeof val !== "object") continue;
    const p = val as Record<string, unknown>;
    const blocks = Array.isArray(p.blocks)
      ? p.blocks.slice(0, 40).map(sanitizeBlock).filter((b): b is CmsBlock => b !== null)
      : [];
    out.pages[slug] = { slug, title: typeof p.title === "string" ? p.title : slug, blocks };
  }
  return out;
}
