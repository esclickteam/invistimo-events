import JsonLd from "@/components/seo/JsonLd";
import WeddingWebsiteMarketingPage from "@/components/marketing/WeddingWebsiteMarketingPage";
import { breadcrumbNode, faqNode, graph, organizationNode, serviceNode } from "@/lib/seo/jsonld";

const faqs = [
  {
    q: "מה ההבדל בין אתר חתונה להזמנה דיגיטלית?",
    a: "ההזמנה הדיגיטלית היא המסר והקישור האישי ששולחים לאורח. אתר החתונה הוא עמוד מעוצב עם סקשנים שאליו אפשר להגיע מההזמנה או מקישור נפרד.",
  },
  {
    q: "האם אתר החתונה אוסף אישורי הגעה?",
    a: "באתר החי סקשן RSVP עובד עם קישור אורח מותאם. התשובות נשמרות במערכת האירוע. הגלריה השיווקית היא דמו בלבד.",
  },
  {
    q: "האם כל החבילות כוללות אתר חתונה?",
    a: "לא. הזמינות תלויה בהרשאה בחשבון. בדקו במחשבון ובחשבון לפני שמניחים שזה כלול.",
  },
];

export default function WeddingWebsitePage() {
  const data = graph([
    organizationNode(),
    breadcrumbNode([
      { name: "ראשי", path: "/" },
      { name: "אתר חתונה אישי", path: "/wedding-website" },
    ]),
    serviceNode({
      name: "אתר חתונה אישי",
      description:
        "אתר חתונה מעוצב ב־Invistimo עם תבניות חיות, עורך ויזואלי וחוויית אורח שמחברת הזמנה דיגיטלית ואישורי הגעה.",
      path: "/wedding-website",
      serviceType: "אתר חתונה אישי",
    }),
    faqNode(faqs),
  ]);

  return (
    <>
      <JsonLd data={data} />
      <WeddingWebsiteMarketingPage />
    </>
  );
}
