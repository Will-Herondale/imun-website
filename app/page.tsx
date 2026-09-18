import Link from "next/link";
import type { Metadata } from "next";
import { BrandLogo } from "@/components/BrandLogo";
import { CountUp } from "@/components/CountUp";
import { Reveal } from "@/components/Reveal";
import { SectionHeading } from "@/components/SectionHeading";
import { Accordion } from "@/components/Accordion";
import { CTABand } from "@/components/CTABand";
import { site, dateAndVenueLine, tba, hasConfirmedEdition } from "@/lib/config/site";
import { committees } from "@/lib/config/committees";
import { faqEntries } from "@/lib/config/faq";
import {
  atAGlance,
  highlights,
  delegateExperience,
  whyParticipate,
  heroStats,
} from "@/lib/config/content";
import { registrationStatus } from "@/lib/registration-control";
import { siteUrl } from "@/app/layout";

export const metadata: Metadata = {
  title: `${site.name} — Indian MUN`,
  description: site.descriptor,
  alternates: { canonical: `${siteUrl}/` },
};

export default function HomePage() {
  const reg = registrationStatus();
  const glanceRows = [
    { label: "Date", value: tba(site.date) },
    {
      label: "Venue",
      value: [site.venue.name, site.venue.city].filter(Boolean).join(", ") || "To be announced",
    },
    { label: "Committees", value: `${committees.length} (draft roster)` },
    { label: "Edition", value: hasConfirmedEdition ? site.edition : "To be announced" },
    ...atAGlance.map((row) => ({ label: row.key, value: row.value })),
  ];

  return (
    <>
      {/* ============================ HERO ============================ */}
      <section className="grain relative overflow-hidden bg-navy-900 text-white">
        {/* Meridian motif */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(60% 60% at 78% 30%, rgba(255,255,255,0.07), transparent 70%), radial-gradient(50% 50% at 4% 96%, rgba(255,255,255,0.04), transparent 72%)",
            }}
          />
          <div
            className="absolute inset-0 opacity-60"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px)",
              backgroundSize: "64px 64px",
            }}
          />
          <div className="absolute -right-40 top-1/2 hidden h-[560px] w-[560px] -translate-y-1/2 items-center justify-center lg:flex">
            <div className="absolute inset-0 rounded-full border border-white/10" />
            <div className="absolute inset-10 rounded-full border border-white/[0.06]" />
            <div className="absolute inset-28 rounded-full border border-white/[0.08]" />
            <div className="absolute inset-0 rounded-full border border-azure-600/30" style={{ transform: "translateX(-38%) scale(1.05)", borderRadius: "50%" }} />
            <div className="absolute left-1/2 top-0 h-full w-px bg-white/[0.06]" />
            <div className="absolute left-0 top-1/2 h-px w-full bg-white/[0.06]" />
          </div>
        </div>

        <div className="container-site relative">
          <div className="grid min-h-[calc(100dvh-8.5rem)] grid-cols-12 items-center gap-10 py-14 lg:py-20">
            <div className="col-span-12 lg:col-span-7 xl:col-span-6">
              <Reveal>
                <p className="flex items-center gap-3 text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-azure-300">
                  <span aria-hidden="true" className="inline-block h-px w-10 bg-azure-500/80" />
                  {site.fullName}
                </p>
              </Reveal>
              <h1 className="mt-6 text-[clamp(2.4rem,6vw,4.3rem)] font-medium leading-[1.04] tracking-[-0.015em] text-white">
                <span className="block overflow-hidden pb-[0.06em]">
                  <span className="hero-line" style={{ animationDelay: "40ms" }}>
                    A formal Model United Nations
                  </span>
                </span>
                {" "}
                <span className="block overflow-hidden pb-[0.06em]">
                  <span className="hero-line" style={{ animationDelay: "160ms" }}>
                    for India&apos;s student delegates.
                  </span>
                </span>
              </h1>
              <Reveal delay={120}>
                <p className="mt-6 max-w-xl text-[1.05rem] leading-relaxed text-white/70">
                  {site.descriptor} Structured debate, rigorous chairs and the
                  discipline of real international procedure — conducted with the
                  seriousness the subject demands.
                </p>
              </Reveal>
              <Reveal delay={180}>
                <div className="mt-10 flex flex-wrap items-center gap-4">
                  <Link href={reg.open ? "/registration" : "/registration"} className="btn btn-accent">
                    Register as a delegate
                  </Link>
                  <Link href="/conference" className="btn btn-outline-light">
                    Explore the conference
                  </Link>
                </div>
              </Reveal>
              <Reveal delay={240}>
                <p className="mt-6 text-[0.82rem] text-white/50">
                  {reg.open ? "Registration is open — seats are limited." : "Registration is currently closed."}{" "}
                  <span aria-hidden="true">·</span> {site.tagline}
                </p>
              </Reveal>
            </div>

            <div className="col-span-12 lg:col-span-5 xl:col-span-6 lg:text-right">
              <Reveal delay={120}>
                <div className="relative mx-auto max-w-[18rem] lg:mx-0 lg:ml-auto lg:max-w-[22rem]">
                  {hasConfirmedEdition ? (
                    <p className="mb-5 whitespace-nowrap text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-azure-300 lg:text-right">
                      {site.edition}
                    </p>
                  ) : null}
                  <div className="relative aspect-square">
                    <div aria-hidden="true" className="absolute inset-0 rounded-full border border-white/12" />
                    <div aria-hidden="true" className="absolute inset-[7%] rounded-full border border-white/[0.07]" />
                    <div aria-hidden="true" className="absolute inset-[14%] rounded-full border border-white/[0.05]" />
                    <BrandLogo priority className="relative h-full w-full object-contain p-[13%]" />
                  </div>
                  <div className="mt-5 flex justify-center gap-5 text-[0.72rem] uppercase tracking-[0.16em] text-white/55">
                    <span>Debate</span>
                    <span aria-hidden="true" className="text-white/30">·</span>
                    <span>Negotiate</span>
                    <span aria-hidden="true" className="text-white/30">·</span>
                    <span>Lead</span>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>

          {/* Stats strip */}
          <div className="grid grid-cols-1 gap-y-6 border-t border-white/10 py-8 sm:grid-cols-3 sm:gap-x-8">
            {heroStats.map((s, i) => (
              <Reveal key={s.label} delay={i * 70} className="flex items-baseline gap-4 sm:justify-start">
                <CountUp value={s.value} className="font-display text-[2.4rem] font-medium leading-none text-white" />
                <span className="max-w-[11rem] text-[0.8rem] leading-snug text-white/55">{s.label}</span>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ============================ ABOUT STRIP ============================ */}
      <section className="section">
        <div className="container-site grid grid-cols-12 gap-10">
          <div className="col-span-12 lg:col-span-5">
            <SectionHeading
              kicker="About the conference"
              title={`${site.name} is an institution for serious student diplomacy.`}
            />
          </div>
          <div className="col-span-12 lg:col-span-6 lg:col-start-7">
            <Reveal>
              <div className="space-y-5 text-[1.02rem] leading-relaxed text-steel-600">
                <p>
                  Model United Nations exists to train the instincts of international
                  negotiation — argument from evidence, compromise under constraint,
                  and the discipline to yield the floor and hold it again. {site.name}{" "}
                  was conceived to give Indian student delegates that training in its
                  most exacting, formal form.
                </p>
                <p>
                  The conference runs under a structured Rules of Procedure, staffed
                  committees and an independent dais. It is measured by the depth of
                  its resolutions and the conduct of its chamber — not by the poster.
                </p>
              </div>
            </Reveal>
            <Reveal delay={80}>
              <div className="mt-9 flex items-center gap-4">
                <Link href="/about" className="btn btn-outline">
                  Read more about IMUN
                </Link>
                <span className="hidden text-[0.8rem] text-steel-400 sm:block">{dateAndVenueLine()}</span>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ============================ AT A GLANCE ============================ */}
      <section className="section-tight border-y border-steel-100 bg-steel-50/70">
        <div className="container-site grid grid-cols-12 gap-6">
          <div className="col-span-12 lg:col-span-3">
            <Reveal>
              <p className="kicker flex items-center gap-3">
                <span aria-hidden="true" className="inline-block h-px w-8 bg-azure-600/70" />
                Conference record
              </p>
              <h2 className="mt-4 font-display text-[1.9rem] font-medium leading-tight text-navy-900">
                At a glance
              </h2>
            </Reveal>
          </div>
          <div className="col-span-12 lg:col-span-9">
            <Reveal>
              <dl className="grid grid-cols-1 border-t border-steel-200 sm:grid-cols-2 xl:grid-cols-3">
                {glanceRows.map((row, i) => (
                  <div
                    key={row.label}
                    className={`flex flex-col justify-center gap-1 border-b border-steel-200 px-6 py-5 ${
                      i % 2 === 1 ? "sm:border-l" : ""
                    } ${i >= 2 ? "xl:border-l-0" : ""} ${i % 3 === 1 ? "xl:border-l" : ""}`}
                  >
                    <dt className="eyebrow-doc">{row.label}</dt>
                    <dd className="mt-1 font-display text-[1.05rem] text-navy-900">{row.value}</dd>
                  </div>
                ))}
              </dl>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ============================ HIGHLIGHTS ============================ */}
      <section className="section">
        <div className="container-site">
          <SectionHeading
            kicker="What defines the session"
            title="The conference in four commitments"
            intro="Everything on this page is accountable to these commitments. When in doubt, they are the answer."
          />
          <div className="mt-14 grid grid-cols-1 gap-x-10 gap-y-12 border-t border-steel-200 pt-10 md:grid-cols-2">
            {highlights.map((h, i) => (
              <Reveal key={h.title} delay={(i % 2) * 70} className="flex gap-6">
                <span aria-hidden="true" className="pt-1 font-display text-[1.5rem] font-medium text-azure-600">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="font-display text-[1.35rem] font-medium text-navy-900">{h.title}</h3>
                  <p className="mt-3 leading-relaxed text-steel-600">{h.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ============================ COMMITTEES PREVIEW ============================ */}
      <section className="section bg-steel-50/70 border-y border-steel-100">
        <div className="container-site">
          <SectionHeading
            kicker="Committee roster"
            title="The chambers"
            intro="A draft roster of the committee system. The final list and agenda topics will be issued by the secretariat once confirmed."
          />
          <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2">
            {committees.slice(0, 4).map((c, i) => (
              <Reveal key={c.code} delay={i * 60} className="h-full">
                <Link
                  href="/committees"
                  className="card-lift group relative flex h-full flex-col overflow-hidden rounded-[1rem] border border-steel-200 bg-white p-6 md:p-7"
                >
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 top-0 h-[3px] bg-azure-500 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                  />
                  <div className="flex items-start justify-between gap-4">
                    <span
                      aria-hidden="true"
                      className="font-display text-[2.2rem] leading-none text-azure-600/25 transition-colors duration-300 group-hover:text-azure-600/50"
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <code className="rounded-[0.4rem] border border-steel-200 bg-steel-50 px-2 py-1 text-[0.7rem] font-semibold tracking-[0.14em] text-navy-600">
                      {c.code}
                    </code>
                  </div>
                  <h3 className="mt-5 font-display text-[1.35rem] font-medium leading-snug text-navy-900">{c.name}</h3>
                  <p className="mt-2 text-[0.78rem] uppercase tracking-[0.14em] text-steel-400">{c.category}</p>
                  <div className="mt-auto pt-6">
                    <span className="eyebrow-doc block">Agenda</span>
                    <p className="mt-1 text-[0.92rem] text-navy-700">{c.agenda}</p>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
          <div className="mt-8">
            <Link href="/committees" className="group inline-flex items-center gap-2 text-[0.9rem] font-semibold text-azure-700">
              View all committees
              <svg
                width="15"
                height="15"
                viewBox="0 0 15 15"
                aria-hidden="true"
                className="transition-transform duration-150 group-hover:translate-x-1"
              >
                <path
                  d="M2.5 7.5h9M8 4l3.5 3.5L8 11"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* ============================ DELEGATE EXPERIENCE ============================ */}
      <section className="section">
        <div className="container-site grid grid-cols-12 gap-12">
          <div className="col-span-12 lg:col-span-4">
            <div className="lg:sticky lg:top-36">
              <SectionHeading
                kicker="The delegate experience"
                title="What a delegate actually does"
              />
              <Reveal delay={100}>
                <p className="mt-6 text-[0.95rem] leading-relaxed text-steel-500">
                  From the first briefing to the closing gavel, the session is built
                  around the work on the floor.
                </p>
              </Reveal>
            </div>
          </div>
          <div className="col-span-12 lg:col-span-7 lg:col-start-6">
            <ol className="border-t border-steel-200">
              {delegateExperience.map((item, i) => (
                <Reveal as="li" key={item.title} delay={i * 60} className="border-b border-steel-200">
                  <div className="flex gap-6 py-7">
                    <span aria-hidden="true" className="pt-1 font-display text-[1.4rem] text-azure-600">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <h3 className="font-display text-[1.3rem] font-medium text-navy-900">{item.title}</h3>
                      <p className="mt-2 max-w-xl leading-relaxed text-steel-600">{item.body}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </ol>
            <Reveal delay={120}>
              <div className="mt-10">
                <Link href="/registration" className="btn btn-primary">
                  Begin your registration
                </Link>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ============================ WHY PARTICIPATE ============================ */}
      <section className="grain mesh-dark relative overflow-hidden section bg-navy-850 text-white">
        <div className="container-site">
          <SectionHeading
            kicker="Why participate"
            title="Three reasons the room matters"
          />
          <div className="mt-14 grid grid-cols-1 gap-x-10 gap-y-10 md:grid-cols-3">
            {whyParticipate.map((item, i) => (
              <Reveal key={item.title} delay={i * 80}>
                <div className={`h-full pt-6 ${i > 0 ? "border-t border-white/15 md:border-t-0 md:border-l md:pl-10" : ""}`}>
                  <p className="kicker !text-azure-300">0{i + 1}</p>
                  <h3 className="mt-4 font-display text-[1.35rem] font-medium leading-snug text-white">{item.title}</h3>
                  <p className="mt-4 leading-relaxed text-white/65">{item.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ============================ FAQ PREVIEW ============================ */}
      <section className="section">
        <div className="container-site mx-auto grid grid-cols-12 gap-10">
          <div className="col-span-12 lg:col-span-4">
            <SectionHeading
              kicker="Before you ask"
              title="Questions, answered in advance"
            />
            <Reveal delay={100}>
              <Link href="/faq" className="btn btn-outline mt-8">
                View all questions
              </Link>
            </Reveal>
          </div>
          <div className="col-span-12 lg:col-span-8">
            <Reveal>
              <Accordion items={faqEntries.slice(0, 4)} />
            </Reveal>
          </div>
        </div>
      </section>

      <CTABand />
    </>
  );
}