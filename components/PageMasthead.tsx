import Link from "next/link";
import { absoluteUrl } from "@/lib/seo/site-url";

/**
 * Page hero. Supplying `path` renders a visible Home › Section trail and emits
 * BreadcrumbList structured data for search engines.
 */
export function PageMasthead({
  section,
  title,
  lede,
  path,
}: {
  section: string;
  title: string;
  lede?: string;
  path?: string;
}) {
  const crumbs = path ? [{ name: "Home", href: "/" }, { name: section, href: path }] : null;

  const jsonLd = crumbs
    ? {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: crumbs.map((c, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: c.name,
          item: absoluteUrl(c.href),
        })),
      }
    : null;

  return (
    <section className="relative overflow-hidden bg-navy-950 text-white">
      <div className="rule-gold" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_120%_at_12%_-10%,rgba(193,161,90,0.14),transparent_65%)]"
      />
      {jsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      ) : null}
      <div className="container-site relative py-14 md:py-20">
        <div className="grid grid-cols-12 items-end gap-6">
          <div className="col-span-12 lg:col-span-7">
            {crumbs ? (
              <nav aria-label="Breadcrumb">
                <ol className="mb-4 flex items-center gap-2 text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-white/45">
                  {crumbs.map((c, i) => (
                    <li key={c.href} className="flex items-center gap-2">
                      {i > 0 ? <span aria-hidden="true" className="text-white/25">/</span> : null}
                      {i < crumbs.length - 1 ? (
                        <Link href={c.href} className="transition-colors hover:text-brass-300">
                          {c.name}
                        </Link>
                      ) : (
                        <span aria-current="page" className="text-white/70">{c.name}</span>
                      )}
                    </li>
                  ))}
                </ol>
              </nav>
            ) : null}
            <p className="kicker-light">{section}</p>
            <h1 className="mt-4 font-display text-[clamp(2.1rem,5.2vw,3.6rem)] font-medium leading-[1.04] text-white">
              {title}
            </h1>
          </div>
          {lede ? (
            <div className="col-span-12 lg:col-span-5 lg:pb-2">
              <p className="border-l border-brass-500/60 pl-6 text-[1.02rem] leading-relaxed text-white/65">
                {lede}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
