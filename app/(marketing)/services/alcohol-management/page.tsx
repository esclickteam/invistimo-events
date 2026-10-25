import type { Metadata } from "next";
import JsonLd from "@/components/seo/JsonLd";
import {
  breadcrumbNode,
  faqNode,
  graph,
  organizationNode,
  serviceNode,
} from "@/lib/seo/jsonld";
import { absoluteUrl, pageMetadata, SITE_URL } from "@/lib/seo/site";
import AlcoholManagementMarketingPage from "./AlcoholManagementMarketingPage";
import {
  ALCOHOL_MGMT_FAQS,
  ALCOHOL_MGMT_META,
  ALCOHOL_MGMT_PATH,
  MEDIA,
} from "./content";

const breadcrumbs = [
  { name: "ראשי", path: "/" },
  { name: "שירותים", path: "/services/alcohol-management" },
  { name: "ניהול אלכוהול לאירועים", path: ALCOHOL_MGMT_PATH },
];

const ogImage = {
  url: absoluteUrl(MEDIA.og),
  width: 1200,
  height: 630,
  alt: "ניהול אלכוהול לאירועים | Invistimo",
};

export const metadata: Metadata = {
  ...pageMetadata({
    title: ALCOHOL_MGMT_META.title,
    description: ALCOHOL_MGMT_META.description,
    path: ALCOHOL_MGMT_PATH,
  }),
  openGraph: {
    title: ALCOHOL_MGMT_META.title,
    description: ALCOHOL_MGMT_META.description,
    url: absoluteUrl(ALCOHOL_MGMT_PATH),
    siteName: "Invistimo",
    locale: "he_IL",
    type: "website",
    images: [ogImage],
  },
  twitter: {
    card: "summary_large_image",
    title: ALCOHOL_MGMT_META.title,
    description: ALCOHOL_MGMT_META.description,
    images: [ogImage.url],
  },
};

export default function AlcoholManagementServicePage() {
  return (
    <>
      <JsonLd
        data={graph([
          organizationNode(),
          {
            "@type": "WebPage",
            "@id": `${SITE_URL}${ALCOHOL_MGMT_PATH}#webpage`,
            url: absoluteUrl(ALCOHOL_MGMT_PATH),
            name: ALCOHOL_MGMT_META.title,
            description: ALCOHOL_MGMT_META.description,
            inLanguage: "he-IL",
            isPartOf: { "@id": `${SITE_URL}/#website` },
            about: { "@id": `${SITE_URL}/#organization` },
            primaryImageOfPage: {
              "@type": "ImageObject",
              url: absoluteUrl(MEDIA.og),
            },
            dateModified: "2026-10-25",
          },
          {
            ...breadcrumbNode(breadcrumbs),
            "@id": `${SITE_URL}${ALCOHOL_MGMT_PATH}#breadcrumb`,
          },
          serviceNode({
            name: "ניהול אלכוהול לאירועים",
            description: ALCOHOL_MGMT_META.description,
            path: ALCOHOL_MGMT_PATH,
            serviceType: "ניהול אלכוהול באירועים עם אנשי צוות",
          }),
          faqNode(ALCOHOL_MGMT_FAQS.map(({ q, a }) => ({ q, a }))),
        ])}
      />
      <AlcoholManagementMarketingPage />
    </>
  );
}
