import type { MetadataRoute } from "next";
import { lastModifiedFor } from "@/lib/seo/contentDates";
import { guidePath, GUIDES } from "@/lib/seo/guides";
import { absoluteUrl, CORE_PUBLIC_ROUTES } from "@/lib/seo/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const core = CORE_PUBLIC_ROUTES.map((route) => ({
    url: absoluteUrl(route.path),
    lastModified: lastModifiedFor(route.path),
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  const guides = GUIDES.map((guide) => ({
    url: absoluteUrl(guidePath(guide.slug)),
    lastModified: lastModifiedFor(guidePath(guide.slug)),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  return [...core, ...guides];
}
