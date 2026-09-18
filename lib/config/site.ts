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

  /** Conference dates, confirmed: 10–11 October 2026. */
  date: "10–11 October 2026",

  /** Venue object. « PLACEHOLDER » — confirm venue + city. */
  venue: {
    name: "",
    city: "",
  },

  /**
   * Registration fee, if charged.
   * Leave `amount` empty (`null`) when no fee has been confirmed.
   * « PLACEHOLDER » — confirm with the secretariat.
   */
  registrationFee: {
    amount: null as number | null,
    currency: "INR",
    note: "",
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
   * NOTE: the environment variable REGISTRATION_OPEN (e.g. set in Azure App
   * Service) overrides this value if present — the envelope wins, so you can
   * flip registration in production without redeploying.
   */
  registrationOpen: true,

  /** Human-readable label for the current registration period. */
  registrationLabel: "",

  /** Committees offered at this session. Reorder = reorder dropdowns. */
  committeesInRoster: true,
};

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