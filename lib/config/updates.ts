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
    date: "2026-09-28",
    tag: "Registration",
    title: "Delegate fee updated to a flat ₹500",
    body: "Delegate registration now follows a single flat fee of ₹500 per delegate for the full session.",
  },
  {
    date: "2026-09-22",
    tag: "Conference",
    title: "Session dates confirmed — 24–25 October 2026",
    body: "IMUN 2026 runs fully online on 24–25 October 2026 — no venue or travel needed. All three committees keep 25 delegate seats each, and joining links are emailed to registered delegates before the session.",
  },
  {
    date: "2026-09-22",
    tag: "Registration",
    title: "Registration is open",
    body: "Delegate registration is open for IMUN 2026. Committee seats are limited and are confirmed after successful payment.",
  },
  {
    date: "2026-09-22",
    tag: "Conference",
    title: "Committee roster updated",
    body: "The session now runs DISEC, UNHRC and AIPPM — each with 25 delegate seats and a confirmed executive board.",
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
