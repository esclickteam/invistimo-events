"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { Frank_Ruhl_Libre } from "next/font/google";
import { motion, useReducedMotion } from "framer-motion";
import ChatunaVideo from "./components/ChatunaVideo";
import { CHATUNA_FAQS } from "./chatunaFaqs";
import {
  CHAOS_QUOTES,
  COMPARE_OPTIONS,
  DEMO_GUEST_ROWS,
  EXAMPLE_RECORDS,
  FAQ_TOPICS,
  FOLLOW_UP_PATHS,
  GUESTS_VIDEO,
  HOW_STEPS,
  JOURNEY_STEPS,
  JOURNEY_VIDEO,
  LINKS,
  MEDIA,
  PACKAGE_CARDS,
  PREP_ITEMS,
  SEASON_CARDS,
  SEATING_VIDEO,
  STORY_STEPS,
  TIMELINE,
  TIMING_VIDEO,
  WHY_POINTS,
} from "./content";

const display = Frank_Ruhl_Libre({
  subsets: ["hebrew", "latin"],
  weight: ["500", "700"],
  display: "swap",
  variable: "--font-chatuna-display",
});

const fade = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0 },
};

function SectionShell({
  id,
  tone = "light",
  children,
  className = "",
}: {
  id?: string;
  tone?: "light" | "cream" | "dark" | "ivory";
  children: ReactNode;
  className?: string;
}) {
  const tones = {
    light: "bg-[#FFFDF8] text-[#3A2A1F]",
    cream: "bg-[#F7EDDF] text-[#3A2A1F]",
    ivory: "bg-[#FBF6EE] text-[#3A2A1F]",
    dark: "bg-[#2A211A] text-[#F7EDDF]",
  } as const;
  return (
    <section id={id} className={`${tones[tone]} ${className}`}>
      <div className="mx-auto w-full max-w-6xl px-5 py-16 md:px-8 md:py-24">{children}</div>
    </section>
  );
}

