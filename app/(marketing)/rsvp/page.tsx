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

const TITLE = "מערכת אישורי הגעה לאירועים | Invistimo";
const DESCRIPTION =
  "מערכת אישורי הגעה לאירועים וניהול מוזמנים: קישור אישי, מעקב תשובות ושיחות לפי החבילה. לחתונה יש עמוד נפרד, ומשם ממשיכים להושבה.";

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
            name: "מערכת אישורי הגעה לאירועים",
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
            העמוד הזה מסביר את מודל אישורי ההגעה הכללי. להתמקדות בחתונה (אולם, מנות ותזמון) עברו ל
            <Link href="/rsvp/chatuna" className="mx-1 font-bold text-[#8A642E] underline-offset-4 hover:underline">
              אישורי הגעה לחתונה
            </Link>
            ; לחינה ולמשפחה קרובה —
            <Link href="/rsvp/hina" className="mx-1 font-bold text-[#8A642E] underline-offset-4 hover:underline">
              אישורי הגעה לחינה
            </Link>
            ; לבר או בת מצווה עם אישור דרך ההורים —
            <Link
              href="/rsvp/bar-bat-mitzvah"
              className="mx-1 font-bold text-[#8A642E] underline-offset-4 hover:underline"
            >
              בר ובת מצווה
            </Link>
            ; לברית או בריתה בזמן קצר —
            <Link href="/rsvp/brit-brita" className="mx-1 font-bold text-[#8A642E] underline-offset-4 hover:underline">
              ברית ובריתה
            </Link>
            . לערוץ הוואטסאפ —{" "}
            <Link href="/rsvp/whatsapp" className="font-bold text-[#8A642E] underline-offset-4 hover:underline">
              אישורי הגעה בוואטסאפ
            </Link>
            . אחרי שיש תשובות ממשיכים{" "}
            <Link href="/seating-explained" className="font-bold text-[#8A642E] underline-offset-4 hover:underline">
              לסידורי הושבה
            </Link>{" "}
            <Link
              href="/info/guides/wedding-seating-arrangements"
              className="font-bold text-[#8A642E] underline-offset-4 hover:underline"
            >
              ולמדריך סידורי ההושבה
            </Link>
            . המחירים{" "}
            <Link href="/pricing" className="font-bold text-[#8A642E] underline-offset-4 hover:underline">
              במחשבון החבילות
            </Link>
            , ואפשר קודם{" "}
            <Link href="/try" className="font-bold text-[#8A642E] underline-offset-4 hover:underline">
              לראות הדגמה
            </Link>
            . לבחירת חברה והשוואת שירותים —
            <Link
              href="/info/guides/how-to-choose-rsvp-company"
              className="font-bold text-[#8A642E] underline-offset-4 hover:underline"
            >
              איך בוחרים חברת אישורי הגעה
            </Link>
            , ולשאלה{" "}
            <Link
              href="/info/guides/whatsapp-vs-sms-rsvp"
              className="font-bold text-[#8A642E] underline-offset-4 hover:underline"
            >
              WhatsApp או SMS
            </Link>
            .
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
