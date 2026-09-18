import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { navItems } from "@/lib/config/nav";
import { site, tba, dateAndVenueLine } from "@/lib/config/site";
import { registrationStatus } from "@/lib/registration-control";

export function Footer() {
  const year = new Date().getFullYear();
  const reg = registrationStatus();

  const social = [
    { label: "Instagram", handle: site.social.instagram },
    { label: "X (Twitter)", handle: site.social.x },
    { label: "LinkedIn", handle: site.social.linkedin },
    { label: "YouTube", handle: site.social.youtube },
  ].filter((s) => s.handle);

  return (
    <footer className="relative overflow-hidden bg-navy-950 text-white/65 no-print">
      <div className="rule-gold" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-brass-500/[0.06] blur-3xl"
      />

      <div className="container-site relative grid grid-cols-12 gap-x-8 gap-y-12 py-16">
        <div className="col-span-12 md:col-span-5">
          <BrandLogo tone="onDark" className="h-14 w-14 object-contain" />
          <p className="mt-6 max-w-md text-[0.92rem] leading-relaxed text-white/60">
            {site.descriptor}
          </p>
          <p className="mt-4 text-[0.74rem] font-semibold uppercase tracking-[0.2em] text-brass-300/80">
            {site.fullName}
            {site.edition ? ` · ${site.edition}` : ""}
          </p>
        </div>

        <nav aria-label="Footer" className="col-span-6 sm:col-span-4 md:col-span-2">
          <h2 className="kicker-light mb-5">Explore</h2>
          <ul className="space-y-3 text-[0.9rem]">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="transition-colors hover:text-brass-300">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="col-span-6 sm:col-span-4 md:col-span-3">
          <h2 className="kicker-light mb-5">Conference</h2>
          <ul className="space-y-3 text-[0.9rem]">
            <li>{tba(site.date) || "Dates to be announced"}</li>
            <li>
              {site.venue.name ? tba(site.venue.name) : "Venue to be announced"}
              {site.venue.city ? `, ${site.venue.city}` : ""}
            </li>
            <li>
              <span className={reg.open ? "font-semibold text-brass-300" : ""}>{reg.label}</span>
            </li>
            <li className="text-white/35">{dateAndVenueLine()}</li>
          </ul>
        </div>

        <div className="col-span-12 sm:col-span-4 md:col-span-2">
          <h2 className="kicker-light mb-5">Contact</h2>
          <ul className="space-y-3 text-[0.9rem]">
            <li>
              {site.contact.email ? (
                <a
                  href={`mailto:${site.contact.email}`}
                  className="transition-colors hover:text-brass-300"
                >
                  {site.contact.email}
                </a>
              ) : (
                "Email to be announced"
              )}
            </li>
            <li>{site.contact.phone || "Phone to be announced"}</li>
            {social.length > 0 ? (
              <li className="flex flex-wrap gap-4 pt-1">
                {social.map((s) => (
                  <a
                    key={s.label}
                    href={s.handle}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[0.8rem] transition-colors hover:text-brass-300"
                  >
                    {s.label}
                  </a>
                ))}
              </li>
            ) : (
              <li className="text-white/35">Social channels to be announced</li>
            )}
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-site flex flex-col gap-3 py-6 text-[0.78rem] text-white/45 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {site.name} · {site.fullName}. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="transition-colors hover:text-brass-300">
              Privacy
            </Link>
            <Link href="/admin" className="transition-colors hover:text-brass-300">
              Organisers
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
