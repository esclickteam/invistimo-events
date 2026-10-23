import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo/site";

/**
 * Public marketing pages stay crawlable for Googlebot, Bingbot, OAI-SearchBot
 * and other polite crawlers via userAgent "*". Private apps are disallowed.
 * Guest invitation URLs are NOT disallowed: they must stay open for guests and
 * link previews, and they carry noindex instead.
 */
export default function robots(): MetadataRoute.Robots {
  const disallow = [
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
    "/login",
    "/register",
    "/check-in",
    "/wedding-challenges",
    "/menus",
    "/venue-client",
  ];

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow,
      },
      {
        userAgent: "Googlebot",
        allow: "/",
        disallow,
      },
      {
        userAgent: "Bingbot",
        allow: "/",
        disallow,
      },
      {
        userAgent: "OAI-SearchBot",
        allow: "/",
        disallow,
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
