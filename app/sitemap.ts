import type { MetadataRoute } from "next";
import { indexableCategoryPaths, isBlogCategoryId } from "@/lib/blog/taxonomy";
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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
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

  const categories = indexableCategoryPaths().map((path) => ({
    url: absoluteUrl(path),
    lastModified: sitemapLastModified(path),
    changeFrequency: "weekly" as const,
    priority: 0.64,
  }));

  const managed: MetadataRoute.Sitemap = [];
  if (process.env.MONGO_URI || process.env.MONGODB_URI) {
    try {
      const { listPublishedPosts } = await import("@/lib/blog/feed");
      const posts = await listPublishedPosts();
      for (const post of posts) {
        if (!isBlogCategoryId(String(post.categoryId || ""))) continue;
        managed.push({
          url: absoluteUrl(`/blog/p/${post.slug}`),
          lastModified: post.updatedAt ? new Date(post.updatedAt) : new Date("2026-11-08T00:00:00.000Z"),
          changeFrequency: "monthly",
          priority: 0.6,
        });
      }
    } catch (error) {
      console.error("[sitemap] blog posts skipped", error);
    }
  }

  return [...core, ...guides, ...categories, ...managed];
}
