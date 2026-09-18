/**
 * Committee roster for the current IMUN session.
 *
 * The secretariat is confirming this roster in stages. Committees with an
 * `executiveBoard` (DISEC, JCC, UNHRC, EU) are confirmed, including their
 * board staffing; the remaining entries are still provisional and every
 * agenda remains "Awaiting published agenda" until the secretariat issues it.
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
  /**
   * Executive board counts, where the secretariat has confirmed them. Omitted
   * for committees whose board staffing is not yet published.
   */
  executiveBoard?: ExecutiveBoard;
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
    executiveBoard: { chairpersons: 1, viceChairpersons: 1, rapporteurs: 1 },
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
  {
    code: "DISEC",
    name: "Disarmament and International Security Committee",
    category: "General Assembly",
    agenda: "Awaiting published agenda",
    description:
      "The First Committee of the General Assembly, charged with disarmament, global challenges and threats to peace. Delegates confront arms control, non-proliferation and collective security in a chamber where consensus is hard won.",
    seats: 30,
    executiveBoard: { chairpersons: 1, viceChairpersons: 1, rapporteurs: 1 },
  },
  {
    code: "JCC",
    name: "Joint Crisis Committee",
    category: "Crisis Committee",
    agenda: "Awaiting published agenda",
    description:
      "A fast-moving crisis simulation in which the board directs events as they unfold. Delegates respond to live developments and negotiate under pressure, where every directive carries immediate consequence.",
    seats: 30,
    executiveBoard: { director: 1, chairpersons: 2, viceChairpersons: 2, rapporteurs: 2 },
  },
  {
    code: "EU",
    name: "European Union",
    category: "Regional Body",
    agenda: "Awaiting published agenda",
    description:
      "The council of European member states, negotiating common positions on trade, security and enlargement. Delegates balance national interest against the bloc's collective voice.",
    seats: 30,
    executiveBoard: { chairpersons: 1, viceChairpersons: 1, rapporteurs: 1 },
  },
];

export const committeeByCode = (code: string): Committee | undefined =>
  committees.find((c) => c.code === code);