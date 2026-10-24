import Link from "next/link";
import { HOME_FAQS } from "@/lib/seo/homeIntentMap";

/**
 * Mid/lower homepage sections for SEO · AEO · GEO.
 * Does not touch the Hero. Copy stays factual and aligned with service pages.
 */
export default function HomeSeoSections() {
  return (
    <>
      {/* למי מתאים */}
      <section
        dir="rtl"
        aria-labelledby="home-for-whom"
        className="border-y border-[#E7D9C4]/80 bg-[#FFFDF8] px-5 py-16 md:px-10 md:py-20"
      >
        <div className="mx-auto max-w-5xl">
          <p className="text-sm font-black tracking-[0.16em] text-[#A67C3D]">למי זה מתאים</p>
          <h2
            id="home-for-whom"
            className="mt-3 text-3xl font-black text-[#2A211A] md:text-4xl"
          >
            אירועים שבהם הרשימה חשובה לא פחות מהעיצוב
          </h2>
          <p className="mt-5 max-w-3xl text-lg leading-9 text-[#5C4A3A]">
            Invistimo מתאימה כשצריך קישור אישי לכל אורח, מעקב אחרי מי ענה, וחיבור להזמנה
            דיגיטלית — ולפי הצורך גם להושבה, לאתר חתונה או לניהול אירוע. לא מחליפה מערכת
            כנסים עם סשנים מקבילים.
          </p>
          <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { href: "/rsvp/chatuna", label: "חתונה" },
              { href: "/for/bar-mitzvah", label: "בר מצווה" },
              { href: "/for/bat-mitzvah", label: "בת מצווה" },
              { href: "/for/brit", label: "ברית / בריתה" },
              { href: "/for/henna", label: "חינה" },
              { href: "/for/birthday", label: "יום הולדת" },
              { href: "/for/private-party", label: "מסיבה פרטית" },
              { href: "/for/corporate", label: "אירוע חברה" },
              { href: "/rsvp", label: "כל סוגי האירועים" },
            ].map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="block rounded-2xl border border-[#E7D3B0] bg-white/70 px-5 py-4 text-base font-bold text-[#3D3127] transition hover:border-[#C9A45C] hover:bg-white"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ערוצי אישור */}
      <section
        dir="rtl"
        aria-labelledby="home-channels"
        className="bg-[#F4F0E8] px-5 py-16 md:px-10 md:py-20"
      >
        <div className="mx-auto max-w-5xl">
          <p className="text-sm font-black tracking-[0.16em] text-[#A67C3D]">ערוצי אישור</p>
          <h2
            id="home-channels"
            className="mt-3 text-3xl font-black text-[#2A211A] md:text-4xl"
          >
            וואטסאפ לאישור, SMS להשלמה, שיחות למי שלא ענה
          </h2>
          <p className="mt-5 max-w-3xl text-lg leading-9 text-[#5C4A3A]">
            בחבילת ההודעות סבבי אישור ההגעה יוצאים בוואטסאפ עם קישור אישי. SMS נכנס
            בתזכורת לפני האירוע ובהודעת תודה אחריו. חבילות שיחה (מוקלטת, אנושית או משולבת)
            מתווספות למי שנשאר פתוח — לא מחליפות את בסיס ההודעות.
          </p>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            <div>
              <h3 className="text-xl font-black text-[#2C241C]">וואטסאפ</h3>
              <p className="mt-2 text-[15px] leading-7 text-[#5C4A3A]">
                שני סבבים בחבילת ההודעות. התשובה נשמרת במערכת.
              </p>
              <Link
                href="/rsvp/whatsapp"
                className="mt-3 inline-block text-sm font-black text-[#8B642B] underline-offset-4 hover:underline"
              >
                לאישורי הגעה בוואטסאפ
              </Link>
            </div>
            <div>
              <h3 className="text-xl font-black text-[#2C241C]">SMS</h3>
              <p className="mt-2 text-[15px] leading-7 text-[#5C4A3A]">
                תזכורת לפני המועד ותודה אחריו — לא ערוץ ראשי לאיסוף מגיע/לא מגיע.
              </p>
              <Link
                href="/rsvp/sms"
                className="mt-3 inline-block text-sm font-black text-[#8B642B] underline-offset-4 hover:underline"
              >
                ל־SMS במערכת
              </Link>
            </div>
            <div>
              <h3 className="text-xl font-black text-[#2C241C]">שיחות</h3>
              <p className="mt-2 text-[15px] leading-7 text-[#5C4A3A]">
                מוקלטת, אנושית או משולבת — בעיקר למי שלא ענה בוואטסאפ.
              </p>
              <Link
                href="/rsvp/calls"
                className="mt-3 inline-block text-sm font-black text-[#8B642B] underline-offset-4 hover:underline"
              >
                לחבילות השיחות
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* תזמון STD מול RSVP */}
      <section
        dir="rtl"
        aria-labelledby="home-timing"
        className="bg-[#FFFDF8] px-5 py-16 md:px-10 md:py-20"
      >
        <div className="mx-auto max-w-5xl">
          <p className="text-sm font-black tracking-[0.16em] text-[#A67C3D]">סדר השליחה</p>
          <h2
            id="home-timing"
            className="mt-3 text-3xl font-black text-[#2A211A] md:text-4xl"
          >
            Save the Date קודם — אישורי הגעה כשהפרטים נעולים
          </h2>
          <p className="mt-5 max-w-3xl text-lg leading-9 text-[#5C4A3A]">
            Save the Date שומר את התאריך ואינו אוסף מגיע או לא מגיע. אחרי שהתאריך, השעה
            והמיקום בהזמנה מדויקים — שולחים קישור אישי ומתחילים סבבי אישור, עם מרווח לסבב
            שני לפני שהאולם צריך מספר מנות. אין במערכת «יום קבוע» לפני החתונה.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/rsvp/save-the-date"
              className="rounded-full border border-[#2C241C]/20 bg-white px-6 py-3 text-sm font-black text-[#2C241C]"
            >
              ל־Save the Date
            </Link>
            <Link
              href="/info/guides/when-to-send-rsvp"
              className="rounded-full border border-[#2C241C]/20 bg-white px-6 py-3 text-sm font-black text-[#2C241C]"
            >
              מתי שולחים אישורים
            </Link>
            <Link
              href="/info/guides/save-the-date-vs-invitation"
              className="rounded-full border border-[#2C241C]/20 bg-white px-6 py-3 text-sm font-black text-[#2C241C]"
            >
              STD מול הזמנה
            </Link>
          </div>
        </div>
      </section>

      {/* הושבה + ניהול */}
      <section
        dir="rtl"
        aria-labelledby="home-seating-mgmt"
        className="bg-[#F4F0E8] px-5 py-16 md:px-10 md:py-20"
      >
        <div className="mx-auto max-w-5xl">
          <p className="text-sm font-black tracking-[0.16em] text-[#A67C3D]">מהאישור ועד השולחן</p>
          <h2
            id="home-seating-mgmt"
            className="mt-3 text-3xl font-black text-[#2A211A] md:text-4xl"
          >
            אישורים מזינים את ההושבה ואת ניהול האירוע
          </h2>
          <p className="mt-5 max-w-3xl text-lg leading-9 text-[#5C4A3A]">
            כשיש מספיק תשובות אפשר לשבץ שולחנות אם נרכשה תוספת ההושבה, ולשלוח מספר שולחן
            בתזכורת. ניהול אירוע מרכז משימות, ספקים ותקציב לצד אותה רשימה — בלי להעתיק
            שמות בין קבצים.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/seating-explained"
              className="rounded-full bg-[#2C241C] px-6 py-3 text-sm font-black text-[#F7F1E8]"
            >
              לסידורי הושבה
            </Link>
            <Link
              href="/event-management"
              className="rounded-full border border-[#2C241C]/25 px-6 py-3 text-sm font-black text-[#2C241C]"
            >
              לניהול אירוע
            </Link>
            <Link
              href="/rsvp/guest-list"
              className="rounded-full border border-[#2C241C]/25 px-6 py-3 text-sm font-black text-[#2C241C]"
            >
              לרשימת מוזמנים
            </Link>
          </div>
        </div>
      </section>

      {/* תמחור */}
      <section
        dir="rtl"
        aria-labelledby="home-pricing"
        className="bg-[#FFFDF8] px-5 py-16 md:px-10 md:py-20"
      >
        <div className="mx-auto max-w-5xl">
          <p className="text-sm font-black tracking-[0.16em] text-[#A67C3D]">חבילות</p>
          <h2
            id="home-pricing"
            className="mt-3 text-3xl font-black text-[#2A211A] md:text-4xl"
          >
            המחיר לפי רשומות וחבילה — במחשבון
          </h2>
          <p className="mt-5 max-w-3xl text-lg leading-9 text-[#5C4A3A]">
            בוחרים מספר רשומות וסוג חבילה: הודעות, שיחות מוקלטות, שיחות אנושיות או משולבות.
            הושבה וניהול אירוע הם תוספות לפי מה שנבחר. אין כאן מחיר אחיד לכל חתונה — הסכום
            מוצג רק אחרי בחירה במחשבון.
          </p>
          <Link
            href="/pricing"
            className="mt-8 inline-flex rounded-full bg-[#C9A45C] px-8 py-3.5 text-sm font-black text-[#1C1612] transition hover:bg-[#D4B06A]"
          >
            למחשבון החבילות
          </Link>
        </div>
      </section>

      {/* FAQ — interactive details = allowed "card-like" containers */}
      <section
        dir="rtl"
        aria-labelledby="home-faq"
        className="border-t border-[#E7D9C4]/80 bg-[#F7F1E8] px-5 py-16 md:px-10 md:py-20"
      >
        <div className="mx-auto max-w-3xl">
          <p className="text-sm font-black tracking-[0.16em] text-[#A67C3D]">שאלות נפוצות</p>
          <h2
            id="home-faq"
            className="mt-3 text-3xl font-black text-[#2A211A] md:text-4xl"
          >
            תשובות קצרות לפני שפותחים אירוע
          </h2>
          <p className="mt-4 text-base leading-7 text-[#5C4A3A]">
            חמש תשובות קצרות להתמצאות. הרחבות, סוגי אירועים והושבה — ב{" "}
            <Link href="/faq" className="font-bold text-[#8B642B] underline-offset-2 hover:underline">
              עמוד השאלות הנפוצות
            </Link>
            {" "}ובעמודי השירות.
          </p>
          <div className="mt-8 space-y-3">
            {HOME_FAQS.map((faq) => (
              <details
                key={faq.q}
                className="group rounded-2xl border border-[#E6D7BC] bg-white/80 px-5 py-4 open:bg-white"
              >
                <summary className="cursor-pointer list-none text-base font-black text-[#2C241C] marker:content-none [&::-webkit-details-marker]:hidden">
                  <span className="flex items-start justify-between gap-3">
                    {faq.q}
                    <span className="text-[#C9A45C] transition group-open:rotate-45">+</span>
                  </span>
                </summary>
                <p className="mt-3 text-[15px] leading-7 text-[#5C4A3A]">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
