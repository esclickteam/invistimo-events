import Image from "next/image";
import Link from "next/link";
import PackageComparison from "@/app/pricing/components/PackageComparison";
import PackageQuiz from "@/app/pricing/components/PackageQuiz";
import ProcessTimeline from "@/app/pricing/components/ProcessTimeline";
import RevealOnScroll from "@/app/pricing/components/RevealOnScroll";
import {
  EventManageIcon,
  HumanDeskIcon,
  InvitationIcon,
  LiveServiceIcon,
  RecordedCallIcon,
  ReminderIcon,
  SeatingIcon,
  SmsIcon,
  WhatsAppIcon,
} from "@/app/pricing/components/PricingIcons";
import { PRICING_PAGE_FAQS } from "@/components/marketing/pricingFaqs";
import TrackedCtaLink from "@/components/seo/TrackedCtaLink";
import { EVENT_TYPES, EVENT_TYPE_SECTION } from "@/lib/seo/eventTypes";
import { formatIls, formatRate, packageRate, servicePrice } from "@/lib/pricing/packageQuote";

export { PRICING_PAGE_FAQS };

const ctaClass =
  "inline-flex min-h-12 items-center justify-center rounded-full bg-gradient-to-l from-[#3A2B22] via-[#5A4333] to-[#2C211B] px-8 py-3 text-base font-black text-white shadow-[0_18px_40px_rgba(58,39,20,0.22)] transition hover:-translate-y-0.5";
const secondaryClass =
  "inline-flex min-h-12 items-center justify-center rounded-full border border-[#DCC7A6] bg-[#FBF6EE] px-8 py-3 text-base font-black !text-[#2C241C] shadow-[0_12px_30px_rgba(91,63,32,0.08)] transition hover:bg-white";

const SERVICE_ICONS = [
  { title: "הזמנות דיגיטליות", Icon: InvitationIcon, href: "/invitations/chatuna" },
  { title: "WhatsApp", Icon: WhatsAppIcon, href: "/rsvp/whatsapp" },
  { title: "SMS ותזכורות", Icon: SmsIcon, href: "/rsvp" },
  { title: "שיחות מוקלטות", Icon: RecordedCallIcon, href: "/rsvp/calls" },
  { title: "מוקד אנושי", Icon: HumanDeskIcon, href: "/rsvp/calls" },
  { title: "סידורי הושבה", Icon: SeatingIcon, href: "/seating-explained" },
  { title: "ניהול אירוע", Icon: EventManageIcon, href: "/event-management" },
  { title: "תזכורות", Icon: ReminderIcon, href: "/info/guides/when-to-send-rsvp" },
];

const WHY = [
  "כמה מסלולי שירות לבחירה — הודעות ושיחות.",
  "ניהול רשימת מוזמנים במקום אחד.",
  "אפשרויות הודעות ושיחות לפי חבילה.",
  "קישורים אישיים לאורחים.",
  "דשבורד למעקב אחר תשובות.",
  "סידורי הושבה דיגיטליים כתוספת.",
  "שירותים משלימים לאירוע לפי הצורך.",
  "אפשרות להכיר את המערכת בדמו.",
];

const EXTRA_SERVICES = [
  {
    title: "Save the Date",
    text: "הודעת שמירת תאריך לפני סבבי האישור. זמינות לפי הגדרות החשבון — לא שורת מחיר קבועה במחשבון הבסיס.",
    href: "/rsvp/save-the-date",
    cta: "לפרטי Save the Date",
    price: "לפי הגדרות / ייעוץ",
  },
  {
    title: "הזמנות דיגיטליות",
    text: "הזמנה דיגיטלית כלולה בחבילות אישורי ההגעה. לעמוד השירות המלא על הזמנות לחתונה.",
    href: "/invitations/chatuna",
    cta: "להזמנות דיגיטליות",
    price: "כלול בחבילות RSVP",
  },
  {
    title: "Wedding Challenges",
    text: "מוצר נפרד ליום האירוע — לא חלק מחבילות אישורי ההגעה במחשבון. הרכישה מתבצעת כשירות נפרד בתיאום.",
    href: "/contact",
    cta: "לבירור רכישה",
    price: "רכישה נפרדת",
  },
  {
    title: "ניהול אירוע",
    text: "מערכת עצמאית זמינה כתוספת במחשבון; ליווי מורחב מתואם בעמוד השירות.",
    href: "/event-management",
    cta: "לניהול אירוע",
    price: "תוספת / הצעת מחיר",
  },
  {
    title: "שירותי LIVE",
    text: "שירותים ליום האירוע מחוץ למחשבון חבילות האישורים — בתיאום מול הצוות.",
    href: "/contact",
    cta: "לייעוץ LIVE",
    price: "הצעת מחיר / מוצר נפרד",
  },
];

