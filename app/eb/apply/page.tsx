import type { Metadata } from "next";
import { EBApplicationForm } from "@/components/EBApplicationForm";
import { PageMasthead } from "@/components/PageMasthead";
import { siteUrl } from "@/app/layout";

export const metadata: Metadata = {
  title: "Apply — Executive Board",
  description: `Application form for the Executive Board of IMUN 2026 — Chairperson and Vice-Chairperson positions across all committees.`,
  alternates: { canonical: `${siteUrl}/eb/apply` },
};

export default function EBApplyPage() {
  return (
    <>
      <PageMasthead
        path="/eb/apply"
        section="Executive Board · Apply"
        title="Executive Board application"
        lede="Tell us about your record, your committee and how you would run the room. The secretariat reviews every application."
      />
      <section className="section">
        <div className="container-site" style={{ maxWidth: "52rem" }}>
          <EBApplicationForm />
        </div>
      </section>
    </>
  );
}