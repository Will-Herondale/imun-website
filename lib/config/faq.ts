/** Frequently asked questions. Add/remove entries as needed. */
import { site } from "@/lib/config/site";

export type FaqEntry = {
  question: string;
  answer: string;
};

const inr = (amount: number) =>
  `${site.registrationFee.currency} ${amount.toLocaleString("en-IN")}`;

const [round1, round2, round3, onSpot] = site.registrationRounds;

export const faqEntries: FaqEntry[] = [
  {
    question: "Who is eligible to register as a delegate?",
    answer:
      "IMUN is designed for school and college students. If you can join us for the full session and participate in the committee of your choice, you are welcome to apply. Specific eligibility by school or grade will be published with the confirmed conference details.",
  },
  {
    question: "How do the committee preferences work?",
    answer:
      "The registration form asks for three preferences in order. Allotment is made by the secretariat on the basis of your stated preferences, your Model UN experience and availability. We recommend selecting committees you are genuinely interested in rather than ones you expect to be less contested.",
  },
  {
    question: "Is prior Model UN experience required?",
    answer:
      "No. IMUN accommodates both first-time delegates and experienced speakers. The experience section of the form helps us guide you towards an appropriate committee and support the level of debate.",
  },
  {
    question: "What is the registration fee, and what does it cover?",
    answer:
      `The delegate fee is the same for every committee and is charged by registration round. ` +
      `${round1.label} is ${inr(round1.amount)} (${round1.window}), ` +
      `${round2.label} is ${inr(round2.amount)} (${round2.window}), ` +
      `${round3.label} is ${inr(round3.amount)} (${round3.window}), and ` +
      `on-spot registration is ${inr(onSpot.amount)} subject to seats. ` +
      `The fee covers committee sessions, conference materials and your certificate.`,
  },
  {
    question: "How do I pay the delegate fee?",
    answer:
      `Payment is made on the ${site.payment.provider} app to the wallet ID ${site.payment.walletId}. ` +
      `Keep the payment reference after you pay — the secretariat reconciles every payment against a registration and confirms your seat. ` +
      `Submission of the registration form does not by itself confirm a seat until the fee is received.`,
  },
  {
    question: "What is the dress code?",
    answer:
      "Formal attire — the standard is a suit, blazer or formal ethnic wear that reflects the seriousness of the proceedings. The secretariat will publish the complete dress code with the conference guide.",
  },
  {
    question: "How will I receive my committee allotment?",
    answer:
      "Once registration closes and allotments are finalised, you will be notified at the email address provided in your registration. Keep the same email address active for the duration of the conference.",
  },
  {
    question: "I made a mistake in my registration. Can I correct it?",
    answer:
      "Write to the secretariat using the contact details on this site with your full name and the details to be corrected. Corrections are processed against confirmed records only.",
  },
  {
    question: "When does registration close?",
    answer:
      `Registration runs through the session dates (${site.date}). On-spot registration is available at the venue subject to seats, at the highest fee tier. ` +
      `Earlier rounds carry a lower fee and committee seats are limited, so registering early is recommended.`,
  },
];