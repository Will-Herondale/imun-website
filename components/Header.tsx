"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandLogo } from "@/components/BrandLogo";
import { ScrollProgress } from "@/components/ScrollProgress";
import { navItems, registerHref } from "@/lib/config/nav";
import { registrationStatus } from "@/lib/registration-control";

export function Header({ dateLine }: { dateLine: string }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [shadow, setShadow] = useState(false);
  const reg = registrationStatus();

  useEffect(() => {
    const onScroll = () => setShadow(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    // Close on route change (e.g. in-app links, browser back).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 border-b border-white/10 bg-navy-900 transition-shadow duration-200 ${
        shadow ? "shadow-[0_1px_0_rgba(255,255,255,0.06),0_18px_40px_-24px_rgba(0,0,0,0.85)]" : ""
      }`}
    >
      {/* Utility bar */}
      <div className="border-b border-white/10 bg-navy-950 text-white/80 no-print">
        <div className="container-site flex items-center justify-between gap-4 py-2 text-[0.72rem]">
          <p className="hidden truncate font-medium tracking-wide sm:block">
            {dateLine}
          </p>
          <p className="truncate font-medium tracking-wide sm:hidden">{dateLine}</p>
          <Link
            href={registerHref}
            className="flex shrink-0 items-center gap-2 font-semibold text-white/90 transition-colors hover:text-white"
          >
            <span
              className={`inline-block h-1.5 w-1.5 rounded-full ${
                reg.open ? "bg-azure-300 shadow-[0_0_0_3px_rgba(255,255,255,0.18)]" : "bg-steel-400"
              }`}
              aria-hidden="true"
            />
            <span className="uppercase tracking-[0.14em]">{reg.label}</span>
          </Link>
        </div>
      </div>

      {/* Main bar */}
      <div className="container-site flex h-[74px] items-center justify-between gap-6">
        <Link
          href="/"
          aria-label="IMUN — Indian MUN, homepage"
          className="shrink-0"
        >
          <BrandLogo priority className="h-12 w-12 object-contain" />
        </Link>

        <nav
          aria-label="Main"
          className="hidden items-center gap-7 lg:flex"
        >
          <ul className="flex items-center gap-7">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="nav-link"
                  aria-current={
                    pathname === item.href || pathname.startsWith(`${item.href}/`)
                      ? "page"
                      : undefined
                  }
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-3">
          <Link href={registerHref} className="btn btn-primary hidden lg:inline-flex">
            Register
          </Link>
          <button
            type="button"
            className="lg:hidden -mr-2 flex h-11 w-11 items-center justify-center rounded-[0.5rem] text-white/80 hover:bg-white/10 hover:text-white"
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? "Close main menu" : "Open main menu"}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
              {menuOpen ? (
                <path
                  d="M5 5l12 12M17 5L5 17"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              ) : (
                <path
                  d="M3 6.5h16M3 11h16M3 15.5h10"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <div
        id="mobile-menu"
        className={`border-t border-white/10 bg-navy-900 lg:hidden ${
          menuOpen ? "block" : "hidden"
        }`}
      >
        <nav aria-label="Mobile" className="container-site py-4">
          <ul className="flex flex-col">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="flex items-center justify-between border-b border-white/10 py-3.5 font-sans text-[0.95rem] font-semibold text-white/90 last:border-0"
                  aria-current={pathname === item.href ? "page" : undefined}
                  tabIndex={menuOpen ? 0 : -1}
                  onClick={() => setMenuOpen(false)}
                >
                  {item.label}
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 15 15"
                    aria-hidden="true"
                    className="text-white/30"
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
              </li>
            ))}
          </ul>
          <Link href={registerHref} className="btn btn-primary mt-4 w-full" onClick={() => setMenuOpen(false)}>
            Register as a delegate
          </Link>
        </nav>
      </div>
      <ScrollProgress />
    </header>
  );
}