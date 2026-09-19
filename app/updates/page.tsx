import type { Metadata } from "next";
import { PageMasthead } from "@/components/PageMasthead";
import { Reveal } from "@/components/Reveal";
import { JsonLd } from "@/components/JsonLd";
import { sortedUpdates } from "@/lib/config/updates";
import { siteUrl } from "@/app/layout";
import { absoluteUrl } from "@/lib/seo/site-url";

export const metadata: Metadata = {
  title: "Updates",
  description:
    "Official announcements from the IMUN secretariat — registration rounds, payment, conference dates and allocations.",
  alternates: { canonical: `${siteUrl}/updates` },
};

function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00+05:30`);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "long", timeZone: "Asia/Kolkata" }).format(d);
}

export default function UpdatesPage() {
  const entries = sortedUpdates();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: entries.map((e, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "NewsArticle",
        headline: e.title,
        description: e.body,
        datePublished: e.date,
        url: absoluteUrl("/updates"),
        publisher: { "@id": `${siteUrl}/#organization` },
      },
    })),
  };

  return (
    <>
      <PageMasthead
        path="/updates"
        section="Updates"
        title="Secretariat announcements"
        lede="Registration rounds, payment and conference notices — published here as they are confirmed."
      />

      <JsonLd data={jsonLd} />

      <section className="section">
        <div className="container-site mx-auto max-w-3xl">
          {entries.length === 0 ? (
            <Reveal>
              <p className="text-center text-[1rem] text-steel-500">No updates have been published yet.</p>
            </Reveal>
          ) : (
            <ol className="border-t border-steel-200">
              {entries.map((e, i) => (
                <Reveal as="li" key={`${e.date}-${e.title}`} delay={i * 50} className="border-b border-steel-200">
                  <article className="py-8">
                    <div className="flex flex-wrap items-center gap-3">
                      <time dateTime={e.date} className="eyebrow-doc">
                        {formatDate(e.date)}
                      </time>
                      <span className="rounded-full border border-brass-500/40 px-2.5 py-0.5 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-brass-700">
                        {e.tag}
                      </span>
                    </div>
                    <h2 className="mt-3 font-display text-[1.5rem] font-medium text-navy-900">{e.title}</h2>
                    <p className="mt-3 text-[1.02rem] leading-relaxed text-steel-600">{e.body}</p>
                  </article>
                </Reveal>
              ))}
            </ol>
          )}
        </div>
      </section>
    </>
  );
}
