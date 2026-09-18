import type { Metadata } from "next";
import Link from "next/link";
import { siteUrl } from "@/app/layout";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <section className="section">
      <div className="container-site mx-auto max-w-lg text-center">
        <p className="font-display text-[4rem] font-medium leading-none text-brass-600">404</p>
        <h1 className="mt-4 font-display text-[1.9rem] font-medium text-navy-900">
          This page is not on the agenda.
        </h1>
        <p className="mt-4 text-[1rem] leading-relaxed text-steel-600">
          The address you followed does not resolve to a section of this site.
          Return to the homepage or the conference record.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link href="/" className="btn btn-primary">Return home</Link>
          <Link href="/conference" className="btn btn-outline">Conference record</Link>
        </div>
        <link rel="canonical" href={`${siteUrl}/404`} />
      </div>
    </section>
  );
}