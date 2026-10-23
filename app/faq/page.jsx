import FAQAccordion from "../components/FAQAccordion";
import AnswerFirst from "@/components/seo/AnswerFirst";
import ServiceLinks from "@/components/marketing/ServiceLinks";
import JsonLd from "@/components/seo/JsonLd";
import { breadcrumbNode, faqNode, graph, organizationNode } from "@/lib/seo/jsonld";
import { allFaqItems } from "@/lib/seo/publicFaq";
import { findCoreRoute, pageMetadata } from "@/lib/seo/site";

const route = findCoreRoute("/faq");
if (!route) throw new Error("Missing SEO route /faq");

export const metadata = pageMetadata({
  title: route.title,
  description: route.description,
  path: route.path,
});

export default function FAQPage() {
  return (
    <>
    <JsonLd
      data={graph([
        organizationNode(),
        breadcrumbNode([
          { name: "בית", path: "/" },
          { name: "שאלות ותשובות", path: "/faq" },
        ]),
        faqNode(allFaqItems()),
      ])}
    />
    <AnswerFirst path="/faq" />
    <div className="max-w-4xl mx-auto px-6 py-24">
      {/* כותרת ראשית */}
      <h1 className="text-4xl font-bold text-center mb-12">
        שאלות ותשובות
      </h1>

      {/* פתיח */}
      <section className="relative pr-6 mb-14">
        <span className="absolute right-0 top-2 h-full w-[2px] bg-[#eadfce]" />
        <p className="text-lg leading-relaxed">
          ריכזנו עבורכם את השאלות הנפוצות ביותר בנוגע לשימוש במערכת{" "}
          <strong>Invistimo</strong>, לרבות תהליכי עבודה, יצירת אירועים,
          ניהול הזמנות, אישורי הגעה, חבילות, תשלומים ופיצ’רים מתקדמים.
        </p>
        <p className="mt-3 text-[#7b6754]">
          לא מצאתם תשובה לשאלה שלכם? ניתן לפנות אלינו דרך עמוד{" "}
          <a
            href="/contact"
            className="underline font-semibold hover:text-[#5c4632]"
          >
            יצירת קשר
          </a>{" "}
          ונשמח לעזור.
        </p>
      </section>

      {/* אקורדיון שאלות */}
      <FAQAccordion />
    </div>
    <ServiceLinks current="/faq" />
    </>
  );
}
