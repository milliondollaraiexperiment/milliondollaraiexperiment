import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/publicUrls";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: absoluteUrl("/"), lastModified: now, changeFrequency: "hourly", priority: 1 },
    { url: absoluteUrl("/about"), lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: absoluteUrl("/log"), lastModified: now, changeFrequency: "hourly", priority: 0.9 },
    { url: absoluteUrl("/roadmap"), lastModified: now, changeFrequency: "daily", priority: 0.7 },
    { url: absoluteUrl("/terms"), lastModified: now, changeFrequency: "yearly", priority: 0.4 },
    { url: absoluteUrl("/privacy"), lastModified: now, changeFrequency: "yearly", priority: 0.4 },
  ];
}
