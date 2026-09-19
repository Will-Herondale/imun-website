import type { Metadata } from "next";
import Link from "next/link";
import { PageMasthead } from "@/components/PageMasthead";
import { RegistrationForm } from "@/components/RegistrationForm";
import { Reveal } from "@/components/Reveal";
import { SectionHeading } from "@/components/SectionHeading";
import { isRegistrationOpen, registrationStatus } from "@/lib/registration-control";
import { site, tba, dateAndVenueLine } from "@/lib/config/site";
import { committees } from "@/lib/config/committees";
import { famgatewayConfigured } from "@/lib/payments/famgateway";
import { siteUrl } from "@/app/layout";

export const metadata: Metadata = {
  title: "Registration",
  description: `Delegate registration for ${site.fullName} — basic information, Model UN experience, committee preferences and declaration.`,
  alternates: { canonical: `${siteUrl}/registration` },
};

export default function RegistrationPage() {
  const open = isRegistrationOpen();
  const reg = registrationStatus();
  const paymentsLive = famgatewayConfigured();
  const feeRounds = site.registrationRounds;
  const feeMin = Math.min(...feeRounds.map((r) => r.amount));
  const feeMax = Math.max(...feeRounds.map((r) => r.amount));
  const inr = (amount: number) => `${site.registrationFee.currency} ${amount.toLocaleString("en-IN")}`;
  const feeRange = `${inr(feeMin)} – ${inr(feeMax)}`;

  return (
    <>
      <PageMasthead
        path="/registration"
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
                      <dd className="font-semibold text-navy-900">{feeRange}</dd>
                    </div>
                    <div className="flex items-baseline justify-between gap-4">
                      <dt className="text-steel-500">Committees</dt>
                      <dd className="text-right text-navy-900">{committees.length} on the roster</dd>
                    </div>
                  </dl>
                  <p className="mt-5 border-t border-steel-200 pt-4 text-[0.82rem] leading-relaxed text-steel-500">
                    {dateAndVenueLine()}. Submissions are recorded in the organiser&apos;s
                    secure, access-controlled store and seen only by the secretariat.
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
                <RegistrationForm paymentsLive={paymentsLive} />
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

      <section className="section-tight border-t border-steel-100 bg-steel-50/60">
        <div className="container-site grid grid-cols-12 gap-10">
          <div className="col-span-12 lg:col-span-5">
            <SectionHeading
              kicker="Fees and payment"
              title="Delegate fee by registration round"
              intro="Fees are charged per delegate and rise as the session approaches. Registering in an earlier round secures the lower fee."
            />
          </div>
          <div className="col-span-12 lg:col-span-6 lg:col-start-7">
            <Reveal>
              <div className="overflow-hidden border border-steel-200 bg-white shadow-[var(--shadow-card)]">
                <table className="w-full text-left text-[0.95rem]">
                  <thead>
                    <tr className="border-b border-steel-200 bg-steel-50/70">
                      <th className="px-5 py-3.5 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-steel-500">Round</th>
                      <th className="px-5 py-3.5 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-steel-500">Window</th>
                      <th className="px-5 py-3.5 text-right text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-steel-500">Fee</th>
                    </tr>
                  </thead>
                  <tbody>
                    {feeRounds.map((r) => (
                      <tr key={r.label} className="border-b border-steel-100 last:border-0">
                        <td className="px-5 py-4 font-semibold text-navy-900">{r.label}</td>
                        <td className="px-5 py-4 text-steel-600">{r.window}</td>
                        <td className="px-5 py-4 text-right font-display text-[1.05rem] font-medium text-navy-900">
                          {inr(r.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Reveal>

            <Reveal delay={80}>
              <div className="mt-6 border border-brass-500/30 bg-brass-50/60 p-6">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-brass-700">How to pay</p>
                <p className="mt-3 text-[0.95rem] leading-relaxed text-steel-600">
                  {paymentsLive ? site.payment.note : site.payment.setupNotice}
                </p>
                <dl className="mt-5 flex flex-wrap items-baseline gap-x-10 gap-y-3">
                  <div>
                    <dt className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-steel-500">Pay from</dt>
                    <dd className="mt-1.5 font-semibold text-navy-900">Any UPI app</dd>
                  </div>
                  <div>
                    <dt className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-steel-500">Wallet ID</dt>
                    <dd className="mt-1.5 font-mono text-[0.95rem] font-semibold text-navy-900">{site.payment.walletId}</dd>
                  </div>
                </dl>
              </div>
            </Reveal>
          </div>
        </div>
      </section>
    </>
  );
}