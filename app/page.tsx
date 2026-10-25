import type { Metadata } from "next";
import { BrandLogo } from "@/components/BrandLogo";
import { Reveal } from "@/components/Reveal";
import { site } from "@/lib/config/site";
import { siteUrl } from "@/app/layout";

export const metadata: Metadata = {
  title: { absolute: "IMUN — Indian Model United Nations" },
  description:
    "The Indian Model United Nations. The 2026 session has concluded and the next edition is being prepared — details will be announced here soon.",
  alternates: { canonical: `${siteUrl}/` },
};

const social = [{ label: "Instagram", href: site.social.instagram }].filter((s) => s.href);

export default function StandbyPage() {
  return (
    <section className="relative flex min-h-[calc(100dvh-13rem)] items-center overflow-hidden bg-navy-950 text-white">
      <div className="rule-gold" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(75%_120%_at_50%_-10%,rgba(193,161,90,0.18),transparent_60%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.05] [background-image:linear-gradient(rgba(255,255,255,0.6)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.6)_1px,transparent_1px)] [background-size:64px_64px]"
      />

      <div className="container-site relative py-20 md:py-28">
        <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
          <Reveal>
            <div className="relative flex aspect-square w-40 items-center justify-center">
              <div className="absolute inset-0 rounded-full border border-brass-500/30" />
              <div className="absolute inset-5 rounded-full border border-white/10" />
              <div
                aria-hidden="true"
                className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_50%_38%,rgba(193,161,90,0.2),transparent_62%)]"
              />
              <span className="absolute left-1/2 top-0 h-2.5 w-px -translate-x-1/2 bg-brass-500/50" aria-hidden="true" />
              <span className="absolute bottom-0 left-1/2 h-2.5 w-px -translate-x-1/2 bg-brass-500/50" aria-hidden="true" />
              <span className="absolute left-0 top-1/2 h-px w-2.5 -translate-y-1/2 bg-brass-500/50" aria-hidden="true" />
              <span className="absolute right-0 top-1/2 h-px w-2.5 -translate-y-1/2 bg-brass-500/50" aria-hidden="true" />
              <BrandLogo priority tone="onDark" className="relative h-28 w-28 object-contain" />
            </div>
          </Reveal>

          <Reveal delay={80} className="mt-10">
            <p className="kicker-light">Indian Model United Nations</p>
            <h1 className="mt-5 font-display text-[clamp(2.2rem,5.5vw,3.9rem)] font-medium leading-[1.04] tracking-[-0.02em] text-white">
              The next edition is
              <span className="italic text-brass-300"> being prepared.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-[1.02rem] leading-relaxed text-white/60">
              The 2026 session has concluded. Dates, committees and registration for
              the next IMUN conference will be published here as soon as they are
              confirmed.
            </p>
          </Reveal>

          <Reveal delay={160} className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <a href={`mailto:${site.contact.email}`} className="btn btn-accent">
              Write to the secretariat
            </a>
            {social.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noreferrer"
                className="btn btn-outline-light"
              >
                {s.label}
              </a>
            ))}
          </Reveal>

          <Reveal delay={220} className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-[0.82rem] text-white/45">
            <span className="flex items-center gap-2">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-steel-500" aria-hidden="true" />
              Registrations closed
            </span>
            <a href={`tel:+91${site.contact.phone}`} className="transition-colors hover:text-brass-300">
              +91 {site.contact.phone}
            </a>
            <a href={`mailto:${site.contact.email}`} className="transition-colors hover:text-brass-300">
              {site.contact.email}
            </a>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
