import type { Metadata } from "next";
import { PageMasthead } from "@/components/PageMasthead";
import { Accordion } from "@/components/Accordion";
import { Reveal } from "@/components/Reveal";
import { faqEntries } from "@/lib/config/faq";
import { siteUrl } from "@/app/layout";
import { faqSchema } from "@/lib/seo/structured-data";
import { JsonLd } from "@/components/JsonLd";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Frequently asked questions about registration, committees, eligibility, fees and conduct at IMUN.",
  alternates: { canonical: `${siteUrl}/faq` },
};

export default function FaqPage() {
  return (
    <>
      <PageMasthead
        path="/faq"
        section="FAQ"
        title="Frequently asked questions"
        lede="If your question is not answered here, write to the secretariat using the contact details on the Contact page."
      />

      <JsonLd data={faqSchema()} />

      <section className="section">
        <div className="container-site mx-auto max-w-4xl">
          <Reveal>
            <Accordion items={faqEntries.map((e) => ({ question: e.question, answer: e.answer }))} />
          </Reveal>
          <Reveal delay={60}>
            <p className="mt-10 text-[0.92rem] text-steel-500">
              Details that depend on final confirmation — dates, venue, fee,
              awards and deadlines — will be answered in full once the secretariat&apos;s
              official announcement is published.
            </p>
          </Reveal>
        </div>
      </section>
    </>
  );
}