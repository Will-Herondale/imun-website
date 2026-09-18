import type { Metadata } from "next";
import Link from "next/link";
import { PageMasthead } from "@/components/PageMasthead";
import { Reveal } from "@/components/Reveal";
import { SectionHeading } from "@/components/SectionHeading";
import { site, tba, dateAndVenueLine } from "@/lib/config/site";
import { registrationStatus } from "@/lib/registration-control";
import { siteUrl } from "@/app/layout";

export const metadata: Metadata = {
  title: "Conference",
  description: `The conference programme and record for ${site.fullName} — schedule, committees, participation and conduct.`,
  alternates: { canonical: `${siteUrl}/conference` },
};

export default function ConferencePage() {
  const reg = registrationStatus();
  const confirmed = [
    { label: "Debate sessions", value: "Committee sessions across the roster" },
    { label: "Conduct", value: "Formal dress code, formal debate, English language" },
    { label: "Participation", value: "School and college students across India" },
  ];

  const pending = [
    { label: "Dates", value: tba(site.date) },
    { label: "Venue", value: [site.venue.name, site.venue.city].filter(Boolean).join(", ") || tba("") },
    { label: "Edition", value: tba(site.edition) },
    { label: "Delegate fee", value: site.registrationFee.amount ? `${site.registrationFee.currency} ${site.registrationFee.amount}` : "To be announced" },
    { label: "Session theme", value: tba(site.theme) },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: `${site.name} — ${site.fullName}`,
    description: site.descriptor,
    startDate: site.date || undefined,
    location: {
      "@type": "Place",
      name: site.venue.name || "Venue to be announced",
      address: { addressLocality: site.venue.city || undefined },
    },
    eventStatus: "https://schema.org/EventScheduled",
    offers: site.registrationFee.amount
      ? [{ "@type": "Offer", price: String(site.registrationFee.amount), priceCurrency: site.registrationFee.currency }]
      : undefined,
  };

  return (
    <>
      <PageMasthead section="Conference" title="The conference record" lede={`Everything that frames the session — how it is run, how you participate and what the record currently confirms.`} />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <section className="section">
        <div className="container-site grid grid-cols-12 gap-10">
          <div className="col-span-12 lg:col-span-5">
            <SectionHeading kicker="Conduct of the session" title="The rules under which the room works" />
          </div>
          <div className="col-span-12 space-y-5 text-[1.02rem] leading-relaxed text-steel-600 lg:col-span-6 lg:col-start-7">
            <Reveal>
              <p>
                Debate is conducted under a structured Rules of Procedure —
                moderated and unmoderated caucus, formal motions, resolutions,
                amendments and voting. The dais keeps time, keeps order and keeps
                the record. Delegates address the chair, state their country and
                yield correctly.
              </p>
            </Reveal>
            <Reveal delay={60}>
              <p>
                Position papers and committee research guides are issued ahead of
                the session. The awards structure, dress code and full programme
                are published in the conference guide once confirmed.
              </p>
            </Reveal>
            <Reveal delay={120}>
              <Link href="/committees" className="btn btn-outline mt-2">
                View the committee roster
              </Link>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Record: confirmed + pending */}
      <section className="section-tight border-y border-steel-100 bg-steel-50/60">
        <div className="container-site grid grid-cols-1 gap-8 md:grid-cols-2">
          <Reveal>
            <div className="border border-steel-200 bg-white p-8 shadow-[var(--shadow-card)]">
              <p className="kicker flex items-center gap-3">
                <span aria-hidden="true" className="inline-block h-1.5 w-1.5 rounded-full bg-brass-600" />
                Fixed
              </p>
              <dl className="mt-6">
                {confirmed.map((row) => (
                  <div key={row.label} className="border-b border-steel-100 py-4 last:border-0">
                    <dt className="eyebrow-doc">{row.label}</dt>
                    <dd className="mt-1.5 text-[1rem] text-navy-900">{row.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </Reveal>
          <Reveal delay={80}>
            <div className="border border-dashed border-steel-300 bg-white p-8 shadow-[var(--shadow-card)]">
              <p className="kicker-navy flex items-center gap-3">
                <span aria-hidden="true" className="inline-block h-1.5 w-1.5 rounded-full bg-steel-400" />
                Under confirmation
              </p>
              <dl className="mt-6">
                {pending.map((row) => (
                  <div key={row.label} className="border-b border-steel-100 py-4 last:border-0">
                    <dt className="eyebrow-doc">{row.label}</dt>
                    <dd className="mt-1.5 text-[1rem] text-navy-900">{row.value}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-6 text-[0.85rem] leading-relaxed text-steel-400">
                These fields are placeholders held in a single site configuration
                file; they are replaced by the secretariat before the site is
                announced.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="section">
        <div className="container-site grid grid-cols-12 gap-10">
          <div className="col-span-12 lg:col-span-5">
            <SectionHeading kicker="A typical session" title="From gavel to gavel" />
          </div>
          <div className="col-span-12 lg:col-span-6 lg:col-start-7">
            <ol className="border-t border-steel-200">
              {[
                ["Opening ceremony", "Formal address from the secretariat; committee simulation is declared in order."],
                ["Orientation", "A structured briefing on the Rules of Procedure and formatting of committee documents."],
                ["Committee sessions", "General speakers' list, caucus, formal debate and lobbying across the session."],
                ["Closing ceremony", "Presentation of resolutions, recognition of outstanding delegates and issuance of certificates."],
              ].map(([t, body], i) => (
                <Reveal as="li" key={t} delay={i * 60} className="border-b border-steel-200">
                  <div className="flex gap-6 py-7">
                    <span aria-hidden="true" className="pt-1 font-display text-[1.4rem] text-brass-600">{String(i + 1).padStart(2, "0")}</span>
                    <div>
                      <h3 className="font-display text-[1.25rem] font-medium text-navy-900">{t}</h3>
                      <p className="mt-2 max-w-xl leading-relaxed text-steel-600">{body}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </ol>
            <div className="mt-10">
              <p className="text-[0.9rem] text-steel-500">{dateAndVenueLine()}</p>
              <p className="mt-2 text-[0.9rem] text-steel-500">
                Status: <span className="font-semibold text-navy-800">{reg.label}</span>
              </p>
              <Link href="/registration" className="btn btn-primary mt-5">
                {reg.open ? "Register as a delegate" : "View registration information"}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}