import type { Metadata } from "next";
import { siteUrl } from "@/app/layout";
import { getSiteMode } from "@/lib/content/mode";
import { StandbyHome } from "@/components/standby/StandbyHome";
import { FullHome } from "@/components/full/FullHome";
import { CmsPageRenderer } from "@/components/cms/CmsPageRenderer";

export async function generateMetadata(): Promise<Metadata> {
  const { mode, profile } = await getSiteMode();
  if (mode === "full") {
    return {
      title: { absolute: "IMUN — Indian Model United Nations Conference 2026" },
      description: profile.content.seo.description || "IMUN — Indian Model United Nations Conference.",
      alternates: { canonical: `${siteUrl}/` },
    };
  }
  const c = profile.content;
  return {
    title: { absolute: c.seo.title || "IMUN — Indian Model United Nations" },
    description: c.seo.description,
    alternates: { canonical: `${siteUrl}/` },
  };
}

export default async function HomePage() {
  const { mode, profile } = await getSiteMode();
  if (mode === "full") {
    const cmsHome = profile.cms.pages.home;
    if (cmsHome?.blocks.length) return <CmsPageRenderer page={cmsHome} />;
    return <FullHome />;
  }
  return <StandbyHome content={profile.content} />;
}
