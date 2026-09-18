import Link from "next/link";
import type { Metadata } from "next";
import { BrandLogo } from "@/components/BrandLogo";
import { SectionHeading } from "@/components/SectionHeading";
import { Accordion } from "@/components/Accordion";
import { CTABand } from "@/components/CTABand";
import { site, dateAndVenueLine, tba, hasConfirmedEdition } from "@/lib/config/site";
import { committees, type ExecutiveBoard } from "@/lib/config/committees";
import { faqEntries } from "@/lib/config/faq";
import { atAGlance, highlights, delegateExperience, whyParticipate } from "@/lib/config/content";
import { registrationStatus } from "@/lib/registration-control";
import { siteUrl } from "@/app/layout";

export const metadata: Metadata = {
  title: `${site.name} — Indian MUN`,
  description: site.descriptor,
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
      {/* ============================ MASTHEAD ============================ */}
      <section className="border-b border-steel-200 bg-white">
        <div className="container-site pt-10 pb-9 md:pt-12">
          <div className="flex flex-col items-center text-center">
            <BrandLogo priority tone="onLight" className="h-24 w-24 object-contain" />
            <p className="mt-5 font-display text-[clamp(2.6rem,8vw,4.6rem)] font-semibold leading-none tracking-[-0.01em] text-navy-900">
              IMUN
            </p>
            <p className="mt-3 text-[0.72rem] font-semibold uppercase tracking-[0.3em] text-steel-500">
              Indian Model United Nations
            </p>
          </div>

          <div className="rule-double mt-8" aria-hidden="true" />

          <dl className="grid grid-cols-2 divide-steel-200 md:grid-cols-4">
            {glanceRows.slice(0, 4).map((row, i) => (
              <div
                key={row.label}
                className={`border-b border-steel-200 px-5 py-4 md:border-b-0 ${
                  i > 0 ? "md:border-l" : ""
                } ${i % 2 === 1 ? "border-l" : ""} ${i === 2 ? "md:border-l" : ""}`}
              >
                <dt className="eyebrow-doc">{row.label}</dt>
                <dd className="mt-1.5 font-display text-[1rem] text-navy-900">{row.value}</dd>
              </div>
            ))}
          </dl>

          <div className="rule-heavy" aria-hidden="true" />

          <div className="mt-8 grid grid-cols-12 gap-8">
            <p className="col-span-12 text-[1.1rem] leading-relaxed text-navy-900 lg:col-span-7">
              {site.descriptor} A formal Model United Nations for India&apos;s student
              delegates — structured debate, rigorous chairs and the discipline of real
              international procedure.
            </p>
            <div className="col-span-12 border-navy-900 lg:col-span-5 lg:border-l-2 lg:pl-6">
              <p className="eyebrow-doc">Registration</p>
              <p className="mt-2 text-[0.92rem] leading-relaxed text-steel-600">
                {reg.open
                  ? "Registration is open. Seats are allotted in the order registrations are processed."
                  : "Registration is currently closed. The form reopens when the secretariat announces the next phase."}
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link href="/registration" className="btn btn-primary">
                  Register as a delegate
                </Link>
                <Link href="/conference" className="btn btn-outline">
                  Conference details
                </Link>
              </div>
              <p className="mt-3 text-[0.78rem] text-steel-400">{dateAndVenueLine()}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ============================ RECORD ============================ */}
      <section className="section-tight border-b border-steel-200 bg-steel-50">
        <div className="container-site grid grid-cols-12 gap-8">
          <div className="col-span-12 lg:col-span-3">
            <SectionHeading kicker="Conference record" title="At a glance" />
          </div>
          <div className="col-span-12 lg:col-span-9">
            <table className="doc-table">
              <caption>Record of the session</caption>
              <tbody>
                {glanceRows.map((row) => (
                  <tr key={row.label}>
                    <th scope="row" className="w-[14rem]">
                      {row.label}
                    </th>
                    <td>{row.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ============================ ABOUT ============================ */}
      <section className="section border-b border-steel-200">
        <div className="container-site grid grid-cols-12 gap-8">
          <div className="col-span-12 lg:col-span-4">
            <SectionHeading index="1" kicker="About the conference" title="An institution for student diplomacy" />
          </div>
          <div className="col-span-12 space-y-5 text-[1rem] leading-relaxed text-steel-600 lg:col-span-7 lg:col-start-6">
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
            <p>
              <Link href="/about" className="font-semibold text-navy-900 underline decoration-navy-900 underline-offset-4">
                Read more about IMUN
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* ============================ COMMITMENTS ============================ */}
      <section className="section border-b border-steel-200">
        <div className="container-site">
          <SectionHeading
            index="2"
            kicker="What defines the session"
            title="Standing commitments"
            intro="Every part of the conference is accountable to these commitments."
          />
          <ol className="mt-10 grid grid-cols-1 gap-x-12 border-t border-steel-200 md:grid-cols-2">
            {highlights.map((h, i) => (
              <li key={h.title} className="flex gap-5 border-b border-steel-200 py-6">
                <span aria-hidden="true" className="doc-index pt-1">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="font-display text-[1.15rem] font-semibold text-navy-900">{h.title}</h3>
                  <p className="mt-2 text-[0.95rem] leading-relaxed text-steel-600">{h.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ============================ COMMITTEES ============================ */}
      <section className="section border-b border-steel-200 bg-steel-50">
        <div className="container-site">
          <SectionHeading
            index="3"
            kicker="Committee roster"
            title="The chambers"
            intro="The roster as confirmed by the secretariat. Agendas are issued ahead of the session."
          />
          <div className="mt-10 overflow-x-auto">
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
          <div className="mt-6">
            <Link href="/committees" className="font-semibold text-navy-900 underline decoration-navy-900 underline-offset-4">
              Committee details and descriptions
            </Link>
          </div>
        </div>
      </section>

      {/* ============================ DELEGATE EXPERIENCE ============================ */}
      <section className="section border-b border-steel-200">
        <div className="container-site grid grid-cols-12 gap-10">
          <div className="col-span-12 lg:col-span-4">
            <SectionHeading index="4" kicker="The delegate experience" title="What a delegate actually does" />
          </div>
          <div className="col-span-12 lg:col-span-7 lg:col-start-6">
            <ol className="border-t border-steel-200">
              {delegateExperience.map((item, i) => (
                <li key={item.title} className="flex gap-5 border-b border-steel-200 py-5">
                  <span aria-hidden="true" className="doc-index pt-1">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h3 className="font-display text-[1.1rem] font-semibold text-navy-900">{item.title}</h3>
                    <p className="mt-1.5 max-w-xl text-[0.95rem] leading-relaxed text-steel-600">{item.body}</p>
                  </div>
                </li>
              ))}
            </ol>
            <div className="mt-8">
              <Link href="/registration" className="btn btn-primary">
                Begin your registration
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ============================ WHY PARTICIPATE ============================ */}
      <section className="section border-b border-steel-200 bg-navy-900">
        <div className="container-site">
          <div className="grid grid-cols-12 gap-10">
            <div className="col-span-12 lg:col-span-4">
              <SectionHeading index="5" kicker="Why participate" title="The case for the floor" tone="dark" />
            </div>
            <div className="col-span-12 lg:col-span-7 lg:col-start-6">
              <ol className="border-t border-white/20">
                {whyParticipate.map((item, i) => (
                  <li key={item.title} className="flex gap-5 border-b border-white/20 py-5">
                    <span aria-hidden="true" className="doc-index pt-1 !text-white">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <h3 className="font-display text-[1.1rem] font-semibold text-white">{item.title}</h3>
                      <p className="mt-1.5 max-w-xl text-[0.95rem] leading-relaxed text-white/70">{item.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* ============================ FAQ ============================ */}
      <section className="section">
        <div className="container-site grid grid-cols-12 gap-10">
          <div className="col-span-12 lg:col-span-4">
            <SectionHeading index="6" kicker="Before you ask" title="Frequently asked questions" />
            <div className="mt-6">
              <Link href="/faq" className="btn btn-outline">
                View all questions
              </Link>
            </div>
          </div>
          <div className="col-span-12 lg:col-span-7 lg:col-start-6">
            <Accordion items={faqEntries.slice(0, 4)} />
          </div>
        </div>
      </section>

      <CTABand />
    </>
  );
}
