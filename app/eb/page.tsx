import type { Metadata } from "next";
import Link from "next/link";
import { PageMasthead } from "@/components/PageMasthead";
import { Reveal } from "@/components/Reveal";
import { SectionHeading } from "@/components/SectionHeading";
import { committees } from "@/lib/config/committees";
import { siteUrl } from "@/app/layout";

export const metadata: Metadata = {
  title: "Executive Board",
  description: `Apply to join the Executive Board of ${"IMUN 2026"} as Chairperson or Vice-Chairperson — DISEC, UNHRC, the European Union and the Joint Crisis Committee.`,
  alternates: { canonical: `${siteUrl}/eb` },
};

export default function EBPage() {
  return (
    <>
      <PageMasthead
        path="/eb"
        section="Executive Board"
        title="Join the dais"
        lede="The Executive Board carries the room — the chairs and vice-chairs who lead DISEC, UNHRC, the European Union and the Joint Crisis Committee through the session."
      />

      <section className="section">
        <div className="container-site grid grid-cols-12 gap-10">
          <div className="col-span-12 lg:col-span-5">
            <SectionHeading kicker="Why apply" title="Lead the committee, not just debate in it" />
          </div>
          <div className="col-span-12 space-y-5 text-[1.02rem] leading-relaxed text-steel-600 lg:col-span-6 lg:col-start-7">
            <Reveal>
              <p>
                Good chairs set the temperature of the room. They run the Rules
                of Procedure without weighing debate down, keep the speakers'
                list moving, and make sure a first-time delegate is as able to
                contribute as a veteran. That is the EB we are building for
                IMUN 2026.
              </p>
            </Reveal>
            <Reveal delay={60}>
              <p>
                We are accepting applications for Chairpersons, Vice-Chairpersons
                and candidates flexible about either. Prior dais experience is
                preferred but not required for every seat — appetite and how you
                think count too.
              </p>
            </Reveal>
            <Reveal delay={120}>
              <Link href="/eb/apply" className="btn btn-primary mt-2">
                Apply for the Executive Board
              </Link>
            </Reveal>
          </div>
        </div>
      </section>

      {/* The four committees */}
      <section className="section-tight border-y border-steel-100 bg-steel-50/60">
        <div className="container-site grid grid-cols-1 gap-8 md:grid-cols-2">
          <Reveal>
            <div className="border border-steel-200 bg-white p-8 shadow-[var(--shadow-card)]">
              <p className="kicker flex items-center gap-3">
                <span aria-hidden="true" className="inline-block h-1.5 w-1.5 rounded-full bg-brass-600" />
                The committees you can lead
              </p>
              <ul className="mt-6 divide-y divide-steel-100">
                {committees.map((c) => (
                  <li key={c.code} className="py-4">
                    <div className="flex items-baseline justify-between gap-4">
                      <h3 className="text-[1rem] font-semibold text-navy-900">{c.name}</h3>
                      <span className="shrink-0 font-mono text-[0.72rem] uppercase tracking-[0.14em] text-steel-400">{c.code}</span>
                    </div>
                    <p className="mt-1 text-[0.92rem] text-steel-500">{c.category}</p>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
          <Reveal delay={80}>
            <div className="border border-dashed border-steel-300 bg-white p-8 shadow-[var(--shadow-card)]">
              <p className="kicker-navy flex items-center gap-3">
                <span aria-hidden="true" className="inline-block h-1.5 w-1.5 rounded-full bg-steel-400" />
                What the application asks
              </p>
              <ul className="mt-6 space-y-4 text-[0.95rem] leading-relaxed text-steel-600">
                <li>Your committee preference and a suggested agenda for it</li>
                <li>Your record as a delegate and on the dais</li>
                <li>What strong chairing looks like to you, and how you have handled a difficult moment</li>
                <li>Your availability across the conference and for preparation calls</li>
              </ul>
              <p className="mt-6 text-[0.85rem] leading-relaxed text-steel-400">
                Applications are reviewed by the secretariat; shortlisted
                candidates are contacted at the email they provide.
              </p>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}