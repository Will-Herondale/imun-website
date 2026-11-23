export type CmsBlockType =
  | "hero"
  | "richText"
  | "imageText"
  | "stats"
  | "cards"
  | "faq"
  | "cta"
  | "gallery"
  | "tabs";

export type CmsBlockBase = {
  id: string;
  type: CmsBlockType;
  hidden?: boolean;
};

export type HeroBlock = CmsBlockBase & {
  type: "hero";
  kicker?: string;
  title: string;
  titleAccent?: string;
  body?: string;
  primaryCtaLabel?: string;
  primaryCtaHref?: string;
  secondaryCtaLabel?: string;
  secondaryCtaHref?: string;
  imageUrl?: string;
};

export type RichTextBlock = CmsBlockBase & {
  type: "richText";
  heading?: string;
  body: string; // markdown-ish/plain text; rendered as paragraphs
};

export type ImageTextBlock = CmsBlockBase & {
  type: "imageText";
  heading?: string;
  body: string;
  imageUrl: string;
  imageAlt?: string;
  imageSide?: "left" | "right";
  ctaLabel?: string;
  ctaHref?: string;
};

export type StatItem = { label: string; value: string; hint?: string };
export type StatsBlock = CmsBlockBase & { type: "stats"; heading?: string; items: StatItem[] };

export type CardItem = { title: string; body: string; imageUrl?: string; href?: string; tag?: string };
export type CardsBlock = CmsBlockBase & { type: "cards"; heading?: string; body?: string; columns?: 2 | 3 | 4; items: CardItem[] };

export type FaqItem = { question: string; answer: string };
export type FaqBlock = CmsBlockBase & { type: "faq"; heading?: string; items: FaqItem[] };

export type CtaBlock = CmsBlockBase & {
  type: "cta";
  heading: string;
  body?: string;
  primaryCtaLabel?: string;
  primaryCtaHref?: string;
  secondaryCtaLabel?: string;
  secondaryCtaHref?: string;
};

export type GalleryItem = { imageUrl: string; alt?: string; caption?: string };
export type GalleryBlock = CmsBlockBase & { type: "gallery"; heading?: string; items: GalleryItem[] };

export type TabItem = { label: string; content: string };
export type TabsBlock = CmsBlockBase & { type: "tabs"; heading?: string; items: TabItem[] };

export type CmsBlock =
  | HeroBlock
  | RichTextBlock
  | ImageTextBlock
  | StatsBlock
  | CardsBlock
  | FaqBlock
  | CtaBlock
  | GalleryBlock
  | TabsBlock;

export type CmsPage = {
  slug: string;
  title: string;
  blocks: CmsBlock[];
};

export type SiteCms = {
  pages: Record<string, CmsPage>;
};

export const CMS_PAGE_SLUGS = ["home", "about", "conference", "committees", "faq", "contact", "updates", "privacy"] as const;
export type CmsPageSlug = typeof CMS_PAGE_SLUGS[number];
