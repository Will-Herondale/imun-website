import { getActiveProfile } from "@/lib/content/profiles";
import type { CmsPageSlug } from "./types";

export async function getActiveCmsPage(slug: CmsPageSlug) {
  const profile = await getActiveProfile();
  return profile.cms.pages[slug] ?? null;
}

export async function getActiveCmsPageIfConfigured(slug: CmsPageSlug) {
  const page = await getActiveCmsPage(slug);
  return page && page.blocks.length > 0 ? page : null;
}