function CtaLink({
  href,
  children,
  variant = "primary",
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
}) {
  const styles =
    variant === "primary"
      ? "bg-[#8A642E] !text-white hover:bg-[#735325]"
      : variant === "secondary"
        ? "border border-[#E8D9C2] bg-[#F7EDDF] !text-[#2A211A] hover:bg-white"
        : "!text-[#8A642E] underline-offset-4 hover:underline";
  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center rounded-full px-6 py-3 text-[15px] font-bold transition ${styles}`}
    >
      {children}
    </Link>
  );
}

function PhoneFrame({
  src,
  alt,
  priority = false,
}: {
  src: string;
  alt: string;
  priority?: boolean;
}) {
  return (
    <div className="relative mx-auto w-[min(100%,280px)]">
      <div className="overflow-hidden rounded-[2rem] border-[10px] border-[#1C1612] bg-[#1C1612] shadow-[0_28px_60px_rgba(40,28,16,0.28)]">
        <div className="relative aspect-[9/19] w-full overflow-hidden bg-[#F7EDDF]">
          <Image src={src} alt={alt} fill className="object-contain object-top" sizes="280px" priority={priority} />
        </div>
      </div>
    </div>
  );
}

/**
 * Portrait journey clips are already filmed inside a phone composite.
 * Keep a tall phone-shaped stage (never landscape crop) without a second bezel.
 */
function PhoneVideoFrame({
  src,
  poster,
  title,
  eager = false,
  videoRef,
}: {
  src: string;
  poster?: string;
  title: string;
  eager?: boolean;
  videoRef?: RefObject<HTMLVideoElement | null>;
}) {
  return (
    <div className="mx-auto w-[min(100%,340px)]">
      <div className="overflow-hidden rounded-[2rem] border border-[#E4D3B6] bg-[#F7EDDF] shadow-[0_24px_50px_rgba(40,28,16,0.16)]">
        {/* Fixed 9:16 stage — video is absolutely filled inside ChatunaVideo */}
        <ChatunaVideo
          src={src}
          poster={poster}
          title={title}
          eager={eager}
          fit="cover"
          videoRef={videoRef}
          className="aspect-[9/16] w-full bg-[#F7EDDF]"
        />
      </div>
    </div>
  );
}

function JourneySynced() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [active, setActive] = useState(0);
  const reduce = useReducedMotion();

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const onTime = () => {
      const t = el.currentTime;
      const idx = JOURNEY_STEPS.findIndex((s) => t >= s.startSec && t < s.endSec);
      if (idx >= 0) setActive(idx);
    };
    el.addEventListener("timeupdate", onTime);
    return () => el.removeEventListener("timeupdate", onTime);
  }, []);

  return (
    <div className="grid items-start gap-10 lg:grid-cols-[0.9fr_1.1fr]">
      <PhoneVideoFrame
        src={JOURNEY_VIDEO.src}
        poster={JOURNEY_VIDEO.poster}
        title={JOURNEY_VIDEO.title}
        eager
        videoRef={videoRef}
      />
      <ol className="space-y-3">
        {JOURNEY_STEPS.map((step, i) => {
          const on = i === active;
          return (
            <li key={step.id}>
              <button
                type="button"
                onClick={() => {
                  const el = videoRef.current;
                  if (!el) return;
                  el.currentTime = step.startSec + 0.05;
                  if (!reduce) el.play().catch(() => undefined);
                  setActive(i);
                }}
                className={`w-full rounded-2xl border px-4 py-4 text-right transition ${
                  on
                    ? "border-[#8A642E] bg-white shadow-[0_10px_28px_rgba(138,100,46,0.12)]"
                    : "border-transparent bg-white/50 hover:bg-white/80"
                }`}
              >
                <p className="text-xs font-bold tracking-[0.18em] text-[#8A642E]">{step.id}</p>
                <p className={`mt-1 text-xl text-[#2A211A] ${display.className}`}>{step.title}</p>
                <p className="mt-1 text-sm leading-6 text-[#5C4A3A]">{step.body}</p>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function FaqBlock() {
  const byId = Object.fromEntries(CHATUNA_FAQS.map((f) => [f.id, f]));

  return (
    <div className="space-y-10">
      {FAQ_TOPICS.map((topic) => (
        <div key={topic.id}>
          <h3 className={`mb-4 text-2xl text-[#2A211A] ${display.className}`}>{topic.title}</h3>
          <div className="divide-y divide-[#E8D9C2] rounded-[24px] border border-[#E8D9C2] bg-white/80">
            {topic.ids.map((id) => {
              const faq = byId[id];
              if (!faq) return null;
              return (
                <details key={faq.id} className="group px-5 py-4 md:px-6" open={id === topic.ids[0]}>
                  <summary className="flex cursor-pointer list-none items-start justify-between gap-4 text-right marker:content-none [&::-webkit-details-marker]:hidden">
                    <span className="text-base font-bold text-[#2A211A] md:text-lg">{faq.q}</span>
                    <span className="mt-1 text-[#8A642E] group-open:hidden" aria-hidden>
                      +
                    </span>
                    <span className="mt-1 hidden text-[#8A642E] group-open:inline" aria-hidden>
                      −
                    </span>
                  </summary>
                  <p className="mt-3 max-w-3xl text-[15px] leading-7 text-[#5C4A3A]">{faq.a}</p>
                </details>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ChatunaMarketingPage() {
  const reduce = useReducedMotion();

  return (
    <div dir="rtl" className={`${display.variable} min-h-screen overflow-x-hidden bg-[#FFFDF8] text-[#3A2A1F]`}>
      {/* 1 Hero */}
      <section className="relative isolate overflow-hidden border-b border-[#EAD9BE]/70">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,#F3E4C8_0%,transparent_42%),linear-gradient(180deg,#FFFDF8_0%,#F7EDDF_100%)]" />
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-16 pt-10 md:grid-cols-[1.05fr_0.95fr] md:px-8 md:pb-24 md:pt-14">
          <motion.div
            initial={reduce ? false : "hidden"}
            animate="show"
            variants={fade}
            transition={{ duration: 0.55 }}
          >
            <p className="text-xs font-bold tracking-[0.22em] text-[#8A642E]">אישורי הגעה לחתונה</p>
            <h1
              className={`mt-4 text-[2.35rem] leading-[1.15] text-[#2A211A] md:text-5xl md:leading-[1.12] ${display.className}`}
            >
              אישורי הגעה לחתונה, בלי לרדוף אחרי האורחים
            </h1>
            <p className="mt-5 text-xl font-semibold text-[#5C4324] md:text-2xl">
              אתם מתכננים את היום שלכם. אנחנו עוזרים לכם לדעת מי יהיה שם.
            </p>
            <p className="mt-5 max-w-xl text-[16px] leading-8 text-[#5C4A3A]">
              ההזמנות נשלחו, ההתרגשות בשיאה, אבל נשארה שאלה אחת גדולה: מי באמת מגיע לחתונה? עם Invistimo
              אפשר לשלוח אישורי הגעה ב־WhatsApp, לקבל תשובות דרך קישור אישי לכל אורח ולעקוב אחרי רשימת
              המוזמנים במקום אחד. במקום עשרות הודעות, טלפונים ורשימות שמתעדכנות בלי סוף — יש לכם תהליך
              מסודר שמלווה אתכם עד האירוע.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <CtaLink href={LINKS.pricing} variant="primary">
                לצפייה בחבילות אישורי הגעה
              </CtaLink>
              <CtaLink href="#how-it-works" variant="secondary">
                לראות איך זה עובד
              </CtaLink>
            </div>
          </motion.div>

          <motion.div
            initial={reduce ? false : { opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.08 }}
            className="relative"
          >
            <div className="absolute -inset-6 -z-10 rounded-full bg-[#E8D2A8]/35 blur-3xl" />
            <PhoneFrame src={MEDIA.phoneInvite} alt="הזמנת חתונה דיגיטלית בטלפון" priority />
            <div className="pointer-events-none absolute -left-2 top-10 hidden rounded-2xl border border-[#E4D3B6] bg-white/90 px-4 py-3 shadow-lg md:block">
              <p className="text-xs font-bold text-[#8A642E]">התשובות מתעדכנות</p>
              <p className="mt-1 text-sm text-[#5C4A3A]">מגיעים · לא מגיעים · בהמתנה</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 2 Why */}
      <SectionShell tone="ivory">
        <div className="grid items-center gap-12 lg:grid-cols-[1fr_1fr]">
          <div>
            <h2 className="font-[family-name:var(--font-chatuna-display)] text-3xl leading-tight text-[#2A211A] md:text-4xl">
              למה אישורי הגעה לחתונה הם הרבה יותר מרשימת &quot;מגיעים&quot;?
            </h2>
            <div className="mt-6 space-y-4 text-[16px] leading-8 text-[#5C4A3A]">
              <p>
                כשמתכננים חתונה, כמעט כל החלטה קשורה למספר האנשים שצפויים להגיע. מספר המנות מול האולם,
                סידורי ההושבה, חלוקת השולחנות וההיערכות של הספקים — כולם נשענים על תמונת מצב מדויקת ככל
                האפשר.
              </p>
              <p>אבל רשימת המוזמנים הראשונית אינה רשימת המגיעים בפועל.</p>
              <p>
                יש אורחים שלא יכולים להגיע, משפחות שעדיין לא יודעות כמה מהן יגיעו, מוזמנים שממתינים
                לסידור עבודה ואנשים שפשוט שכחו לענות. בלי תהליך אישורי הגעה מסודר, הזוג מוצא את עצמו
                מנסה להשלים את התמונה דרך הודעות אישיות, שיחות טלפון וגיליונות שמתעדכנים שוב ושוב.
              </p>
              <p className="font-semibold text-[#3A2A1F]">
                אישורי הגעה לא מבטיחים שכל מי שאישר יגיע, אבל הם מאפשרים לקבל החלטות על בסיס תשובות
                עדכניות במקום ניחושים.
              </p>
            </div>
          </div>
          <div className="relative overflow-hidden rounded-[28px] border border-[#E4D3B6] bg-white shadow-[0_20px_40px_rgba(40,28,16,0.1)]">
            <Image
              src={MEDIA.invite}
              alt="הזמנת חתונה לדוגמה — מיה ואלון"
              width={900}
              height={1100}
              className="h-auto w-full object-cover"
            />
          </div>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2">
          {WHY_POINTS.map((p) => (
            <div key={p.title} className="rounded-[22px] border border-[#E8D9C2] bg-white/80 px-5 py-6">
              <h3 className="font-[family-name:var(--font-chatuna-display)] text-xl text-[#2A211A]">
                {p.title}
              </h3>
              <p className="mt-2 text-[15px] leading-7 text-[#5C4A3A]">{p.body}</p>
            </div>
          ))}
        </div>
        <div className="mt-10 overflow-hidden rounded-[24px] border border-[#E4D3B6]">
          <Image
            src={MEDIA.dashboard}
            alt="המחשה אמיתית של דשבורד רשימת מוזמנים ב־Invistimo"
            width={1400}
            height={800}
            className="h-auto w-full"
          />
        </div>
      </SectionShell>

      {/* 3 Chaos */}
      <SectionShell tone="dark">
        <h2 className="max-w-3xl font-[family-name:var(--font-chatuna-display)] text-3xl leading-tight text-[#F7EDDF] md:text-4xl">
          החתונה מתקרבת, אבל הרשימה עדיין לא סגורה
        </h2>
        <p className="mt-5 max-w-2xl text-[16px] leading-8 text-[#E8D9C2]">
          מכירים את ההודעות האלה? כשכל תשובה נמצאת במקום אחר, קשה לדעת מה באמת מעודכן.
        </p>
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {CHAOS_QUOTES.map((q) => (
            <blockquote
              key={q}
              className="rounded-[20px] border border-white/10 bg-white/5 px-5 py-5 text-[15px] leading-7 text-[#F7EDDF]"
            >
              &quot;{q}&quot;
            </blockquote>
          ))}
        </div>
        <div className="mt-10 grid items-center gap-8 lg:grid-cols-2">
          <div className="rounded-[24px] border border-dashed border-[#C9A36A]/50 bg-[#3A2F26] p-6">
            <p className="text-sm font-bold text-[#E8C98A]">לפני — תשובות מפוזרות</p>
            <p className="mt-3 text-[15px] leading-7 text-[#E8D9C2]">
              WhatsApp פרטי, שיחות טלפון, הודעות להורים וגיליון שמתעדכן ידנית.
            </p>
          </div>
          <div className="overflow-hidden rounded-[24px] border border-[#C9A36A]/40">
            <Image
              src={MEDIA.dashboard}
              alt="אחרי — רשימה אחת מסודרת במערכת"
              width={1200}
              height={700}
              className="h-auto w-full opacity-95"
            />
          </div>
        </div>
        <p className="mt-10 font-[family-name:var(--font-chatuna-display)] text-2xl text-[#F3E4C8] md:text-3xl">
          במקום לאסוף תשובות מכל הכיוונים — מנהלים אותן במקום אחד.
        </p>
      </SectionShell>

      {/* 4 How it works + journey video */}
      <SectionShell id="how-it-works" tone="cream">
        <h2 className="font-[family-name:var(--font-chatuna-display)] text-3xl leading-tight text-[#2A211A] md:text-4xl">
          מההודעה הראשונה ועד לתשובה שמופיעה ברשימה
        </h2>
        <p className="mt-5 max-w-3xl text-[16px] leading-8 text-[#5C4A3A]">
          האורחים לא צריכים ללמוד מערכת חדשה. הם מקבלים הודעה, פותחים את הקישור האישי שלהם ומשיבים
          בצורה נוחה. אתם יכולים לעקוב אחרי ההתקדמות דרך מערכת ניהול המוזמנים.
        </p>
        <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {HOW_STEPS.map((s) => (
            <li key={s.n} className="rounded-[22px] border border-[#E4D3B6] bg-white/80 px-5 py-5">
              <p className="text-xs font-bold tracking-[0.2em] text-[#8A642E]">{s.n}</p>
              <h3 className="mt-2 font-[family-name:var(--font-chatuna-display)] text-xl text-[#2A211A]">
                {s.title}
              </h3>
              <p className="mt-2 text-[15px] leading-7 text-[#5C4A3A]">{s.body}</p>
            </li>
          ))}
        </ol>
        <div className="mt-14">
          <h3 className="mb-6 font-[family-name:var(--font-chatuna-display)] text-2xl text-[#2A211A]">
            חוויית האורח האמיתית
          </h3>
          <JourneySynced />
          <p className="mt-4 text-sm text-[#7A6550]">
            האישור מתבצע בקישור האישי — לא בכפתורי WhatsApp מומצאים. ההמחשה מתוך מסכי המוצר האמיתיים,
            עם נתוני הדגמה.
          </p>
          <div className="mt-8">
            <CtaLink href={LINKS.pricing} variant="primary">
              גם אנחנו רוצים אישורי הגעה מסודרים
            </CtaLink>
          </div>
        </div>
      </SectionShell>

      {/* 5 What guests see */}
      <SectionShell tone="light">
        <h2 className="font-[family-name:var(--font-chatuna-display)] text-3xl leading-tight text-[#2A211A] md:text-4xl">
          מבחינת האורחים, זה פשוט ונוח
        </h2>
        <p className="mt-5 max-w-3xl text-[16px] leading-8 text-[#5C4A3A]">
          האורחים מקבלים הודעה עם קישור להזמנה שלהם. הם פותחים אותה בטלפון, רואים את פרטי החתונה
          ובוחרים את תשובת ההגעה. כאשר ההזמנה מאפשרת זאת, אפשר לציין גם את מספר המגיעים ולהוסיף הערה.
          אין צורך להוריד אפליקציה ייעודית.
        </p>
        <div className="mt-12 grid gap-8 md:grid-cols-3">
          <figure>
            <PhoneFrame src={MEDIA.phoneWhatsapp} alt="הודעת WhatsApp אמיתית עם קישור אישי" />
            <figcaption className="mt-4 text-center text-sm font-bold text-[#5C4324]">
              הודעת WhatsApp
            </figcaption>
          </figure>
          <figure>
            <PhoneFrame src={MEDIA.phoneInvite} alt="הזמנה דיגיטלית בקישור האישי" />
            <figcaption className="mt-4 text-center text-sm font-bold text-[#5C4324]">
              ההזמנה הדיגיטלית
            </figcaption>
          </figure>
          <figure>
            <PhoneFrame src={MEDIA.phoneRsvp} alt="טופס אישור הגעה אמיתי" />
            <figcaption className="mt-4 text-center text-sm font-bold text-[#5C4324]">
              טופס אישור ההגעה
            </figcaption>
          </figure>
        </div>
        <div className="mt-12">
          <PhoneVideoFrame
            src={JOURNEY_VIDEO.src}
            poster={JOURNEY_VIDEO.poster}
            title="בחירת הגעה, כולל אפשרות לא מגיעים ומסך תודה"
          />
        </div>
        <p className="mt-3 text-center text-sm text-[#7A6550]">
          באותו סרטון אפשר לראות גם את בחירת ההגעה ואת מסך התודה האמיתי אחרי השליחה.
        </p>
      </SectionShell>

      {/* 6 Non-responders */}
      <SectionShell tone="cream">
        <h2 className="font-[family-name:var(--font-chatuna-display)] text-3xl leading-tight text-[#2A211A] md:text-4xl">
          לא כולם עונים בהודעה הראשונה. וזה חלק מהתכנון.
        </h2>
        <p className="mt-5 max-w-3xl text-[16px] leading-8 text-[#5C4A3A]">
          יש אורחים שפותחים את ההודעה ומאשרים מיד. אחרים צריכים לבדוק סידורי עבודה, נסיעות, ילדים או
          תוכניות משפחתיות. ויש מי שפשוט מפספסים את ההודעה. לכן תהליך אישורי הגעה טוב לא מסתיים בשליחה
          הראשונה. הוא מאפשר לראות ממי עדיין ממתינים לתשובה ולהמשיך בסבבי פנייה בהתאם לחבילה שנבחרה.
        </p>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {FOLLOW_UP_PATHS.map((p) => (
            <div key={p.title} className="rounded-[22px] border border-[#E4D3B6] bg-white px-5 py-6">
              <h3 className="font-[family-name:var(--font-chatuna-display)] text-xl text-[#2A211A]">
                {p.title}
              </h3>
              <p className="mt-2 text-[15px] leading-7 text-[#5C4A3A]">{p.body}</p>
            </div>
          ))}
        </div>
        <p className="mt-6 text-sm text-[#7A6550]">
          לא כל האפשרויות כלולות בכל מסלול. אין הבטחה שכל אורח יענה בסוף התהליך.{" "}
          <Link href={LINKS.noReply} className="font-bold text-[#8A642E] underline-offset-4 hover:underline">
            מדריך לאורחים שלא עונים
          </Link>
          {" · "}
          <Link href={LINKS.calls} className="font-bold text-[#8A642E] underline-offset-4 hover:underline">
            אישורי הגעה בשיחות טלפון
          </Link>
          {" · "}
          <Link href={LINKS.whatsappVsSms} className="font-bold text-[#8A642E] underline-offset-4 hover:underline">
            למה כדאי לשלב WhatsApp עם גיבוי SMS?
          </Link>
        </p>
        <div className="mt-8">
          <CtaLink href={LINKS.pricing} variant="secondary">
            להשוואת החבילות
          </CtaLink>
        </div>
      </SectionShell>

      {/* 7 Timing */}
      <SectionShell id="timing" tone="light">
        <h2 className="font-[family-name:var(--font-chatuna-display)] text-3xl leading-tight text-[#2A211A] md:text-4xl">
          התזמון הנכון יכול לעשות הבדל גדול בהכנות
        </h2>
        <p className="mt-5 max-w-3xl text-[16px] leading-8 text-[#5C4A3A]">
          אם מבקשים מאורחים אישור סופי חודשים לפני החתונה, חלקם עדיין לא יודעים אם יוכלו להגיע. אם
          מחכים לרגע האחרון, עלול להישאר מעט מדי זמן להשלמת תשובות ולסגירת המספרים מול האולם. לחתונות
          רבות אפשר לשקול להתחיל את איסוף האישורים כשבועיים עד שבועיים וחצי לפני האירוע, אך זה אינו
          כלל קבוע. התזמון צריך להתחשב במועד שבו האולם מבקש מספר מנות, במספר סבבי ההודעות והשיחות,
          בחגים ובזמינות האורחים.
        </p>
        <div className="mt-10 grid items-start gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <ol className="relative space-y-0 border-r-2 border-[#D8B77C]/70 pr-6">
            {TIMELINE.map((t, i) => (
              <li key={t.title} className="relative pb-10 last:pb-0">
                <span className="absolute -right-[1.4rem] top-1 h-4 w-4 rounded-full border-2 border-[#8A642E] bg-[#FFFDF8]" />
                <p className="text-xs font-bold tracking-[0.16em] text-[#8A642E]">{t.when}</p>
                <h3 className={`mt-1 text-2xl text-[#2A211A] ${display.className}`}>{t.title}</h3>
                <p className="mt-2 max-w-2xl text-[15px] leading-7 text-[#5C4A3A]">{t.body}</p>
                {!reduce && i < TIMELINE.length - 1 ? (
                  <motion.div
                    className="absolute -right-[1.05rem] top-6 h-[calc(100%-1.5rem)] w-0.5 origin-top bg-[#D8B77C]/40"
                    initial={{ scaleY: 0 }}
                    whileInView={{ scaleY: 1 }}
                    viewport={{ once: true, amount: 0.4 }}
                    transition={{ duration: 0.7 }}
                  />
                ) : null}
              </li>
            ))}
          </ol>
          <PhoneVideoFrame
            src={TIMING_VIDEO.src}
            poster={TIMING_VIDEO.poster}
            title={TIMING_VIDEO.title}
          />
        </div>
        <div className="mt-8">
          <CtaLink href={LINKS.whenToSend} variant="primary">
            קראו מתי כדאי לשלוח
          </CtaLink>
        </div>
      </SectionShell>

      {/* 8 Seasons */}
      <SectionShell tone="ivory">
        <h2 className="font-[family-name:var(--font-chatuna-display)] text-3xl leading-tight text-[#2A211A] md:text-4xl">
          לכל חתונה יש תאריך. לא לכל חתונה מתאים אותו לוח זמנים.
        </h2>
        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {SEASON_CARDS.map((c) => (
            <article
              key={c.title}
              className="flex flex-col overflow-hidden rounded-[24px] border border-[#E4D3B6] bg-[linear-gradient(180deg,#FFFDF8_0%,#F3E6D0_100%)]"
            >
              <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#F3E6D0]">
                <Image
                  src={c.image}
                  alt={c.imageAlt}
                  fill
                  className="object-cover object-center"
                  sizes="(max-width:1024px) 100vw, 33vw"
                />
              </div>
              <div className="px-5 py-6">
                <h3 className="font-[family-name:var(--font-chatuna-display)] text-2xl text-[#2A211A]">
                  {c.title}
                </h3>
                <p className="mt-3 text-[15px] leading-7 text-[#5C4A3A]">{c.body}</p>
              </div>
            </article>
          ))}
        </div>
      </SectionShell>

      {/* 9 Both sides */}
      <SectionShell tone="cream">
        <h2 className="font-[family-name:var(--font-chatuna-display)] text-3xl leading-tight text-[#2A211A] md:text-4xl">
          המשפחה שלו, המשפחה שלה, החברים שלכם — רשימה אחת מסודרת
        </h2>
        <p className="mt-5 max-w-3xl text-[16px] leading-8 text-[#5C4A3A]">
          בחתונות רבות רשימת המוזמנים מגיעה מכמה מקורות: בני הזוג, ההורים, משפחה מורחבת וחברים. כדי
          למנוע כפילויות ובלבול, חשוב לעבוד עם רשימה מסודרת שבה אפשר לעקוב אחרי כל מוזמן והסטטוס שלו.
          במערכת אפשר לארגן מוזמנים בקבוצות עם שמות שתבחרו, לשמור מספרי טלפון, מספר מוזמנים בכל רשומה,
          סטטוס אישור והערות רלוונטיות.
        </p>
        <div className="mt-10 overflow-hidden rounded-[28px] border border-[#E4D3B6] bg-[#F7EDDF]">
          <ChatunaVideo
            src={GUESTS_VIDEO.src}
            poster={GUESTS_VIDEO.poster}
            title={GUESTS_VIDEO.title}
            fit="contain"
            className="aspect-video w-full"
          />
        </div>
      </SectionShell>

      {/* 10 Seating */}
      <SectionShell tone="light">
        <h2 className="font-[family-name:var(--font-chatuna-display)] text-3xl leading-tight text-[#2A211A] md:text-4xl">
          כשהתשובות מתחילות להגיע, אפשר להתחיל לראות את סידור האולם
        </h2>
        <p className="mt-5 max-w-3xl text-[16px] leading-8 text-[#5C4A3A]">
          סידורי הושבה הופכים פשוטים יותר כשיש רשימת מגיעים מעודכנת. במקום לשבץ את כל מי שהוזמן בלי
          לדעת מי מגיע, אפשר לעבוד על בסיס התשובות שהתקבלו. עם תוספת ההושבה של Invistimo, כאשר היא
          נרכשת, אפשר לנהל את השיבוץ לשולחנות ולהמשיך בהיערכות לקראת יום האירוע.
        </p>
        <div className="mt-10 grid gap-8 lg:grid-cols-2">
          <div className="overflow-hidden rounded-[28px] border border-[#E4D3B6] bg-[#F7EDDF]">
            <ChatunaVideo
              src={SEATING_VIDEO.src}
              poster={SEATING_VIDEO.poster}
              title={SEATING_VIDEO.title}
              fit="contain"
              className="aspect-video w-full"
            />
          </div>
          <div className="overflow-hidden rounded-[28px] border border-[#E4D3B6] bg-[#F7EDDF]">
            <Image
              src={MEDIA.seating}
              alt="מפת הושבה אמיתית במערכת Invistimo"
              width={1200}
              height={800}
              className="h-full w-full object-contain"
            />
          </div>
        </div>
        <div className="mt-8">
          <CtaLink href={LINKS.seating} variant="primary">
            סידורי הושבה
          </CtaLink>
        </div>
      </SectionShell>

      {/* 11 How many come */}
      <SectionShell tone="ivory">
        <h2 className="font-[family-name:var(--font-chatuna-display)] text-3xl leading-tight text-[#2A211A] md:text-4xl">
          מספר המוזמנים הוא נקודת ההתחלה. מספר המאשרים הוא נתון לתכנון.
        </h2>
        <p className="mt-5 max-w-3xl text-[16px] leading-8 text-[#5C4A3A]">
          כשמזמינים 300 אנשים, אין פירוש הדבר ש־300 יגיעו בפועל. אבל גם אי אפשר לדעת מראש כמה יגיעו רק
          לפי כלל אצבע. הרכב האורחים, המרחק מהאירוע, תקופת השנה ונסיבות אישיות יכולים להשפיע על ההגעה.
          לכן במקום להסתמך על אחוז הגעה קבוע, כדאי לאסוף תשובות אישיות ולעדכן את התכנון ככל שהאירוע
          מתקרב.
        </p>
        <div className="mt-10 overflow-hidden rounded-[24px] border border-[#E4D3B6] bg-white">
          <div className="border-b border-[#EAD9BE] bg-[#F7EDDF] px-5 py-3 text-sm font-bold text-[#8A642E]">
            דוגמה להמחשה בלבד — לא נתוני לקוחות אמיתיים
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-right text-sm">
              <thead className="bg-[#FFFDF8] text-[#7A6550]">
                <tr>
                  <th className="px-4 py-3 font-bold">שם</th>
                  <th className="px-4 py-3 font-bold">קבוצה</th>
                  <th className="px-4 py-3 font-bold">סטטוס</th>
                  <th className="px-4 py-3 font-bold">מגיעים</th>
                </tr>
              </thead>
              <tbody>
                {DEMO_GUEST_ROWS.map((row) => (
                  <tr key={row.name} className="border-t border-[#F0E4D2]">
                    <td className="px-4 py-3 font-semibold text-[#2A211A]">{row.name}</td>
                    <td className="px-4 py-3 text-[#5C4A3A]">{row.side}</td>
                    <td className="px-4 py-3 text-[#5C4A3A]">{row.status}</td>
                    <td className="px-4 py-3 text-[#5C4A3A]">{row.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <p className="mt-6 text-[15px] text-[#5C4A3A]">
          לקריאה נוספת:{" "}
          <Link
            href={LINKS.venueGuarantee}
            className="font-bold text-[#8A642E] underline-offset-4 hover:underline"
          >
            כמה אורחים כדאי להתחייב לאולם?
          </Link>
          {" · "}
          <Link
            href={LINKS.alcoholCalculator}
            className="font-bold text-[#8A642E] underline-offset-4 hover:underline"
          >
            כמה אלכוהול צריך לקנות לחתונה?
          </Link>
        </p>
      </SectionShell>

      {/* 12 Pricing */}
      <SectionShell id="packages" tone="cream">
        <h2 className="font-[family-name:var(--font-chatuna-display)] text-3xl leading-tight text-[#2A211A] md:text-4xl">
          בוחרים את הדרך שמתאימה לחתונה שלכם
        </h2>
        <p className="mt-5 max-w-3xl text-[16px] leading-8 text-[#5C4A3A]">
          העלות תלויה במספר רשומות המוזמנים ובשירותים שתבחרו. יש זוגות שמעדיפים אישורי הגעה בהודעות
          בלבד, ויש מי שמעוניינים לשלב גם שיחות טלפוניות, הושבה או שירותים נוספים. כדאי להשוות בין
          החבילות לפי מספר הסבבים, סוג הפנייה והשירותים הכלולים — ולא רק לפי המחיר.{" "}
          <Link href={LINKS.costGuide} className="font-bold text-[#8A642E] underline-offset-4 hover:underline">
            איך מחשבים מחיר לפי רשומות
          </Link>
        </p>
        <p className="mt-3 text-sm text-[#7A6550]">
          המחירים להמחשה מחושבים ל־{EXAMPLE_RECORDS} רשומות לפי מחשבון החבילות הפעיל. הסכום הסופי
          נקבע במחשבון לפי הכמות שלכם.
        </p>
        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {PACKAGE_CARDS.map((pkg) => (
            <article
              key={pkg.id}
              className="flex flex-col rounded-[24px] border border-[#E4D3B6] bg-white px-5 py-6 shadow-[0_12px_30px_rgba(40,28,16,0.06)]"
            >
              <p className="text-xs font-bold tracking-[0.14em] text-[#8A642E]">{pkg.badge}</p>
              <h3 className="mt-2 font-[family-name:var(--font-chatuna-display)] text-2xl text-[#2A211A]">
                {pkg.hebrewName}
              </h3>
              <p className="mt-1 text-sm text-[#7A6550]">{pkg.name}</p>
              <p className="mt-3 text-[15px] leading-7 text-[#5C4A3A]">{pkg.description}</p>
              <ul className="mt-4 flex-1 space-y-2 text-[14px] leading-6 text-[#5C4A3A]">
                <li>• {pkg.waRounds}</li>
                <li>• {pkg.callRounds}</li>
                <li>• {pkg.seating}</li>
                {pkg.features.slice(0, 3).map((f) => (
                  <li key={f}>• {f}</li>
                ))}
              </ul>
              <p className="mt-5 text-lg font-bold text-[#2A211A]">
                מ־{pkg.examplePriceIls.toLocaleString("he-IL")} ₪
                <span className="mr-1 text-sm font-normal text-[#7A6550]">
                  ל־{EXAMPLE_RECORDS} רשומות
                </span>
              </p>
            </article>
          ))}
        </div>
        <div className="mt-8">
          <CtaLink href={LINKS.pricing} variant="primary">
            לצפייה במחיר לחתונה שלנו
          </CtaLink>
        </div>
      </SectionShell>

      {/* 13 Compare */}
      <SectionShell tone="light">
        <h2 className="font-[family-name:var(--font-chatuna-display)] text-3xl leading-tight text-[#2A211A] md:text-4xl">
          איזה סוג שירות מתאים לכם?
        </h2>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {COMPARE_OPTIONS.map((o) => {
            const pkg = PACKAGE_CARDS.find((p) => p.id === o.id);
            return (
              <div key={o.id} className="rounded-[22px] border border-[#E4D3B6] bg-[#FFFDF8] px-5 py-6">
                <h3 className="font-[family-name:var(--font-chatuna-display)] text-xl text-[#2A211A]">
                  {o.title}
                </h3>
                <p className="mt-2 text-[15px] leading-7 text-[#5C4A3A]">{o.body}</p>
                {pkg ? (
                  <ul className="mt-4 space-y-1 text-sm text-[#7A6550]">
                    <li>{pkg.waRounds}</li>
                    <li>{pkg.callRounds}</li>
                  </ul>
                ) : null}
              </div>
            );
          })}
        </div>
      </SectionShell>

      {/* 14 Story */}
      <SectionShell tone="dark">
        <p className="text-xs font-bold tracking-[0.18em] text-[#E8C98A]">דוגמה להמחשה — לא סיפור לקוח</p>
        <h2 className="mt-3 font-[family-name:var(--font-chatuna-display)] text-3xl leading-tight text-[#F7EDDF] md:text-4xl">
          מהרשימה הראשונה ועד ליום החתונה
        </h2>
        <p className="mt-5 max-w-3xl text-[16px] leading-8 text-[#E8D9C2]">
          מיה ואלון מתחתנים בעוד מספר שבועות. רשימת המוזמנים מגיעה משני הצדדים של המשפחה, והאולם
          מבקש מספר מנות לפני האירוע.
        </p>
        <ol className="mt-10 grid gap-4 md:grid-cols-2">
          {STORY_STEPS.map((s) => (
            <li key={s.title} className="rounded-[20px] border border-white/10 bg-white/5 px-5 py-5">
              <h3 className="font-[family-name:var(--font-chatuna-display)] text-xl text-[#F3E4C8]">
                {s.title}
              </h3>
              <p className="mt-2 text-[15px] leading-7 text-[#E8D9C2]">{s.body}</p>
            </li>
          ))}
        </ol>
        <div className="mt-10 max-w-sm">
          <PhoneFrame src={MEDIA.phoneInvite} alt="הזמנת הדוגמה של מיה ואלון" />
        </div>
      </SectionShell>

      {/* 15 Prep */}
      <SectionShell tone="cream">
        <h2 className="font-[family-name:var(--font-chatuna-display)] text-3xl leading-tight text-[#2A211A] md:text-4xl">
          ארבעה דברים שכדאי להכין לפני שליחת אישורי הגעה
        </h2>
        <ol className="mt-8 space-y-4">
          {PREP_ITEMS.map((item, i) => (
            <li key={item} className="flex gap-4 rounded-[18px] border border-[#E4D3B6] bg-white px-5 py-4">
              <span className="text-lg font-bold text-[#8A642E]">{String(i + 1).padStart(2, "0")}</span>
              <p className="text-[16px] leading-7 text-[#3A2A1F]">{item}</p>
            </li>
          ))}
        </ol>
        <p className="mt-8 max-w-3xl text-[16px] leading-8 text-[#5C4A3A]">
          ככל שהמידע מסודר יותר לפני תחילת השליחה, כך קל יותר לעקוב אחרי התשובות ולהימנע מתיקונים
          מיותרים בהמשך.
        </p>
      </SectionShell>

      {/* FAQ */}
      <SectionShell id="faq" tone="light">
        <h2 className="font-[family-name:var(--font-chatuna-display)] text-3xl leading-tight text-[#2A211A] md:text-4xl">
          שאלות נפוצות על אישורי הגעה לחתונה
        </h2>
        <p className="mt-4 max-w-2xl text-[16px] leading-8 text-[#5C4A3A]">
          תשובות מלאות לפי מה שהמערכת באמת מאפשרת — בלי הבטחות על אחוזי הגעה או חיסכון קבוע.
        </p>
        <div className="mt-10">
          <FaqBlock />
        </div>
        <div className="mt-10 flex flex-wrap gap-4 text-sm">
          <Link href={LINKS.rsvp} className="font-bold text-[#8A642E] underline-offset-4 hover:underline">
            אישורי הגעה לכל אירוע
          </Link>
          <Link href={LINKS.whatsapp} className="font-bold text-[#8A642E] underline-offset-4 hover:underline">
            אישורי הגעה ב־WhatsApp
          </Link>
          <Link href={LINKS.calls} className="font-bold text-[#8A642E] underline-offset-4 hover:underline">
            אישורי הגעה בשיחות טלפון
          </Link>
          <Link href={LINKS.invitations} className="font-bold text-[#8A642E] underline-offset-4 hover:underline">
            הזמנות דיגיטליות
          </Link>
        </div>
      </SectionShell>

      {/* Final CTA */}
      <SectionShell tone="dark" className="!pb-28">
        <h2 className="max-w-3xl font-[family-name:var(--font-chatuna-display)] text-3xl leading-tight text-[#F7EDDF] md:text-4xl">
          החתונה שלכם מתקרבת. הגיע הזמן לעשות סדר ברשימת המוזמנים.
        </h2>
        <p className="mt-5 max-w-3xl text-[16px] leading-8 text-[#E8D9C2]">
          בין בחירת השירים, סידורי השולחנות וכל ההתרגשות שלפני החתונה, יש דברים שאפשר לנהל בצורה
          פשוטה יותר. עם Invistimo תוכלו לרכז את אישורי ההגעה, לעקוב אחרי התשובות ולהתכונן ליום הגדול
          עם תמונה ברורה יותר של רשימת המוזמנים.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <CtaLink href={LINKS.pricing} variant="primary">
            לבחירת חבילת אישורי הגעה
          </CtaLink>
          <CtaLink href={LINKS.contact} variant="secondary">
            יש לנו שאלה
          </CtaLink>
        </div>
      </SectionShell>
    </div>
  );
}
