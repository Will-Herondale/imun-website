import type { Metadata } from "next";
import Link from "next/link";
import { PageMasthead } from "@/components/PageMasthead";
import { RegistrationForm } from "@/components/RegistrationForm";
import { Reveal } from "@/components/Reveal";
import { isRegistrationOpen, registrationStatus } from "@/lib/registration-control";
import { site, tba, dateAndVenueLine } from "@/lib/config/site";
import { committees } from "@/lib/config/committees";
import { siteUrl } from "@/app/layout";

export const metadata: Metadata = {
  title: "Registration",
  description: `Delegate registration for ${site.fullName} — basic information, Model UN experience, committee preferences and declaration.`,
  alternates: { canonical: `${siteUrl}/registration` },
};

export default function RegistrationPage() {
  const open = isRegistrationOpen();
  const reg = registrationStatus();

  return (
    <>
      <PageMasthead
        section="Registration"
        title="Become a delegate"
        lede="The official delegate registration form. Please read the privacy note before submitting — the information you provide is used only to administer your participation."
      />

      <section className="section">
        <div className="container-site grid grid-cols-12 gap-10">
          {/* Context column */}
          <div className="order-2 col-span-12 lg:order-1 lg:col-span-4">
            <div className="lg:sticky lg:top-36">
              <Reveal>
                <div className="border border-steel-200 bg-steel-50/70 p-6">
                  <p className="eyebrow-doc">Before you begin</p>
                  <dl className="mt-4 space-y-3 text-[0.92rem]">
                    <div className="flex items-baseline justify-between gap-4">
                      <dt className="text-steel-500">Status</dt>
                      <dd className={`font-semibold ${reg.open ? "text-navy-800" : "text-steel-500"}`}>{reg.label}</dd>
                    </div>
                    <div className="flex items-baseline justify-between gap-4">
                      <dt className="text-steel-500">Date</dt>
                      <dd className="text-right text-navy-900">{tba(site.date)}</dd>
                    </div>
                    <div className="flex items-baseline justify-between gap-4">
                      <dt className="text-steel-500">Venue</dt>
                      <dd className="text-right text-navy-900">
                        {[site.venue.name, site.venue.city].filter(Boolean).join(", ") || "To be announced"}
                      </dd>
                    </div>
                    <div className="flex items-baseline justify-between gap-4">
                      <dt className="text-steel-500">Delegate fee</dt>
                      <dd className="font-semibold text-navy-900">
                        {site.registrationFee.amount
                          ? `${site.registrationFee.currency} ${site.registrationFee.amount}`
                          : "To be announced"}
                      </dd>
                    </div>
                    <div className="flex items-baseline justify-between gap-4">
                      <dt className="text-steel-500">Committees</dt>
                      <dd className="text-right text-navy-900">{committees.length} on the draft roster</dd>
                    </div>
                  </dl>
                  <p className="mt-5 border-t border-steel-200 pt-4 text-[0.82rem] leading-relaxed text-steel-500">
                    {dateAndVenueLine()}. Submissions are recorded in the organiser&apos;s
                    secure Azure-backed store and seen only by the secretariat.
                  </p>
                </div>
              </Reveal>
              <Reveal delay={80}>
                <p className="mt-6 text-[0.88rem] leading-relaxed text-steel-500">
                  Questions before submitting? Consult the{" "}
                  <Link href="/faq" className="font-semibold text-navy-700 underline decoration-brass-600 underline-offset-2">
                    FAQ
                  </Link>{" "}
                  or the{" "}
                  <Link href="/contact" className="font-semibold text-navy-700 underline decoration-brass-600 underline-offset-2">
                    contact page
                  </Link>
                  .
                </p>
              </Reveal>
            </div>
          </div>

          {/* Form column */}
          <div className="order-1 col-span-12 lg:order-2 lg:col-span-8">
            {open ? (
              <Reveal>
                <RegistrationForm />
              </Reveal>
            ) : (
              <Reveal>
                <div className="border border-steel-200 bg-white p-8 shadow-[var(--shadow-card)] md:p-12" role="status">
                  <p className="kicker flex items-center gap-3">
                    <span aria-hidden="true" className="inline-block h-1.5 w-1.5 rounded-full bg-steel-400" />
                    Registration closed
                  </p>
                  <h2 className="mt-5 font-display text-[clamp(1.8rem,4vw,2.6rem)] font-medium leading-tight text-navy-900">
                    Registration for this session is currently closed.
                  </h2>
                  <p className="mt-5 max-w-xl leading-relaxed text-steel-600">
                    The form reopens when the secretariat announces the next phase
                    of registration. If you have already submitted your details,
                    your record is safe and will be acted on in due course.
                  </p>
                  <div className="mt-8 flex flex-wrap gap-4">
                    <Link href="/conference" className="btn btn-outline">Conference details</Link>
                    <Link href="/faq" className="btn btn-outline">Read the FAQ</Link>
                  </div>
                  <p className="mt-8 border-t border-steel-200 pt-5 text-[0.85rem] text-steel-500">
                    The organisers&apos; contact details will be published here once confirmed.
                  </p>
                </div>
              </Reveal>
            )}
          </div>
        </div>
      </section>
    </>
  );
}