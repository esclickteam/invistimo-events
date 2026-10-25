import type { Metadata } from "next";
import JsonLd from "@/components/seo/JsonLd";
import {
  breadcrumbNode,
  faqNode,
  graph,
  organizationNode,
  serviceNode,
  softwareNode,
  videoNode,
} from "@/lib/seo/jsonld";
import { absoluteUrl, pageMetadata, SITE_URL } from "@/lib/seo/site";
import HinaMarketingPage from "./HinaMarketingPage";
import { HINA_FAQS } from "./hinaFaqs";
import { HINA_META, HINA_PATH, MEDIA, SEATING_VIDEO } from "./content";

const breadcrumbs = [
  { name: "ראשי", path: "/" },
  { name: "אישורי הגעה", path: "/rsvp" },
  { name: "אישורי הגעה לחינה", path: HINA_PATH },
];

const ogImage = {
  url: absoluteUrl(MEDIA.og),
  width: 1200,
  height: 630,
  alt: "אישורי הגעה לחינה וסידורי הושבה | Invistimo",
};

export const metadata: Metadata = {
  ...pageMetadata({
    title: HINA_META.title,
    description: HINA_META.description,
    path: HINA_PATH,
  }),
  openGraph: {
    title: HINA_META.title,
    description: HINA_META.description,
    url: absoluteUrl(HINA_PATH),
    siteName: "Invistimo",
    locale: "he_IL",
    type: "website",
    images: [ogImage],
  },
  twitter: {
    card: "summary_large_image",
    title: HINA_META.title,
    description: HINA_META.description,
    images: [ogImage.url],
  },
};

export default function HinaRsvpPage() {
  return (
    <>
      <JsonLd
        data={graph([
          organizationNode(),
          {
            "@type": "WebPage",
            "@id": `${SITE_URL}${HINA_PATH}#webpage`,
            url: absoluteUrl(HINA_PATH),
            name: HINA_META.title,
            description: HINA_META.description,
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
            "@id": `${SITE_URL}${HINA_PATH}#breadcrumb`,
          },
          serviceNode({
            name: "אישורי הגעה לחינה וסידורי הושבה",
            description: HINA_META.description,
            path: HINA_PATH,
            serviceType: "אישורי הגעה לחינה",
          }),
          softwareNode(
            "Invistimo — הזמנות דיגיטליות, אישורי הגעה וסידורי הושבה לחינה, עם אפשרות לניהול LIVE בהתאם לחבילה.",
            HINA_PATH
          ),
          videoNode({
            name: SEATING_VIDEO.title,
            description: SEATING_VIDEO.description,
            contentUrl: SEATING_VIDEO.src,
            posterUrl: SEATING_VIDEO.poster,
            uploadDate: SEATING_VIDEO.uploadDate,
            path: HINA_PATH,
          }),
          faqNode(HINA_FAQS.map(({ q, a }) => ({ q, a }))),
        ])}
      />
      <HinaMarketingPage />
    </>
  );
}
