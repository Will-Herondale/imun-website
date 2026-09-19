import type { Metadata } from "next";
import { AllocationsAutoRefresh } from "@/components/AllocationsAutoRefresh";
import { PageMasthead } from "@/components/PageMasthead";
import { Reveal } from "@/components/Reveal";
import { siteUrl } from "@/app/layout";
import { activeStore } from "@/lib/storage/registrationTable";
import { publicAllocationGroups, type PublicAllocationGroup } from "@/lib/allocations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Allocations",
  description:
    "Committee and portfolio allocations for registered delegates of the Indian MUN conference.",
  alternates: { canonical: `${siteUrl}/allocations` },
  robots: { index: true, follow: true },
};

async function loadGroups(): Promise<PublicAllocationGroup[]> {
  try {
    return publicAllocationGroups(await activeStore().list());
  } catch {
    return [];
  }
}

export default async function AllocationsPage() {
  const groups = await loadGroups();
  const totalDelegates = groups.reduce((sum, g) => sum + g.delegates.length, 0);
  const updatedAt = new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(new Date());

  return (
    <>
      <PageMasthead
        path="/allocations"
        section="Allocations"
        title="Delegate allocations"
        lede="Committee and portfolio assignments for registered delegates. Allocations are published live and update automatically as the secretariat confirms them."
      />

      <section className="section">
        <AllocationsAutoRefresh />
        <div className="container-site">
          {groups.length === 0 ? (
            <Reveal>
              <div className="mx-auto max-w-2xl border border-steel-200 bg-white p-8 text-center shadow-[var(--shadow-card)]">
                <p className="eyebrow-doc">Live</p>
                <h2 className="mt-4 font-display text-[1.6rem] font-medium text-navy-900">
                  No allocations published yet
                </h2>
                <p className="mt-4 text-[1rem] leading-relaxed text-steel-600">
                  Allocations appear here the moment the secretariat confirms
                  them, so this page updates continuously through the review
                  process. Please check back shortly, or contact the secretariat
                  if you have a question about your registration.
                </p>
              </div>
            </Reveal>
          ) : (
            <div className="space-y-10">
              <Reveal>
                <p className="text-[0.95rem] text-steel-500">
                  {totalDelegates} delegate{totalDelegates === 1 ? "" : "s"} allocated across{" "}
                  {groups.length} committee{groups.length === 1 ? "" : "s"}.
                  <span className="text-steel-400"> · Updated {updatedAt} IST</span>
                </p>
              </Reveal>
              {groups.map((g) => (
                <Reveal key={g.code}>
                  <div className="overflow-hidden border border-steel-200 bg-white shadow-[var(--shadow-card)]">
                    <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-steel-200 px-6 py-4">
                      <h2 className="font-display text-[1.3rem] font-medium text-navy-900">{g.name}</h2>
                      <p className="text-[0.82rem] text-steel-500">
                        {g.code} · {g.delegates.length} of {g.seats} seats
                      </p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="admin-table min-w-[36rem]">
                        <caption className="sr-only">Allocations for {g.name}.</caption>
                        <thead>
                          <tr>
                            <th>Delegate</th>
                            <th>School</th>
                            <th>Portfolio</th>
                          </tr>
                        </thead>
                        <tbody>
                          {g.delegates.map((d, i) => (
                            <tr key={`${g.code}-${i}-${d.name}`}>
                              <td className="font-semibold text-navy-900">{d.name}</td>
                              <td className="text-steel-600">{d.school}</td>
                              <td className="text-steel-600">{d.portfolio || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
