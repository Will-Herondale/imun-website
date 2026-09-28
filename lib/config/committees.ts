/**
 * Committee roster for the current IMUN session.
 *
 * The session runs three committees: DISEC, UNHRC and AIPPM. Each carries
 * its confirmed executive board, published here for information only.
 *
 * Changing committee names here automatically updates:
 *   - the /committees page,
 *   - the registration form preference dropdowns,
 *   - validation of committee preferences on both client and server.
 */

/**
 * Executive board staffing for a committee. Chairs run their own committee's
 * proceedings, so these figures are published for information only and are not
 * part of delegate seat allocation.
 */
export type ExecutiveBoard = {
  /** Crisis committees are led by a director. */
  director?: number;
  chairpersons: number;
  viceChairpersons: number;
  rapporteurs: number;
};

export type Committee = {
  /** Short code shown in the form dropdowns. */
  code: string;
  /** Full committee name. */
  name: string;
  /** Body type: General Assembly / Human Rights / Regional / Crisis. */
  category: string;
  /** Agenda status — the topic is set by each committee's chair. */
  agenda: string;
  /** Two-sentence editorial description of the body and what delegates do. */
  description: string;
  /**
   * Delegate seats available in this committee for the current session.
   * Maximum delegate seats for this committee; drives allocation capacity and the seats matrix.
   */
  seats: number;
  /**
   * Executive board counts, as confirmed by the secretariat.
   */
  executiveBoard?: ExecutiveBoard;
};

export const committees: Committee[] = [
  {
    code: "DISEC",
    name: "Disarmament and International Security Committee",
    category: "General Assembly",
    agenda: "Set by the committee chair",
    description:
      "The First Committee of the General Assembly, charged with disarmament, global challenges and threats to peace. Delegates confront arms control, non-proliferation and collective security in a chamber where consensus is hard won.",
    seats: 25,
    executiveBoard: { chairpersons: 1, viceChairpersons: 1, rapporteurs: 1 },
  },
  {
    code: "UNHRC",
    name: "United Nations Human Rights Council",
    category: "Human Rights",
    agenda: "Set by the committee chair",
    description:
      "An intergovernmental body responsible for strengthening the promotion and protection of human rights around the globe. Delegates negotiate in the language of principle and precedent.",
    seats: 25,
    executiveBoard: { chairpersons: 1, viceChairpersons: 1, rapporteurs: 1 },
  },
  {
    code: "AIPPM",
    name: "All India Political Parties Meet",
    category: "Parliamentary",
    agenda: "Set by the committee chair",
    description:
      "A domestic parliamentary simulation where parties negotiate policy, coalition strategy and floor management under intense time pressure. Delegates argue from ideological positions while balancing party lines and national priorities.",
    seats: 25,
    executiveBoard: { chairpersons: 1, viceChairpersons: 1, rapporteurs: 1 },
  },
];

export const committeeByCode = (code: string): Committee | undefined =>
  committees.find((c) => c.code === code);
