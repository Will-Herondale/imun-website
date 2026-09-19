import type { Metadata } from "next";
import Link from "next/link";
import { PageMasthead } from "@/components/PageMasthead";
import { Reveal } from "@/components/Reveal";
import { committees, type ExecutiveBoard } from "@/lib/config/committees";
import { siteUrl } from "@/app/layout";

export const metadata: Metadata = {
  title: "Committees",
  description:
    "The four committees of IMUN — DISEC, UNHRC, the European Union and the Joint Crisis Committee.",
  alternates: { canonical: `${siteUrl}/committees` },
};

function boardRows(eb: ExecutiveBoard) {
  const rows = [
    { label: "Chairperson", value: eb.chairpersons },
    { label: "Vice-chairperson", value: eb.viceChairpersons },
    { label: "Rapporteur", value: eb.rapporteurs },
  ];
  if (typeof eb.director === "number") {
    rows.unshift({ label: "Director", value: eb.director });
  }
  return rows.map((r) => ({ ...r, label: r.value === 1 ? r.label : `${r.label}s` }));
}

export default function CommitteesPage() {
  return (
    <>
      <PageMasthead
        path="/committees"
        section="Committees"
        title="The committee roster"
        lede="The confirmed roster of four committees. Each committee's agenda is set by its chair and issued ahead of the session."
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
                    <span aria-hidden="true" className="font-display text-[1.8rem] font-medium leading-none text-brass-600">
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
                    <span className="eyebrow-doc block">Delegate seats</span>
                    <span className="mt-1 block text-[0.9rem] text-navy-800">{c.seats} maximum</span>
                    <span className="eyebrow-doc mt-6 block">Agenda</span>
                    <span className="mt-1 block text-[0.9rem] text-steel-500">{c.agenda}</span>
                    {c.executiveBoard ? (
                      <div className="mt-6">
                        <span className="eyebrow-doc block">Executive board</span>
                        <dl className="mt-2 space-y-1 text-[0.88rem] text-steel-500">
                          {boardRows(c.executiveBoard).map((row) => (
                            <div
                              key={row.label}
                              className="flex items-baseline justify-between gap-4 md:justify-end md:gap-3"
                            >
                              <dt>{row.label}</dt>
                              <dd className="font-semibold text-navy-700">{row.value}</dd>
                            </div>
                          ))}
                        </dl>
                      </div>
                    ) : null}
                  </div>
                </article>
              </Reveal>
            ))}
          </div>

          <Reveal>
            <div className="mt-12 rounded-[4px] border border-steel-200 bg-steel-50 p-6">
              <p className="text-[0.92rem] leading-relaxed text-steel-600">
                <span className="font-semibold text-navy-800">On committees:</span>{" "}
                the session runs four committees, each capped at {committees[0]?.seats ?? 25}{" "}
                delegate seats. Committee agendas are set by the chair of each chamber
                and issued ahead of the session. First-time delegates are equally
                welcome in every chamber; the secretariat allocates portfolios with
                the experience section of your registration in mind.
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