import type { MetadataRoute } from "next";
import { lastModifiedFor } from "@/lib/seo/contentDates";
import { guidePath, GUIDES } from "@/lib/seo/guides";
import { absoluteUrl, CORE_PUBLIC_ROUTES } from "@/lib/seo/site";

/**
 * Sitemap must never 500 because a content-date row was forgotten.
 * CI still fails via seo-public.test.ts when a route lacks ROUTE_CONTENT_DATES.
 */
function sitemapLastModified(path: string): Date {
  try {
    return lastModifiedFor(path);
  } catch (error) {
    console.error("[sitemap] missing content date for", path, error);
    return new Date("2026-01-01T00:00:00.000Z");
  }
}

export default function sitemap(): MetadataRoute.Sitemap {
  const core = CORE_PUBLIC_ROUTES.map((route) => ({
    url: absoluteUrl(route.path),
    lastModified: sitemapLastModified(route.path),
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  const guides = GUIDES.map((guide) => ({
    url: absoluteUrl(guidePath(guide.slug)),
    lastModified: sitemapLastModified(guidePath(guide.slug)),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  return [...core, ...guides];
}
