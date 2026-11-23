export type SiteContent = {
  standby: {
    kicker: string;
    headline: string;
    headlineAccent: string;
    body: string;
    ctaLabel: string;
    ctaHref: string;
    statusLabel: string;
  };
  contact: {
    email: string;
    phone: string;
    instagram: string;
  };
  announcement: {
    enabled: boolean;
    text: string;
  };
  footerNote: string;
  seo: {
    title: string;
    description: string;
  };
};

export const defaultSiteContent: SiteContent = {
  standby: {
    kicker: "Indian Model United Nations",
    headline: "The next edition is",
    headlineAccent: "being prepared.",
    body: "The 2026 session has concluded. Dates, committees and registration for the next IMUN conference will be published here as soon as they are confirmed.",
    ctaLabel: "Write to the secretariat",
    ctaHref: "mailto:imun.official@gmail.com",
    statusLabel: "Registrations closed",
  },
  contact: {
    email: "imun.official@gmail.com",
    phone: "7702044332",
    instagram: "https://www.instagram.com/imun_indianmun",
  },
  announcement: {
    enabled: false,
    text: "",
  },
  footerNote: "Next edition details coming soon",
  seo: {
    title: "IMUN — Indian Model United Nations",
    description:
      "The Indian Model United Nations. The 2026 session has concluded and the next edition is being prepared — details will be announced here soon.",
  },
};

export type SiteContentKey = keyof SiteContent;
