import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";

/**
 * Standby masthead: brand only. Event navigation is intentionally hidden while
 * the secretariat prepares the next edition.
 */
export function Header() {
  return (
    <header className="glass sticky top-0 z-50 border-b border-white/10 text-white no-print">
      <div className="rule-gold" />
      <div className="container-site flex h-[72px] items-center justify-between gap-6">
        <Link
          href="/"
          aria-label="IMUN — Indian MUN, homepage"
          className="group flex shrink-0 items-center gap-3"
        >
          <BrandLogo
            priority
            tone="onDark"
            className="h-11 w-11 object-contain transition-transform duration-500 group-hover:scale-[1.04]"
          />
          <span className="hidden leading-none sm:block">
            <span className="block font-display text-[1.35rem] font-semibold leading-none tracking-[0.01em] text-white">
              IMUN
            </span>
            <span className="mt-1.5 block text-[0.6rem] font-semibold uppercase tracking-[0.28em] text-brass-300/90">
              Indian MUN
            </span>
          </span>
        </Link>

        <p className="text-right text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-white/45 sm:text-[0.66rem]">
          Next edition <span className="text-brass-300/80">·</span> Coming soon
        </p>
      </div>
    </header>
  );
}
