import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo/site";

/**
 * Public pages stay crawlable, including for Googlebot, Bingbot and AI search
 * crawlers. Private apps are disallowed. Guest invitation URLs are NOT
 * disallowed: they must stay open for guests and link previews, and they
 * carry noindex instead.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/admin",
        "/dashboard",
        "/employee",
        "/staff",
        "/producer",
        "/producer-staff",
        "/venues",
        "/events",
        "/try",
        "/payment",
        "/sales-documents",
        "/client-contracts",
        "/set-password",
        "/reset-password",
        "/forgot-password",
        "/check-in",
        "/wedding-challenges",
        "/menus",
        "/venue-client",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
