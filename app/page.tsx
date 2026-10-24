import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import HomePageClient from "./HomePageClient";
import JsonLd from "@/components/seo/JsonLd";
import { getDashboardPathFromAuthCookies } from "@/lib/auth/getDashboardRedirectPath";
import { HOME_FAQS } from "@/lib/seo/homeIntentMap";
import {
  breadcrumbNode,
  faqNode,
  graph,
  organizationNode,
  softwareNode,
  websiteNode,
} from "@/lib/seo/jsonld";
import { absoluteUrl, findCoreRoute, pageMetadata, SITE_URL } from "@/lib/seo/site";

export const dynamic = "force-dynamic";

const route = findCoreRoute("/")!;

const baseMeta = pageMetadata({
  title: route.title,
  description: route.description,
  path: "/",
});

export const metadata = {
  ...baseMeta,
  alternates: {
    canonical: absoluteUrl("/"),
    languages: {
      "he-IL": absoluteUrl("/"),
      he: absoluteUrl("/"),
      "x-default": absoluteUrl("/"),
    },
  },
};

export default async function HomePage() {
  const cookieStore = await cookies();

  const dashboardPath = getDashboardPathFromAuthCookies({
    authToken: cookieStore.get("authToken")?.value,
    producerAuthToken: cookieStore.get("producerAuthToken")?.value,
    adminAuthToken: cookieStore.get("adminAuthToken")?.value,
    role: cookieStore.get("role")?.value,
    impersonationRole: cookieStore.get("impersonationRole")?.value,
    originalTargetRole: cookieStore.get("originalTargetRole")?.value,
  });

  if (dashboardPath) {
    redirect(dashboardPath);
  }

  return (
    <>
      {/* Single LCP preload: hero atmosphere image (CSS background). Poster/video load after paint. */}
      <link rel="preload" as="image" href="/homep1.webp" fetchPriority="high" />
      <JsonLd
        data={graph([
          organizationNode(),
          websiteNode(),
          {
            "@type": "WebPage",
            "@id": `${SITE_URL}/#webpage`,
            url: SITE_URL,
            name: route.title,
            description: route.description,
            inLanguage: "he-IL",
            isPartOf: { "@id": `${SITE_URL}/#website` },
            about: { "@id": `${SITE_URL}/#organization` },
            primaryImageOfPage: {
              "@type": "ImageObject",
              url: absoluteUrl("/og-invistimo.jpg"),
            },
          },
          softwareNode(route.description, "/"),
          breadcrumbNode([{ name: "ראשי", path: "/" }]),
          faqNode(HOME_FAQS),
          // VideoObject omitted until hero-guest-journey.* is live on www.invistimo.com (currently 404 on prod).
        ])}
      />
      <HomePageClient />
    </>
  );
}
