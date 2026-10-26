import type { Metadata } from "next";
import JsonLd from "@/components/seo/JsonLd";
import {
  breadcrumbNode,
  faqNode,
  graph,
  organizationNode,
  serviceNode,
  videoNode,
} from "@/lib/seo/jsonld";
import { absoluteUrl, pageMetadata, SITE_URL } from "@/lib/seo/site";
import WeddingWebsiteMarketingPage from "./WeddingWebsiteMarketingPage";
import { WEDDING_WEBSITE_FAQS } from "./weddingFaqs";
import { WW_MEDIA, WW_META, WW_PATH } from "./content";

const breadcrumbs = [
  { name: "ראשי", path: "/" },
  { name: "אתר חתונה", path: WW_PATH },
];

const ogImage = {
  url: absoluteUrl(WW_MEDIA.og),
  width: 1200,
  height: 800,
  alt: "אתר חתונה אישי ומעוצב | Invistimo",
};

export const metadata: Metadata = {
  ...pageMetadata({
    title: WW_META.title,
    description: WW_META.description,
    path: WW_PATH,
  }),
  openGraph: {
    title: WW_META.title,
    description: WW_META.description,
    url: absoluteUrl(WW_PATH),
    siteName: "Invistimo",
    locale: "he_IL",
    type: "website",
    images: [ogImage],
  },
  twitter: {
    card: "summary_large_image",
    title: WW_META.title,
    description: WW_META.description,
    images: [ogImage.url],
  },
};

export default function WeddingWebsitePage() {
  return (
    <>
      <JsonLd
        data={graph([
          organizationNode(),
          {
            "@type": "WebPage",
            "@id": `${SITE_URL}${WW_PATH}#webpage`,
            url: absoluteUrl(WW_PATH),
            name: WW_META.title,
            description: WW_META.description,
            inLanguage: "he-IL",
            isPartOf: { "@id": `${SITE_URL}/#website` },
            about: { "@id": `${SITE_URL}/#organization` },
            primaryImageOfPage: {
              "@type": "ImageObject",
              url: absoluteUrl(WW_MEDIA.og),
            },
          },
          {
            ...breadcrumbNode(breadcrumbs),
            "@id": `${SITE_URL}${WW_PATH}#breadcrumb`,
          },
          serviceNode({
            name: "אתר חתונה אישי",
            description: WW_META.description,
            path: WW_PATH,
            serviceType: "אתר חתונה",
          }),
          videoNode({
            name: WW_MEDIA.video.title,
            description: WW_MEDIA.video.description,
            contentUrl: WW_MEDIA.video.src,
            posterUrl: WW_MEDIA.video.poster,
            uploadDate: WW_MEDIA.video.uploadDate,
            path: WW_PATH,
          }),
          faqNode(WEDDING_WEBSITE_FAQS.map(({ q, a }) => ({ q, a }))),
        ])}
      />
      <WeddingWebsiteMarketingPage />
    </>
  );
}
