import type { Metadata } from "next";
import { PageMasthead } from "@/components/PageMasthead";
import { Reveal } from "@/components/Reveal";
import { site, tba } from "@/lib/config/site";
import { siteUrl } from "@/app/layout";

export const metadata: Metadata = {
  title: "Privacy notice",
  description: "How IMUN handles the personal information you provide in delegate registration.",
  alternates: { canonical: `${siteUrl}/privacy` },
};

export default function PrivacyPage() {
  return (
    <>
      <PageMasthead
        path="/privacy"
        section="Privacy"
        title="Privacy notice"
        lede="This notice explains, in plain language, what happens to the personal information you give us when you register as a delegate."
      />

      <section className="section">
        <div className="container-site mx-auto max-w-3xl space-y-7 text-[1.02rem] leading-relaxed text-steel-600">
          <Reveal>
            <h2 className="font-display text-[1.55rem] font-medium text-navy-900">What we collect</h2>
            <p className="mt-3">
              The registration form collects your name, school, contact details
              (email, phone), grade, Model Un experience history, committee
              preferences and any requests you choose to add. All of it is
              provided voluntarily by you for the purpose of administering your
              participation in {site.fullName}.
            </p>
          </Reveal>
          <Reveal delay={40}>
            <h2 className="font-display text-[1.55rem] font-medium text-navy-900">Who may see it</h2>
            <p className="mt-3">
              Only the organising secretariat can view the full contents of a
              submitted registration. Records are never sold, shared with third
              parties or used for marketing. Contact details, notes and committee
              preferences are never published.
            </p>
          </Reveal>
          <Reveal delay={60}>
            <h2 className="font-display text-[1.55rem] font-medium text-navy-900">Published allocations</h2>
            <p className="mt-3">
              When committee allocations are finalised, the Allocations page
              publishes a delegate&apos;s name, school and the committee and
              portfolio assigned to them. This is done so delegates can confirm
              their placement and see who else is in their committee. No contact
              details, preferences or secretariat notes are ever published. If
              you do not want your name shown on the published list, contact the
              secretariat and we will accommodate your request.
            </p>
          </Reveal>
          <Reveal delay={80}>
            <h2 className="font-display text-[1.55rem] font-medium text-navy-900">How it is stored</h2>
            <p className="mt-3">
              Registrations are stored in an access-controlled, encrypted
              database operated by our hosting provider. Transfer of the data is
              encrypted in transit and at rest, and no full registration content
              is written to application logs.
            </p>
          </Reveal>
          <Reveal delay={120}>
            <h2 className="font-display text-[1.55rem] font-medium text-navy-900">How long we keep it</h2>
            <p className="mt-3">
              Records are retained for the edition you registered for plus a
              reasonable administrative window, and then deleted. To request
              correction, export or deletion of your record, contact the
              secretariat with the email address you registered with.
            </p>
          </Reveal>
          <Reveal delay={160}>
            <h2 className="font-display text-[1.55rem] font-medium text-navy-900">Drafts on your device</h2>
            <p className="mt-3">
              While you are filling the form, a draft of your responses is saved
              in your browser&apos;s local storage so you do not lose progress if the
              page closes. The draft never leaves your device and is deleted when
              your registration is accepted.
            </p>
          </Reveal>
          <Reveal delay={180}>
            <h2 className="font-display text-[1.55rem] font-medium text-navy-900">Analytics</h2>
            <p className="mt-3">
              The public pages use a privacy-respecting web analytics service to
              understand how many people visit and which pages are useful. It
              records aggregated, anonymised usage such as page views and the
              steps of the registration funnel. It does not receive the contents
              of your registration — your name, contact details and answers are
              never sent to it.
            </p>
          </Reveal>
          <Reveal delay={200}>
            <h2 className="font-display text-[1.55rem] font-medium text-navy-900">Official notice</h2>
            <p className="mt-3">
              The organisers&apos; full legal privacy notice, naming the governing
              entity and its registered address, will be published here before the
              website is announced.
            </p>
            <p className="mt-2 text-[0.9rem] text-steel-400">
              Last updated: {tba("") || new Date().toISOString().slice(0, 10)}
            </p>
          </Reveal>
        </div>
      </section>
    </>
  );
}