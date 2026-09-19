import type { Metadata } from "next";
import Link from "next/link";
import { PageMasthead } from "@/components/PageMasthead";
import { Reveal } from "@/components/Reveal";
import { SectionHeading } from "@/components/SectionHeading";
import { site, tba, dateAndVenueLine } from "@/lib/config/site";
import { pillars } from "@/lib/config/content";
import { secretariat } from "@/lib/config/board";
import { siteUrl } from "@/app/layout";

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export const metadata: Metadata = {
  title: "About",
  description: `About ${site.fullName} — what the conference stands for, how it is conducted and who it serves.`,
  alternates: { canonical: `${siteUrl}/about` },
};

export default function AboutPage() {
  return (
    <>
      <PageMasthead path="/about" section="About" title={`About ${site.name}`} lede={`${site.fullName} exists to give Indian student delegates a formal, rigorous Model United Nations — measured by the quality of the debate it produces.`} />

      <section className="section">
        <div className="container-site grid grid-cols-12 gap-10">
          <div className="col-span-12 lg:col-span-5">
            <SectionHeading
              kicker="Mission and purpose"
              title={`${site.name} is designed around the work of the chamber.`}
            />
          </div>
          <div className="col-span-12 space-y-6 text-[1.02rem] leading-relaxed text-steel-600 lg:col-span-6 lg:col-start-7">
            <Reveal>
              <p>
                Most conference websites tell you what the event feels like.
                We would rather tell you what happens inside it. The chamber is
                staffed by an independent dais. Procedure is applied evenly. Every
                delegate speaks — and every delegate yields.
              </p>
            </Reveal>
            <Reveal delay={60}>
              <p>
                {site.fullName} was conceived to serve student delegates who take
                Model United Nations seriously: the research, the formal address,
                the drafting of resolutions and the slow work of negotiation. The
                conference exists to train instincts, not to celebrate attendance.
              </p>
            </Reveal>
            <Reveal delay={120}>
              <p>
                A small, concentrated field — the right number of committees with
                the right number of delegates — keeps the standard of debate high
                and the attention on the substance of the session.
              </p>
            </Reveal>
            <Reveal delay={180}>
              <Link href="/conference" className="btn btn-outline mt-4">
                View the conference record
              </Link>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="section-tight border-y border-steel-100 bg-steel-50/60">
        <div className="container-site">
          <SectionHeading
            kicker="What we stand on"
            title="Three institutional pillars"
            intro="These are not slogans. They are the standards the dais and the secretariat hold themselves to."
          />
          <div className="mt-14 grid grid-cols-1 gap-x-10 gap-y-10 border-t border-steel-200 pt-10 md:grid-cols-3">
            {pillars.map((p, i) => (
              <Reveal key={p.title} delay={i * 70}>
                <div className={`h-full pt-6 ${i > 0 ? "border-t border-steel-200 md:border-t-0 md:border-l md:pl-10" : ""}`}>
                  <p className="kicker">0{i + 1}</p>
                  <h3 className="mt-4 font-display text-[1.3rem] font-medium text-navy-900">{p.title}</h3>
                  <p className="mt-4 leading-relaxed text-steel-600">{p.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container-site">
          <SectionHeading
            kicker="The secretariat"
            title="Who runs the conference"
            intro="The organising board responsible for the session — procedure and delegate affairs, communications, technology and logistics."
          />
          <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {secretariat.map((m, i) => (
              <Reveal key={`${m.role}-${m.name}`} delay={i * 60}>
                <article className="card-premium h-full p-8">
                  <span
                    aria-hidden="true"
                    className="flex h-12 w-12 items-center justify-center rounded-[0.5rem] border border-brass-500/40 bg-brass-50 font-display text-[1.1rem] font-semibold text-brass-700"
                  >
                    {initialsOf(m.name)}
                  </span>
                  <p className="eyebrow-doc mt-6">{m.role}</p>
                  <h3 className="mt-2 font-display text-[1.35rem] font-medium text-navy-900">
                    {m.name}
                  </h3>
                </article>
              </Reveal>
            ))}
          </div>
          <p className="mt-8 text-[0.85rem] text-steel-500">
            Photographs and biographies will be published once supplied by the secretariat.
          </p>
        </div>
      </section>

      <section className="section border-t border-steel-100">
        <div className="container-site grid grid-cols-12 gap-10">
          <div className="col-span-12 lg:col-span-5">
            <SectionHeading
              kicker="A note on standard"
              title="A conference measured by the work it contains."
            />
          </div>
          <div className="col-span-12 space-y-5 text-[1.02rem] leading-relaxed text-steel-600 lg:col-span-6 lg:col-start-7">
            <Reveal>
              <p>
                We do not measure ourselves by the scale of the poster, the number
                of committees or the loudness of a photo grid. The integrity of a
                Model United Nations session lives in the quiet parts — the formal
                address, the amendment on the floor, the careful resolution that
                passes without a gavel chase.
              </p>
            </Reveal>
            <Reveal delay={60}>
              <p>
                If you are looking for a conference that takes the work seriously —
                the research, the rules of procedure, the standard of conduct in a
                chamber — then {site.name} was built for you.
              </p>
            </Reveal>
            <Reveal delay={120}>
              <div className="mt-2 grid grid-cols-1 border-t border-steel-200 pt-6 text-[0.9rem] sm:grid-cols-3">
                <div className="py-4 sm:pr-6">
                  <span className="eyebrow-doc">Edition</span>
                  <p className="mt-1 font-display text-[1.1rem] text-navy-900">{tba(site.edition) || "To be announced"}</p>
                </div>
                <div className="border-t border-steel-100 py-4 sm:border-t-0 sm:border-l sm:pl-6 sm:pr-6">
                  <span className="eyebrow-doc">Date & Venue</span>
                  <p className="mt-1 font-display text-[1.1rem] text-navy-900">{dateAndVenueLine()}</p>
                </div>
                <div className="border-t border-steel-100 py-4 sm:border-t-0 sm:border-l sm:pl-6">
                  <span className="eyebrow-doc">Debate language</span>
                  <p className="mt-1 font-display text-[1.1rem] text-navy-900">English</p>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>
    </>
  );
}