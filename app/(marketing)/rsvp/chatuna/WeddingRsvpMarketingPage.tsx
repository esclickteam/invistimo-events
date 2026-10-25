"use client";

import { motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  CalendarHeart,
  CheckCircle2,
  HeartHandshake,
  LayoutGrid,
  MessageCircle,
  PhoneCall,
  Send,
  Users,
  UtensilsCrossed,
} from "lucide-react";
import TrackedCtaLink from "@/components/seo/TrackedCtaLink";
import { EVENT_INVITATION_BODY } from "@/lib/whatsapp/approvedTemplates";
import { WEDDING_RSVP_FAQS } from "./weddingFaqs";

const PATH = "/rsvp/chatuna";

const ctaPrimary =
  "inline-flex min-h-12 items-center justify-center rounded-full bg-gradient-to-l from-[#3A2B22] via-[#5A4333] to-[#2C211B] px-8 py-3.5 text-base font-black text-white shadow-[0_18px_40px_rgba(58,39,20,0.22)] transition hover:-translate-y-0.5";

const ctaSecondary =
  "inline-flex min-h-12 items-center justify-center rounded-full border border-[#DCC7A6] bg-white/85 px-8 py-3.5 text-base font-black text-[#5E4735] backdrop-blur transition hover:bg-white";

const ctaGold =
  "inline-flex min-h-12 items-center justify-center rounded-full bg-gradient-to-l from-[#B8862D] via-[#C9A45C] to-[#8B6220] px-8 py-3.5 text-base font-black text-white shadow-[0_18px_38px_rgba(184,134,45,0.26)] transition hover:-translate-y-0.5";

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0 },
};

const STD_MESSAGE = `Save The Date
מיה ואלון

אנחנו מתרגשים להזמין אתכם לשריין את התאריך
24.06.2027

פרטים נוספים יישלחו בקרוב 🤍`;

const INVITE_MESSAGE = EVENT_INVITATION_BODY.replace("{{1}}", "החתונה של מיה ואלון")
  .replace("{{2}}", "24.06.2027")
  .replace("{{3}}", "אולמי אלכסנדר");

const RSVP_MESSAGE =
  "משפחה וחברים יקרים,\n" +
  "הנכם מוזמנים לחתונה של מיה ואלון 🤍\n\n" +
  "📅 תאריך: 24.06.2027\n" +
  "📍 מיקום: אולמי אלכסנדר\n\n" +
  "לאישור הגעה לחצו על הכפתור למטה 👇\n\n" +
  "מחכים לשמוח איתכם 💖";

const GUEST_STEPS = [
  {
    n: "01",
    title: "הזמנה אישית ב־WhatsApp",
    text: "האורחים מקבלים הודעה עם פרטי החתונה וקישור אישי.",
  },
  {
    n: "02",
    title: "פותחים את ההזמנה",
    text: "בלחיצה אחת נפתחת ההזמנה הדיגיטלית המעוצבת, עם פרטי האירוע.",
  },
  {
    n: "03",
    title: "בוחרים אם מגיעים",
    text: "האורח מסמן את תשובתו ואת מספר המגיעים בהתאם לאפשרויות הקיימות.",
  },
  {
    n: "04",
    title: "שולחים את האישור",
    text: "התשובה נשלחת דרך הקישור האישי ומתעדכנת במערכת.",
  },
  {
    n: "05",
    title: "ממשיכים בהכנות",
    text: "אתם רואים את מצב התשובות ויכולים להתקדם לקראת ההושבה וסגירת הפרטים מול האולם.",
  },
] as const;

const TIMELINE = [
  {
    when: "3–6 חודשים לפני החתונה",
    title: "Save the Date",
    body: "נותנים לאורחים לשריין את התאריך ביומן, עוד לפני שכל פרטי האירוע סגורים. זמין כשהאפשרות פתוחה בחשבון — הודעה חד־פעמית שלא אוספת אישורי הגעה.",
    message: STD_MESSAGE,
    image: "/marketing/videos/home-save-the-date-poster.jpg",
    imageAlt: "כרטיס Save the Date לחתונה — מיה ואלון",
    cta: null as string | null,
    time: "10:12",
    href: "/rsvp/save-the-date",
  },
  {
    when: "חודש עד חודש וחצי לפני",
    title: "ההזמנה לחתונה",
    body: "זה הזמן לשלוח הזמנה מעוצבת עם פרטי האירוע. האורחים מתרגשים, משתפים ומתכננים להגיע — בלי לבקש מהם להתחייב מוקדם מדי.",
    message: INVITE_MESSAGE,
    image: "/marketing/invites/invite-wedding-mia-alon.webp",
    imageAlt: "הזמנה דיגיטלית לחתונה — מיה ואלון",
    cta: null as string | null,
    time: "18:40",
    href: "/invitations/chatuna",
  },
  {
    when: "שבועיים עד שבועיים וחצי לפני",
    title: "אישורי הגעה",
    body: "כשהחתונה מתקרבת, קל יותר לאורחים לתת תשובה מדויקת. שולחים קישור אישי, מתחילים לקבל אישורים וממשיכים בהתאם למי שעדיין לא השיב.",
    message: RSVP_MESSAGE,
    image: "/marketing/invites/invite-wedding-mia-alon.webp",
    imageAlt: "הזמנה עם קישור אישי לאישור הגעה לחתונה",
    cta: "לאישור הגעה",
    time: "11:05",
    href: "/rsvp/whatsapp",
  },
] as const;

