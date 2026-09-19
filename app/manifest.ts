import type { MetadataRoute } from "next";
import { site } from "@/lib/config/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${site.name} — ${site.fullName}`,
    short_name: site.name,
    description: site.descriptor,
    start_url: "/",
    display: "standalone",
    background_color: "#020d24",
    theme_color: "#020d24",
    icons: [
      { src: "/icon.png", sizes: "any", type: "image/png" },
      { src: "/apple-icon.png", sizes: "any", type: "image/png" },
    ],
  };
}
