import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/seo/site-url";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const routes: Array<{
    path: string;
    changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
    priority: number;
  }> = [
    { path: "/", changeFrequency: "weekly", priority: 1 },
    { path: "/registration", changeFrequency: "weekly", priority: 0.9 },
    { path: "/conference", changeFrequency: "monthly", priority: 0.8 },
    { path: "/committees", changeFrequency: "monthly", priority: 0.8 },
    { path: "/allocations", changeFrequency: "daily", priority: 0.7 },
    { path: "/updates", changeFrequency: "weekly", priority: 0.7 },
    { path: "/about", changeFrequency: "monthly", priority: 0.6 },
    { path: "/faq", changeFrequency: "monthly", priority: 0.6 },
    { path: "/contact", changeFrequency: "yearly", priority: 0.5 },
    { path: "/privacy", changeFrequency: "yearly", priority: 0.3 },
  ];

  return routes.map(({ path, changeFrequency, priority }) => ({
    url: `${siteUrl}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  }));
}
