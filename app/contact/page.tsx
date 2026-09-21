import type { Metadata } from "next";
import Link from "next/link";
import { PageMasthead } from "@/components/PageMasthead";
import { Reveal } from "@/components/Reveal";
import { site } from "@/lib/config/site";
import { siteUrl } from "@/app/layout";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contact the IMUN secretariat with any questions about registration, committees or the conference.",
  alternates: { canonical: `${siteUrl}/contact` },
};

export default function ContactPage() {
  const hasEmail = Boolean(site.contact.email);
  const social = [
    { label: "Instagram", handle: site.social.instagram },
    { label: "X (Twitter)", handle: site.social.x },
    { label: "LinkedIn", handle: site.social.linkedin },
    { label: "YouTube", handle: site.social.youtube },
  ].filter((s) => s.handle);

  return (
    <>
      <PageMasthead
        path="/contact"
        section="Contact"
        title="Contact the secretariat"
        lede="For registration support, committee queries and everything else, the secretariat can be reached as follows."
      />

      <section className="section">
        <div className="container-site grid grid-cols-12 gap-10">
          <div className="col-span-12 lg:col-span-6">
            <Reveal>
              <div className="border border-steel-200 bg-white p-8 shadow-[var(--shadow-card)]">
                <p className="eyebrow-doc">Secretariat</p>
                <dl className="mt-6 space-y-5">
                  <div>
                    <dt className="eyebrow-doc">Email</dt>
                    <dd className="mt-2 text-[1.05rem] font-medium text-navy-900">
                      {hasEmail ? (
                        <a href={`mailto:${site.contact.email}`} className="underline decoration-brass-600 underline-offset-4 hover:text-navy-600">
                          {site.contact.email}
                        </a>
                      ) : (
                        "To be announced"
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="eyebrow-doc">Phone</dt>
                    <dd className="mt-2 text-[1.05rem] font-medium text-navy-900">
                      {site.contact.phone || "To be announced"}
                    </dd>
                  </div>
                  <div>
                    <dt className="eyebrow-doc">Address</dt>
                    <dd className="mt-2 text-[1.05rem] text-navy-800">
                      {site.contact.address || "To be announced"}
                    </dd>
                  </div>
                  <div>
                    <dt className="eyebrow-doc">Social channels</dt>
                    <dd className="mt-3">
                      {social.length > 0 ? (
                        <div className="flex flex-wrap gap-3">
                          {social.map((s) => (
                            <a key={s.label} href={s.handle} target="_blank" rel="noreferrer" className="rounded-[3px] border border-steel-300 px-3 py-1.5 text-[0.82rem] font-semibold text-navy-700 transition-colors hover:border-navy-500 hover:text-navy-500">
                              {s.label}
                            </a>
                          ))}
                        </div>
                      ) : (
                        <span className="text-steel-500">To be announced</span>
                      )}
                    </dd>
                  </div>
                </dl>
              </div>
            </Reveal>
          </div>

          <div className="col-span-12 space-y-6 text-[1rem] leading-relaxed text-steel-600 lg:col-span-5 lg:col-start-8">
            <Reveal>
              <p>
                <span className="font-semibold text-navy-800">Registration support.</span>{" "}
                If you have already submitted the registration form and need to
                correct a detail, mention your full name and the correction along
                with your query.
              </p>
            </Reveal>
            <Reveal delay={60}>
              <p>
                <span className="font-semibold text-navy-800">Response times.</span>{" "}
                The secretariat reads every message but answers in batches,
                especially near registration deadlines.
              </p>
            </Reveal>
            <Reveal delay={120}>
              <div className="rounded-[3px] border-l-2 border-brass-600 bg-brass-100/60 p-5 text-[0.92rem]">
                The secretariat&apos;s official email and Instagram handle above
                are monitored during the registration window. The full session
                schedule will be published here once finalised.
              </div>
            </Reveal>
            <Reveal delay={180}>
              <Link href="/registration" className="btn btn-outline">
                Go to registration
              </Link>
            </Reveal>
          </div>
        </div>
      </section>
    </>
  );
}