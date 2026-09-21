import Link from "next/link";
import type { Metadata } from "next";
import { BrandLogo } from "@/components/BrandLogo";
import { Reveal } from "@/components/Reveal";
import { SectionHeading } from "@/components/SectionHeading";
import { Accordion } from "@/components/Accordion";
import { CTABand } from "@/components/CTABand";
import { site, dateAndVenueLine, tba, hasConfirmedEdition } from "@/lib/config/site";
import { committees, type ExecutiveBoard } from "@/lib/config/committees";
import { faqEntries } from "@/lib/config/faq";
import { atAGlance, highlights, delegateExperience, whyParticipate } from "@/lib/config/content";
import { registrationStatus } from "@/lib/registration-control";
import { siteUrl } from "@/app/layout";
import { eventSchema } from "@/lib/seo/structured-data";
import { JsonLd } from "@/components/JsonLd";

export const metadata: Metadata = {
  title: { absolute: "IMUN — Indian Model United Nations Conference 2026" },
  description: `${site.descriptor} Register as a delegate for the ${site.date} session.`,
  alternates: { canonical: `${siteUrl}/` },
};

function boardLine(eb?: ExecutiveBoard): string {
  if (!eb) return "—";
  const parts: string[] = [];
  if (typeof eb.director === "number") parts.push(`Director ${eb.director}`);
  parts.push(`Chair ${eb.chairpersons}`);
  parts.push(`VC ${eb.viceChairpersons}`);
  parts.push(`Rapporteur ${eb.rapporteurs}`);
  return parts.join(" · ");
}

