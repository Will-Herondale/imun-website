/**
 * Committee roster for the current IMUN session.
 *
 * « PLACEHOLDER » — this list must be replaced with the secretariat's
 * confirmed committee list before the site is announced. The entries below
 * illustrate the format; symbols/labels like the organ descriptions are
 * deliberately generic so nothing is misrepresented as a confirmed fact.
 *
 * Changing committee names here automatically updates:
 *   - the /committees page,
 *   - the registration form preference dropdowns,
 *   - validation of committee preferences on both client and server.
 */

export type Committee = {
  /** Short code shown in the form dropdowns. */
  code: string;
  /** Full committee name. */
  name: string;
  /** Body type: General Assembly / Economic & Social / Domestic. */
  category: string;
  /** Agenda topic (illustrative placeholder until the session agenda is set). */
  agenda: string;
  /** Two-sentence editorial description of the body and what delegates do. */
  description: string;
  /**
   * Delegate seats available in this committee for the current session.
   * « PLACEHOLDER » — drives allocation capacity and the seats matrix; confirm
   * the real numbers with the secretariat and update them here.
   */
  seats: number;
};

export const committees: Committee[] = [
  {
    code: "UNGA",
    name: "United Nations General Assembly",
    category: "General Assembly",
    agenda: "Awaiting published agenda",
    description:
      "The plenary forum of the United Nations. Delegates address the international agenda before the world body, moving resolutions through debate, amendment and vote.",
    seats: 40,
  },
  {
    code: "UNSC",
    name: "United Nations Security Council",
    category: "Security Council",
    agenda: "Awaiting published agenda",
    description:
      "The Council is the principal organ for the maintenance of international peace and security. A smaller, high-intensity chamber where proposals, vetoes and compromises carry real consequence.",
    seats: 15,
  },
  {
    code: "UNHRC",
    name: "United Nations Human Rights Council",
    category: "Human Rights",
    agenda: "Awaiting published agenda",
    description:
      "An intergovernmental body responsible for strengthening the promotion and protection of human rights around the globe. Delegates negotiate in the language of principle and precedent.",
    seats: 30,
  },
  {
    code: "WHO",
    name: "World Health Organization",
    category: "Specialised Agency",
    agenda: "Awaiting published agenda",
    description:
      "The directing and coordinating authority on international health. Delegates contend with public-health policy, financing and cooperation between states.",
    seats: 25,
  },
  {
    code: "UNEP",
    name: "United Nations Environment Programme",
    category: "Specialised Agency",
    agenda: "Awaiting published agenda",
    description:
      "The global authority on the environment. Chapters and working papers bring science, economics and politics to the same table.",
    seats: 30,
  },
  {
    code: "LS",
    name: "Lok Sabha",
    category: "Domestic Committee",
    agenda: "Awaiting published agenda",
    description:
      "A domestic parliamentary simulation. Delegates act as members of Parliament in a legislative setting of question hour, debate and statutory business.",
    seats: 40,
  },
];

export const committeeByCode = (code: string): Committee | undefined =>
  committees.find((c) => c.code === code);