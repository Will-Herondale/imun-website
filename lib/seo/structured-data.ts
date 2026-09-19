import { site, dateAndVenueLine } from "@/lib/config/site";
import { faqEntries } from "@/lib/config/faq";
import { absoluteUrl, siteUrl } from "@/lib/seo/site-url";

const ORG_NAME = `${site.name} — ${site.fullName}`;
const LOGO = absoluteUrl("/assets/brand/iemun-seal.png");
const OG_IMAGE = absoluteUrl("/assets/brand/iemun-og.png");

type Json = Record<string, unknown>;

/** Drop undefined/empty values so JSON-LD stays valid and compact. */
function clean<T extends Json>(obj: T): T {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined && v !== "")) as T;
}

/** Social profiles as an array of URLs (empty handles are omitted). */
function sameAs(): string[] {
  return Object.values(site.social).filter((v): v is string => Boolean(v && v.trim()));
}

/** Organizer / publisher identity, emitted site-wide. */
export function organizationSchema(): Json {
  return clean({
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${siteUrl}/#organization`,
    name: ORG_NAME,
    alternateName: site.name,
    url: siteUrl,
    logo: { "@type": "ImageObject", url: LOGO },
    description: site.descriptor,
    email: site.contact.email || undefined,
    sameAs: sameAs().length ? sameAs() : undefined,
    contactPoint: site.contact.email
      ? [
          clean({
            "@type": "ContactPoint",
            contactType: "customer support",
            email: site.contact.email,
            telephone: site.contact.phone || undefined,
            areaServed: "IN",
            availableLanguage: ["en", "hi"],
          }),
        ]
      : undefined,
  });
}

/** Web site identity with the organisation as publisher. */
export function websiteSchema(): Json {
  return clean({
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${siteUrl}/#website`,
    name: ORG_NAME,
    url: siteUrl,
    description: site.descriptor,
    inLanguage: "en-IN",
    publisher: { "@id": `${siteUrl}/#organization` },
  });
}

/** The conference itself, used on the home and conference pages. */
export function eventSchema(): Json {
  const offers = site.registrationFee.amount
    ? [
        clean({
          "@type": "Offer",
          price: String(site.registrationFee.amount),
          priceCurrency: site.registrationFee.currency,
          url: absoluteUrl("/registration"),
          availability: "https://schema.org/InStock",
          category: "Delegate registration",
        }),
      ]
    : undefined;

  return clean({
    "@context": "https://schema.org",
    "@type": "Event",
    "@id": `${siteUrl}/#conference`,
    name: ORG_NAME,
    description: site.descriptor,
    url: siteUrl,
    image: OG_IMAGE,
    startDate: site.dateIso.start || undefined,
    endDate: site.dateIso.end || undefined,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    isAccessibleForFree: false,
    organizer: { "@id": `${siteUrl}/#organization` },
    location: clean({
      "@type": "Place",
      name: site.venue.name || dateAndVenueLine(),
      address: clean({
        "@type": "PostalAddress",
        addressLocality: site.venue.city || undefined,
        addressCountry: "IN",
      }),
    }),
    offers,
  });
}

/** FAQ rich result for the /faq page. */
export function faqSchema(): Json {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqEntries.map((entry) => ({
      "@type": "Question",
      name: entry.question,
      acceptedAnswer: { "@type": "Answer", text: entry.answer },
    })),
  };
}