export default function HomePage() {
  const reg = registrationStatus();
  const glanceRows = [
    { label: "Date", value: tba(site.date) },
    {
      label: "Venue",
      value: [site.venue.name, site.venue.city].filter(Boolean).join(", ") || "To be announced",
    },
    { label: "Edition", value: hasConfirmedEdition ? site.edition : "To be announced" },
    { label: "Committees", value: `${committees.length}` },
    ...atAGlance.map((row) => ({ label: row.key, value: row.value })),
  ];

  return (
    <>
      <JsonLd data={eventSchema()} />

      {/* ============================== HERO ============================== */}
      <section className="relative overflow-hidden bg-navy-950 text-white">
        <div className="rule-gold" />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(75%_120%_at_8%_-10%,rgba(193,161,90,0.16),transparent_60%)]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.05] [background-image:linear-gradient(rgba(255,255,255,0.6)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.6)_1px,transparent_1px)] [background-size:64px_64px]"
        />

        <div className="container-site relative">
          <div className="grid grid-cols-12 items-center gap-y-14 py-16 md:py-24">
            <Reveal className="col-span-12 lg:col-span-7">
              <p className="kicker-light">
                Indian Model United Nations
                {site.edition ? ` · ${site.edition}` : ""}
              </p>
              <h1 className="mt-6 font-display text-[clamp(2.75rem,7vw,5.25rem)] font-medium leading-[0.98] tracking-[-0.02em] text-white">
                Diplomacy, in its
                <span className="italic text-brass-300"> exacting </span>
                form.
              </h1>
              <p className="mt-7 max-w-xl text-[1.08rem] leading-relaxed text-white/65">
                {site.descriptor} A formal Model United Nations for India&apos;s student
                delegates — structured debate, rigorous chairs and the discipline of real
                international procedure.
              </p>
              <div className="mt-9 flex flex-wrap gap-3">
                <Link href="/registration" className="btn btn-accent">
                  Register as a delegate
                </Link>
                <Link href="/committees" className="btn btn-outline-light">
                  Explore the committees
                </Link>
              </div>
              <p className="mt-6 flex items-center gap-2.5 text-[0.78rem] uppercase tracking-[0.16em] text-white/45">
                <span
                  className={`inline-block h-1.5 w-1.5 rounded-full ${reg.open ? "bg-brass-400" : "bg-steel-500"}`}
                  aria-hidden="true"
                />
                {reg.label} · {dateAndVenueLine()}
              </p>
            </Reveal>

            <Reveal delay={120} className="col-span-12 lg:col-span-5">
              <div className="relative mx-auto flex aspect-square w-full max-w-[21rem] items-center justify-center">
                <div className="absolute inset-0 rounded-full border border-brass-500/30" />
                <div className="absolute inset-7 rounded-full border border-white/10" />
                <div
                  aria-hidden="true"
                  className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_50%_38%,rgba(193,161,90,0.2),transparent_62%)]"
                />
                <span className="absolute left-1/2 top-0 h-3 w-px -translate-x-1/2 bg-brass-500/50" aria-hidden="true" />
                <span className="absolute bottom-0 left-1/2 h-3 w-px -translate-x-1/2 bg-brass-500/50" aria-hidden="true" />
                <span className="absolute left-0 top-1/2 h-px w-3 -translate-y-1/2 bg-brass-500/50" aria-hidden="true" />
                <span className="absolute right-0 top-1/2 h-px w-3 -translate-y-1/2 bg-brass-500/50" aria-hidden="true" />
                <BrandLogo priority tone="onDark" className="relative h-44 w-44 object-contain" />
              </div>
            </Reveal>
          </div>

          {/* Fact strip */}
          <dl className="grid grid-cols-2 border-t border-white/10 md:grid-cols-4">
            {glanceRows.slice(0, 4).map((row, i) => (
              <div
                key={row.label}
                className={`px-1 py-6 md:px-6 ${i > 0 ? "md:border-l md:border-white/10" : ""} ${
                  i % 2 === 1 ? "border-l border-white/10 pl-5" : ""
                }`}
              >
                <dt className="kicker-light">{row.label}</dt>
                <dd className="mt-2 font-display text-[1.05rem] text-white/90">{row.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ============================== EB CTA ============================== */}
      <section className="border-b border-brass-500/25 bg-brass-50/70">
        <div className="container-site grid grid-cols-12 items-center gap-y-8 py-12 md:py-14">
          <div className="col-span-12 lg:col-span-8">
            <p className="kicker flex items-center gap-3">
              <span aria-hidden="true" className="inline-block h-1.5 w-1.5 rounded-full bg-brass-600" />
              Executive Board applications
            </p>
            <h2 className="mt-3 font-display text-[clamp(1.6rem,3.6vw,2.3rem)] font-medium leading-tight text-navy-900">
              Join the dais — chair or vice-chair a committee at IMUN 2026.
            </h2>
            <p className="mt-3 max-w-2xl text-[0.98rem] leading-relaxed text-steel-600">
              DISEC, UNHRC, the European Union and the Joint Crisis Committee all need
              chairs. Prior dais experience is preferred but not required for every seat.
            </p>
          </div>
          <div className="col-span-12 flex flex-wrap items-center gap-3 lg:col-span-4 lg:justify-end">
            <Link href="/eb/apply" className="btn btn-primary">
              Apply now
            </Link>
            <Link href="/eb" className="btn btn-outline">
              About the EB
            </Link>
          </div>
        </div>
      </section>

      {/* ============================== ABOUT ============================== */}
      <section className="section">
        <div className="container-site grid grid-cols-12 gap-y-10">
          <div className="col-span-12 lg:col-span-4">
            <SectionHeading
              index="01"
              kicker="About the conference"
              title="An institution for student diplomacy"
            />
          </div>
          <Reveal className="col-span-12 space-y-6 text-[1.05rem] leading-relaxed text-steel-600 lg:col-span-7 lg:col-start-6">
            <p>
              Model United Nations exists to train the instincts of international
              negotiation — argument from evidence, compromise under constraint, and the
              discipline to yield the floor and hold it again. {site.name} was conceived to
              give Indian student delegates that training in its most exacting, formal form.
            </p>
            <p>
              The conference runs under a structured Rules of Procedure, staffed committees
              and an independent dais. It is measured by the depth of its resolutions and
              the conduct of its chamber, not by the poster.
            </p>
            <Link
              href="/about"
              className="inline-flex items-center gap-2 font-medium text-navy-900 transition-colors hover:text-brass-700"
            >
              Read more about IMUN
              <span aria-hidden="true">→</span>
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ============================== COMMITMENTS ============================== */}
      <section className="section border-y border-steel-200 bg-steel-50">
        <div className="container-site">
          <SectionHeading
            index="02"
            kicker="What defines the session"
            title="Standing commitments"
            intro="Every part of the conference is accountable to these commitments."
          />
          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2">
            {highlights.map((h, i) => (
              <Reveal key={h.title} delay={i * 70}>
                <article className="card-premium h-full p-8">
                  <span aria-hidden="true" className="doc-index">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-5 font-display text-[1.4rem] font-medium text-navy-900">
                    {h.title}
                  </h3>
                  <p className="mt-3 text-[0.98rem] leading-relaxed text-steel-600">{h.body}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ============================== PULL QUOTE ============================== */}
      <section className="section-tight">
        <div className="container-narrow text-center">
          <div className="mx-auto mb-8 h-px w-14 bg-brass-500" aria-hidden="true" />
          <p className="font-display text-[clamp(1.4rem,3vw,2.1rem)] font-medium italic leading-[1.35] text-navy-900">
            &ldquo;A resolution is not won at the podium. It is won in the hours spent
            reading, drafting and persuading.&rdquo;
          </p>
          <p className="mt-6 text-[0.74rem] font-semibold uppercase tracking-[0.2em] text-steel-500">
            The IMUN Secretariat
          </p>
        </div>
      </section>

      {/* ============================== COMMITTEES ============================== */}
      <section className="section border-y border-steel-200 bg-steel-50">
        <div className="container-site">
          <SectionHeading
            index="03"
            kicker="Committee roster"
            title="The chambers"
            intro="The roster as confirmed by the secretariat. Agendas are issued ahead of the session."
          />
          <Reveal className="mt-12">
            <div className="sheet overflow-x-auto p-6 md:p-8">
              <table className="doc-table min-w-[46rem]">
                <caption>Committees, delegate seats and executive board</caption>
                <thead>
                  <tr>
                    <th className="w-24">Code</th>
                    <th>Committee</th>
                    <th className="w-44">Category</th>
                    <th className="w-20 text-right">Seats</th>
                    <th className="w-64">Executive board</th>
                  </tr>
                </thead>
                <tbody>
                  {committees.map((c) => (
                    <tr key={c.code}>
                      <td className="font-semibold text-navy-900">{c.code}</td>
                      <td className="text-navy-900">{c.name}</td>
                      <td>{c.category}</td>
                      <td className="text-right tabular-nums text-navy-900">{c.seats}</td>
                      <td>{boardLine(c.executiveBoard)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Reveal>
          <div className="mt-8">
            <Link href="/committees" className="btn btn-outline">
              Committee details
            </Link>
          </div>
        </div>
      </section>

      {/* ============================== EXPERIENCE ============================== */}
      <section className="section">
        <div className="container-site grid grid-cols-12 gap-y-10">
          <div className="col-span-12 lg:col-span-4">
            <SectionHeading
              index="04"
              kicker="The delegate experience"
              title="What a delegate actually does"
            />
          </div>
          <div className="col-span-12 lg:col-span-7 lg:col-start-6">
            <ol className="border-t border-steel-200">
              {delegateExperience.map((item, i) => (
                <Reveal as="li" key={item.title} delay={i * 60} className="flex gap-6 border-b border-steel-200 py-6">
                  <span
                    aria-hidden="true"
                    className="font-display text-[1.5rem] font-medium leading-none text-brass-500 tabular-nums"
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h3 className="font-display text-[1.25rem] font-medium text-navy-900">
                      {item.title}
                    </h3>
                    <p className="mt-2 max-w-xl text-[0.98rem] leading-relaxed text-steel-600">
                      {item.body}
                    </p>
                  </div>
                </Reveal>
              ))}
            </ol>
            <div className="mt-9">
              <Link href="/registration" className="btn btn-primary">
                Begin your registration
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ============================== WHY PARTICIPATE ============================== */}
      <section className="relative overflow-hidden bg-navy-950 text-white">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_120%_at_90%_10%,rgba(193,161,90,0.14),transparent_60%)]"
        />
        <div className="container-site relative section grid grid-cols-12 gap-y-12">
          <div className="col-span-12 lg:col-span-4">
            <SectionHeading
              index="05"
              kicker="Why participate"
              title="The case for the floor"
              tone="dark"
            />
          </div>
          <div className="col-span-12 grid gap-6 lg:col-span-7 lg:col-start-6">
            {whyParticipate.map((item, i) => (
              <Reveal key={item.title} delay={i * 80}>
                <article className="rounded-[0.75rem] border border-white/10 bg-white/[0.03] p-8 transition-colors duration-300 hover:border-brass-500/40">
                  <h3 className="font-display text-[1.35rem] font-medium text-white">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-[0.98rem] leading-relaxed text-white/65">{item.body}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ============================== FAQ ============================== */}
      <section className="section">
        <div className="container-site grid grid-cols-12 gap-y-10">
          <div className="col-span-12 lg:col-span-4">
            <SectionHeading index="06" kicker="Before you ask" title="Frequently asked questions" />
            <div className="mt-7">
              <Link href="/faq" className="btn btn-outline">
                View all questions
              </Link>
            </div>
          </div>
          <Reveal className="col-span-12 lg:col-span-7 lg:col-start-6">
            <Accordion items={faqEntries.slice(0, 4)} />
          </Reveal>
        </div>
      </section>

      <CTABand />
    </>
  );
}
