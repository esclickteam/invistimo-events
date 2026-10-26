"use client";

import Image from "next/image";
import Link from "next/link";
import { Frank_Ruhl_Libre } from "next/font/google";
import { motion, useReducedMotion } from "framer-motion";
import PublicAutoplayVideo from "@/components/marketing/PublicAutoplayVideo";
import GiftOptionsDemo from "./components/GiftOptionsDemo";
import { CREDIT_GIFTS_FAQS, FAQ_TOPIC_IDS, FAQ_TOPICS } from "./creditGiftsFaqs";
import {
  COMPARE_ROWS,
  GIFT_METHODS,
  GUEST_BENEFITS,
  GUEST_STEPS,
  HOST_BENEFITS,
  HOST_STEPS,
  INTEGRATION_POINTS,
  LINKS,
  MEDIA,
  PAGE_ANSWER,
  RELATED_INTERNAL,
  SECURITY_POINTS,
  WHY_POINTS,
} from "./content";

const display = Frank_Ruhl_Libre({
  subsets: ["hebrew", "latin"],
  weight: ["500", "700"],
  display: "swap",
  variable: "--font-credit-gifts-display",
});

const fade = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

function Section({
  id,
  tone = "ivory",
  children,
  className = "",
}: {
  id?: string;
  tone?: "ivory" | "cream" | "white" | "champagne" | "dark";
  children: React.ReactNode;
  className?: string;
}) {
  const tones = {
    ivory: "bg-[#FBF6EE] text-[#3A2A1F]",
    cream: "bg-[#F7EDDF] text-[#3A2A1F]",
    white: "bg-[#FFFDF8] text-[#3A2A1F]",
    champagne: "bg-gradient-to-b from-[#F3E8D7] to-[#FBF6EE] text-[#3A2A1F]",
    dark: "bg-[#2A211A] text-[#F7EDDF]",
  } as const;
  return (
    <section id={id} className={`${tones[tone]} ${className}`}>
      <div className="mx-auto w-full max-w-6xl px-5 py-14 md:px-8 md:py-20">{children}</div>
    </section>
  );
}

function Eyebrow({ children, light = false }: { children: React.ReactNode; light?: boolean }) {
  return (
    <p
      className={`text-xs font-black tracking-[0.16em] ${
        light ? "text-[#E8D1A5]" : "text-[#8A642E]"
      }`}
    >
      {children}
    </p>
  );
}

function PrimaryCta({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#2C241C] px-7 py-3.5 text-base font-black !text-white shadow-[0_16px_36px_rgba(44,36,28,0.22)] transition hover:-translate-y-0.5 hover:bg-[#3A2B22]"
    >
      {children}
    </Link>
  );
}

function SecondaryCta({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#DCC7A6] bg-white/80 px-7 py-3.5 text-base font-black !text-[#2C241C] backdrop-blur transition hover:-translate-y-0.5 hover:bg-white"
    >
      {children}
    </Link>
  );
}