const SAMPLE_RECORDS = [100, 200, 350, 500];

export default function PricingMarketingExtras() {
  return (
    <div dir="rtl" className="pricing-page bg-[#FBF6EE] pb-24 text-[#3F3025] md:pb-10">
      <RevealOnScroll>
        <section className="px-5 py-12 md:px-8 md:py-16">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-center text-3xl font-black text-[#35281F] md:text-4xl">
              מה כלול בכל חבילה?
            </h2>
            <p className="mx-auto mt-3 max-w-3xl text-center leading-8 text-[#5C4A3A]">
              השוואה לפי התכולה בפועל במחשבון. יכולת שקיימת במערכת אינה מוצגת ככלולה אוטומטית בכל חבילה.
            </p>
            <div className="mt-8">
              <PackageComparison />
            </div>
          </div>
        </section>
      </RevealOnScroll>

      <RevealOnScroll>
        <section className="bg-[#FFFDF8]/70 px-5 py-12 md:px-8 md:py-16">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-3xl font-black text-[#35281F] md:text-4xl">
              לא בטוחים איזו חבילה לבחור?
            </h2>
            <p className="mt-3 max-w-2xl leading-8 text-[#5C4A3A]">
              שאלון קצר לפי הצרכים שלכם. ההמלצה מבוססת על תכולת החבילות — לא על החבילה היקרה ביותר.
            </p>
            <div className="mt-8">
              <PackageQuiz />
            </div>
          </div>
        </section>
      </RevealOnScroll>

      <RevealOnScroll>
        <section className="px-5 py-12 md:px-8 md:py-16">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-3xl font-black text-[#35281F] md:text-4xl">
              אישורי הגעה בהודעות, שיחות מוקלטות או מוקד אנושי?
            </h2>
            <p className="mt-3 max-w-3xl leading-8 text-[#5C4A3A]">
              שלושה סוגי שירות — בלי להציג שיחות מוקלטות כנחותות או מוקד אנושי כהכרחי. מה כלול בכל חבילה מופיע במחשבון ובהשוואה.
            </p>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {[
                {
                  Icon: WhatsAppIcon,
                  title: "הודעות דיגיטליות",
                  text: "מתאימות לאורחים שמעדיפים לענות בטלפון ובקישור האישי. כלולות בכל החבילות כבסיס של שני סבבי וואטסאפ.",
                },
                {
                  Icon: RecordedCallIcon,
                  title: "שיחות מוקלטות",
                  text: "מענה טלפוני מובנה לפי האפשרויות שהוגדרו. כלולות בחבילת Voice (3 סבבים) וב־Hybrid (2 סבבים).",
                },
                {
                  Icon: HumanDeskIcon,
                  title: "מוקד אנושי",
                  text: "שיחה עם נציג לטיפול במקרים מורכבים. כלול ב־Personal (3 סבבים) וב־Hybrid (סבב אחד).",
                },
              ].map((card) => (
                <article
                  key={card.title}
                  className="rounded-[28px] border border-[#E6D2AA] bg-gradient-to-l from-[#FFF8EA] via-[#FFFDF7] to-[#F7E8CA] p-6"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#E5D1B7] bg-white text-[#A86F2B]">
                    <card.Icon size={22} />
                  </span>
                  <h3 className="mt-4 text-xl font-black text-[#35281F]">{card.title}</h3>
                  <p className="mt-3 leading-7 text-[#5C4A3A]">{card.text}</p>
                </article>
              ))}
            </div>
            <p className="mt-5 text-sm leading-7 text-[#7A6042]">
              פירוט נוסף:{" "}
              <Link href="/rsvp/calls" className="font-bold text-[#8A642E] underline-offset-4 hover:underline">
                עמוד שיחות ואישורי הגעה בטלפון
              </Link>
              .
            </p>
          </div>
        </section>
      </RevealOnScroll>

      <RevealOnScroll>
        <section className="bg-[#FFFDF8]/70 px-5 py-12 md:px-8 md:py-16">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-3xl font-black text-[#35281F] md:text-4xl">
              רוצים להוסיף עוד משהו לאירוע?
            </h2>
            <p className="mt-3 max-w-3xl leading-8 text-[#5C4A3A]">
              תוספות שמסומנות במחשבון מתווספות לסכום פעם אחת — לא גובים שוב על שירות שכבר כלול בחבילה.
            </p>
            <ul className="mt-8 grid gap-4 md:grid-cols-2">
              {[
                {
                  title: "הושבה דיגיטלית",
                  text: "מפת שולחנות ושיבוץ לפי אישורי ההגעה. מתאים למי שרוצה לחבר תשובות למפה.",
                  price: "100 ₪ בכל החבילות",
                  included: "לא כלול אוטומטית",
                },
                {
                  title: "מערכת עצמאית לניהול ומעקב אירוע",
                  text: "כלי ניהול מעבר לאישורים. מתאים למי שרוצה ריכוז משימות ומעקב.",
                  price: "הודעות 200 ₪ · שיחות 150 ₪",
                  included: "תוספת במחשבון",
                },
                {
                  title: "עיצוב הזמנה בהתאמה אישית",
                  text: "מעבר לתבניות הקיימות. מתאים למי שצריך עיצוב ייעודי.",
                  price: "הודעות 200 ₪ · שיחות 150 ₪",
                  included: "תוספת במחשבון",
                },
                {
                  title: "מתנות באשראי",
                  text: "דרך ספק חיצוני — בשקיפות מלאה. התשלום מול הספק אינו מחליף את חבילת Invistimo.",
                  price: "הודעות 150 ₪ · שיחות 100 ₪",
                  included: "ספק חיצוני",
                },
              ].map((item) => (
                <li key={item.title} className="rounded-[28px] border border-[#E6D2AA] bg-white p-6">
                  <h3 className="text-xl font-black text-[#35281F]">{item.title}</h3>
                  <p className="mt-3 leading-7 text-[#5C4A3A]">{item.text}</p>
                  <p className="mt-3 text-sm font-black text-[#8A5A25]">{item.price}</p>
                  <p className="mt-1 text-xs font-bold text-[#9C866D]">{item.included}</p>
                </li>
              ))}
            </ul>
            <p className="mt-5 text-sm leading-7 text-[#7A6042]">
              <Link href="#pricing-calculator" className="font-bold text-[#8A642E] underline-offset-4 hover:underline">
                חזרה למחשבון לסימון תוספות
              </Link>
            </p>
          </div>
        </section>
      </RevealOnScroll>

      <RevealOnScroll>
        <section className="px-5 py-12 md:px-8 md:py-16">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-3xl font-black text-[#35281F] md:text-4xl">
              מהרכישה ועד לאירוע — כך זה עובד
            </h2>
            <p className="mt-3 leading-8 text-[#5C4A3A]">
              בוחרים חבילה, פונים לצוות, ומשלימים את ההזמנה מול נציג. אין תשלום עצמאי באתר.
            </p>
            <div className="mt-8">
              <ProcessTimeline />
            </div>
          </div>
        </section>
      </RevealOnScroll>

      <RevealOnScroll>
        <section className="bg-[#FFFDF8]/70 px-5 py-12 md:px-8 md:py-16">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-3xl font-black text-[#35281F] md:text-4xl">
              יותר מאישורי הגעה — סביבת ניהול לאירוע שלכם
            </h2>
            <p className="mt-4 max-w-3xl leading-8 text-[#5C4A3A]">
              Invistimo מאפשרת לנהל הזמנות דיגיטליות, רשימות מוזמנים, אישורי הגעה וסידורי הושבה במקום אחד.
              במקום לנהל תשובות בקבוצות הודעות ובגיליונות נפרדים, אפשר לרכז את הנתונים, לעקוב אחר התקדמות
              אישורי ההגעה ולתכנן את ההושבה באמצעות כלים ייעודיים.
            </p>
            <div className="mt-8 grid items-center gap-8 lg:grid-cols-2">
              <ul className="space-y-3">
                {WHY.map((item) => (
                  <li
                    key={item}
                    className="rounded-2xl border border-[#E6D2AA] bg-white px-4 py-3 text-sm font-bold leading-6 text-[#5C4A3A]"
                  >
                    {item}
                  </li>
                ))}
              </ul>
              <div className="overflow-hidden rounded-[28px] border border-[#E5D3B8] bg-white p-2 shadow-[0_18px_40px_rgba(91,64,35,0.1)]">
                <Image
                  src="/images/rsvp/chatuna/dashboard-seating.jpg"
                  alt="צילום מסך אמיתי של מפת הושבה במערכת Invistimo"
                  width={1200}
                  height={800}
                  className="h-auto w-full rounded-[22px] object-cover"
                />
              </div>
            </div>
            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {SERVICE_ICONS.map(({ title, Icon, href }) => (
                <Link
                  key={title}
                  href={href}
                  className="flex flex-col items-center gap-2 rounded-2xl border border-[#E6D2AA] bg-white px-3 py-4 text-center transition hover:border-[#D4B06E]"
                >
                  <span className="text-[#A86F2B]">
                    <Icon size={22} />
                  </span>
                  <span className="text-xs font-black text-[#35281F]">{title}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </RevealOnScroll>

      <RevealOnScroll>
        <section className="px-5 py-12 md:px-8 md:py-16">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-3xl font-black text-[#35281F] md:text-4xl">
              מחירים לשירותים נוספים
            </h2>
            <p className="mt-3 max-w-3xl leading-8 text-[#5C4A3A]">
              שירותים שאינם חלק ממחשבון ארבע חבילות אישורי ההגעה — או שמוצעים כתוספת/מוצר נפרד.
            </p>
            <ul className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {EXTRA_SERVICES.map((service) => (
                <li key={service.title} className="flex flex-col rounded-[28px] border border-[#E6D2AA] bg-white p-6">
                  <div className="flex items-center gap-2 text-[#A86F2B]">
                    <LiveServiceIcon size={20} />
                    <h3 className="text-xl font-black text-[#35281F]">{service.title}</h3>
                  </div>
                  <p className="mt-3 flex-1 leading-7 text-[#5C4A3A]">{service.text}</p>
                  <p className="mt-3 text-sm font-black text-[#8A5A25]">{service.price}</p>
                  <TrackedCtaLink
                    href={service.href}
                    className={`${secondaryClass} mt-5 !min-h-11 text-sm`}
                    location={`extra_service:/pricing:${service.title}`}
                  >
                    {service.cta}
                  </TrackedCtaLink>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </RevealOnScroll>

      <RevealOnScroll>
        <section className="bg-[#FFFDF8]/70 px-5 py-12 md:px-8">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-3xl font-black text-[#35281F]">דוגמאות מספריות מהמחשבון</h2>
            <p className="mt-3 leading-8 text-[#5C4A3A]">
              המחירים למטה מחושבים מאותה לוגיקת תמחור של המחשבון (ללא תוספות). הם משתנים מיד כשמשנים
              רשומות או תוספות למעלה.
            </p>
            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[36rem] border-collapse text-sm">
                <thead>
                  <tr className="bg-[#F7F1E8]">
                    <th className="border border-[#E6D2AA] px-3 py-2 text-right">רשומות</th>
                    <th className="border border-[#E6D2AA] px-3 py-2 text-right">הודעות</th>
                    <th className="border border-[#E6D2AA] px-3 py-2 text-right">מוקלטות</th>
                    <th className="border border-[#E6D2AA] px-3 py-2 text-right">אנושיות</th>
                    <th className="border border-[#E6D2AA] px-3 py-2 text-right">משולבות</th>
                  </tr>
                </thead>
                <tbody>
                  {SAMPLE_RECORDS.map((records) => (
                    <tr key={records}>
                      <td className="border border-[#E6D2AA] px-3 py-2 font-black tabular-nums">
                        {records.toLocaleString("he-IL")}
                      </td>
                      {(
                        ["messages", "voice", "personal", "hybrid"] as const
                      ).map((id) => (
                        <td key={id} className="border border-[#E6D2AA] px-3 py-2 tabular-nums">
                          <span className="block font-black">{formatIls(servicePrice(id, records))}</span>
                          <span className="text-xs text-[#9C866D]">{formatRate(packageRate(id, records))} / רשומה</span>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </RevealOnScroll>

      <RevealOnScroll>
        <section className="px-5 py-12 md:px-8 md:py-16">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-3xl font-black text-[#35281F] md:text-4xl">{EVENT_TYPE_SECTION.heading}</h2>
            <p className="mt-4 max-w-3xl leading-8 text-[#5C4A3A]">
              אותו מחשבון משרת אירועים מסוגים שונים. ההבדל הוא בגודל הרשימה ובתוספות — לא בקטגוריית מחיר
              נפרדת לפי סוג אירוע.
            </p>
            <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {EVENT_TYPES.map((item) => (
                <li key={item.label} className="rounded-[24px] border border-[#E6D2AA] bg-white/90 p-5">
                  <h3 className="text-lg font-black text-[#35281F]">{item.label}</h3>
                  <p className="mt-2 leading-7 text-[#5C4A3A]">{item.blurb}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </RevealOnScroll>

      <RevealOnScroll>
        <section className="bg-[#FFFDF8]/70 px-5 py-12 md:px-8">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-3xl font-black text-[#35281F]">
              כל מה שחשוב לדעת לפני שבוחרים חבילה
            </h2>
            <div className="mt-6 space-y-3">
              {PRICING_PAGE_FAQS.map((faq) => (
                <details key={faq.q} className="rounded-[24px] border border-[#E6D2AA] bg-white px-5 py-4">
                  <summary className="cursor-pointer list-none">
                    <h3 className="text-lg font-black text-[#35281F]">{faq.q}</h3>
                  </summary>
                  <p className="mt-3 leading-8 text-[#5C4A3A]">{faq.a}</p>
                </details>
              ))}
            </div>
            <p className="mt-6 leading-8 text-[#5C4A3A]">
              מדריכים:{" "}
              <Link href="/info/guides/cost-rsvp-wedding" className="font-bold text-[#8A642E] underline-offset-4 hover:underline">
                חישוב מחיר
              </Link>
              {" · "}
              <Link href="/info/guides/guest-list" className="font-bold text-[#8A642E] underline-offset-4 hover:underline">
                רשימת מוזמנים
              </Link>
              {" · "}
              <Link href="/info/guides/guests-who-dont-reply" className="font-bold text-[#8A642E] underline-offset-4 hover:underline">
                אורחים שלא עונים
              </Link>
              {" · "}
              <Link href="/info/guides/seating-plan" className="font-bold text-[#8A642E] underline-offset-4 hover:underline">
                סידורי הושבה
              </Link>
              {" · "}
              <Link href="/info/guides" className="font-bold text-[#8A642E] underline-offset-4 hover:underline">
                מרכז המדריכים
              </Link>
              {" · "}
              <Link href="/terms" className="font-bold text-[#8A642E] underline-offset-4 hover:underline">
                תנאים ומדיניות ביטולים
              </Link>
              {" · "}
              <Link href="/faq" className="font-bold text-[#8A642E] underline-offset-4 hover:underline">
                שאלות כלליות
              </Link>
              .
            </p>
          </div>
        </section>
      </RevealOnScroll>

      <section className="px-5 pb-16 md:px-8">
        <div className="mx-auto max-w-4xl overflow-hidden rounded-[32px] border border-[#E3C990] bg-gradient-to-l from-[#FFF8EA] via-white to-[#F7E8CA] p-7 shadow-[0_24px_60px_rgba(95,68,34,0.1)] md:p-10">
          <p className="text-sm font-black tracking-wide text-[#A67C3D]">הצטרפות</p>
          <h2 className="mt-2 text-3xl font-black text-[#35281F]">מוכנים לבחור חבילה?</h2>
          <p className="mt-3 max-w-2xl leading-8 text-[#5C4A3A]">
            חזרו למחשבון, בחרו כמות ותוספות, ושלחו בקשה בוואטסאפ. אם צריך התאמה לפני בחירה — דברו איתנו
            או התנסו בדמו.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <TrackedCtaLink href="#pricing-calculator" className={ctaClass} location="footer_cta:/pricing">
              חזרה למחשבון
            </TrackedCtaLink>
            <TrackedCtaLink href="/contact" className={secondaryClass} location="footer_cta:/pricing">
              יצירת קשר
            </TrackedCtaLink>
            <TrackedCtaLink href="/try" className={secondaryClass} location="footer_cta:/pricing">
              דמו
            </TrackedCtaLink>
            <TrackedCtaLink href="/rsvp" className={secondaryClass} location="footer_cta:/pricing">
              לעמוד אישורי הגעה
            </TrackedCtaLink>
          </div>
        </div>
      </section>
    </div>
  );
}