const BENEFITS = [
  {
    title: "הזמנות דיגיטליות מעוצבות",
    text: "הזמנה שמשקפת את הסגנון שלכם ומרכזת את פרטי החתונה.",
    href: "/invitations/chatuna",
    icon: HeartHandshake,
  },
  {
    title: "אישורי הגעה אישיים",
    text: "קישור נוח לכל אורח ותשובות שנשמרות במערכת.",
    href: "/rsvp/whatsapp",
    icon: Send,
  },
  {
    title: "מעקב אחרי המוזמנים",
    text: "רואים מי אישר, מי לא מגיע וממי עדיין מחכים לתשובה.",
    href: "/rsvp",
    icon: Users,
  },
  {
    title: "שיחות להשלמת אישורים",
    text: "אפשרויות לשיחות מוקלטות, אנושיות או משולבות בהתאם לחבילה.",
    href: "/pricing",
    icon: PhoneCall,
  },
  {
    title: "סידורי הושבה",
    text: "ממשיכים מרשימת המוזמנים לתכנון השולחנות.",
    href: "/seating-explained",
    icon: LayoutGrid,
  },
  {
    title: "תזכורות והודעות תודה",
    text: "שומרים על קשר עם האורחים לפני האירוע ואחריו בהתאם לשירות שנבחר.",
    href: "/rsvp/whatsapp",
    icon: MessageCircle,
  },
] as const;

const PACKAGES = [
  {
    title: "אישורי הגעה בהודעות",
    text: "הזמנה דיגיטלית, שני סבבי וואטסאפ לאישור הגעה, תזכורת SMS עם מספר שולחן כשיש הושבה, והודעת תודה ב־SMS.",
  },
  {
    title: "שילוב שיחות מוקלטות",
    text: "אותו בסיס הודעות, בתוספת שלושה סבבי שיחה מוקלטת למי שעדיין לא ענה.",
  },
  {
    title: "שילוב שיחות אנושיות",
    text: "אותו בסיס הודעות, בתוספת שלושה סבבים במוקד אנושי.",
  },
  {
    title: "מסלול משולב",
    text: "אותו בסיס הודעות, עם שני סבבים מוקלטים וסבב אנושי אחד.",
  },
] as const;

function WhatsAppBrandIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden>
      <circle cx="16" cy="16" r="16" fill="#25D366" />
      <path
        d="M16.02 7.2C11.08 7.2 7.08 11.2 7.08 16.14c0 1.58.42 3.12 1.2 4.48L6.9 25.4l4.96-1.3a8.9 8.9 0 0 0 4.16 1.02c4.94 0 8.94-4 8.94-8.94S20.96 7.2 16.02 7.2Z"
        fill="white"
      />
      <path
        d="M13.14 11.15C12.86 10.53 12.57 10.52 12.31 10.51C12.1 10.5 11.86 10.5 11.62 10.5C11.38 10.5 10.98 10.59 10.64 10.96C10.3 11.34 9.35 12.2 9.35 13.95C9.35 15.7 10.67 17.39 10.85 17.63C11.03 17.87 13.27 21.47 16.78 22.84C19.69 23.98 20.29 23.75 20.93 23.69C21.57 23.63 22.99 22.84 23.28 22.05C23.57 21.26 23.57 20.58 23.48 20.43C23.39 20.28 23.14 20.19 22.77 20.01C22.41 19.83 20.59 18.93 20.26 18.81C19.93 18.69 19.69 18.63 19.45 18.99C19.21 19.35 18.54 20.13 18.33 20.37C18.12 20.61 17.9 20.64 17.54 20.46C17.17 20.28 15.98 19.9 14.56 18.63C13.45 17.64 12.69 16.42 12.48 16.06C12.27 15.7 12.46 15.51 12.64 15.33C12.8 15.17 13 14.91 13.18 14.7C13.36 14.49 13.42 14.34 13.54 14.1C13.66 13.86 13.6 13.65 13.51 13.47C13.42 13.29 12.76 11.52 13.14 11.15Z"
        fill="#25D366"
      />
    </svg>
  );
}

