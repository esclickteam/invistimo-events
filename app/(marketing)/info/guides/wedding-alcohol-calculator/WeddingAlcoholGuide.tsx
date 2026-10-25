"use client";

import React, { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import TrackedCtaLink from "@/components/seo/TrackedCtaLink";
import AlcoholCalculator from "./AlcoholCalculator";
import { ALCOHOL_GUIDE_FAQS } from "./guideFaqs";

const PATH = "/info/guides/wedding-alcohol-calculator";
const UPDATED = "25 באוקטובר 2026";

const ctaPrimary =
  "inline-flex min-h-12 items-center justify-center rounded-full bg-gradient-to-l from-[#3A2B22] via-[#5A4333] to-[#2C211B] px-8 py-3.5 text-base font-black text-white shadow-[0_18px_40px_rgba(58,39,20,0.22)] transition hover:-translate-y-0.5";
const ctaSecondary =
  "inline-flex min-h-12 items-center justify-center rounded-full border border-[#DCC7A6] bg-white/85 px-8 py-3.5 text-base font-black text-[#5E4735] backdrop-blur transition hover:bg-white";

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm font-black tracking-[0.14em] text-[#7A5530]">{children}</p>
  );
}

const CHECKLIST = [
  "ביררנו מה האולם מספק",
  "בדקנו אם מותר להביא אלכוהול מבחוץ",
  "בדקנו דמי מזיגה",
  "בדקנו מה כלול בשירות הבר",
  "ביררנו מדיניות החזרת בקבוקים סגורים",
  "בדקנו דרישות כשרות",
  "בדקנו הובלה וקירור",
  "תכננו מספיק מים ומשקאות ללא אלכוהול",
  "בדקנו את מספר האורחים הצפוי",
  "קיבלנו הצעות מחיר כתובות",
] as const;

const CORKAGE_CHECKS = [
  "האם מותר להביא אלכוהול מבחוץ?",
  "האם קיימים דמי מזיגה?",
  "כיצד הם מחושבים?",
  "האם המחיר כולל ברמנים?",
  "האם האולם מספק קרח וכוסות?",
  "האם האולם מאחסן ומקרר את הבקבוקים?",
  "האם יש מגבלות על מותגים או סוגי משקאות?",
  "האם נדרש אישור כשרות או עמידה בתנאי המקום?",
  "מי אחראי על בקבוקים שנשארים בסיום האירוע?",
  "האם יש חיוב על פתיחת בקבוקים שלא נוצלו?",
] as const;

const RETURN_CHECKS = [
  "האם ניתן להחזיר בקבוקים שלא נפתחו?",
  "תוך כמה זמן מהאירוע?",
  "האם נדרשת חשבונית?",
  "האם האריזה והמדבקות חייבות להיות שלמות?",
  "האם יש מותגים או מוצרים שלא ניתן להחזיר?",
  "האם מקבלים החזר כספי או זיכוי?",
  "האם יש עמלת החזרה?",
  "מי אחראי על הובלת הבקבוקים בחזרה?",
] as const;

const SHORT_GUIDES = [
  {
    h: "האם צריך לקנות אלכוהול לכל המוזמנים?",
    p: "לא. יש להתבסס על מספר המשתתפים הצפוי ועל האורחים בגיל שתייה חוקי שמתכננים לצרוך אלכוהול.",
  },
  {
    h: "האם עדיף מגוון גדול של מותגים?",
    p: "לא בהכרח. מגוון גדול מדי עלול ליצור עודפי מלאי. חשוב להתאים את הבחירה לקהל ולתפריט.",
  },
  {
    h: "האם כדאי לקנות בקבוקים יקרים?",
    p: "הבחירה תלויה בתקציב ובהעדפות. אין צורך להניח שמותגים יקרים ישפרו את חוויית כל האורחים.",
  },
  {
    h: "מה חשוב לגבי משקאות ללא אלכוהול?",
    p: "מים, סודה, משקאות קלים ומוקטיילים הם חלק חשוב מתכנון הבר, גם עבור אורחים שלא שותים אלכוהול.",
  },
  {
    h: "מי אחראי על האלכוהול בסוף האירוע?",
    p: "יש לתאם מראש מי סופר, אוסף ומחזיר בקבוקים סגורים, בהתאם להסכם עם האולם והספק.",
  },
] as const;

