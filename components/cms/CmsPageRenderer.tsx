import Link from "next/link";
import { Accordion } from "@/components/Accordion";
import { CmsTabs } from "@/components/cms/CmsTabs";
import type {
  CardItem,
  CmsBlock,
  CmsPage,
  GalleryItem,
  StatItem,
} from "@/lib/cms/types";

function paragraphs(value: string | undefined, className = "text-steel-600") {
  if (!value) return null;
  return value.split(/\n{2,}/).map((paragraph, index) => (
    <p key={index} className={`${index ? "mt-4 " : ""}${className}`}>
      {paragraph}
    </p>
  ));
}

function ImagePreview({
  src,
  alt,
  className,
}: {
  src?: string;
  alt?: string;
  className?: string;
}) {
  if (!src) {
    return (
      <div className={`flex min-h-48 items-center justify-center bg-steel-100 text-[0.75rem] uppercase tracking-[0.12em] text-steel-400 ${className ?? ""}`}>
        Image not supplied
      </div>
    );
  }
  // CMS URLs are sanitized server-side to http(s) or site-relative paths.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt ?? ""} className={`h-full w-full object-cover ${className ?? ""}`} loading="lazy" />;
}

function ButtonLink({
  label,
  href,
  secondary = false,
}: {
  label?: string;
  href?: string;
  secondary?: boolean;
}) {
  if (!label || !href) return null;
  return (
    <Link href={href} className={secondary ? "btn btn-outline-light" : "btn btn-accent"}>
      {label}
    </Link>
  );
}

function renderCards(items: CardItem[], columns: 2 | 3 | 4 = 3) {
  const grid = columns === 2 ? "md:grid-cols-2" : columns === 4 ? "md:grid-cols-2 xl:grid-cols-4" : "md:grid-cols-2 lg:grid-cols-3";
  return (
    <div className={`grid grid-cols-1 gap-6 ${grid}`}>
      {items.map((item, index) => (
        <article key={`${item.title}-${index}`} className="card-premium overflow-hidden">
          {item.imageUrl ? <div className="aspect-[16/10]"><ImagePreview src={item.imageUrl} alt={item.title} /></div> : null}
          <div className="p-7">
            {item.tag ? <p className="eyebrow-doc">{item.tag}</p> : null}
            <h3 className="mt-2 font-display text-[1.3rem] font-medium text-navy-900">{item.title}</h3>
            {paragraphs(item.body, "mt-3 text-[0.94rem] leading-relaxed text-steel-600")}
            {item.href ? <Link href={item.href} className="mt-5 inline-block text-[0.82rem] font-semibold uppercase tracking-[0.1em] text-navy-800 underline decoration-brass-500 underline-offset-4">Read more</Link> : null}
          </div>
        </article>
      ))}
    </div>
  );
}

function renderStats(items: StatItem[]) {
  return (
    <div className="grid grid-cols-1 border-y border-steel-200 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item, index) => (
        <div key={`${item.label}-${index}`} className={`px-6 py-7 ${index ? "border-t border-steel-200 sm:border-l sm:border-t-0" : ""}`}>
          <p className="eyebrow-doc">{item.label}</p>
          <p className="mt-3 font-display text-[2rem] font-medium leading-none text-navy-900">{item.value}</p>
          {item.hint ? <p className="mt-2 text-[0.82rem] text-steel-500">{item.hint}</p> : null}
        </div>
      ))}
    </div>
  );
}

