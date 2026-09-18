/**
 * Editorial content for the marketing pages.
 * These are the site's own copy blocks — feel free to refine them.
 */

/** Homepage "Conference highlights" — four short institutional facts. */
export const highlights = [
  {
    title: "Genuine parliamentary procedure",
    body: "Debate conducted under a structured Rules of Procedure — moderated caucus, formal motions, resolutions and voting, not informal talking in turns.",
  },
  {
    title: "Substantive agendas",
    body: "Committees take up current international questions and negotiate real working papers. Position papers and research guides are issued ahead of the session.",
  },
  {
    title: "Awards and commendations",
    body: "Outstanding delegates are recognised at the closing ceremony. The awards structure, as confirmed, is published in the conference guide.",
  },
  {
    title: "An earnest, formal setting",
    body: "Dress, language and conduct follow international conference norms, so the room feels like the real thing from the first gavel.",
  },
] as const;

/** Homepage "The delegate experience" — numbered editorial points. */
export const delegateExperience = [
  {
    title: "Train before you speak",
    body: "A pre-conference orientation covers the Rules of Procedure, how to write a position paper and how to hold a committee room. First-timers are not thrown into the deep end.",
  },
  {
    title: "Prepare with research",
    body: "Every delegate receives a committee research guide ahead of the session. Strong ranking recovered committee work begins at home, not at the podium.",
  },
  {
    title: "Speak under the gavel",
    body: "Every delegate speaks — formal address, substantive debate and the lobby. Speaking rights rotate so the room hears more than a handful of voices.",
  },
  {
    title: "Negotiate on paper",
    body: "Resolutions are drafted, amended and voted. Learning to build blocs, trade language and defend language on the floor is the heart of the exercise.",
  },
  {
    title: "Leave with a certificate",
    body: "Delegates who complete the session receive a signed certificate of participation. Award winners are recognised at the closing ceremony.",
  },
] as const;

/** Conference-page pillars — the institutional "what IMUN stands for". */
export const pillars = [
  {
    title: "Substance over spectacle",
    body: "The conference measures itself by the depth of its debates and the quality of its resolutions, not by stagecraft.",
  },
  {
    title: "Neutral, rigorous chairs",
    body: "The dais keeps time, keeps order and keeps the record. Procedure is applied evenly, and every delegate keeps speaking rights.",
  },
  {
    title: "Standards of conduct",
    body: "Delegates are expected to observe formal dress, formal language and the dignity of the chamber throughout the session.",
  },
] as const;

/** The conference "at a glance" sheet fields (see /conference). */
export const atAGlance = [
  { key: "Programme", value: "Committee sessions · ceremonies · social evening" },
  { key: "Language", value: "English" },
  { key: "Participation", value: "School and college students" },
  { key: "Conduct", value: "Formal dress code; formal debate" },
] as const;

/** Short count strip used on the homepage hero. */
export const heroStats = [
  { value: "6", label: "Committees (draft roster)" },
  { value: "5", label: "Debate sessions" },
  { value: "15+", label: "Hours on the floor" },
] as const;

/** The three headline reasons used in the "Why take part" band. */
export const whyParticipate = [
  {
    title: "Speak with discipline",
    body: "Structured procedure turns nerves into technique. You learn the formal register of international negotiation — and hold a room's attention on merit.",
  },
  {
    title: "Read the world closely",
    body: "Preparing a country's position on a live question trains you to argue from evidence, anticipate objections and adjust your line when the facts shift.",
  },
  {
    title: "Leave with a record",
    body: "A signed certificate of participation and — for the strongest delegations — an award that sits on a school record without inflation or gimmickry.",
  },
] as const;

/** Social proof line shown above the footer CTA. */
export const closingNote =
  "IMUN exists to give student delegates a genuinely formal Model United Nations — one measured by the quality of the debate it produces.";