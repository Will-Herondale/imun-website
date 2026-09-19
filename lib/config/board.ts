/**
 * Secretariat and organising board for the current IMUN session.
 *
 * Names and roles only; photographs are added separately when the secretariat
 * supplies them. Changing this list updates the About page.
 */

export type BoardMember = {
  /** Portfolio, e.g. "Secretary-General". */
  role: string;
  /** Full name. */
  name: string;
  /** Optional short initials for a monogram tile. */
  initials?: string;
};

export const secretariat: BoardMember[] = [
  { role: "Secretary-General", name: "Nathan Hamilton" },
  { role: "Director-General", name: "Lalith Prateek" },
  { role: "Marketing Head", name: "Rithvik Dosapati" },
  { role: "Under-Secretary-General, Technology", name: "Ashwath M" },
  { role: "Under-Secretary-General, Technology", name: "Vivaan" },
  { role: "Under-Secretary-General, Logistics", name: "Shreeharsh Narayan" },
  { role: "Under-Secretary-General, Policy", name: "Arush" },
];
