import type { Metadata } from "next";
import Link from "next/link";
import { PageMasthead } from "@/components/PageMasthead";
import { Reveal } from "@/components/Reveal";
import { committees } from "@/lib/config/committees";
import { siteUrl } from "@/app/layout";

export const metadata: Metadata = {
  title: "Committees",
  description: `The draft committee roster for ${"IMUN"} — General Assembly, Security Council, specialised agencies and a domestic chamber.`,
  alternates: { canonical: `${siteUrl}/committees` },
};

export default function CommitteesPage() {
  return (
    <>
      <PageMasthead
        section="Committees"
        title="The committee roster"
        lede="A draft listing of the chamber system. Committee agendas and the final roster are issued by the secretariat once confirmed."
      />

      <section className="section">
        <div className="container-site">
          <div className="border-t border-steel-200">
            {committees.map((c, i) => (
              <Reveal key={c.code}>
                <article
                  id={c.code}
                  className="grid grid-cols-12 gap-4 border-b border-steel-200 py-10 md:gap-6 md:py-12"
                >
                  <div className="col-span-12 flex items-baseline gap-5 md:col-span-3 md:block">
                    <span aria-hidden="true" className="font-display text-[1.8rem] font-medium leading-none text-azure-600">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <code className="ml-auto rounded-[3px] border border-steel-200 px-2 py-1 text-[0.72rem] font-semibold tracking-[0.12em] text-navy-500 md:mt-4 md:inline-block">
                      {c.code}
                    </code>
                  </div>
                  <div className="col-span-12 md:col-span-6">
                    <p className="eyebrow-doc mb-2">{c.category}</p>
                    <h2 className="font-display text-[1.6rem] font-medium leading-tight text-navy-900">{c.name}</h2>
                    <p className="mt-4 max-w-2xl leading-relaxed text-steel-600">{c.description}</p>
                  </div>
                  <div className="col-span-12 md:col-span-3 md:text-right">
                    <span className="eyebrow-doc block">Agenda</span>
                    <span className="mt-1 block text-[0.9rem] text-steel-500">{c.agenda}</span>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>

          <Reveal>
            <div className="mt-12 rounded-[4px] border border-steel-200 bg-steel-50 p-6">
              <p className="text-[0.92rem] leading-relaxed text-steel-600">
                <span className="font-semibold text-navy-800">Before confirming a committee:</span>{" "}
                the list above is a draft placeholder held in a single configuration
                file. The final roster, agendas and delegate allocations per
                committee will be published by the secretariat before registration
                is processed. First-time delegates are equally welcome in every
                chamber; the secretariat allocates portfolios with the experience
                section of your registration in mind.
              </p>
            </div>
          </Reveal>

          <Reveal delay={80}>
            <div className="mt-10">
              <Link href="/registration" className="btn btn-primary">
                Register as a delegate
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}