function StatusPill({ label, tone }: { label: string; tone: string }) {
  const styles: Record<string, string> = {
    active: "bg-[#EAF3E4] text-[#3F5C34]",
    display_only: "bg-[#EEF3F8] text-[#3A4F66]",
    informational: "bg-[#F4EEE4] text-[#6B5B4A]",
  };
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-black ${styles[tone] || styles.informational}`}>
      {label}
    </span>
  );
}

function MethodIcon({ id }: { id: string }) {
  const map: Record<string, string> = {
    credit: MEDIA.paymentIcon,
    paybox: MEDIA.giftPageIcon,
    bit: MEDIA.summaryIcon,
    cash: MEDIA.scheduleIcon,
    blessing: MEDIA.installmentsIcon,
  };
  const src = map[id] || MEDIA.giftPageIcon;
  return (
    <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#E6D2AA] bg-white">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" className="h-8 w-8 object-contain" />
    </div>
  );
}

function FaqBlock() {
  const byId = Object.fromEntries(CREDIT_GIFTS_FAQS.map((f) => [f.id, f]));
  return (
    <div className="space-y-8">
      {FAQ_TOPICS.map((topic) => (
        <div key={topic.id}>
          <h3 className="text-lg font-black text-[#2C241C]">{topic.title}</h3>
          <div className="mt-3 divide-y divide-[#EFE2CC] rounded-[24px] border border-[#E6D2AA] bg-white">
            {FAQ_TOPIC_IDS[topic.id].map((id, index) => {
              const faq = byId[id];
              if (!faq) return null;
              return (
                <details key={faq.id} className="group px-5 py-4" open={index === 0 && topic.id === "credit"}>
                  <summary className="flex cursor-pointer list-none items-start justify-between gap-4 text-right marker:content-none [&::-webkit-details-marker]:hidden">
                    <h4 className="text-base font-black text-[#2C241C] md:text-lg">{faq.q}</h4>
                    <span className="mt-1 text-[#8A642E] transition group-open:rotate-45" aria-hidden>
                      +
                    </span>
                  </summary>
                  <p className="mt-3 text-[15px] leading-7 text-[#5C4A3A]">{faq.a}</p>
                </details>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function CreditGiftsMarketingPage() {
  const reduceMotion = useReducedMotion();

  return (
    <div
      dir="rtl"
      className={`${display.variable} -mt-[64px] min-h-screen overflow-x-hidden bg-[#FBF6EE] text-[#3A2A1F]`}
    >
      {/* 1. Hero */}
      <section className="relative isolate overflow-hidden px-5 pb-12 pt-[96px] md:px-8 md:pb-16 md:pt-[110px]">
        <div className="absolute inset-0 -z-10">
          <Image
            src={MEDIA.hero}
            alt="מעטפה אלגנטית וכרטיס ברכה על רקע שמפניה רך"
            fill
            priority
            className="object-cover"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-l from-[#FFFDF8]/96 via-[#FBF6EE]/90 to-[#F3E8D7]/58" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(232,209,166,0.4),transparent_44%)]" />
        </div>

        <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12">
          <motion.div
            initial={reduceMotion ? false : "hidden"}
            animate="show"
            variants={fade}
            transition={{ duration: 0.45 }}
          >
            <p className={`${display.className} text-2xl font-bold text-[#8A642E] md:text-3xl`}>
              Invistimo
            </p>
            <h1
              className={`${display.className} mt-3 text-[1.85rem] font-bold leading-[1.25] text-[#2C241C] md:text-[2.75rem]`}
            >
              מתנות לחתונה באשראי, bit ו־PayBox — כל הדרכים להעניק מתנה
            </h1>
            <p className="mt-4 max-w-xl text-lg font-semibold leading-8 text-[#5C4A3A]">
              האורחים בוחרים איך להעניק. אתם בוחרים אילו אפשרויות להציג.
            </p>
            <p className="mt-4 max-w-xl text-base leading-8 text-[#5C4A3A] md:text-[17px]">
              {PAGE_ANSWER}
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <PrimaryCta href="#gift-methods">גלו את אפשרויות המתנה</PrimaryCta>
              <SecondaryCta href={LINKS.pricing}>בדקו חבילות ומחירים</SecondaryCta>
              <SecondaryCta href={LINKS.demo}>נסו את הדמו</SecondaryCta>
            </div>
          </motion.div>

          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.08 }}
            className="relative"
          >
            <GiftOptionsDemo />
          </motion.div>
        </div>
        <div className="mx-auto mt-12 max-w-4xl overflow-hidden rounded-[28px] border border-[#E6D2AA] bg-[#1E1814]">
          <PublicAutoplayVideo
            src={MEDIA.video}
            poster={MEDIA.videoPoster}
            title="המחשה — הצגת אפשרויות מתנה דיגיטליות (אשראי חיצוני, bit ו־PayBox)"
            shellClassName="w-full"
            className="aspect-video w-full"
            expandable
            frameBg="#1E1814"
          />
          <p className="border-t border-[#3A322C] bg-[#241E1A] px-5 py-3 text-sm font-semibold text-[#E8D5A3]">
            Invistimo מציגה קישור/מספר שאתם מזינים — אינה סולקת כרטיסים ואינה מאמתת תשלומי bit או PayBox
          </p>
        </div>
      </section>


      <Section tone="cream" id="intro">
        <Eyebrow>למה כמה דרכים?</Eyebrow>
        <h2 className={`${display.className} mt-3 text-3xl font-bold md:text-4xl`}>
          לא כל אורח מעדיף לתת מתנה באותה דרך
        </h2>
        <p className="mt-4 max-w-3xl text-[17px] leading-8 text-[#5C4A3A]">
          יש מי שנוח לו לשלם בכרטיס אשראי, אחרים מעדיפים PayBox או bit, ויש
          אורחים שמעדיפים מעטפה ביום האירוע. ב־Invistimo שלוש אפשרויות דיגיטליות:
          קישור אשראי מ־RSVP, קישור PayBox, ומספר bit להעתקה — ואפשר לשלב אותן
          לצד ההזמנה ואישורי ההגעה לפי מה שהפעלתם.
        </p>
        <p className="mt-4 max-w-3xl text-[15px] leading-7 text-[#6B5B4A]">
          חשוב להבחין: סליקת אשראי אצל ספק חיצוני; PayBox הוא קישור שאתם מזינים;
          bit הוא מספר להעתקה בלבד — בלי קישור bit ובלי QR bit בעורך.
        </p>
      </Section>

      {/* 2. All methods */}
      <Section id="gift-methods" tone="ivory">
        <Eyebrow>אפשרויות מתנה</Eyebrow>
        <h2 className={`${display.className} mt-3 text-3xl font-bold md:text-4xl`}>
          איך האורחים יכולים לתת מתנה לחתונה?
        </h2>
        <p className="mt-3 max-w-3xl text-[16px] leading-7 text-[#5C4A3A]">
          שלוש אפשרויות דיגיטליות פעילות במוצר — אשראי, PayBox ו־bit — ועוד
          הסברים על מזומן/צ&apos;ק וברכה.
        </p>

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {GIFT_METHODS.map((method, index) => (
            <motion.article
              key={method.id}
              initial={reduceMotion ? false : { opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.35, delay: index * 0.04 }}
              className="rounded-[28px] border border-[#E6D2AA] bg-white p-6 shadow-[0_12px_32px_rgba(95,68,34,0.06)] transition hover:-translate-y-0.5 hover:border-[#C9A45C]/80 hover:shadow-[0_18px_40px_rgba(95,68,34,0.1)]"
            >
              <div className="flex items-start justify-between gap-3">
                <MethodIcon id={method.id} />
                <StatusPill label={method.statusLabel} tone={method.status} />
              </div>
              <h3 className="mt-4 text-xl font-black text-[#2C241C]">{method.title}</h3>
              <p className="mt-1 text-sm font-semibold text-[#8A642E]">{method.subtitle}</p>
              {method.paragraphs.map((p) => (
                <p key={p.slice(0, 24)} className="mt-3 text-[15px] leading-7 text-[#5C4A3A]">
                  {p}
                </p>
              ))}
              <ul className="mt-4 space-y-2">
                {method.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-2 text-sm leading-6 text-[#5C4A3A]">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#C9A45C]" aria-hidden />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-xs font-bold text-[#6B5B4A]">מי מטפל בתשלום: {method.whoHandles}</p>
              {method.caveats.length ? (
                <ul className="mt-3 space-y-1.5 rounded-2xl bg-[#FBF6EE] px-3 py-3">
                  {method.caveats.map((c) => (
                    <li key={c} className="text-xs leading-5 text-[#7A6754]">
                      {c}
                    </li>
                  ))}
                </ul>
              ) : null}
            </motion.article>
          ))}
        </div>
      </Section>

      {/* 3. Interactive demo highlight */}
      <Section id="guest-preview" tone="champagne">
        <div className="grid items-center gap-10 lg:grid-cols-[1fr_0.9fr]">
          <div>
            <Eyebrow>תצוגת אורח</Eyebrow>
            <h2 className={`${display.className} mt-3 text-3xl font-bold md:text-4xl`}>
              כך האורחים שלכם יראו את אפשרויות המתנה
            </h2>
            <p className="mt-4 text-[16px] leading-7 text-[#5C4A3A]">
              הדגמה אינטראקטיבית עם נתוני דמו בלבד: בחירת אמצעי, מעבר לקישור
              חיצוני, העתקת מספר bit, והצגת QR לקישור PayBox. לא מוצגת הודעת
              «התשלום התקבל» אחרי לחיצה על קישור חיצוני.
            </p>
            <ul className="mt-5 space-y-2 text-sm leading-6 text-[#5C4A3A]">
              <li>• אשראי — קישור לספק RSVP.</li>
              <li>• PayBox — קישור חיצוני.</li>
              <li>• bit — מספר להעתקה בלבד.</li>
            </ul>
          </div>
          <GiftOptionsDemo />
        </div>
      </Section>

      {/* 4. Host setup */}
      <Section id="host-setup" tone="white">
        <Eyebrow>לבעלי האירוע</Eyebrow>
        <h2 className={`${display.className} mt-3 text-3xl font-bold md:text-4xl`}>
          אתם מחליטים איך האורחים יוכלו להעניק מתנה
        </h2>
        <p className="mt-3 max-w-3xl text-[16px] leading-7 text-[#5C4A3A]">
          בפרטי האירוע מגדירים את שלוש האפשרויות: קישור אשראי מ־RSVP (אחרי
          פתיחת משתמש אצל הספק), קישור PayBox, ומספר bit להעתקה. רק בעלי האירוע
          או בעלי הרשאה מתאימה יכולים לערוך.
        </p>
        <ol className="mt-8 grid gap-4 md:grid-cols-2">
          {HOST_STEPS.map((step, i) => (
            <li
              key={step.title}
              className="rounded-[24px] border border-[#E6D2AA] bg-[#FBF6EE] p-5"
            >
              <p className="text-sm font-black text-[#8A642E]">שלב {i + 1}</p>
              <h3 className="mt-1 text-lg font-black text-[#2C241C]">{step.title}</h3>
              <p className="mt-2 text-sm leading-6 text-[#5C4A3A]">{step.text}</p>
            </li>
          ))}
        </ol>
        <div className="mt-8 rounded-[24px] border border-[#E6D2AA] bg-[#FBF6EE] p-5">
          <h3 className="text-base font-black text-[#2C241C]">מה מגדירים בפועל?</h3>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-[#5C4A3A]">
            <li>• אשראי — קישור שקיבלתם אחרי פתיחת משתמש במערכת RSVP.</li>
            <li>• PayBox — קישור PayBox תקף שיצרתם באפליקציה.</li>
            <li>• bit — מספר טלפון להעתקה בלבד (בלי קישור bit ובלי QR בעורך).</li>
          </ul>
        </div>
      </Section>

      {/* Guest steps */}
      <Section tone="cream">
        <Eyebrow>לאורחים</Eyebrow>
        <h2 className={`${display.className} mt-3 text-3xl font-bold md:text-4xl`}>
          איך מעניקים מתנה בפועל?
        </h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {GUEST_STEPS.map((step, i) => (
            <div key={step.title} className="rounded-[24px] border border-[#E6D2AA] bg-white p-5">
              <p className={`${display.className} text-3xl font-bold text-[#C9A45C]`}>{i + 1}</p>
              <h3 className="mt-2 text-lg font-black">{step.title}</h3>
              <p className="mt-2 text-sm leading-6 text-[#5C4A3A]">{step.text}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* 5. Integration */}
      <Section id="rsvp-integration" tone="ivory">
        <Eyebrow>שילוב בחוויה</Eyebrow>
        <h2 className={`${display.className} mt-3 text-3xl font-bold md:text-4xl`}>
          אפשרויות המתנה כחלק מהחוויה הדיגיטלית
        </h2>
        <p className="mt-3 max-w-3xl text-[16px] leading-7 text-[#5C4A3A]">
          האפשרות לתת מתנה צריכה להיות מכבדת ולא אגרסיבית — בלי חלון קופץ שמחייב
          בחירה, ובלי הודעות מתנה אוטומטיות לאורחים ללא הסכמה והגדרה מתאימה.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {INTEGRATION_POINTS.map((item) => (
            <article
              key={item.title}
              className="rounded-[24px] border border-[#E6D2AA] bg-white p-5 transition hover:border-[#C9A45C]"
            >
              <h3 className="text-lg font-black text-[#2C241C]">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-[#5C4A3A]">{item.text}</p>
            </article>
          ))}
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <figure className="overflow-hidden rounded-[24px] border border-[#E6D2AA] bg-white">
            <div className="relative aspect-[16/10]">
              <Image
                src={MEDIA.phoneInvite}
                alt="מסך הזמנה דיגיטלית במובייל ב־Invistimo"
                fill
                className="object-cover object-top"
                sizes="(max-width:768px) 100vw, 480px"
              />
            </div>
            <figcaption className="border-t border-[#EFE2CC] px-4 py-3 text-sm font-semibold text-[#5E4735]">
              הזמנה דיגיטלית — נקודת כניסה לחוויית האורח
            </figcaption>
          </figure>
          <figure className="overflow-hidden rounded-[24px] border border-[#E6D2AA] bg-white">
            <div className="relative aspect-[16/10]">
              <Image
                src={MEDIA.dashboard}
                alt="דשבורד אורחים במערכת Invistimo"
                fill
                className="object-cover object-top"
                sizes="(max-width:768px) 100vw, 480px"
              />
            </div>
            <figcaption className="border-t border-[#EFE2CC] px-4 py-3 text-sm font-semibold text-[#5E4735]">
              ניהול האירוע — הגדרות המתנות לצד שאר הפרטים
            </figcaption>
          </figure>
        </div>
      </Section>

      {/* 6. Comparison */}
      <Section id="compare" tone="white">
        <Eyebrow>השוואה</Eyebrow>
        <h2 className={`${display.className} mt-3 text-3xl font-bold md:text-4xl`}>
          איזו דרך הכי נוחה לקבל מתנות לאירוע?
        </h2>
        <p className="mt-3 max-w-3xl text-[15px] leading-7 text-[#5C4A3A]">
          ההשוואה מבוססת על אופן השימוש במערכת ועל תנאי RSVP כפי שמופיעים במסמכי
          Invistimo. עמלות PayBox ו־bit — רק לפי מדיניות הספקים החיצוניים.
        </p>
        <div className="mt-8 overflow-x-auto rounded-[24px] border border-[#E6D2AA] bg-white">
          <table className="min-w-[720px] w-full text-right text-sm">
            <caption className="sr-only">
              השוואה בין אמצעי מתנה: אשראי, PayBox, bit ומזומן או צ׳ק
            </caption>
            <thead className="bg-[#F7EDDF] text-[#2C241C]">
              <tr>
                <th scope="col" className="px-4 py-3 font-black">
                  אמצעי
                </th>
                <th scope="col" className="px-4 py-3 font-black">
                  איך האורח משתמש
                </th>
                <th scope="col" className="px-4 py-3 font-black">
                  מה צריך להגדיר
                </th>
                <th scope="col" className="px-4 py-3 font-black">
                  מי מטפל בתשלום
                </th>
                <th scope="col" className="px-4 py-3 font-black">
                  עמלות / הערות
                </th>
              </tr>
            </thead>
            <tbody>
              {COMPARE_ROWS.map((row) => (
                <tr key={row.method} className="border-t border-[#EFE2CC] align-top">
                  <th scope="row" className="px-4 py-3 font-black text-[#2C241C]">
                    {row.method}
                  </th>
                  <td className="px-4 py-3 text-[#5C4A3A]">{row.guest}</td>
                  <td className="px-4 py-3 text-[#5C4A3A]">{row.setup}</td>
                  <td className="px-4 py-3 text-[#5C4A3A]">{row.who}</td>
                  <td className="px-4 py-3 text-[#5C4A3A]">{row.fees}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* 7. Benefits */}
      <Section tone="cream">
        <Eyebrow>יתרונות</Eyebrow>
        <h2 className={`${display.className} mt-3 text-3xl font-bold md:text-4xl`}>
          למה כדאי להציע כמה אפשרויות למתנה?
        </h2>
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <div className="rounded-[24px] border border-[#E6D2AA] bg-white p-6">
            <h3 className="text-xl font-black text-[#2C241C]">לאורחים</h3>
            <ul className="mt-4 space-y-2">
              {GUEST_BENEFITS.map((b) => (
                <li key={b} className="flex gap-2 text-sm leading-6 text-[#5C4A3A]">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#C9A45C]" aria-hidden />
                  {b}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-[24px] border border-[#E6D2AA] bg-white p-6">
            <h3 className="text-xl font-black text-[#2C241C]">לבעלי האירוע</h3>
            <ul className="mt-4 space-y-2">
              {HOST_BENEFITS.map((b) => (
                <li key={b} className="flex gap-2 text-sm leading-6 text-[#5C4A3A]">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#C9A45C]" aria-hidden />
                  {b}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <p className="mt-6 text-sm leading-6 text-[#6B5B4A]">
          אין להבטיח שכל התשלומים מכל הערוצים מוצגים בדוח כספי אחד ללא אינטגרציות
          מאומתות. אשראי מתועד לפי מה ש־RSVP מספק; PayBox ו־bit — מעקב ידני או
          באפליקציות החיצוניות.
        </p>
      </Section>

      {/* 8. Why Invistimo */}
      <Section id="why" tone="ivory">
        <Eyebrow>למה Invistimo?</Eyebrow>
        <h2 className={`${display.className} mt-3 text-3xl font-bold md:text-4xl`}>
          ההזמנה, אישור ההגעה ואפשרויות המתנה — בחוויה אחת
        </h2>
        <p className="mt-4 max-w-3xl text-[16px] leading-7 text-[#5C4A3A]">
          Invistimo מאפשרת לשלב את תהליך ההזמנה ואישורי ההגעה עם אפשרויות מתנה
          לאורחים, בהתאם להגדרות האירוע ולשירותים הזמינים. כך האורח יכול לקבל את
          פרטי האירוע, לאשר הגעה ולמצוא את אפשרויות המתנה שבעלי השמחה בחרו להציג.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {WHY_POINTS.map((p) => (
            <article key={p.title} className="rounded-[24px] border border-[#E6D2AA] bg-white p-5">
              <h3 className="text-base font-black text-[#2C241C]">{p.title}</h3>
              <p className="mt-2 text-sm leading-6 text-[#5C4A3A]">{p.text}</p>
            </article>
          ))}
        </div>
      </Section>

      {/* 9. Security */}
      <Section id="security" tone="dark">
        <Eyebrow light>אבטחה ופרטיות</Eyebrow>
        <h2 className={`${display.className} mt-3 text-3xl font-bold md:text-4xl`}>
          איך שומרים על חוויית מתנה בטוחה וברורה?
        </h2>
        <ul className="mt-8 grid gap-3 md:grid-cols-2">
          {SECURITY_POINTS.map((point) => (
            <li
              key={point}
              className="rounded-[20px] border border-white/10 bg-white/5 px-4 py-4 text-sm leading-6 text-[#E8D9C2]"
            >
              {point}
            </li>
          ))}
        </ul>
        <p className="mt-6 text-sm text-[#C9B79A]">
          הנוסח מיושר עם{" "}
          <Link href={LINKS.terms} className="underline underline-offset-2">
            התקנון
          </Link>{" "}
          ועם{" "}
          <Link href={LINKS.privacy} className="underline underline-offset-2">
            מדיניות הפרטיות
          </Link>
          .
        </p>
      </Section>

      {/* 10. FAQ */}
      <Section id="faq" tone="white">
        <Eyebrow>שאלות נפוצות</Eyebrow>
        <h2 className={`${display.className} mt-3 text-3xl font-bold md:text-4xl`}>
          שאלות על מתנות באשראי, bit ו־PayBox
        </h2>
        <p className="mt-3 max-w-3xl text-[15px] leading-7 text-[#5C4A3A]">
          כל תשובה נפתחת במשפט ישיר ומיועדת גם להופעה מחוץ להקשר העמוד — בלי
          הבטחות תשלום שלא אומתו.
        </p>
        <div className="mt-8">
          <FaqBlock />
        </div>
      </Section>

      {/* Internal links */}
      <Section tone="cream">
        <h2 className={`${display.className} text-2xl font-bold md:text-3xl`}>המשך באתר Invistimo</h2>
        <ul className="mt-6 flex flex-wrap gap-3">
          {RELATED_INTERNAL.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="inline-flex min-h-11 items-center rounded-full border border-[#E6D2AA] bg-white px-4 py-2 text-sm font-bold text-[#5E4735] transition hover:border-[#C9A45C]"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </Section>

      {/* Final CTA */}
      <Section tone="champagne" className="!pb-24">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className={`${display.className} text-3xl font-bold md:text-4xl`}>
            מוכנים להציג לאורחים את אפשרויות המתנה?
          </h2>
          <p className="mt-4 text-[16px] leading-7 text-[#5C4A3A]">
            בדקו חבילות, נסו דמו, או פנו אלינו להתאמה לאירוע. שירות האשראי מופעל
            באמצעות ספק חיצוני RSVP; PayBox ו־bit מוצגים לפי מה שהגדרתם.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <PrimaryCta href={LINKS.pricing}>חבילות ומחירים</PrimaryCta>
            <SecondaryCta href={LINKS.demo}>נסו את הדמו</SecondaryCta>
            <SecondaryCta href={LINKS.contact}>יצירת קשר</SecondaryCta>
          </div>
          <p className="mt-6 text-sm leading-6 text-[#6B5B4A]">
            * התשלום באשראי מתבצע על ידי האורח אצל RSVP, כולל עמלת סליקה של 2.5%
            מגובה המתנה, כפי שמפורט במסמכי השירות. Invistimo אינה סולקת את הכרטיס
            בעצמה.
          </p>
        </div>
      </Section>
    </div>
  );
}
