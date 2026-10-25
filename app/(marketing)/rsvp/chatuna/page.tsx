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
import ChatunaMarketingPage from "./ChatunaMarketingPage";
import { CHATUNA_FAQS } from "./chatunaFaqs";
import {
  CHATUNA_META,
  CHATUNA_PATH,
  GUESTS_VIDEO,
  JOURNEY_VIDEO,
  MEDIA,
  SEATING_VIDEO,
  TIMING_VIDEO,
} from "./content";

const breadcrumbs = [
  { name: "ראשי", path: "/" },
  { name: "אישורי הגעה", path: "/rsvp" },
  { name: "אישורי הגעה לחתונה", path: CHATUNA_PATH },
];

const ogImage = {
  url: absoluteUrl(MEDIA.og),
  width: 1200,
  height: 630,
  alt: "אישורי הגעה לחתונה | Invistimo",
};

export const metadata: Metadata = {
  ...pageMetadata({
    title: CHATUNA_META.title,
    description: CHATUNA_META.description,
    path: CHATUNA_PATH,
  }),
  openGraph: {
    title: CHATUNA_META.title,
    description: CHATUNA_META.description,
    url: absoluteUrl(CHATUNA_PATH),
    siteName: "Invistimo",
    locale: "he_IL",
    type: "website",
    images: [ogImage],
  },
  twitter: {
    card: "summary_large_image",
    title: CHATUNA_META.title,
    description: CHATUNA_META.description,
    images: [ogImage.url],
  },
};

export default function WeddingRsvpPage() {
  return (
    <>
      <JsonLd
        data={graph([
          organizationNode(),
          {
            "@type": "WebPage",
            "@id": `${SITE_URL}${CHATUNA_PATH}#webpage`,
            url: absoluteUrl(CHATUNA_PATH),
            name: CHATUNA_META.title,
            description: CHATUNA_META.description,
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
            "@id": `${SITE_URL}${CHATUNA_PATH}#breadcrumb`,
          },
          serviceNode({
            name: "אישורי הגעה לחתונה",
            description: CHATUNA_META.description,
            path: CHATUNA_PATH,
            serviceType: "אישורי הגעה לחתונה",
          }),
          softwareNode(
            "Invistimo — אישורי הגעה לחתונה עם WhatsApp, קישור אישי, מעקב תשובות ואפשרות לשיחות והושבה.",
            CHATUNA_PATH
          ),
          videoNode({
            name: JOURNEY_VIDEO.title,
            description: JOURNEY_VIDEO.description,
            contentUrl: JOURNEY_VIDEO.src,
            posterUrl: JOURNEY_VIDEO.poster,
            uploadDate: JOURNEY_VIDEO.uploadDate,
            path: CHATUNA_PATH,
          }),
          videoNode({
            name: GUESTS_VIDEO.title,
            description: GUESTS_VIDEO.description,
            contentUrl: GUESTS_VIDEO.src,
            posterUrl: GUESTS_VIDEO.poster,
            uploadDate: GUESTS_VIDEO.uploadDate,
            path: CHATUNA_PATH,
          }),
          videoNode({
            name: SEATING_VIDEO.title,
            description: SEATING_VIDEO.description,
            contentUrl: SEATING_VIDEO.src,
            posterUrl: SEATING_VIDEO.poster,
            uploadDate: SEATING_VIDEO.uploadDate,
            path: CHATUNA_PATH,
          }),
          videoNode({
            name: TIMING_VIDEO.title,
            description: TIMING_VIDEO.description,
            contentUrl: TIMING_VIDEO.src,
            posterUrl: TIMING_VIDEO.poster,
            uploadDate: TIMING_VIDEO.uploadDate,
            path: CHATUNA_PATH,
          }),
          faqNode(CHATUNA_FAQS.map(({ q, a }) => ({ q, a }))),
        ])}
      />
      <ChatunaMarketingPage />
    </>
  );
}
