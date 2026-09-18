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
    <footer className="border-t-[3px] border-navy-900 bg-steel-50 text-steel-600 no-print">
      <div className="container-site grid grid-cols-12 gap-x-8 gap-y-10 py-14">
        <div className="col-span-12 md:col-span-5">
          <BrandLogo tone="onLight" className="h-14 w-14 object-contain" />
          <p className="mt-5 max-w-md text-[0.92rem] leading-relaxed">{site.descriptor}</p>
          <p className="mt-3 text-[0.78rem] uppercase tracking-[0.14em] text-steel-500">
            {site.fullName}
            {site.edition ? ` · ${site.edition}` : ""}
          </p>
        </div>

        <nav aria-label="Footer" className="col-span-6 sm:col-span-4 md:col-span-2">
          <h2 className="eyebrow-doc mb-4">Explore</h2>
          <ul className="space-y-2.5 text-[0.9rem]">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="transition-colors hover:text-navy-900">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="col-span-6 sm:col-span-4 md:col-span-3">
          <h2 className="eyebrow-doc mb-4">Conference</h2>
          <ul className="space-y-2.5 text-[0.9rem]">
            <li>{tba(site.date) || "Dates to be announced"}</li>
            <li>
              {site.venue.name ? tba(site.venue.name) : "Venue to be announced"}
              {site.venue.city ? `, ${site.venue.city}` : ""}
            </li>
            <li>
              <span className={reg.open ? "font-semibold text-navy-900" : ""}>{reg.label}</span>
            </li>
            <li className="text-steel-400">{dateAndVenueLine()}</li>
          </ul>
        </div>

        <div className="col-span-12 sm:col-span-4 md:col-span-2">
          <h2 className="eyebrow-doc mb-4">Contact</h2>
          <ul className="space-y-2.5 text-[0.9rem]">
            <li>
              {site.contact.email ? (
                <a href={`mailto:${site.contact.email}`} className="transition-colors hover:text-navy-900">
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
                    className="text-[0.8rem] transition-colors hover:text-navy-900"
                  >
                    {s.label}
                  </a>
                ))}
              </li>
            ) : (
              <li className="text-steel-400">Social channels to be announced</li>
            )}
          </ul>
        </div>
      </div>

      <div className="border-t border-steel-200">
        <div className="container-site flex flex-col gap-3 py-5 text-[0.78rem] text-steel-500 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {site.name} · {site.fullName}. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="transition-colors hover:text-navy-900">
              Privacy
            </Link>
            <Link href="/admin" className="transition-colors hover:text-navy-900">
              Organisers
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
