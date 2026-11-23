import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { site } from "@/lib/config/site";
import { getActiveProfile } from "@/lib/content/profiles";
import { navItems, secondaryNavItems } from "@/lib/config/nav";
import { registrationStatus } from "@/lib/registration-control";
import { defaultSiteContent } from "@/lib/content/defaults";

export async function Footer() {
  const year = new Date().getFullYear();
  const profile = await getActiveProfile().catch(() => null);
  const c = profile?.content ?? defaultSiteContent;
  const mode = profile?.mode ?? "standby";
  const reg = registrationStatus();

  if (mode === "full") {
    return (
      <footer className="relative overflow-hidden bg-navy-950 text-white/65 no-print">
        <div className="rule-gold" />
        <div className="container-site relative grid grid-cols-12 gap-x-8 gap-y-12 py-16">
          <div className="col-span-12 md:col-span-5">
            <BrandLogo tone="onDark" className="h-14 w-14 object-contain" />
            <p className="mt-6 max-w-md text-[0.92rem] leading-relaxed text-white/60">{site.descriptor}</p>
            <p className="mt-4 text-[0.74rem] font-semibold uppercase tracking-[0.2em] text-brass-300/80">{site.fullName}{site.edition ? ` · ${site.edition}` : ""}</p>
          </div>
          <nav aria-label="Footer" className="col-span-6 sm:col-span-4 md:col-span-2">
            <h2 className="kicker-light mb-5">Explore</h2>
            <ul className="space-y-3 text-[0.9rem]">{[...navItems, ...secondaryNavItems].map((item) => <li key={item.href}><Link href={item.href} className="transition-colors hover:text-brass-300">{item.label}</Link></li>)}</ul>
          </nav>
          <div className="col-span-6 sm:col-span-4 md:col-span-3">
            <h2 className="kicker-light mb-5">Conference</h2>
            <ul className="space-y-3 text-[0.9rem]">
              <li>{site.date || "Dates to be announced"}</li>
              <li>{[site.venue.name, site.venue.city].filter(Boolean).join(", ") || "Venue to be announced"}</li>
              <li><span className={reg.open ? "font-semibold text-brass-300" : ""}>{reg.label}</span></li>
            </ul>
          </div>
          <div className="col-span-12 sm:col-span-4 md:col-span-2">
            <h2 className="kicker-light mb-5">Contact</h2>
            <ul className="space-y-3 text-[0.9rem]">
              {c.contact.email ? <li><a href={`mailto:${c.contact.email}`} className="transition-colors hover:text-brass-300">{c.contact.email}</a></li> : null}
              {c.contact.phone ? <li><a href={`tel:+91${c.contact.phone}`} className="transition-colors hover:text-brass-300">+91 {c.contact.phone}</a></li> : null}
              {c.contact.instagram ? <li><a href={c.contact.instagram} target="_blank" rel="noreferrer" className="transition-colors hover:text-brass-300">Instagram</a></li> : null}
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10"><div className="container-site flex flex-col gap-3 py-6 text-[0.78rem] text-white/45 sm:flex-row sm:items-center sm:justify-between"><p>© {year} {site.name} · {site.fullName}. All rights reserved.</p><div className="flex items-center gap-6"><Link href="/privacy" className="transition-colors hover:text-brass-300">Privacy</Link><Link href="/admin" className="transition-colors hover:text-brass-300">Organisers</Link></div></div></div>
      </footer>
    );
  }

  return (
    <footer className="relative overflow-hidden bg-navy-950 text-white/65 no-print">
      <div className="rule-gold" />
      <div className="container-site relative flex flex-col gap-10 py-14 md:flex-row md:items-start md:justify-between">
        <div className="max-w-md">
          <BrandLogo tone="onDark" className="h-12 w-12 object-contain" />
          <p className="mt-5 text-[0.9rem] leading-relaxed text-white/55">{site.fullName} — a formal Model United Nations conference for student delegates across India.</p>
          <p className="mt-4 text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-brass-300/80">{c.footerNote}</p>
        </div>
        <div>
          <h2 className="kicker-light mb-5">Contact</h2>
          <ul className="space-y-3 text-[0.9rem]">
            {c.contact.email ? <li><a href={`mailto:${c.contact.email}`} className="transition-colors hover:text-brass-300">{c.contact.email}</a></li> : null}
            {c.contact.phone ? <li><a href={`tel:+91${c.contact.phone}`} className="transition-colors hover:text-brass-300">+91 {c.contact.phone}</a></li> : null}
            {c.contact.instagram ? <li><a href={c.contact.instagram} target="_blank" rel="noreferrer" className="transition-colors hover:text-brass-300">Instagram</a></li> : null}
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10"><div className="container-site flex flex-col gap-3 py-6 text-[0.78rem] text-white/45 sm:flex-row sm:items-center sm:justify-between"><p>© {year} {site.name} · {site.fullName}. All rights reserved.</p><div className="flex items-center gap-6"><Link href="/privacy" className="transition-colors hover:text-brass-300">Privacy</Link><Link href="/admin" className="transition-colors hover:text-brass-300">Organisers</Link></div></div></div>
    </footer>
  );
}