export default function WeddingAlcoholGuide() {
  const reduce = useReducedMotion();

  return (
    <article dir="rtl" className="min-h-screen overflow-hidden bg-[#FBF6EE] text-[#3F3025]">
      {/* Hero */}
      <header className="relative isolate overflow-hidden">
        <div
          className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_12%,rgba(201,164,92,0.22),transparent_42%),radial-gradient(circle_at_88%_8%,rgba(232,214,180,0.55),transparent_40%),linear-gradient(180deg,#FFFDF8_0%,#F7EFE0_48%,#FBF6EE_100%)]"
          aria-hidden
        />
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 pb-14 pt-6 md:gap-12 md:px-8 md:pb-16 md:pt-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <p className="text-sm font-black tracking-[0.12em] text-[#7A5530]">מדריך · Invistimo</p>
            <p className="mt-2 text-xs font-semibold text-[#8A6B45]">עודכן: {UPDATED}</p>
            <h1 className="mt-3 max-w-2xl text-[1.85rem] font-black leading-[1.18] tracking-[-0.03em] text-[#2C241C] md:text-[2.65rem]">
              כמה אלכוהול צריך לקנות לחתונה?
            </h1>
            <p className="mt-5 max-w-xl text-xl font-bold leading-9 text-[#5E4735]">
              מתכננים את הבר, בוחרים את המשקאות ומשווים עלויות — לפני שמוציאים כסף.
            </p>
            <div className="mt-5 max-w-xl space-y-4 text-base leading-8 text-[#5C4A3A] md:text-lg">
              <p>
                כמה בקבוקי וודקה צריך? כמה יין ובירה כדאי להכין? האם עדיף לקנות אלכוהול לבד או לקחת
                חבילת בר מהאולם?
              </p>
              <p>
                התשובה תלויה במספר האורחים הבוגרים, בהרגלי השתייה, במשך האירוע, בתפריט ובמה שהאולם כבר
                מספק.
              </p>
              <p>
                במדריך הזה תוכלו לתכנן את המשקאות לאירוע, לקבל הערכת כמויות ולהשוות בין רכישה עצמאית
                לבין שירותי הבר של האולם.
              </p>
            </div>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <TrackedCtaLink
                href="#alcohol-calculator"
                className={ctaPrimary}
                location={`hero_calc:${PATH}`}
              >
                למחשבון האלכוהול
              </TrackedCtaLink>
              <TrackedCtaLink
                href="#venue-checklist"
                className={ctaSecondary}
                location={`hero_venue:${PATH}`}
              >
                מה לבדוק מול האולם?
              </TrackedCtaLink>
            </div>
          </div>

          <div className="relative">
            <figure className="overflow-hidden rounded-[28px] border border-[#E6D2AA] bg-[#FFFDF8] shadow-[0_28px_70px_rgba(58,39,20,0.12)]">
              <Image
                src="/images/rsvp/guides/alcohol/wedding-bar-hero.jpg"
                alt="בר חתונה יוקרתי עם כוסות שמפניה ויין"
                width={1280}
                height={720}
                className="h-auto w-full object-cover"
                priority
                sizes="(max-width:1024px) 100vw, 46vw"
              />
            </figure>
            {!reduce ? (
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="mt-4 text-center text-sm font-semibold text-[#8A6B45]"
              >
                תכנון בר · השוואת עלויות · בלי ניחושים מיותרים
              </motion.p>
            ) : (
              <p className="mt-4 text-center text-sm font-semibold text-[#8A6B45]">
                תכנון בר · השוואת עלויות · בלי ניחושים מיותרים
              </p>
            )}
          </div>
        </div>
      </header>

      {/* Professional intro */}
      <section aria-labelledby="before-buying" className="bg-[#FFFDF8] px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-3xl">
          <Eyebrow>תכנון נכון</Eyebrow>
          <h2 id="before-buying" className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
            לפני שקונים בקבוקים, בודקים מי באמת צפוי לשתות
          </h2>
          <div className="mt-6 space-y-5 text-base leading-8 text-[#5C4A3A] md:text-lg">
            <p>מספר המוזמנים הכולל אינו מספיק כדי לתכנן את כמויות האלכוהול.</p>
            <p>
              צריך להתחשב בכמות האורחים הצפויה בפועל, במספר האורחים בגיל שתייה חוקי, בהעדפות האישיות
              שלהם, במשך האירוע ובמשקאות שהבר כבר מספק.
            </p>
            <p>
              חתונה עם הרבה משפחות וילדים עשויה לדרוש תכנון שונה מחתונה שבה רוב המשתתפים הם מבוגרים
              צעירים.
            </p>
            <p>
              עם זאת, גיל לבדו אינו קובע כמה אדם ישתה. חשוב להסתמך על היכרות עם האורחים ולא על הנחות
              גורפות.
            </p>
            <p className="rounded-2xl border border-[#E6D2AA] bg-[#FBF6EE] px-5 py-4 font-semibold text-[#5E4735]">
              המחשבון הוא כלי להערכת רכש ואינו המלצה לכמות שאדם צריך לשתות.
            </p>
          </div>
        </div>
      </section>

      {/* Calculator */}
      <section aria-labelledby="calc-heading" className="bg-[#FBF6EE] px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-5xl">
          <Eyebrow>מחשבון אינטראקטיבי</Eyebrow>
          <h2 id="calc-heading" className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
            בואו נתכנן את הבר שלכם
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-8 text-[#5C4A3A] md:text-lg">
            שלבים ברורים: פרטי אירוע, קטלוג בקבוקים, העדפות בר, ואז כמויות והשוואת עלויות — עם הנחות
            שקופות לעריכה.
          </p>
          <div className="mt-10">
            <AlcoholCalculator />
          </div>
        </div>
      </section>

      {/* Buy vs venue narrative */}
      <section aria-labelledby="buy-or-venue" className="bg-[#FFFDF8] px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-3xl">
          <Eyebrow>החלטה כלכלית</Eyebrow>
          <h2 id="buy-or-venue" className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
            לקנות אלכוהול לבד או לקחת מהאולם — מה משתלם יותר?
          </h2>
          <div className="mt-6 space-y-5 text-base leading-8 text-[#5C4A3A] md:text-lg">
            <p>לא תמיד רכישה עצמאית זולה יותר.</p>
            <p>
              לעיתים מחיר הבקבוק בחנות נמוך יותר, אבל צריך להביא בחשבון עלויות נוספות כמו דמי מזיגה,
              ברמנים, קירור, קרח, הובלה ואחסון.
            </p>
            <p>
              מנגד, חבילת בר של האולם יכולה להיות נוחה יותר ולכלול חלק מהשירותים, אך לא תמיד כוללת את
              כל המותגים או את רמת האלכוהול הרצויה.
            </p>
            <p>
              השתמשו במחשבון ההשוואה למעלה עם הנתונים מההצעות שלכם — בלי להכריז על חיסכון לפני שיש
              מספרים אמיתיים.
            </p>
          </div>
          <figure className="mt-10 overflow-hidden rounded-[28px] border border-[#E6D2AA]">
            <Image
              src="/images/rsvp/guides/alcohol/champagne-glasses.jpg"
              alt="כוסות שמפניה על שולחן חתונה"
              width={1200}
              height={700}
              className="h-auto w-full object-cover"
              sizes="(max-width:768px) 100vw, 720px"
            />
          </figure>
        </div>
      </section>

      {/* Sealed bottle returns */}
      <section aria-labelledby="returns" className="bg-[#FBF6EE] px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-3xl">
          <Eyebrow>לפני הקנייה</Eyebrow>
          <h2 id="returns" className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
            לפני שקונים אלכוהול, בדקו אם אפשר להחזיר בקבוקים סגורים
          </h2>
          <div className="mt-6 space-y-5 text-base leading-8 text-[#5C4A3A] md:text-lg">
            <p>
              אחד הדברים שכדאי לבדוק לפני רכישת אלכוהול לחתונה הוא מדיניות ההחזרות של החנות או הספק.
            </p>
            <p>
              יש ספקים שעשויים לאפשר החזרת בקבוקים שנשארו סגורים ובמצב תקין, בהתאם לתנאים שנקבעו
              מראש.
            </p>
            <p>לכן כדאי לברר עוד לפני הקנייה:</p>
          </div>
          <ul className="mt-6 grid gap-2">
            {RETURN_CHECKS.map((item) => (
              <li
                key={item}
                className="rounded-2xl border border-[#E6D2AA] bg-white/80 px-4 py-3 text-sm font-semibold text-[#5E4735]"
              >
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-8 rounded-2xl border border-[#C9A45C]/50 bg-[#FFF8EA] px-5 py-4 text-base font-black leading-7 text-[#3F3025]">
            אל תניחו שאפשר להחזיר בקבוקים סגורים. בקשו את תנאי ההחזרה מראש ובכתב.
          </p>
        </div>
      </section>

      {/* Corkage */}
      <section
        id="venue-checklist"
        aria-labelledby="corkage"
        className="scroll-mt-24 bg-[#FFFDF8] px-5 py-16 md:px-8 md:py-20"
      >
        <div className="mx-auto max-w-3xl">
          <Eyebrow>דמי מזיגה</Eyebrow>
          <h2 id="corkage" className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
            מהם דמי מזיגה והאם האולם גובה אותם?
          </h2>
          <div className="mt-6 space-y-5 text-base leading-8 text-[#5C4A3A] md:text-lg">
            <p>
              דמי מזיגה הם תשלום שחלק מהאולמות או ספקי הבר עשויים לגבות כאשר מביאים אלכוהול מבחוץ.
            </p>
            <p>
              התשלום עשוי להיות מחושב לפי בקבוק, לפי אורח או כסכום קבוע, בהתאם להסכם.
            </p>
            <p>
              לא כל אולם גובה דמי מזיגה, ולא בכל מקום החיוב מחושב באותה דרך.
            </p>
            <p>לכן חשוב לבדוק:</p>
          </div>
          <ul className="mt-6 grid gap-2">
            {CORKAGE_CHECKS.map((item) => (
              <li
                key={item}
                className="rounded-2xl border border-[#E6D2AA] bg-[#FBF6EE] px-4 py-3 text-sm font-semibold text-[#5E4735]"
              >
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-8 rounded-2xl border border-[#C9A45C]/50 bg-[#FFF8EA] px-5 py-4 text-base font-black leading-7 text-[#3F3025]">
            מחיר בקבוק נמוך לא בהכרח אומר שרכישה עצמאית תהיה זולה יותר.
          </p>
        </div>
      </section>

      {/* Checklist */}
      <section aria-labelledby="checklist" className="bg-[#FBF6EE] px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-3xl">
          <Eyebrow>צ׳קליסט</Eyebrow>
          <h2 id="checklist" className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
            10 דברים שכדאי לסגור לפני שמזמינים אלכוהול
          </h2>
          <ChecklistPrintable items={CHECKLIST} />
        </div>
      </section>

      {/* RSVP connection */}
      <section aria-labelledby="rsvp-help" className="bg-[#FFFDF8] px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-3xl">
          <Eyebrow>אישורי הגעה</Eyebrow>
          <h2 id="rsvp-help" className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
            כמות המוזמנים היא התחלה. מספר המגיעים הוא מה שחשוב לתכנון.
          </h2>
          <div className="mt-6 space-y-5 text-base leading-8 text-[#5C4A3A] md:text-lg">
            <p>
              אם הזמנתם 500 אורחים, זה לא אומר שצריך לתכנן רכישת אלכוהול ל־500 משתתפים.
            </p>
            <p>
              אישורי הגעה מספקים תמונה מעודכנת יותר של מספר האורחים שצפויים להגיע.
            </p>
            <p>
              ב־Invistimo אפשר לעקוב אחר מספר המאשרים וכמות המשתתפים בכל רשומה, ולהיעזר במידע הזה
              בתכנון האירוע.
            </p>
            <p>
              כמובן שאישורי הגעה אינם מעידים מי שותה אלכוהול או כמה ישתה. את ההעדפות צריך להעריך
              בנפרד.
            </p>
          </div>
          <div className="mt-8">
            <TrackedCtaLink
              href="/rsvp/chatuna"
              className={ctaPrimary}
              location={`mid_rsvp:${PATH}`}
            >
              איך אישורי הגעה עוזרים לתכנון החתונה?
            </TrackedCtaLink>
          </div>
          <p className="mt-4 text-sm text-[#8A6B45]">
            ראו גם:{" "}
            <Link href="/info/guides/guest-list" className="font-bold text-[#8A642E] underline-offset-4 hover:underline">
              רשימת מוזמנים
            </Link>
            {" · "}
            <Link href="/info/guides/when-to-send-rsvp" className="font-bold text-[#8A642E] underline-offset-4 hover:underline">
              מתי שולחים אישורי הגעה
            </Link>
            {" · "}
            <Link href="/info/guides/wedding-venue-guest-guarantee" className="font-bold text-[#8A642E] underline-offset-4 hover:underline">
              התחייבות לאולם
            </Link>
          </p>
        </div>
      </section>

      {/* Short guides */}
      <section aria-labelledby="more-tips" className="bg-[#FBF6EE] px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-3xl">
          <Eyebrow>עוד שאלות קצרות</Eyebrow>
          <h2 id="more-tips" className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
            תשובות מהירות לתכנון הבר
          </h2>
          <ul className="mt-8 grid gap-4">
            {SHORT_GUIDES.map((item) => (
              <li
                key={item.h}
                className="rounded-[24px] border border-[#E6D2AA] bg-white/85 p-5 md:p-6"
              >
                <h3 className="text-lg font-black text-[#2C241C]">{item.h}</h3>
                <p className="mt-2 text-base leading-7 text-[#5C4A3A]">{item.p}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* FAQ */}
      <section aria-labelledby="faq" className="bg-[#FFFDF8] px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-3xl">
          <Eyebrow>שאלות נפוצות</Eyebrow>
          <h2 id="faq" className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
            שאלות ותשובות על אלכוהול לחתונה
          </h2>
          <div className="mt-8 space-y-3">
            {ALCOHOL_GUIDE_FAQS.map((item) => (
              <details
                key={item.q}
                className="group rounded-[22px] border border-[#E6D2AA] bg-white/90 px-5 py-4"
              >
                <summary className="cursor-pointer list-none text-base font-black text-[#2C241C]">
                  <span className="flex items-start justify-between gap-3">
                    {item.q}
                    <span className="text-[#C9A45C] transition group-open:rotate-45" aria-hidden>
                      +
                    </span>
                  </span>
                </summary>
                <p className="mt-3 text-[15px] leading-7 text-[#5C4A3A]">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Related + CTA */}
      <section className="bg-[#1C1612] px-5 py-16 text-[#F7F1E8] md:px-8 md:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-black text-[#FFF8EF] md:text-4xl">
            רוצים מספר אורחים מעודכן לפני שסוגרים כמויות לבר?
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-[#D8CBB8]">
            אישורי הגעה מסודרים עוזרים לעדכן את צפי ההגעה — ואז לחזור למחשבון האלכוהול עם מספרים
            ריאליים יותר.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <TrackedCtaLink href="/rsvp/chatuna" className={ctaPrimary} location={`footer_chatuna:${PATH}`}>
              לאישורי הגעה לחתונה
            </TrackedCtaLink>
            <TrackedCtaLink
              href="/rsvp"
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/20 bg-white/5 px-8 py-3.5 text-base font-black text-[#FFF8EF] transition hover:bg-white/10"
              location={`footer_rsvp:${PATH}`}
            >
              לכל שירותי האישורים
            </TrackedCtaLink>
          </div>
          <nav aria-label="מדריכים קשורים" className="mt-10 flex flex-wrap justify-center gap-3 text-sm">
            {[
              { href: "/info/guides/wedding-venue-guest-guarantee", label: "התחייבות לאולם" },
              { href: "/info/guides/guest-list", label: "רשימת מוזמנים" },
              { href: "/info/guides/when-to-send-rsvp", label: "מתי שולחים אישורי הגעה" },
              { href: "/info/guides/cost-rsvp-wedding", label: "עלויות אישורי הגעה" },
              { href: "/info/guides", label: "כל המדריכים" },
            ].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-full border border-white/15 px-4 py-2 text-[#E8DCC8] underline-offset-4 hover:underline"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      </section>
    </article>
  );
}

function ChecklistPrintable({ items }: { items: readonly string[] }) {
  const [checked, setChecked] = useState<Record<number, boolean>>({});

  return (
    <div className="mt-8">
      <ul className="grid gap-2">
        {items.map((item, i) => (
          <li key={item}>
            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[#E6D2AA] bg-white/85 px-4 py-3 text-sm font-semibold text-[#5E4735]">
              <input
                type="checkbox"
                className="mt-0.5 h-5 w-5 shrink-0 accent-[#C9A45C]"
                checked={!!checked[i]}
                onChange={(e) => setChecked((c) => ({ ...c, [i]: e.target.checked }))}
              />
              <span className={checked[i] ? "line-through opacity-60" : ""}>{item}</span>
            </label>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() => window.print()}
        className="mt-6 rounded-full border border-[#DCC7A6] bg-white px-6 py-2.5 text-sm font-black text-[#5E4735] print:hidden"
      >
        הדפסת רשימת בדיקה
      </button>
    </div>
  );
}
