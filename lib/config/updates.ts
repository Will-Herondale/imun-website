/**
 * Conference updates / announcements, newest first on /updates.
 *
 * Edit this list to publish a notice — no CMS or redeploy of other files is
 * needed. `date` must be ISO (YYYY-MM-DD) so entries sort and validate
 * correctly; it is also emitted as structured data.
 */
export type UpdateEntry = {
  /** ISO date (YYYY-MM-DD). */
  date: string;
  /** Short category label, e.g. Registration, Conference, Allocations. */
  tag: string;
  title: string;
  body: string;
};

export const updates: UpdateEntry[] = [
  {
    date: "2026-09-20",
    tag: "Conference",
    title: "The session will be held online",
    body: "IMUN 2026 runs fully online on 10–11 October 2026 — no venue or travel needed. The fee schedule is revised for the online format: Round 1 registration is ₹600 until 28 September, then ₹750, ₹900 and ₹1,000 at on-spot. All four committees keep 25 delegate seats each.",
  },
  {
    date: "2026-09-19",
    tag: "Registration",
    title: "Secure UPI checkout is live",
    body: "The delegate fee can now be paid at checkout from any UPI app. Your seat is confirmed the moment the payment is verified — no separate confirmation step is needed.",
  },
  {
    date: "2026-09-19",
    tag: "Registration",
    title: "Round 1 registration is open",
    body: "Delegate registration is open at the Round 1 fee of ₹600 until 28 September 2026. Fees rise in later rounds, so early registration is advised.",
  },
  {
    date: "2026-09-18",
    tag: "Conference",
    title: "Conference dates confirmed",
    body: "The session will be held on 10–11 October 2026. Four committees — DISEC, UNHRC, the European Union and the Joint Crisis Committee — each with 25 delegate seats.",
  },
];

/** Newest first. */
export function sortedUpdates(): UpdateEntry[] {
  return [...updates].sort((a, b) => b.date.localeCompare(a.date));
}
