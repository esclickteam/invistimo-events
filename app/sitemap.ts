import type { MetadataRoute } from "next";
import { EVENT_LANDINGS } from "@/lib/seo/eventLandings";
import { guidePath, GUIDES } from "@/lib/seo/guides";
import { SERVICE_PAGES } from "@/lib/seo/services";
import { absoluteUrl, CONTENT_UPDATED, CORE_PUBLIC_ROUTES } from "@/lib/seo/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const seen = new Set<string>();
  const entries: MetadataRoute.Sitemap = [];

  function add(path: string, changeFrequency: "weekly" | "monthly" | "yearly", priority: number) {
    if (seen.has(path)) return;
    seen.add(path);
    entries.push({
      url: absoluteUrl(path),
      lastModified: CONTENT_UPDATED,
      changeFrequency,
      priority,
    });
  }

  for (const route of CORE_PUBLIC_ROUTES) {
    add(route.path, route.changeFrequency, route.priority);
  }

  for (const service of SERVICE_PAGES) {
    add(service.path, "monthly", 0.82);
  }

  for (const landing of EVENT_LANDINGS) {
    add(landing.path, "monthly", 0.84);
  }

  for (const guide of GUIDES) {
    add(guidePath(guide.slug), "monthly", 0.7);
  }

  return entries;
}
