import type { MetadataRoute } from "next";
import { guidePath, GUIDES } from "@/lib/seo/guides";
import { absoluteUrl, CONTENT_UPDATED, CORE_PUBLIC_ROUTES } from "@/lib/seo/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const core = CORE_PUBLIC_ROUTES.map((route) => ({
    url: absoluteUrl(route.path),
    lastModified: CONTENT_UPDATED,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  const guides = GUIDES.map((guide) => ({
    url: absoluteUrl(guidePath(guide.slug)),
    lastModified: CONTENT_UPDATED,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  return [...core, ...guides];
}
