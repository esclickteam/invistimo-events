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
import BarBatMitzvahMarketingPage from "./BarBatMitzvahMarketingPage";
import { MEDIA, MITZVAH_META, MITZVAH_PATH } from "./content";
import { MITZVAH_FAQS } from "./mitzvahFaqs";

const breadcrumbs = [
  { name: "ראשי", path: "/" },
  { name: "אישורי הגעה", path: "/rsvp" },
  { name: "אישורי הגעה לבר ובת מצווה", path: MITZVAH_PATH },
];

const ogImage = {
  url: absoluteUrl(MEDIA.og),
  width: 1200,
  height: 630,
  alt: "אישורי הגעה לבר ובת מצווה | Invistimo",
};

export const metadata: Metadata = {
  ...pageMetadata({
    title: MITZVAH_META.title,
    description: MITZVAH_META.description,
    path: MITZVAH_PATH,
  }),
  openGraph: {
    title: MITZVAH_META.title,
    description: MITZVAH_META.description,
    url: absoluteUrl(MITZVAH_PATH),
    siteName: "Invistimo",
    locale: "he_IL",
    type: "website",
    images: [ogImage],
  },
  twitter: {
    card: "summary_large_image",
    title: MITZVAH_META.title,
    description: MITZVAH_META.description,
    images: [ogImage.url],
  },
};

export default function BarBatMitzvahRsvpPage() {
  return (
    <>
      <JsonLd
        data={graph([
          organizationNode(),
          {
            "@type": "WebPage",
            "@id": `${SITE_URL}${MITZVAH_PATH}#webpage`,
            url: absoluteUrl(MITZVAH_PATH),
            name: MITZVAH_META.title,
            description: MITZVAH_META.description,
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
            "@id": `${SITE_URL}${MITZVAH_PATH}#breadcrumb`,
          },
          serviceNode({
            name: "אישורי הגעה לבר ובת מצווה",
            description: MITZVAH_META.description,
            path: MITZVAH_PATH,
            serviceType: "אישורי הגעה לבר ובת מצווה",
          }),
          softwareNode(
            "Invistimo — אישורי הגעה לבר ובת מצווה עם הזמנה דיגיטלית, קישור אישי להורים, מעקב תשובות ואפשרות להושבה בהתאם לחבילה.",
            MITZVAH_PATH
          ),
          faqNode(MITZVAH_FAQS.map(({ q, a }) => ({ q, a }))),
        ])}
      />
      <BarBatMitzvahMarketingPage />
    </>
  );
}
