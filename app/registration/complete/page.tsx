import type { Metadata } from "next";
import Link from "next/link";
import { PageMasthead } from "@/components/PageMasthead";
import { PaymentComplete } from "@/components/PaymentComplete";
import { site, tba } from "@/lib/config/site";
import { siteUrl } from "@/app/layout";

export const dynamic = "force-dynamic";

/** Never index a token-bearing URL, and never leak the token via Referer. */
export const metadata: Metadata = {
  title: "Confirming your registration",
  description: `Payment confirmation for your ${site.fullName} delegate registration.`,
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
  alternates: { canonical: `${siteUrl}/registration` },
};

/**
 * Where FamGateway sends the delegate back after paying.
 *
 * The resume token in the query string identifies a stored draft; the page
 * polls the server until that draft is registered. Nothing here is trusted
 * client-side, and the registration itself is written by the payment webhook
 * (or, as a fallback, by this page's own server call).
 */
export default async function RegistrationCompletePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const params = await searchParams;
  const raw = Array.isArray(params.token) ? params.token[0] : params.token;
  const token = (raw ?? "").trim().slice(0, 128);

  return (
    <>
      <PageMasthead
        path="/registration/complete"
        section="Registration"
        title="Payment confirmation"
        lede="We are matching your payment to the details you submitted."
      />

      <section className="section">
        <div className="container-site grid grid-cols-12 gap-10">
          <div className="order-2 col-span-12 lg:order-1 lg:col-span-4">
            <div className="lg:sticky lg:top-36">
              <div className="border border-steel-200 bg-steel-50/70 p-6">
                <p className="eyebrow-doc">What happens now</p>
                <ol className="mt-4 space-y-3 text-[0.92rem] leading-relaxed text-steel-600">
                  <li>
                    <strong className="font-semibold text-navy-800">1.</strong> Your answers are
                    already saved on our servers.
                  </li>
                  <li>
                    <strong className="font-semibold text-navy-800">2.</strong> We confirm the
                    payment against the wallet and write your registration.
                  </li>
                  <li>
                    <strong className="font-semibold text-navy-800">3.</strong> Committee
                    allotments are emailed to the address you gave us.
                  </li>
                </ol>
                <p className="mt-5 border-t border-steel-200 pt-4 text-[0.82rem] leading-relaxed text-steel-500">
                  {tba(site.date)}. You may close this page at any time — your registration will
                  still complete.
                </p>
              </div>
              <p className="mt-6 text-[0.88rem] leading-relaxed text-steel-500">
                Something look wrong?{" "}
                <Link
                  href="/contact"
                  className="font-semibold text-navy-700 underline decoration-brass-600 underline-offset-2"
                >
                  Contact the secretariat
                </Link>
                .
              </p>
            </div>
          </div>

          <div className="order-1 col-span-12 lg:order-2 lg:col-span-8">
            <PaymentComplete token={token} />
          </div>
        </div>
      </section>
    </>
  );
}