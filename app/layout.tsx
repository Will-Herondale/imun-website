import type { Metadata } from "next";
import { Inter, Newsreader } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { site, dateAndVenueLine } from "@/lib/config/site";

// Nonce-based CSP (see proxy.ts) requires dynamic rendering: Next can only
// attach the per-request nonce to its inline scripts during server-side
// rendering, not on build-time static output.
export const dynamic = "force-dynamic";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// Editorial serif for display type — formal, literary, unmistakably premium.
const display = Newsreader({
  subsets: ["latin"],
  variable: "--font-newsreader",
  display: "swap",
  style: ["normal", "italic"],
});

export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.iemun.example").replace(/\/$/, "");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${site.name} — Indian MUN`,
    template: `%s · ${site.name} — Indian MUN`,
  },
  description: site.descriptor,
  keywords: [
    "IMUN",
    "Indian MUN",
    "Model United Nations",
    "MUN conference India",
    "student conference",
    "debate India",
  ],
  openGraph: {
    type: "website",
    siteName: `${site.name} — ${site.fullName}`,
    locale: "en_IN",
    images: [{ url: "/assets/brand/iemun-og.png", width: 1200, height: 630, alt: site.fullName }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${site.name} — Indian MUN`,
    description: site.descriptor,
    images: ["/assets/brand/iemun-og.png"],
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${display.variable}`}>
      <body className="flex min-h-dvh flex-col">
        {/* Safety net: reveal animations start at opacity 0 and are switched on
            by JS. If scripting is unavailable, keep all content visible. */}
        <noscript>
          <style>{`[data-reveal]{opacity:1 !important;transform:none !important}`}</style>
        </noscript>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-[3px] focus:bg-navy-900 focus:px-4 focus:py-2 focus:text-white"
        >
          Skip to main content
        </a>
        <Header dateLine={dateAndVenueLine()} />
        <main id="main-content" className="flex-1">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}