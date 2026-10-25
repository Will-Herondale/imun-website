import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { site } from "@/lib/config/site";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative overflow-hidden bg-navy-950 text-white/65 no-print">
      <div className="rule-gold" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-brass-500/[0.06] blur-3xl"
      />

      <div className="container-site relative flex flex-col gap-10 py-14 md:flex-row md:items-start md:justify-between">
        <div className="max-w-md">
          <BrandLogo tone="onDark" className="h-12 w-12 object-contain" />
          <p className="mt-5 text-[0.9rem] leading-relaxed text-white/55">
            {site.fullName} — a formal Model United Nations conference for student
            delegates across India.
          </p>
          <p className="mt-4 text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-brass-300/80">
            Next edition details coming soon
          </p>
        </div>

        <div>
          <h2 className="kicker-light mb-5">Contact</h2>
          <ul className="space-y-3 text-[0.9rem]">
            <li>
              <a
                href={`mailto:${site.contact.email}`}
                className="transition-colors hover:text-brass-300"
              >
                {site.contact.email}
              </a>
            </li>
            <li>
              <a
                href={`tel:+91${site.contact.phone}`}
                className="transition-colors hover:text-brass-300"
              >
                +91 {site.contact.phone}
              </a>
            </li>
            {site.social.instagram ? (
              <li>
                <a
                  href={site.social.instagram}
                  target="_blank"
                  rel="noreferrer"
                  className="transition-colors hover:text-brass-300"
                >
                  Instagram
                </a>
              </li>
            ) : null}
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