function WhatsAppChatMock({
  message,
  image,
  imageAlt,
  cta,
  time,
}: {
  message: string;
  image?: string;
  imageAlt?: string;
  cta?: string | null;
  time: string;
}) {
  return (
    <div
      dir="rtl"
      className="overflow-hidden rounded-[22px] border border-[#D8CCB8] bg-[#E5DDD5] shadow-[0_18px_40px_rgba(44,36,28,0.1)]"
    >
      <div className="flex items-center gap-3 bg-[#075E54] px-3.5 py-2.5 text-white">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#C9A45C] text-xs font-black text-[#1C1612]">
          IN
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-black">Invistimo</p>
          <p className="text-[11px] text-white/70">עסק</p>
        </div>
        <WhatsAppBrandIcon size={20} />
      </div>
      <div
        className="px-2.5 py-3"
        style={{
          backgroundImage: "radial-gradient(rgba(0,0,0,0.04) 1px, transparent 1px)",
          backgroundSize: "14px 14px",
          backgroundColor: "#E5DDD5",
        }}
      >
        <div className="mr-auto max-w-[94%] overflow-hidden rounded-xl rounded-tr-sm bg-white shadow-[0_1px_2px_rgba(0,0,0,0.08)]">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image}
              alt={imageAlt || ""}
              className="aspect-[4/3] w-full object-cover object-top"
              loading="lazy"
              decoding="async"
            />
          ) : null}
          <div className="whitespace-pre-line px-3 py-2.5 text-[13px] leading-[1.55] text-[#111B21]">
            {message}
          </div>
          {cta ? (
            <div className="border-t border-[#E9EDEF] px-3 py-2.5 text-center text-[13.5px] font-semibold text-[#027EB5]">
              {cta}
            </div>
          ) : null}
          <div className="px-3 pb-1.5 text-left text-[10px] leading-none text-[#667781]">{time}</div>
        </div>
      </div>
    </div>
  );
}

function QuietVideo({
  src,
  className,
  poster,
}: {
  src: string;
  className?: string;
  poster?: string;
}) {
  const reduceMotion = useReducedMotion();
  const ref = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (reduceMotion) return;
    let cancelled = false;
    const enable = () => {
      if (!cancelled) setReady(true);
    };
    const ric = (
      window as Window & {
        requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      }
    ).requestIdleCallback;
    if (typeof ric === "function") {
      ric(enable, { timeout: 1800 });
    } else {
      const t = window.setTimeout(enable, 600);
      return () => {
        cancelled = true;
        window.clearTimeout(t);
      };
    }
    return () => {
      cancelled = true;
    };
  }, [reduceMotion]);

  useEffect(() => {
    const el = ref.current;
    if (!el || !ready || reduceMotion) return;
    el.play().catch(() => undefined);
  }, [ready, reduceMotion]);

  if (reduceMotion && poster) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={poster} alt="" className={className} loading="lazy" decoding="async" />
    );
  }

  return (
    <video
      ref={ref}
      src={ready ? src : undefined}
      poster={poster}
      muted
      loop
      playsInline
      preload="none"
      className={className}
      aria-label="הדגמת מוצר"
    />
  );
}

