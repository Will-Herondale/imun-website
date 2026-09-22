/**
 * ============================================================================
 * IMUN — central site configuration
 * ----------------------------------------------------------------------------
 * Every event-specific detail lives in this file so that non-technical
 * organisers can update the site without hunting through components.
 *
 *   Fields marked  « PLACEHOLDER »  have not been confirmed and MUST be
 *   replaced with real information before the site is announced.
 *
 * Yes/no switches and contact details below are read by every page and by the
 * registration backend, so the whole site stays consistent.
 * ============================================================================
 */

export const site = {
  /** Public name of the conference. */
  name: "IMUN",

  /** Full legal/display name. */
  fullName: "Indian MUN",

  /** Short editorial tagline used in the hero and page metadata. */
  tagline: "Debate. Negotiate. Lead.",

  /** One-sentence positioning line for the hero and meta description. */
  descriptor:
    "A formal Model United Nations conference for student delegates across India — training in international affairs, diplomacy and public speaking.",

  /**
   * Edition label, e.g. "Inaugural Edition" / "3rd Edition".
   * « PLACEHOLDER » — confirm the edition number.
   */
  edition: "",

  /** Conference dates, confirmed: 24–25 October 2026. */
  date: "24–25 October 2026",

  /**
   * Machine-readable dates for structured data (schema.org Event). Keep in
   * sync with `date` above.
   */
  dateIso: { start: "2026-10-24", end: "2026-10-25" },

  /**
   * Venue object. Physical edition with the venue still to be finalised; an
   * empty name renders as "To be announced" across the site.
   */
  venue: {
    name: "",
    city: "",
  },

  /** Conference format, published across the site. */
  format: "In person",

  /**
   * Delegate registration fee. Fees rise by registration round, so `amount`
   * holds the lowest (Round 1) tier used for the headline figure and the
   * structured-data offer. The full schedule lives in `registrationRounds`.
   */
  registrationFee: {
    amount: 1600,
    currency: "INR",
    note: "",
  },

  /**
   * Registration rounds and their per-delegate fee. Editing this list updates
   * the Registration and Conference pages. Rounds are expanded to run through
   * the confirmation of the venue; the final round holds until the session.
   */
  registrationRounds: [
    { label: "Round 1", amount: 1600, window: "Until 8 October 2026", from: "2026-01-01", to: "2026-10-08" },
    { label: "Round 2", amount: 2100, window: "9 – 18 October 2026", from: "2026-10-09", to: "2026-10-18" },
    { label: "Round 3", amount: 2500, window: "19 – 25 October 2026", from: "2026-10-19", to: "2026-10-25" },
  ],

  /**
   * How the delegate fee is collected. Confirmations are issued against the
   * payment reference once the secretariat reconciles the wallet.
   */
  payment: {
    provider: "Fam",
    walletId: "nathan.hamilton@fam",
    note: "Pay the delegate fee securely from any UPI app (Google Pay, PhonePe, Paytm, Fam or any other) at checkout — your seat is confirmed the moment the payment is verified. You can also pay to the wallet ID below and record the transaction ID / UTR for manual confirmation.",
    /**
     * Shown on the registration form while the secure checkout is not yet
     * connected (FAMGATEWAY_API_KEY unset). It disappears automatically once the
     * key is configured — no code change or redeploy needed.
     */
    setupNotice:
      "Our secure UPI checkout is being set up and will be live by 5:30 PM (IST) today. You can register right now by paying the delegate fee from any UPI app to the wallet ID below and entering your transaction ID / UTR.",
  },

  /**
   * Conference theme / agenda headline, if the secretariat has announced one.
   * « PLACEHOLDER » — leave empty until a theme is confirmed.
   */
  theme: "",

  /** Delegate seats available across all committees (4 × 25). */
  capacity: 100,

  /** Expected delegate turnout for the session (headline figure). */
  expectedDelegates: "150+",

  /** Conference duration in days. */
  days: 2,

  /**
   * Contact details for the public site and the registration footer.
   * Address is still pending confirmation and renders as "To be announced".
   */
  contact: {
    email: "imun.official@gmail.com",
    phone: "7702044332",
    address: "",
  },

  /**
   * Official social media links (full URLs). Empty strings are hidden.
   */
  social: {
    instagram: "https://www.instagram.com/imun_indianmun",
    x: "",
    linkedin: "",
    youtube: "",
  },

  /**
   * Master switch controlling delegate registration. When `false`:
   *   - the Registration page shows a "closed" notice,
   *   - the Registration CTA links to the notice instead of the form,
   *   - the API rejects every submission with 409,
   *   - the site header shows a "Registration closed" marker.
   *
   * NOTE: the environment variable REGISTRATION_OPEN (set in the hosting
   * environment) overrides this value if present — the environment wins, so
   * you can flip registration in production without redeploying.
   */
  registrationOpen: true,

  /** Human-readable label for the current registration period. */
  registrationLabel: "Registration open — Round 1 (₹1,600 until 8 October)",

  /** Committees offered at this session. Reorder = reorder dropdowns. */
  committeesInRoster: true,
};

/**
 * The registration round in effect for a given moment. Dates are evaluated in
 * India Standard Time (Asia/Kolkata) so the round flips at local midnight.
 */
export function registrationRoundFor(date: Date = new Date()) {
  const day = date.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  return (
    site.registrationRounds.find((r) => r.from <= day && (!r.to || day <= r.to)) ??
    site.registrationRounds[0]
  );
}

/** The delegate fee (INR) that applies right now — stored with each record. */
export function feeAmountFor(date: Date = new Date()): number {
  return registrationRoundFor(date).amount;
}

/** Convenience: true when an edition placeholder has been confirmed. */
export const hasConfirmedEdition = Boolean(site.edition);

/**
 * Renders a confirmed value or a polished "to be announced" fallback.
 * Use everywhere a required-but-unconfirmed fact is displayed.
 */
export function tba(value: string): string {
  return value.trim() ? value : "To be announced";
}

/** Builds a headline-friendly date/venue line without inventing facts. */
export function dateAndVenueLine(): string {
  const date = site.date.trim();
  const venue = [site.venue.name.trim(), site.venue.city.trim()]
    .filter(Boolean)
    .join(", ");
  return [date || (venue ? "" : ""), venue].filter(Boolean).join(" · ") || "Date and venue to be announced";
}

/** Where a confirmed social handle would live; empty until set. */
export function socialLink(handle: string): string {
  return handle.trim();
}