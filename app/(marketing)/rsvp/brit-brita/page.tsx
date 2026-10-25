import type { Metadata } from "next";
import JsonLd from "@/components/seo/JsonLd";
import {
  breadcrumbNode,
  faqNode,
  graph,
  organizationNode,
  serviceNode,
  softwareNode,
} from "@/lib/seo/jsonld";
import { absoluteUrl, pageMetadata, SITE_URL } from "@/lib/seo/site";
import BritBritaMarketingPage from "./BritBritaMarketingPage";
import { BRIT_FAQS } from "./britFaqs";
import { BRIT_META, BRIT_PATH, MEDIA } from "./content";

const breadcrumbs = [
  { name: "ראשי", path: "/" },
  { name: "אישורי הגעה", path: "/rsvp" },
  { name: "אישורי הגעה לברית ובריתה", path: BRIT_PATH },
];

const ogImage = {
  url: absoluteUrl(MEDIA.og),
  width: 1200,
  height: 630,
  alt: "אישורי הגעה לברית ובריתה | Invistimo",
};

export const metadata: Metadata = {
  ...pageMetadata({
    title: BRIT_META.title,
    description: BRIT_META.description,
    path: BRIT_PATH,
  }),
  openGraph: {
    title: BRIT_META.title,
    description: BRIT_META.description,
    url: absoluteUrl(BRIT_PATH),
    siteName: "Invistimo",
    locale: "he_IL",
    type: "website",
    images: [ogImage],
  },
  twitter: {
    card: "summary_large_image",
    title: BRIT_META.title,
    description: BRIT_META.description,
    images: [ogImage.url],
  },
};

export default function BritBritaRsvpPage() {
  return (
    <>
      <JsonLd
        data={graph([
          organizationNode(),
          {
            "@type": "WebPage",
            "@id": `${SITE_URL}${BRIT_PATH}#webpage`,
            url: absoluteUrl(BRIT_PATH),
            name: BRIT_META.title,
            description: BRIT_META.description,
            inLanguage: "he-IL",
            isPartOf: { "@id": `${SITE_URL}/#website` },
            about: { "@id": `${SITE_URL}/#organization` },
            primaryImageOfPage: {
              "@type": "ImageObject",
              url: absoluteUrl(MEDIA.og),
            },
          },
          {
            ...breadcrumbNode(breadcrumbs),
            "@id": `${SITE_URL}${BRIT_PATH}#breadcrumb`,
          },
          serviceNode({
            name: "אישורי הגעה לברית ובריתה",
            description: BRIT_META.description,
            path: BRIT_PATH,
            serviceType: "אישורי הגעה לברית ובריתה",
          }),
          softwareNode(
            "Invistimo — אישורי הגעה לברית ובריתה עם הזמנה דיגיטלית מהירה, קישור אישי ומעקב תשובות.",
            BRIT_PATH
          ),
          faqNode(BRIT_FAQS.map(({ q, a }) => ({ q, a }))),
        ])}
      />
      <BritBritaMarketingPage />
    </>
  );
}
