import { BrandLogo } from "@/components/BrandLogo";
import { Reveal } from "@/components/Reveal";
import type { SiteContent } from "@/lib/content/defaults";

export function StandbyHome({ content: c }: { content: SiteContent }) {
  const social = c.contact.instagram ? [{ label: "Instagram", href: c.contact.instagram }] : [];
  return (
    <section className="relative flex min-h-[calc(100dvh-13rem)] items-center overflow-hidden bg-navy-950 text-white">
      <div className="rule-gold" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(75%_120%_at_50%_-10%,rgba(193,161,90,0.18),transparent_60%)]" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-[0.05] [background-image:linear-gradient(rgba(255,255,255,0.6)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.6)_1px,transparent_1px)] [background-size:64px_64px]" />
      <div className="container-site relative py-20 md:py-28">
        <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
          <Reveal>
            <div className="relative flex aspect-square w-40 items-center justify-center">
              <div className="absolute inset-0 rounded-full border border-brass-500/30" />
              <div className="absolute inset-5 rounded-full border border-white/10" />
              <BrandLogo priority tone="onDark" className="relative h-28 w-28 object-contain" />
            </div>
          </Reveal>
          <Reveal delay={80} className="mt-10">
            {c.announcement.enabled && c.announcement.text ? (
              <p className="mb-6 inline-flex rounded-[999px] border border-brass-500/30 bg-brass-500/10 px-4 py-1.5 text-[0.75rem] font-semibold uppercase tracking-[0.12em] text-brass-200">
                {c.announcement.text}
              </p>
            ) : null}
            <p className="kicker-light">{c.standby.kicker}</p>
            <h1 className="mt-5 font-display text-[clamp(2.2rem,5.5vw,3.9rem)] font-medium leading-[1.04] tracking-[-0.02em] text-white">
              {c.standby.headline}
              {c.standby.headlineAccent ? <span className="italic text-brass-300"> {c.standby.headlineAccent}</span> : null}
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-[1.02rem] leading-relaxed text-white/60">{c.standby.body}</p>
          </Reveal>
          <Reveal delay={160} className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <a href={c.standby.ctaHref || `mailto:${c.contact.email}`} className="btn btn-accent">
              {c.standby.ctaLabel || "Write to the secretariat"}
            </a>
            {social.map((s) => (
              <a key={s.label} href={s.href} target="_blank" rel="noreferrer" className="btn btn-outline-light">{s.label}</a>
            ))}
          </Reveal>
          <Reveal delay={220} className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-[0.82rem] text-white/45">
            <span className="flex items-center gap-2"><span className="inline-block h-1.5 w-1.5 rounded-full bg-steel-500" aria-hidden="true" />{c.standby.statusLabel}</span>
            {c.contact.phone ? <a href={`tel:+91${c.contact.phone}`} className="transition-colors hover:text-brass-300">+91 {c.contact.phone}</a> : null}
            {c.contact.email ? <a href={`mailto:${c.contact.email}`} className="transition-colors hover:text-brass-300">{c.contact.email}</a> : null}
          </Reveal>
        </div>
      </div>
    </section>
  );
}
