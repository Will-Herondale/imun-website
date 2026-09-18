/**
 * Editorial content for the public pages.
 */

/** Homepage "Standing commitments" — four institutional facts. */
export const highlights = [
  {
    title: "Genuine parliamentary procedure",
    body: "Debate runs under a written Rules of Procedure: moderated caucus, formal motions, resolutions and recorded votes.",
  },
  {
    title: "Substantive agendas",
    body: "Committees take up current international questions and negotiate working papers. Research guides are issued ahead of the session.",
  },
  {
    title: "An independent dais",
    body: "Chairs keep time, keep order and keep the record, applying procedure evenly to every delegate in the room.",
  },
  {
    title: "Awards and commendations",
    body: "Outstanding delegates are recognised at the closing ceremony under an awards structure published in the conference guide.",
  },
] as const;

/** Homepage "The delegate experience" — numbered points. */
export const delegateExperience = [
  {
    title: "Train before you speak",
    body: "A pre-conference orientation covers the Rules of Procedure, how to write a position paper and how to hold a committee room. First-time delegates are not thrown in unguided.",
  },
  {
    title: "Prepare with research",
    body: "Every delegate receives a committee research guide before the session. Committee work begins with preparation, not at the podium.",
  },
  {
    title: "Speak under the gavel",
    body: "Speaking rights rotate through the room, so formal address and substantive debate reach more than a handful of voices.",
  },
  {
    title: "Negotiate on paper",
    body: "Resolutions are drafted, amended and voted. Building blocs, trading language and defending it on the floor is the heart of the exercise.",
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
  { key: "Programme", value: "Two days · committee sessions and ceremonies" },
  { key: "Language", value: "English" },
  { key: "Participation", value: "School and college students · 150+ delegates expected" },
  { key: "Conduct", value: "Formal dress code; formal debate" },
] as const;

/** The three headline reasons used in the "Why participate" section. */
export const whyParticipate = [
  {
    title: "Speak with discipline",
    body: "Structured procedure turns nerves into technique: the formal register of negotiation, and the ability to hold a room on merit.",
  },
  {
    title: "Read the world closely",
    body: "Preparing a country's position on a live question trains you to argue from evidence, anticipate objections and adjust when the facts shift.",
  },
  {
    title: "Leave with a record",
    body: "A signed certificate of participation, and for the strongest delegations an award that stands on its own.",
  },
] as const;
