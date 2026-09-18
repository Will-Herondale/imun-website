import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.iemun.example").replace(/\/$/, "");
  const now = new Date();
  const routes = [
    "/",
    "/about",
    "/conference",
    "/committees",
    "/registration",
    "/faq",
    "/contact",
    "/privacy",
  ];
  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: now,
    changeFrequency: route === "/" ? "weekly" : "monthly",
    priority: route === "/" ? 1 : 0.7,
  }));
}