import type { Metadata } from "next";
import WeddingWebsiteMarketingPage from "@/components/marketing/wedding-website/WeddingWebsiteMarketingPage";
import {
  OG_SHARE,
  SCROLL_VIDEO,
  WW_DESCRIPTION,
  WW_FAQS,
  WW_PATH,
  WW_TITLE,
} from "@/components/marketing/wedding-website/content";
import JsonLd from "@/components/seo/JsonLd";
import {
  breadcrumbNode,
  faqNode,
  graph,
  ORGANIZATION_ID,
  organizationNode,
  serviceNode,
  videoNode,
} from "@/lib/seo/jsonld";
import { absoluteUrl, pageMetadata, SITE_NAME, SITE_URL } from "@/lib/seo/site";

const OG_IMAGE = {
  url: absoluteUrl(OG_SHARE.path),
  width: OG_SHARE.width,
  height: OG_SHARE.height,
  alt: OG_SHARE.alt,
} as const;

const baseMeta = pageMetadata({
  title: WW_TITLE,
  description: WW_DESCRIPTION,
  path: WW_PATH,
});

export const metadata: Metadata = {
  ...baseMeta,
  openGraph: {
    ...baseMeta.openGraph,
    title: WW_TITLE,
    description: WW_DESCRIPTION,
    url: absoluteUrl(WW_PATH),
    siteName: SITE_NAME,
    locale: "he_IL",
    type: "website",
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: WW_TITLE,
    description: WW_DESCRIPTION,
    images: [OG_IMAGE.url],
  },
};

const breadcrumbs = [
  { name: "בית", path: "/" },
  { name: "אתר חתונה", path: WW_PATH },
];

export default function WeddingWebsitePage() {
  return (
    <>
      <JsonLd
        data={graph([
          organizationNode(),
          breadcrumbNode(breadcrumbs),
          {
            "@type": "WebPage",
            "@id": `${absoluteUrl(WW_PATH)}#webpage`,
            url: absoluteUrl(WW_PATH),
            name: WW_TITLE,
            description: WW_DESCRIPTION,
            inLanguage: "he-IL",
            isPartOf: { "@id": `${SITE_URL}/#website` },
            about: { "@id": ORGANIZATION_ID },
            primaryImageOfPage: {
              "@type": "ImageObject",
              url: OG_IMAGE.url,
              width: OG_IMAGE.width,
              height: OG_IMAGE.height,
            },
          },
          serviceNode({
            name: "אתר חתונה אישי",
            description: WW_DESCRIPTION,
            path: WW_PATH,
            serviceType: "אתר חתונה אישי ומעוצב",
          }),
          {
            "@type": "ImageObject",
            contentUrl: OG_IMAGE.url,
            url: OG_IMAGE.url,
            width: OG_IMAGE.width,
            height: OG_IMAGE.height,
            caption: OG_IMAGE.alt,
            inLanguage: "he-IL",
          },
          videoNode({
            name: "גלילה בתוך אתר חתונה לדוגמה",
            description:
              "הקלטת מסך אמיתית של אתר חתונה דמו ב־Invistimo: כניסה, Hero, סיפור זוגי, גלריה, פרטי אירוע, מיקום וסיום.",
            contentUrl: SCROLL_VIDEO.src,
            posterUrl: SCROLL_VIDEO.poster,
            uploadDate: SCROLL_VIDEO.uploadDate,
            path: WW_PATH,
          }),
          faqNode(WW_FAQS),
        ])}
      />
      <WeddingWebsiteMarketingPage />
    </>
  );
}