function PhoneFrame({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative mx-auto w-full max-w-[280px] sm:max-w-[300px] ${className}`}>
      <div className="absolute -inset-5 rounded-[42px] bg-[radial-gradient(circle_at_top,#E8D4AF_0%,transparent_55%)] opacity-90 blur-2xl" aria-hidden />
      <div className="relative rounded-[36px] border border-white/80 bg-gradient-to-br from-[#F8EFE1] via-[#FFFDF9] to-[#E7D7BF] p-[9px] shadow-[0_35px_95px_rgba(58,39,20,0.22)]">
        <div className="rounded-[28px] border border-[#221811]/10 bg-[#17120E] p-[7px] shadow-inner">
          <div className="overflow-hidden rounded-[22px] bg-black aspect-[9/16]">{children}</div>
        </div>
      </div>
    </div>
  );
}

function SectionEyebrow({
  children,
  onDark = false,
}: {
  children: React.ReactNode;
  onDark?: boolean;
}) {
  return (
    <p
      className={`text-sm font-black tracking-[0.14em] ${
        onDark ? "text-[#E8C988]" : "text-[#7A5530]"
      }`}
    >
      {children}
    </p>
  );
}

export default function WeddingRsvpMarketingPage() {
  const reduceMotion = useReducedMotion();

  return (
    <div dir="rtl" className="min-h-screen overflow-hidden bg-[#FBF6EE] text-[#3F3025]">
      {/* ===== 1. HERO — flush under sticky header ===== */}
      <section
        aria-labelledby="wedding-rsvp-h1"
        className="relative isolate -mt-0 overflow-hidden border-b border-[#E8D9C0]/60"
      >
        <div
          className="absolute inset-0 -z-10"
          style={{
            backgroundImage:
              "linear-gradient(105deg, rgba(251,246,238,0.94) 0%, rgba(251,246,238,0.78) 42%, rgba(44,36,28,0.35) 100%), url(/marketing/invites/invite-wedding-mia-alon.webp)",
            backgroundSize: "cover",
            backgroundPosition: "center top",
          }}
          aria-hidden
        />
        <div
          className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_12%_18%,rgba(201,164,92,0.22),transparent_42%),radial-gradient(circle_at_88%_70%,rgba(58,43,34,0.18),transparent_45%)]"
          aria-hidden
        />

        <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 pb-16 pt-8 md:gap-12 md:px-8 md:pb-20 md:pt-10 lg:grid-cols-[1.12fr_0.88fr]">
          <motion.div
            initial={reduceMotion ? false : "hidden"}
            animate="visible"
            variants={fadeUp}
            transition={{ duration: 0.75 }}
          >
            <h1
              id="wedding-rsvp-h1"
              className="max-w-2xl text-[2rem] font-black leading-[1.12] tracking-[-0.03em] text-[#2C241C] md:text-5xl md:leading-[1.1]"
            >
              אישורי הגעה לחתונה,{" "}
              <span className="bg-gradient-to-l from-[#B48A4A] via-[#D3B47C] to-[#84613A] bg-clip-text text-transparent">
                בלי לרדוף אחרי האורחים
              </span>
            </h1>

            <p className="mt-5 max-w-xl text-xl font-bold leading-9 text-[#5E4735] md:text-2xl">
              אתם מתכננים את היום שלכם. אנחנו עוזרים לכם לדעת מי יהיה שם.
            </p>

            <p className="mt-5 max-w-xl text-base leading-8 text-[#5C4A3A] md:text-lg">
              ההתרגשות בשיאה, רשימת המוזמנים הולכת וגדלה, וכולם מחכים לדעת כמה אורחים יגיעו. עם
              Invistimo שולחים הזמנות וקישורים אישיים לאישור הגעה, מקבלים תשובות במקום אחד ומתקדמים
              לקראת החתונה עם הרבה יותר סדר ושקט.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <TrackedCtaLink href="/try" className={ctaPrimary} location={`hero_plan:${PATH}`}>
                בואו נתכנן את החתונה
              </TrackedCtaLink>
              <TrackedCtaLink
                href="#guest-journey"
                className={ctaSecondary}
                location={`hero_how:${PATH}`}
              >
                כך זה עובד
              </TrackedCtaLink>
            </div>
          </motion.div>

          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 36 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.85, delay: 0.12 }}
            className="relative"
          >
            <PhoneFrame>
              <Image
                src="/marketing/invites/invite-wedding-mia-alon.webp"
                alt="הזמנה דיגיטלית יוקרתית לחתונה — תצוגת אורח בטלפון"
                width={720}
                height={1280}
                className="h-full w-full object-cover object-top"
                priority
              />
            </PhoneFrame>
            <p className="mt-4 text-center text-sm font-semibold text-[#7A6042]">
              הזמנה אישית בטלפון — ואז קישור לאישור הגעה
            </p>
          </motion.div>
        </div>
      </section>

      {/* ===== 2. Emotional — why RSVP matters ===== */}
      <section
        aria-labelledby="why-rsvp"
        className="relative bg-[#FFFDF8] px-5 py-20 md:px-8 md:py-28"
      >
        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
          <div>
            <SectionEyebrow>למה זה חשוב</SectionEyebrow>
            <h2
              id="why-rsvp"
              className="mt-3 text-3xl font-black leading-[1.15] text-[#2C241C] md:text-4xl"
            >
              רשימת המוזמנים שלכם היא הרבה יותר מרשימה של שמות
            </h2>
            <p className="mt-5 text-lg leading-8 text-[#5C4A3A]">
              מאחורי כל שם ברשימה יש משפחה, חברים ואנשים שחשוב לכם שיהיו חלק מהיום שלכם. אבל ככל
              שהחתונה מתקרבת, מגיעות גם השאלות: מי אישר? מי עדיין מתלבט? כמה מקומות צריך להכין? ומתי
              אפשר כבר לסגור את המספרים מול האולם?
            </p>
            <p className="mt-4 text-lg leading-8 text-[#5C4A3A]">
              במקום לעבור בין שיחות, הודעות וקובצי Excel, Invistimo עוזרת לכם לרכז את התשובות ולעקוב
              אחרי ההתקדמות בצורה נוחה וברורה.
            </p>
          </div>

          <motion.div
            initial={reduceMotion ? false : "hidden"}
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={fadeUp}
            className="grid gap-4"
          >
            <div className="rounded-[28px] border border-dashed border-[#C9A45C]/70 bg-[#F7EFE0] p-5 opacity-90">
              <p className="text-xs font-black tracking-wide text-[#8A642E]">לפני — רשימה מפוזרת</p>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-[#6D5B4A]">
                <li className="line-through decoration-[#C9A45C]/50">וואטסאפ משפחתי + הערות בצד</li>
                <li className="line-through decoration-[#C9A45C]/50">Excel עם עמודות לא מעודכנות</li>
                <li className="line-through decoration-[#C9A45C]/50">«נעדכן אתכם» בלי מעקב</li>
              </ul>
            </div>
            <div className="rounded-[28px] border border-[#E6D2AA] bg-gradient-to-l from-[#FFF8EA] via-[#FFFDF7] to-[#F7E8CA] p-5 shadow-[0_18px_40px_rgba(95,68,34,0.08)]">
              <p className="text-xs font-black tracking-wide text-[#8A642E]">אחרי — תמונה מסודרת</p>
              <ul className="mt-3 space-y-2 text-sm font-semibold leading-6 text-[#3F3025]">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#C9A45C]" aria-hidden />
                  קישור אישי לכל אורח ותשובה במערכת
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#C9A45C]" aria-hidden />
                  רואים מי אישר, מי לא מגיע וממי מחכים
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#C9A45C]" aria-hidden />
                  מתקדמים להושבה ולסגירה מול האולם
                </li>
              </ul>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ===== 3. Guest journey ===== */}
      <section
        id="guest-journey"
        aria-labelledby="guest-journey-title"
        className="relative scroll-mt-24 overflow-hidden bg-[#1C1612] px-5 py-20 text-[#F7F1E8] md:px-8 md:py-28"
      >
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_10%,rgba(201,164,92,0.18),transparent_36%),radial-gradient(circle_at_10%_90%,rgba(255,255,255,0.04),transparent_40%)]"
          aria-hidden
        />
        <div className="relative mx-auto max-w-6xl">
          <SectionEyebrow onDark>חוויית האורח</SectionEyebrow>
          <h2
            id="guest-journey-title"
            className="mt-3 max-w-3xl text-3xl font-black leading-[1.15] text-[#FFF8EF] md:text-4xl"
          >
            מההזמנה ועד ה&quot;נתראה ברחבה&quot;
          </h2>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-[#D8CBB8]">
            האורח לא צריך אפליקציה. הוא פותח קישור אישי, רואה את ההזמנה, מסמן הגעה — והתשובה חוזרת
            אליכם למערכת.
          </p>

          <div className="mt-12 grid items-start gap-10 lg:grid-cols-[0.9fr_1.1fr]">
            <PhoneFrame className="lg:sticky lg:top-28">
              <QuietVideo
                src="/videos/rsvp1.mp4"
                className="h-full w-full object-cover object-top"
              />
            </PhoneFrame>

            <ol className="grid gap-4">
              {GUEST_STEPS.map((step, i) => (
                <motion.li
                  key={step.n}
                  initial={reduceMotion ? false : "hidden"}
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.4 }}
                  variants={fadeUp}
                  transition={{ delay: i * 0.06 }}
                  className="flex gap-4 rounded-[24px] border border-white/10 bg-white/[0.04] p-5 backdrop-blur"
                >
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#C9A45C]/15 text-sm font-black text-[#E8C988]">
                    {step.n}
                  </span>
                  <div>
                    <h3 className="text-lg font-black text-[#FFF8EF]">{step.title}</h3>
                    <p className="mt-1.5 text-[15px] leading-7 text-[#D0C2AF]">{step.text}</p>
                  </div>
                </motion.li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* ===== 4. Timeline STD / Invite / RSVP ===== */}
      <section
        aria-labelledby="timeline-title"
        className="relative bg-[#FBF6EE] px-5 py-20 md:px-8 md:py-28"
      >
        <div className="mx-auto max-w-6xl">
          <SectionEyebrow>תזמון נכון</SectionEyebrow>
          <h2
            id="timeline-title"
            className="mt-3 max-w-3xl text-3xl font-black leading-[1.15] text-[#2C241C] md:text-4xl"
          >
            לכל הודעה יש את הרגע הנכון שלה
          </h2>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-[#5C4A3A]">
            Save the Date, הזמנה ואישורי הגעה הם שלושה שלבים שונים — כל אחד עם מטרה משלו. כך האורחים
            לא מתבקשים להתחייב מוקדם מדי, ואתם מקבלים תשובות כשהן באמת שימושיות.
          </p>

          <ol className="relative mt-14 space-y-14">
            <div
              className="pointer-events-none absolute right-[27px] top-4 bottom-4 hidden w-px bg-gradient-to-b from-[#C9A45C] via-[#E6D2AA] to-transparent md:block"
              aria-hidden
            />
            {TIMELINE.map((step, index) => (
              <motion.li
                key={step.title}
                initial={reduceMotion ? false : "hidden"}
                whileInView="visible"
                viewport={{ once: true, amount: 0.25 }}
                variants={fadeUp}
                className="relative grid items-center gap-6 md:grid-cols-[56px_1fr_minmax(240px,320px)] md:gap-8"
              >
                <div className="relative z-10 hidden md:flex md:justify-center">
                  <span className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-[#C9A45C] bg-[#FFFDF8] text-sm font-black text-[#8B642B] shadow-[0_0_0_6px_#FBF6EE]">
                    {index + 1}
                  </span>
                </div>
                <div className="rounded-[28px] border border-[#E7D3B0] bg-[#FFFDF8] p-6 md:p-8">
                  <span className="inline-flex rounded-full border border-[#C9A45C]/40 bg-white/80 px-4 py-1.5 text-xs font-black tracking-[0.08em] text-[#8B642B]">
                    {step.when}
                  </span>
                  <h3 className="mt-4 text-2xl font-black text-[#2C241C]">{step.title}</h3>
                  <p className="mt-3 text-[15px] leading-7 text-[#5C4A3A]">{step.body}</p>
                  <Link
                    href={step.href}
                    className="mt-4 inline-flex text-sm font-black text-[#8A642E] underline-offset-4 hover:underline"
                  >
                    למידע נוסף
                  </Link>
                </div>
                <WhatsAppChatMock
                  message={step.message}
                  image={step.image}
                  imageAlt={step.imageAlt}
                  cta={step.cta}
                  time={step.time}
                />
              </motion.li>
            ))}
          </ol>

          <p className="mt-10 max-w-3xl text-sm leading-7 text-[#7A6042]">
            הזמנים הם המלצה ויכולים להשתנות לפי אופי האירוע ודרישות האולם. אתם קובעים מתי יוצא כל
            סבב במערכת.
          </p>
        </div>
      </section>

      {/* ===== 5. Guests who don't reply ===== */}
      <section
        aria-labelledby="no-reply-title"
        className="bg-[#2C241C] px-5 py-20 text-[#F7F1E8] md:px-8 md:py-28"
      >
        <div className="mx-auto max-w-6xl">
          <SectionEyebrow onDark>השלמת תשובות</SectionEyebrow>
          <h2
            id="no-reply-title"
            className="mt-3 max-w-3xl text-3xl font-black leading-[1.15] text-[#FFF8EF] md:text-4xl"
          >
            כי תמיד יש את אלה שיגידו &quot;נעדכן אתכם&quot;
          </h2>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-[#D8CBB8]">
            בכל חתונה יש אורחים שעונים מיד, כאלה שצריכים לבדוק סידור לילדים וכאלה שפשוט שוכחים להשיב.
            במקום לנסות לזכור למי כבר שלחתם הודעה, אפשר לראות מי עדיין לא אישר ולהמשיך את תהליך
            הפנייה בצורה מסודרת.
          </p>

          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {[
              {
                icon: WhatsAppBrandIcon,
                title: "סבבי WhatsApp לפי החבילה",
                text: "בחבילת ההודעות: שני סבבי וואטסאפ. סבב שני מיועד למי שעדיין לא ענה.",
              },
              {
                icon: PhoneCall,
                title: "שיחות מוקלטות או אנושיות",
                text: "חבילות שיחה נפרדות: מוקלטות, מוקד אנושי, או שילוב — לפי מה שמופיע במחשבון.",
              },
              {
                icon: CheckCircle2,
                title: "מעקב במערכת",
                text: "התשובות שמתקבלות מתעדכנות ברשומה. רואים מי נשאר פתוח בלי לנחש.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#C9A45C]/15 text-[#E8C988]">
                  {item.icon === WhatsAppBrandIcon ? (
                    <WhatsAppBrandIcon size={26} />
                  ) : (
                    <item.icon className="h-6 w-6" aria-hidden />
                  )}
                </span>
                <h3 className="mt-5 text-xl font-black text-[#FFF8EF]">{item.title}</h3>
                <p className="mt-2 text-[15px] leading-7 text-[#D0C2AF]">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== 6. Two sides, one list ===== */}
      <section
        aria-labelledby="two-sides-title"
        className="bg-[#FFFDF8] px-5 py-20 md:px-8 md:py-28"
      >
        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
          <div>
            <SectionEyebrow>ניהול רשימה</SectionEyebrow>
            <h2
              id="two-sides-title"
              className="mt-3 text-3xl font-black leading-[1.15] text-[#2C241C] md:text-4xl"
            >
              המשפחה שלו, המשפחה שלה — וכל מי שאתם אוהבים
            </h2>
            <p className="mt-5 text-lg leading-8 text-[#5C4A3A]">
              רשימת המוזמנים לחתונה מורכבת בדרך כלל מכמה מעגלים: משפחה קרובה, חברים, עבודה ואורחים
              משני הצדדים. כשכולם נמצאים ברשימה מסודרת, הרבה יותר קל לעקוב אחרי ההזמנות, האישורים
              ומספר המגיעים.
            </p>
            <p className="mt-4 text-lg leading-8 text-[#5C4A3A]">
              ב־Invistimo אפשר לחלק לפי צד או קבוצות — לפי איך שאתם עובדים בחשבון — ולשמור קישור אישי
              לכל אורח בלי לערבב תשובות.
            </p>
          </div>

          <div className="rounded-[32px] border border-[#E6D2AA] bg-gradient-to-br from-[#FFFDF8] to-[#F7EBD9] p-6 shadow-[0_22px_50px_rgba(95,68,34,0.08)] md:p-8">
            <p className="text-xs font-black tracking-wide text-[#8A642E]">המחשה: קבוצות ברשימה</p>
            <div className="mt-5 space-y-3">
              {[
                { label: "משפחת הכלה", count: "אורחים + קישור אישי לכל רשומה", tone: "bg-[#C9A45C]/20" },
                { label: "משפחת החתן", count: "מעקב אישורים באותה רשימה", tone: "bg-[#8B642B]/15" },
                { label: "חברים ועבודה", count: "סטטוס מגיע / לא מגיע / ממתין", tone: "bg-[#3A2B22]/10" },
              ].map((g) => (
                <div
                  key={g.label}
                  className={`flex items-center justify-between gap-3 rounded-2xl ${g.tone} px-4 py-3`}
                >
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-[#8A642E]" aria-hidden />
                    <span className="font-black text-[#2C241C]">{g.label}</span>
                  </div>
                  <span className="text-xs font-semibold text-[#6D5B4A]">{g.count}</span>
                </div>
              ))}
            </div>
            <p className="mt-5 text-sm leading-6 text-[#7A6042]">
              הקבוצות עוזרות גם בהמשך — כשעוברים לסידורי הושבה לפי קבוצות, אם נרכשה התוספת.
            </p>
          </div>
        </div>
      </section>

      {/* ===== 7. Seating ===== */}
      <section
        aria-labelledby="seating-title"
        className="bg-[#FBF6EE] px-5 py-20 md:px-8 md:py-28"
      >
        <div className="mx-auto max-w-6xl">
          <SectionEyebrow>מהאישור להושבה</SectionEyebrow>
          <h2
            id="seating-title"
            className="mt-3 max-w-3xl text-3xl font-black leading-[1.15] text-[#2C241C] md:text-4xl"
          >
            כשהתשובות מגיעות, מתחילים לראות את החתונה מקבלת צורה
          </h2>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-[#5C4A3A]">
            ככל שמתקבלים אישורי ההגעה, אפשר להיערך בצורה טובה יותר למספר האורחים, לתכנון השולחנות
            ולסידורי ההושבה. אם בחרתם גם בשירות ההושבה, תוכלו להמשיך לנהל את התהליך בתוך Invistimo.
          </p>

          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            <div className="overflow-hidden rounded-[28px] border border-[#E6D2AA] bg-white shadow-[0_18px_40px_rgba(58,39,20,0.08)]">
              <Image
                src="/marketing/product/webp/desktop-try-seating.webp"
                alt="מפת הושבה אמיתית ב־Invistimo עם שולחנות ושיבוץ אורחים"
                width={1200}
                height={800}
                className="h-auto w-full object-cover"
                loading="lazy"
              />
              <div className="p-5">
                <h3 className="text-lg font-black text-[#2C241C]">רשימה, מפה ושיוך לשולחנות</h3>
                <p className="mt-2 text-[15px] leading-7 text-[#5C4A3A]">
                  רואים את מצב האישורים, משבצים אורחים לשולחנות — ידנית או לפי קבוצות — ומתקנים לפי
                  משפחות והעדפות.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-5">
              <div className="overflow-hidden rounded-[28px] border border-[#E6D2AA] bg-[#17120E] shadow-[0_18px_40px_rgba(58,39,20,0.12)]">
                <div className="aspect-video">
                  <QuietVideo
                    src="/videos/sit4.mp4"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="bg-[#FFFDF8] p-5">
                  <h3 className="text-lg font-black text-[#2C241C]">הודעה אישית עם מספר שולחן</h3>
                  <p className="mt-2 text-[15px] leading-7 text-[#5C4A3A]">
                    כשיש הושבה וההגדרות מאפשרות זאת — שולחים לאורח מספר שולחן בהודעה אישית, וגם
                    בתזכורת ה־SMS לקראת האירוע.
                  </p>
                </div>
              </div>

              <ul className="grid gap-3 sm:grid-cols-2">
                {[
                  { icon: Users, t: "רשימת מוזמנים ומצב אישורים" },
                  { icon: LayoutGrid, t: "מפת הושבה אמיתית" },
                  { icon: UtensilsCrossed, t: "שיוך אורחים לשולחנות" },
                  { icon: CalendarHeart, t: "תזכורת עם מספר שולחן" },
                ].map((x) => (
                  <li
                    key={x.t}
                    className="flex items-center gap-3 rounded-2xl border border-[#E6D2AA] bg-white px-4 py-3 text-sm font-bold text-[#3F3025]"
                  >
                    <x.icon className="h-5 w-5 shrink-0 text-[#C9A45C]" aria-hidden />
                    {x.t}
                  </li>
                ))}
              </ul>

              <TrackedCtaLink
                href="/seating-explained"
                className={ctaGold}
                location={`seating_cta:${PATH}`}
              >
                לסידורי הושבה
              </TrackedCtaLink>
            </div>
          </div>
        </div>
      </section>

      {/* ===== 8. Benefits ===== */}
      <section
        aria-labelledby="benefits-title"
        className="bg-[#FFFDF8] px-5 py-20 md:px-8 md:py-28"
      >
        <div className="mx-auto max-w-6xl">
          <SectionEyebrow>הכול במקום אחד</SectionEyebrow>
          <h2
            id="benefits-title"
            className="mt-3 max-w-3xl text-3xl font-black leading-[1.15] text-[#2C241C] md:text-4xl"
          >
            יותר מסודר לכם. יותר נעים לאורחים.
          </h2>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {BENEFITS.map((b) => (
              <Link
                key={b.title}
                href={b.href}
                className="group rounded-[28px] border border-[#E7D3B0] bg-[#FBF6EE] p-6 transition hover:-translate-y-1 hover:border-[#C9A45C] hover:shadow-[0_18px_40px_rgba(44,36,28,0.08)]"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#2C241C] text-[#C9A45C] transition group-hover:bg-[#3A2B22]">
                  <b.icon className="h-6 w-6" aria-hidden />
                </span>
                <h3 className="mt-5 text-xl font-black text-[#2C241C]">{b.title}</h3>
                <p className="mt-2 text-[15px] leading-7 text-[#5C4A3A]">{b.text}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ===== 9. Packages ===== */}
      <section
        aria-labelledby="packages-title"
        className="bg-[#1C1612] px-5 py-20 text-[#F7F1E8] md:px-8 md:py-28"
      >
        <div className="mx-auto max-w-6xl">
          <SectionEyebrow onDark>בחירת שירות</SectionEyebrow>
          <h2
            id="packages-title"
            className="mt-3 max-w-3xl text-3xl font-black leading-[1.15] text-[#FFF8EF] md:text-4xl"
          >
            החתונה שלכם. הדרך שמתאימה לכם.
          </h2>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-[#D8CBB8]">
            יש זוגות שמעדיפים לנהל את אישורי ההגעה באמצעות הודעות, ויש כאלה שרוצים לשלב גם שיחות
            טלפוניות. ב־Invistimo תוכלו לבחור את השירות המתאים להיקף המוזמנים ולדרך שבה תרצו לנהל את
            התהליך. המחיר לפי מספר רשומות — בלי מחיר אחיד מומצא.
          </p>

          <div className="mt-12 grid gap-5 md:grid-cols-2">
            {PACKAGES.map((p) => (
              <div
                key={p.title}
                className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6"
              >
                <h3 className="text-xl font-black text-[#FFF8EF]">{p.title}</h3>
                <p className="mt-3 text-[15px] leading-7 text-[#D0C2AF]">{p.text}</p>
              </div>
            ))}
          </div>

          <div className="mt-10">
            <TrackedCtaLink href="/pricing" className={ctaGold} location={`packages_cta:${PATH}`}>
              לצפייה בחבילות ובמחירים
            </TrackedCtaLink>
          </div>
        </div>
      </section>

      {/* ===== 10. FAQ ===== */}
      <section
        aria-labelledby="faq-title"
        className="bg-[#FFFDF8] px-5 py-20 md:px-8 md:py-28"
      >
        <div className="mx-auto max-w-3xl">
          <SectionEyebrow>שאלות נפוצות</SectionEyebrow>
          <h2
            id="faq-title"
            className="mt-3 text-3xl font-black leading-[1.15] text-[#2C241C] md:text-4xl"
          >
            כל מה שחשוב לדעת לפני ששולחים אישורי הגעה לחתונה
          </h2>

          <div className="mt-10 space-y-3">
            {WEDDING_RSVP_FAQS.map((faq) => (
              <details
                key={faq.q}
                className="group rounded-[24px] border border-[#E6D2AA] bg-white px-5 py-4 open:shadow-[0_12px_30px_rgba(95,68,34,0.06)]"
              >
                <summary className="cursor-pointer list-none">
                  <h3 className="text-lg font-black text-[#35281F]">{faq.q}</h3>
                </summary>
                <p className="mt-3 text-[15px] leading-8 text-[#5C4A3A]">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ===== 11. Closing CTA ===== */}
      <section
        aria-labelledby="closing-title"
        className="relative overflow-hidden bg-[#FBF6EE] px-5 py-20 md:px-8 md:py-28"
      >
        <div
          className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(201,164,92,0.2),transparent_40%),radial-gradient(circle_at_20%_80%,rgba(58,43,34,0.06),transparent_42%)]"
          aria-hidden
        />
        <div className="relative mx-auto max-w-3xl text-center">
          <h2
            id="closing-title"
            className="text-3xl font-black leading-[1.2] text-[#2C241C] md:text-4xl"
          >
            הדבר היחיד שאתם צריכים לרדוף אחריו הוא הרגע שבו תיפגשו מתחת לחופה
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-[#5C4A3A]">
            אתם דואגים לחגיגה, לאנשים ולרגעים שלא תשכחו. אנחנו כאן כדי לעזור לכם להגיע אליהם עם
            רשימת מוזמנים מסודרת, אישורי הגעה במקום אחד והרבה פחות סימני שאלה.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <TrackedCtaLink href="/try" className={ctaPrimary} location={`closing_start:${PATH}`}>
              בואו נתחיל
            </TrackedCtaLink>
            <TrackedCtaLink
              href="/pricing"
              className={ctaSecondary}
              location={`closing_pricing:${PATH}`}
            >
              לצפייה בחבילות
            </TrackedCtaLink>
          </div>

          <nav
            aria-label="קישורים קשורים"
            className="mt-14 flex flex-wrap items-center justify-center gap-3"
          >
            {[
              { href: "/rsvp/whatsapp", label: "אישורי הגעה ב־WhatsApp" },
              { href: "/rsvp/save-the-date", label: "Save the Date" },
              { href: "/invitations/chatuna", label: "הזמנות דיגיטליות" },
              { href: "/seating-explained", label: "סידורי הושבה" },
              { href: "/pricing", label: "חבילות ומחירים" },
              { href: "/rsvp", label: "אישורי הגעה לכל אירוע" },
            ].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="inline-flex min-h-11 items-center rounded-full border border-[#E6D2AA] bg-white px-4 py-2 text-sm font-bold text-[#5E4735] transition hover:border-[#C9A45C]"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      </section>
    </div>
  );
}