function renderBlock(block: CmsBlock) {
  if (block.hidden) return null;
  switch (block.type) {
    case "hero":
      return (
        <section className="relative overflow-hidden bg-navy-950 text-white">
          <div className="rule-gold" />
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_120%_at_12%_-10%,rgba(193,161,90,0.16),transparent_65%)]" />
          <div className="container-site relative grid min-h-[32rem] grid-cols-12 items-center gap-10 py-20">
            <div className={block.imageUrl ? "col-span-12 lg:col-span-7" : "col-span-12 lg:col-span-9"}>
              {block.kicker ? <p className="kicker-light">{block.kicker}</p> : null}
              <h1 className="mt-5 font-display text-[clamp(2.5rem,6vw,5rem)] font-medium leading-[0.98] tracking-[-0.03em]">
                {block.title}
                {block.titleAccent ? <span className="italic text-brass-300"> {block.titleAccent}</span> : null}
              </h1>
              {block.body ? <div className="mt-7 max-w-2xl text-[1.05rem] leading-relaxed text-white/65">{paragraphs(block.body, "text-white/65")}</div> : null}
              <div className="mt-9 flex flex-wrap gap-3">
                <ButtonLink label={block.primaryCtaLabel} href={block.primaryCtaHref} />
                <ButtonLink label={block.secondaryCtaLabel} href={block.secondaryCtaHref} secondary />
              </div>
            </div>
            {block.imageUrl ? (
              <div className="col-span-12 aspect-[4/3] overflow-hidden border border-white/15 bg-white/5 lg:col-span-5">
                <ImagePreview src={block.imageUrl} alt={block.title} />
              </div>
            ) : null}
          </div>
        </section>
      );
    case "richText":
      return (
        <section className="section">
          <div className="container-site max-w-4xl">
            {block.heading ? <h2 className="font-display text-[2rem] font-medium text-navy-900">{block.heading}</h2> : null}
            <div className={block.heading ? "mt-6 text-[1.02rem] leading-relaxed" : "text-[1.02rem] leading-relaxed"}>
              {paragraphs(block.body)}
            </div>
          </div>
        </section>
      );
    case "imageText":
      return (
        <section className="section">
          <div className={`container-site grid grid-cols-1 items-center gap-10 lg:grid-cols-2 ${block.imageSide === "left" ? "" : "lg:[&>*:first-child]:order-2"}`}>
            <div className="aspect-[4/3] overflow-hidden bg-steel-100"><ImagePreview src={block.imageUrl} alt={block.imageAlt ?? block.heading} /></div>
            <div>
              {block.heading ? <h2 className="font-display text-[2rem] font-medium text-navy-900">{block.heading}</h2> : null}
              <div className={block.heading ? "mt-5 text-[1.02rem] leading-relaxed" : "text-[1.02rem] leading-relaxed"}>{paragraphs(block.body)}</div>
              <ButtonLink label={block.ctaLabel} href={block.ctaHref} />
            </div>
          </div>
        </section>
      );
    case "stats":
      return (
        <section className="section-tight">
          <div className="container-site">
            {block.heading ? <h2 className="mb-8 font-display text-[2rem] font-medium text-navy-900">{block.heading}</h2> : null}
            {renderStats(block.items)}
          </div>
        </section>
      );
    case "cards":
      return (
        <section className="section">
          <div className="container-site">
            {block.heading ? <h2 className="font-display text-[2rem] font-medium text-navy-900">{block.heading}</h2> : null}
            {block.body ? <div className="mt-4 max-w-2xl text-[1rem] leading-relaxed">{paragraphs(block.body)}</div> : null}
            <div className={block.heading || block.body ? "mt-10" : ""}>{renderCards(block.items, block.columns)}</div>
          </div>
        </section>
      );
    case "faq":
      return (
        <section className="section">
          <div className="container-site max-w-4xl">
            {block.heading ? <h2 className="mb-8 font-display text-[2rem] font-medium text-navy-900">{block.heading}</h2> : null}
            <Accordion items={block.items.map((item) => ({ question: item.question, answer: item.answer }))} />
          </div>
        </section>
      );
    case "cta":
      return (
        <section className="section-tight bg-navy-950 text-white">
          <div className="container-site flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
            <div className="max-w-2xl">
              <h2 className="font-display text-[2rem] font-medium">{block.heading}</h2>
              {block.body ? <div className="mt-4 leading-relaxed text-white/65">{paragraphs(block.body, "text-white/65")}</div> : null}
            </div>
            <div className="flex shrink-0 flex-wrap gap-3">
              <ButtonLink label={block.primaryCtaLabel} href={block.primaryCtaHref} />
              <ButtonLink label={block.secondaryCtaLabel} href={block.secondaryCtaHref} secondary />
            </div>
          </div>
        </section>
      );
    case "gallery":
      return (
        <section className="section">
          <div className="container-site">
            {block.heading ? <h2 className="mb-8 font-display text-[2rem] font-medium text-navy-900">{block.heading}</h2> : null}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              {block.items.map((item: GalleryItem, index) => (
                <figure key={`${item.imageUrl}-${index}`} className="overflow-hidden bg-steel-100">
                  <div className="aspect-square"><ImagePreview src={item.imageUrl} alt={item.alt} /></div>
                  {item.caption ? <figcaption className="px-3 py-2 text-[0.78rem] text-steel-500">{item.caption}</figcaption> : null}
                </figure>
              ))}
            </div>
          </div>
        </section>
      );
    case "tabs":
      return (
        <section className="section">
          <div className="container-site max-w-4xl">
            {block.heading ? <h2 className="mb-8 font-display text-[2rem] font-medium text-navy-900">{block.heading}</h2> : null}
            <CmsTabs items={block.items} />
          </div>
        </section>
      );
  }
}

export function CmsPageRenderer({ page }: { page: CmsPage }) {
  return <>{page.blocks.map((block) => <div key={block.id}>{renderBlock(block)}</div>)}</>;
}
