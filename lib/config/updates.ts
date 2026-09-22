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
    date: "2026-09-22",
    tag: "Conference",
    title: "Session dates confirmed — 24–25 October 2026",
    body: "IMUN 2026 will be held in person on 24–25 October 2026. The venue is being finalised and will be announced as soon as it is confirmed. All four committees keep 25 delegate seats each.",
  },
  {
    date: "2026-09-22",
    tag: "Registration",
    title: "Registration is open — Round 1 at ₹1,600",
    body: "Delegate registration is open at the Round 1 fee of ₹1,600 until 8 October 2026, then ₹1,600, ₹2,100 and ₹2,500 in later rounds. Registering early is recommended as committee seats are limited.",
  },
  {
    date: "2026-09-22",
    tag: "Conference",
    title: "Committee roster updated",
    body: "The session now runs DISEC, UNHRC, the Lok Sabha and the Continuous Crisis Committee — each with 25 delegate seats and a confirmed executive board.",
  },
  {
    date: "2026-09-19",
    tag: "Registration",
    title: "Secure UPI checkout is live",
    body: "The delegate fee can now be paid at checkout from any UPI app. Your seat is confirmed the moment the payment is verified — no separate confirmation step is needed.",
  },
];

/** Newest first. */
export function sortedUpdates(): UpdateEntry[] {
  return [...updates].sort((a, b) => b.date.localeCompare(a.date));
}
