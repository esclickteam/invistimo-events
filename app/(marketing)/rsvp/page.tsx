import ServiceLinks from "@/components/marketing/ServiceLinks";
import JsonLd from "@/components/seo/JsonLd";
import RsvpMarketingPage from "./RsvpMarketingPage";
import { JOURNEY_VIDEO, RSVP_FAQS } from "./content";
import { clusterSiblings } from "@/lib/seo/clusters";
import {
  breadcrumbNode,
  faqNode,
  graph,
  organizationNode,
  serviceNode,
  videoNode,
} from "@/lib/seo/jsonld";
import { pageMetadata } from "@/lib/seo/site";
import Link from "next/link";

const TITLE = "אישורי הגעה לחתונה ולאירועים ב־WhatsApp | Invistimo";
const DESCRIPTION =
  "אישורי הגעה לחתונה ולאירועים עם הודעות WhatsApp, קישור אישי לכל אורח, מעקב תשובות בזמן אמת ואפשרות לשיחות ותזכורות. הכירו את Invistimo.";

export const metadata = pageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: "/rsvp",
});

const breadcrumbs = [
  { name: "בית", path: "/" },
  { name: "אישורי הגעה", path: "/rsvp" },
];

const faqs = RSVP_FAQS.map((item) => ({ q: item.q, a: item.a }));

export default function RsvpPage() {
  const siblings = clusterSiblings("/rsvp");

  return (
    <>
      <JsonLd
        data={graph([
          organizationNode(),
          breadcrumbNode(breadcrumbs),
          serviceNode({
            name: "אישורי הגעה לחתונה ולאירועים",
            description: DESCRIPTION,
            path: "/rsvp",
            serviceType: "אישורי הגעה",
          }),
          videoNode({
            name: JOURNEY_VIDEO.title,
            description: JOURNEY_VIDEO.description,
            contentUrl: JOURNEY_VIDEO.src,
            posterUrl: JOURNEY_VIDEO.poster,
            uploadDate: JOURNEY_VIDEO.uploadDate,
            path: "/rsvp",
          }),
          faqNode(faqs),
        ])}
      />
      <RsvpMarketingPage />
      <section dir="rtl" className="bg-[#FBF6EE] px-6 pb-10 text-[#3F3025]">
        <div className="mx-auto max-w-3xl space-y-4 leading-8">
          <h2 className="text-2xl font-black text-[#35281F]">עמודים קשורים לפי סוג האירוע והערוץ</h2>
          <p>
            מחפשים התמקדות בחתונה? עברו ל
            <Link href="/rsvp/chatuna" className="mx-1 font-bold text-[#8A642E] underline-offset-4 hover:underline">
              אישורי הגעה לחתונה
            </Link>
            . להתמקדות בערוץ הוואטסאפ —
            <Link href="/rsvp/whatsapp" className="mx-1 font-bold text-[#8A642E] underline-offset-4 hover:underline">
              אישורי הגעה ב־WhatsApp
            </Link>
            . לשאלה{" "}
            <Link
              href="/info/guides/whatsapp-vs-sms-rsvp"
              className="font-bold text-[#8A642E] underline-offset-4 hover:underline"
            >
              WhatsApp או SMS — איך כדאי לשלוח אישורי הגעה?
            </Link>
          </p>
          {siblings.length ? (
            <ul className="flex flex-wrap gap-3 pt-2">
              {siblings.map((link) => (
                <li key={link.path}>
                  <Link
                    href={link.path}
                    className="inline-flex min-h-11 items-center rounded-full border border-[#E6D2AA] bg-white px-4 py-2 text-sm font-bold text-[#5E4735]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </section>
      <ServiceLinks current="/rsvp" />
    </>
  );
}
