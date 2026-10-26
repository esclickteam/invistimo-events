import JsonLd from "@/components/seo/JsonLd";
import {
  breadcrumbNode,
  faqNode,
  graph,
  organizationNode,
  serviceNode,
} from "@/lib/seo/jsonld";
import { absoluteUrl, pageMetadata, SITE_URL } from "@/lib/seo/site";
import { CREDIT_GIFTS_FAQS } from "./creditGiftsFaqs";
import {
  CREDIT_GIFTS_META,
  CREDIT_GIFTS_PATH,
  PAGE_ANSWER,
  UPDATED_AT,
} from "./content";

export const metadata = {
  ...pageMetadata({
    title: CREDIT_GIFTS_META.title,
    description: CREDIT_GIFTS_META.description,
    path: CREDIT_GIFTS_PATH,
  }),
  keywords: [
    "מתנות באשראי לחתונה",
    "מתנות לחתונה באשראי",
    "מתנות דיגיטליות לחתונה",
    "מתנות לחתונה בביט",
    "מתנות לחתונה בפייבוקס",
    "קישור פייבוקס לחתונה",
    "מספר ביט להזמנה לחתונה",
    "מתנה לחתונה בהעברה בנקאית",
    "תשלום מתנה לחתונה",
    "קבלת מתנות לחתונה אונליין",
    "קישור לתשלום מתנה לחתונה",
    "מתנות באשראי לאירועים",
    "מתנות דיגיטליות לבר מצווה",
  ],
  openGraph: {
    title: CREDIT_GIFTS_META.title,
    description: CREDIT_GIFTS_META.description,
    url: absoluteUrl(CREDIT_GIFTS_PATH),
    siteName: "Invistimo",
    locale: "he_IL",
    type: "website",
    images: [
      {
        url: absoluteUrl("/marketing/credit-gifts/hero-envelope.jpg"),
        width: 1376,
        height: 768,
        alt: "מעטפה אלגנטית למתנות דיגיטליות לחתונה — Invistimo",
      },
    ],
  },
};

const breadcrumbs = [
  { name: "בית", path: "/" },
  { name: "מתנות לחתונה באשראי, bit ו־PayBox", path: CREDIT_GIFTS_PATH },
];

const faqPairs = CREDIT_GIFTS_FAQS.map((faq) => ({ q: faq.q, a: faq.a }));

export default function CreditGiftsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd
        data={graph([
          organizationNode(),
          {
            "@type": "WebPage",
            "@id": `${SITE_URL}${CREDIT_GIFTS_PATH}#webpage`,
            url: absoluteUrl(CREDIT_GIFTS_PATH),
            name: CREDIT_GIFTS_META.title,
            description: CREDIT_GIFTS_META.description,
            inLanguage: "he-IL",
            dateModified: UPDATED_AT,
            isPartOf: { "@id": `${SITE_URL}/#website` },
            about: { "@id": `${SITE_URL}/#organization` },
            speakable: {
              "@type": "SpeakableSpecification",
              cssSelector: ["h1", "#intro p", "#faq"],
            },
          },
          breadcrumbNode(breadcrumbs),
          serviceNode({
            name: "מתנות לחתונה באשראי, bit ו־PayBox",
            description: PAGE_ANSWER,
            path: CREDIT_GIFTS_PATH,
            serviceType: "מתנות דיגיטליות לאירועים",
          }),
          faqNode(faqPairs),
        ])}
      />
      {children}
    </>
  );
}
