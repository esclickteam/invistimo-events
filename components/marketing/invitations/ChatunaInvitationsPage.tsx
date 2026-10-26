"use client";

import { useEffect, useId, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Frank_Ruhl_Libre } from "next/font/google";
import { motion, useReducedMotion } from "framer-motion";
import {
  ANIMATION_DEMOS,
  CUSTOMIZE_OPTIONS,
  DEMO_COUPLE,
  INVITATION_DESIGNS,
  INVITATION_FAQS,
  PRE_SEND_CHECKS,
  PRINT_VS_DIGITAL,
  PROCESS_STEPS,
  REAL_EXAMPLE_INVITE,
  WEDDING_STYLE_IDEAS,
  type InvitationDesign,
} from "@/components/marketing/invitations/designs";
import InvitationArt from "@/components/marketing/invitations/InvitationArt";
import "@/components/marketing/invitations/invite-motion.css";
import PublicAutoplayVideo from "@/components/marketing/PublicAutoplayVideo";
import { addonPrice } from "@/lib/pricing/packageQuote";

const display = Frank_Ruhl_Libre({
  subsets: ["hebrew", "latin"],
  weight: ["500", "700"],
  display: "swap",
  variable: "--font-invite-display",
});

const designMessages = addonPrice("messages", "design");
const designCalls = addonPrice("voice", "design");

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0 },
};

const primaryCta =
  "inline-flex min-h-12 items-center justify-center rounded-full bg-gradient-to-l from-[#2C211B] via-[#5A4333] to-[#3A2B22] px-8 py-3 text-base font-bold text-[#F7F1E6] shadow-[0_18px_40px_rgba(58,39,20,0.22)] transition hover:-translate-y-0.5";
const secondaryCta =
  "inline-flex min-h-12 items-center justify-center rounded-full border border-[#DCC7A6] bg-white/80 px-8 py-3 text-base font-bold text-[#5E4735] backdrop-blur transition hover:bg-white";

function SectionShell({
  id,
  children,
  dark = false,
  className = "",
}: {
  id?: string;
  children: React.ReactNode;
  dark?: boolean;
  className?: string;
}) {
  return (
    <section
      id={id}
      className={`relative px-5 py-16 md:px-8 md:py-24 ${
        dark ? "bg-[#17120E] text-[#F3E7D2]" : "text-[#2C241C]"
      } ${className}`}
    >
      {children}
    </section>
  );
}

function SectionHead({
  eyebrow,
  title,
  lede,
  light = false,
}: {
  eyebrow?: string;
  title: string;
  lede?: string;
  light?: boolean;
}) {
  return (
    <div className="mx-auto mb-10 max-w-3xl text-center md:mb-14">
      {eyebrow ? (
        <p
          className={`mb-3 text-sm font-bold tracking-[0.18em] ${
            light ? "text-[#E8D1A5]" : "text-[#A77A38]"
          }`}
        >
          {eyebrow}
        </p>
      ) : null}
      <h2
        className={`font-[family-name:var(--font-invite-display)] text-3xl font-medium leading-tight md:text-5xl ${
          light ? "text-[#F7F1E6]" : "text-[#241E18]"
        }`}
      >
        {title}
      </h2>
      {lede ? (
        <p
          className={`mx-auto mt-5 max-w-2xl text-base leading-8 md:text-lg ${
            light ? "text-[#D8C4A4]" : "text-[#5C4A38]"
          }`}
        >
          {lede}
        </p>
      ) : null}
    </div>
  );
}

function PhoneFrame({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`mx-auto w-full max-w-[280px] ${className}`}>
      <div className="rounded-[2rem] border border-[#2C241C]/15 bg-[#1A1510] p-2 shadow-[0_30px_80px_rgba(36,24,16,0.28)]">
        <div className="overflow-hidden rounded-[1.55rem] bg-[#F7F1E6]">{children}</div>
      </div>
    </div>
  );
}

function GalleryModal({
  design,
  onClose,
}: {
  design: InvitationDesign;
  onClose: () => void;
}) {
  const titleId = useId();
  const reduce = useReducedMotion();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-[80] flex items-end justify-center bg-[#17120E]/72 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-[28px] bg-[#FBF6EE] p-5 shadow-2xl md:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold tracking-[0.16em] text-[#A77A38]">{design.name}</p>
            <h3 id={titleId} className="mt-1 font-[family-name:var(--font-invite-display)] text-3xl text-[#241E18]">
              {design.nameHe}
            </h3>
            <p className="mt-2 max-w-xl text-sm leading-7 text-[#5C4A38]">{design.description}</p>
            <p className="mt-2 inline-flex rounded-full border border-[#E6D2AA] bg-white px-3 py-1 text-xs font-bold text-[#7A6042]">
              {design.availabilityNote}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[#DCC7A6] bg-white px-4 py-2 text-sm font-bold text-[#5E4735]"
          >
            סגירה
          </button>
        </div>

        <div className="mt-8 grid items-start gap-8 md:grid-cols-[1.1fr_0.9fr]">
          <InvitationArt id={design.id} animated={!reduce && design.animated} className="mx-auto w-full max-w-md shadow-xl" />
          <div>
            <p className="mb-3 text-sm font-bold text-[#7A6042]">תצוגת מובייל</p>
            <PhoneFrame>
              <InvitationArt id={design.id} compact animated={!reduce && design.animated} />
            </PhoneFrame>
            <div className="mt-6 space-y-3 text-sm leading-7 text-[#5C4A38]">
              <p>
                זו דוגמת השראה לעיצוב אישי — לא תבנית לבחירה אוטומטית בעורך. אפשר להעלות הזמנה מוכנה שלכם, או להזמין
                עיצוב דומה כתוספת בתשלום.
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                <Link href="/pricing" className={primaryCta}>
                  להזמנת עיצוב דומה
                </Link>
                <Link href="/contact" className={secondaryCta}>
                  לדבר איתנו על העיצוב
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function HeroComposition({ reduce }: { reduce: boolean | null }) {
  return (
    <div className="relative mx-auto w-full max-w-[560px] px-1 pt-4 sm:pt-6">
      <div className="pointer-events-none absolute inset-x-[8%] top-10 bottom-8 rounded-[36px] bg-[radial-gradient(circle_at_top,#E8D4AF_0%,transparent_55%)] blur-2xl" />
      <div className="relative flex items-end justify-center pb-2">
        <div
          className={`w-[34%] shrink-0 origin-bottom -translate-y-2 -rotate-[12deg] ${
            reduce ? "" : "invite-float"
          }`}
          style={{ zIndex: 1, marginInlineEnd: "-6%" }}
        >
          <InvitationArt id="classic-ivory" compact className="shadow-2xl" />
        </div>
        <div
          className={`w-[40%] shrink-0 origin-bottom ${reduce ? "" : "invite-float-center"}`}
          style={{ zIndex: 3 }}
        >
          <InvitationArt id="modern-editorial" compact className="shadow-[0_35px_80px_rgba(36,24,16,0.38)]" />
        </div>
        <div
          className={`w-[34%] shrink-0 origin-bottom -translate-y-2 rotate-[12deg] ${
            reduce ? "" : "invite-float-delayed"
          }`}
          style={{ zIndex: 2, marginInlineStart: "-6%" }}
        >
          <InvitationArt id="botanical-elegance" compact animated={!reduce} className="shadow-2xl" />
        </div>
      </div>
    </div>
  );
}

function AnimationDemoCard({
  demo,
  reduce,
}: {
  demo: (typeof ANIMATION_DEMOS)[number];
  reduce: boolean | null;
}) {
  const [staticView, setStaticView] = useState(false);
  const motionOn = !reduce && !staticView;

  return (
    <div className="overflow-hidden rounded-[28px] border border-[#E6D2AA] bg-white/70 shadow-[0_18px_50px_rgba(91,63,32,0.08)]">
      <div className="relative aspect-[4/5] bg-[#F7F1E6] p-5">
        {demo.id === "envelope" ? (
          <div className="relative mx-auto mt-6 h-56 w-44 perspective-[800px]">
            <div className="absolute inset-x-4 bottom-0 top-10 rounded-md bg-[#FBF6EE] shadow-md">
              <div className={`flex h-full flex-col items-center justify-center ${motionOn ? "invite-reveal" : ""}`}>
                <p className="font-[family-name:var(--font-invite-display)] text-xl">{DEMO_COUPLE.bride}</p>
                <p className="text-[#C9A962]">&</p>
                <p className="font-[family-name:var(--font-invite-display)] text-xl">{DEMO_COUPLE.groom}</p>
              </div>
            </div>
            <div className="absolute inset-x-0 bottom-0 h-40 rounded-md bg-[#E8D4AF]" />
            <div
              className={`absolute inset-x-0 top-8 h-24 origin-top bg-[#D4B483] ${
                motionOn ? "invite-envelope-flap" : ""
              }`}
              style={{ clipPath: "polygon(0 0, 100% 0, 50% 100%)" }}
            />
          </div>
        ) : null}

        {demo.id === "satin" ? (
          <InvitationArt id="silk-champagne" compact animated={motionOn} className="mx-auto max-w-[220px]" />
        ) : null}

        {demo.id === "bloom" ? (
          <InvitationArt id="botanical-elegance" compact animated={motionOn} className="mx-auto max-w-[220px]" />
        ) : null}

        {demo.id === "cinematic" ? (
          <div className="flex h-full flex-col items-center justify-center bg-[#17120E] text-[#F3E7D2]">
            <p className={`font-[family-name:var(--font-invite-display)] text-3xl ${motionOn ? "invite-type-in" : ""}`}>
              {DEMO_COUPLE.bride} & {DEMO_COUPLE.groom}
            </p>
            <p className={`mt-4 text-sm tracking-[0.25em] text-[#C9A962] ${motionOn ? "invite-reveal" : ""}`}>
              {DEMO_COUPLE.date}
            </p>
          </div>
        ) : null}

        <span className="absolute left-3 top-3 rounded-full bg-[#17120E]/80 px-3 py-1 text-[11px] font-bold text-[#E8D1A5]">
          הדגמת קונספט
        </span>
      </div>
      <div className="space-y-3 p-5">
        <h3 className="font-[family-name:var(--font-invite-display)] text-2xl text-[#241E18]">{demo.title}</h3>
        <p className="text-sm leading-7 text-[#5C4A38]">{demo.description}</p>
        <button
          type="button"
          onClick={() => setStaticView((v) => !v)}
          className="text-sm font-bold text-[#8A642E] underline-offset-4 hover:underline"
        >
          {staticView ? "הפעלת תנועה" : "תצוגה סטטית"}
        </button>
      </div>
    </div>
  );
}

function Checklist() {
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const done = Object.values(checked).filter(Boolean).length;

  return (
    <div className="mx-auto max-w-3xl rounded-[28px] border border-[#E6D2AA] bg-white/75 p-6 shadow-[0_18px_50px_rgba(91,63,32,0.08)] md:p-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <p className="text-sm font-bold text-[#7A6042]">
          {done}/{PRE_SEND_CHECKS.length} נבדקו · נשמר במכשיר בלבד
        </p>
        <button
          type="button"
          className="text-sm font-bold text-[#8A642E] underline-offset-4 hover:underline"
          onClick={() => setChecked({})}
        >
          איפוס
        </button>
      </div>
      <ul className="space-y-3">
        {PRE_SEND_CHECKS.map((item, index) => {
          const on = Boolean(checked[index]);
          return (
            <li key={item}>
              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[#EADDC8] bg-[#FFFDF8] px-4 py-3 transition hover:bg-white">
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => setChecked((prev) => ({ ...prev, [index]: !prev[index] }))}
                  className="mt-1 h-4 w-4 accent-[#A77A38]"
                />
                <span className={`text-sm leading-7 md:text-base ${on ? "text-[#7A6042] line-through" : "text-[#3F3025]"}`}>
                  {item}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function ChatunaInvitationsPage() {
  const reduce = useReducedMotion();
  const [activeDesign, setActiveDesign] = useState<InvitationDesign | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const scrollToGallery = () => {
    document.getElementById("gallery")?.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
  };

  return (
    <div dir="rtl" className={`${display.variable} bg-[#FBF6EE] text-[#2C241C]`}>
      {/* HERO */}
      <section className="relative isolate px-5 pb-16 pt-14 md:px-8 md:pb-24 md:pt-20">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,#E9D4AF_0%,transparent_36%),radial-gradient(circle_at_top_left,#F5E8D3_0%,transparent_32%),linear-gradient(180deg,#FFFDF8_0%,#FBF6EE_55%,#F1E4D2_100%)]" />
        <div className="absolute left-[6%] top-20 -z-10 h-56 w-56 rounded-full bg-[#D8B77C]/20 blur-3xl" />
        <div className="absolute bottom-8 right-[10%] -z-10 h-64 w-64 rounded-full bg-[#B59668]/15 blur-3xl" />

        <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12">
          <motion.div initial="hidden" animate="visible" variants={fadeUp} transition={{ duration: 0.7 }}>
            <nav aria-label="מיקום בעמוד" className="mb-6 text-sm font-semibold text-[#7A6042]">
              <Link href="/" className="hover:text-[#8A642E]">
                בית
              </Link>
              <span className="px-1.5 text-[#C7A56B]">/</span>
              <span>הזמנות דיגיטליות לחתונה</span>
            </nav>

            <p className="mb-3 font-[family-name:var(--font-invite-display)] text-4xl text-[#8A642E] md:text-5xl">
              Invistimo
            </p>

            <h1 className="font-[family-name:var(--font-invite-display)] text-[2rem] font-medium leading-[1.2] text-[#241E18] sm:text-4xl md:text-5xl lg:text-[3.2rem]">
              הזמנות דיגיטליות לחתונה, בעיצוב שמרגיש בדיוק כמוכם
            </h1>

            <p className="mt-4 text-lg font-medium leading-8 text-[#5C4A38] md:mt-5 md:text-2xl md:leading-9">
              הסיפור שלכם מתחיל הרבה לפני החופה. הוא מתחיל בהזמנה.
            </p>

            <div className="mt-5 space-y-4 text-base leading-8 text-[#5C4A38] md:mt-6 md:text-lg">
              <p>יש רגע שבו החתונה מתחילה להרגיש אמיתית: כשההזמנה הראשונה נשלחת.</p>
              <p>
                עם Invistimo תוכלו לבחור הזמנה דיגיטלית לחתונה, להתאים אותה לסגנון שלכם ולשתף את הרגע המרגש עם האנשים
                שאתם אוהבים.
              </p>
              <p className="hidden sm:block">
                מעיצוב מינימליסטי ואלגנטי ועד הזמנות עם פרחים, טקסטורות יוקרתיות ואנימציות עדינות — ההזמנה שלכם יכולה
                להיות הרבה יותר מהודעה עם תאריך ומיקום.
              </p>
            </div>

            <div className="mt-7 flex flex-wrap gap-3 md:mt-8">
              <button type="button" onClick={scrollToGallery} className={primaryCta}>
                לגלות את עיצובי ההזמנות
              </button>
              <Link href="#full-example" className={secondaryCta}>
                לראות הזמנה לדוגמה
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.15 }}
          >
            <HeroComposition reduce={reduce} />
            <p className="mt-3 text-center text-xs font-semibold text-[#8A7458] sm:mt-4">
              שלוש השראות עיצוב · לא תבניות לבחירה אוטומטית במערכת
            </p>
          </motion.div>
        </div>
      </section>

      {/* WHY DIGITAL */}
      <SectionShell id="why">
        <div className="mx-auto max-w-6xl">
          <SectionHead
            eyebrow="למה דיגיטלית"
            title="כי ההזמנה היא הרושם הראשון מהחתונה שלכם"
          />
          <div className="mx-auto max-w-3xl space-y-5 text-base leading-8 text-[#5C4A38] md:text-lg">
            <p>הרבה לפני שהאורחים מגיעים לאולם, הם פוגשים את החתונה דרך ההזמנה.</p>
            <p>היא מספרת להם על האווירה שבחרתם, על הסגנון שלכם ועל הרגע שאתם עומדים לחגוג.</p>
            <p>
              הזמנה דיגיטלית מאפשרת לשלב את המראה שאתם אוהבים עם דרך שיתוף נוחה. האורחים יכולים לפתוח אותה בטלפון,
              לראות את פרטי האירוע ולשמור את המידע החשוב.
            </p>
            <p>
              בשונה מהזמנה מודפסת בלבד, הזמנה דיגיטלית יכולה להיות חלק מתהליך רחב יותר של ניהול האירוע, כולל קישור
              אישי ואישורי הגעה.
            </p>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {[
              ["עיצוב שמספר את הסיפור שלכם", "אפשר לבחור שפה חזותית שמתאימה לאופי החתונה."],
              ["שיתוף נוח", "אפשר להעביר את ההזמנה לאורחים בערוצים הנתמכים, בהתאם לשירות שנבחר."],
              ["הפרטים במקום אחד", "תאריך, שעות, אולם, כתובת ומידע חשוב."],
              ["אפשרות לעדכן פרטים", "כאשר משתמשים בהזמנה המתעדכנת במערכת, שינויים יכולים להשתקף בקישור הפעיל."],
              ["חיבור לאישורי הגעה", "במסלולים המתאימים, האורחים ממשיכים מההזמנה לאישור ההגעה האישי."],
              ["פחות התעסקות בקבצים", "אפשר לנהל את ההזמנה כחלק מהאירוע, במקום לשלוח שוב ושוב גרסאות שונות."],
            ].map(([title, text]) => (
              <div
                key={title}
                className="rounded-[24px] border border-[#E6D2AA]/80 bg-gradient-to-br from-white/90 to-[#F7EFE1]/70 p-6"
              >
                <h3 className="font-[family-name:var(--font-invite-display)] text-2xl text-[#241E18]">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-[#5C4A38] md:text-base">{text}</p>
              </div>
            ))}
          </div>
          <p className="mx-auto mt-6 max-w-3xl text-center text-sm text-[#8A7458]">
            לא כל יכולת זמינה בכל סוג הזמנה או בכל חבילה — הפרטים תלויים במסלול השירות שנבחר.
          </p>
        </div>
      </SectionShell>

      {/* GALLERY */}
      <SectionShell id="gallery" className="bg-[#F3EADF]">
        <div className="mx-auto max-w-6xl">
          <SectionHead
            eyebrow="גלריית הזמנות"
            title="לכל סיפור אהבה יש סגנון משלו"
            lede="גלו את העיצוב שיגרום לכם להגיד: זאת ההזמנה שלנו."
          />
          <p className="mx-auto mb-10 max-w-3xl text-center text-sm leading-7 text-[#6B5744]">
            שמונה סגנונות מקוריים להשראה ולעיצוב אישי. אין כרגע ספריית תבניות לבחירה אוטומטית בעורך — אפשר להעלות
            הזמנה מוכנה, או להזמין עיצוב דומה כתוספת במחשבון החבילות.
          </p>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {INVITATION_DESIGNS.map((design, index) => (
              <motion.article
                key={design.id}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.2 }}
                variants={fadeUp}
                transition={{ duration: 0.55, delay: index * 0.04 }}
                className="group"
              >
                <button
                  type="button"
                  onClick={() => setActiveDesign(design)}
                  className="w-full text-right"
                >
                  <div className="overflow-hidden rounded-[22px] shadow-[0_22px_55px_rgba(58,39,20,0.14)] transition duration-500 group-hover:-translate-y-1 group-hover:shadow-[0_30px_70px_rgba(58,39,20,0.2)]">
                    <InvitationArt id={design.id} compact animated={!reduce && design.animated} />
                  </div>
                  <div className="mt-4 space-y-1.5 px-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-[family-name:var(--font-invite-display)] text-xl text-[#241E18]">
                        {design.name}
                      </h3>
                      {design.animated ? (
                        <span className="rounded-full bg-[#17120E] px-2 py-0.5 text-[10px] font-bold text-[#E8D1A5]">
                          תנועה
                        </span>
                      ) : null}
                      <span className="rounded-full border border-[#DCC7A6] bg-white/80 px-2 py-0.5 text-[10px] font-bold text-[#7A6042]">
                        השראה
                      </span>
                    </div>
                    <p className="text-sm leading-6 text-[#5C4A38]">{design.tagline}</p>
                    <span className="inline-flex pt-1 text-sm font-bold text-[#8A642E] underline-offset-4 group-hover:underline">
                      לצפייה בהזמנה
                    </span>
                  </div>
                </button>
              </motion.article>
            ))}
          </div>

          <div className="mt-14 grid items-center gap-8 rounded-[28px] border border-[#E6D2AA] bg-white/70 p-6 md:grid-cols-[0.85fr_1.15fr] md:p-8">
            <PhoneFrame>
              <Image
                src={REAL_EXAMPLE_INVITE.src}
                alt={REAL_EXAMPLE_INVITE.alt}
                width={REAL_EXAMPLE_INVITE.width}
                height={REAL_EXAMPLE_INVITE.height}
                className="h-auto w-full"
                sizes="280px"
              />
            </PhoneFrame>
            <div>
              <p className="text-sm font-bold tracking-[0.16em] text-[#A77A38]">דוגמה אמיתית מהמערכת</p>
              <h3 className="mt-2 font-[family-name:var(--font-invite-display)] text-3xl text-[#241E18]">
                הזמנה שהועלתה ונפתחת בקישור אישי
              </h3>
              <p className="mt-4 text-base leading-8 text-[#5C4A38]">
                כך נראית הזמנה דיגיטלית אחרי העלאה למערכת: תמונה אנכית איכותית, מוצגת באורח כשהוא פותח את הקישור
                האישי שלו — ואפשר להמשיך ממנה לאישור הגעה.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/pricing" className={primaryCta}>
                  לבדיקת חבילות
                </Link>
                <Link href="/info/guides/send-digital-invitation" className={secondaryCta}>
                  איך שולחים הזמנה
                </Link>
              </div>
            </div>
          </div>
        </div>
      </SectionShell>

      {/* ANIMATIONS */}
      <SectionShell id="animations" dark>
        <div className="mx-auto max-w-6xl">
          <SectionHead
            light
            eyebrow="הזמנות מונפשות"
            title="הזמנה שלא רק רואים. הזמנה שמרגישים."
            lede="לפעמים תנועה קטנה משנה את כל החוויה. מעטפה שנפתחת, סרט סאטן שמתגלה בעדינות, פרחים שמופיעים בהדרגה או שמות שנחשפים בתנועה אלגנטית — האנימציה צריכה לשרת את העיצוב, לא להשתלט עליו."
          />
          <p className="mx-auto mb-10 max-w-3xl text-center text-sm leading-7 text-[#C9B28A]">
            ארבע ההדגמות למטה הן קונספט לעיצוב אישי. עורך ההזמנות הפעיל אינו כולל בחירת אנימציות לרכישה מיידית.
          </p>
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {ANIMATION_DEMOS.map((demo) => (
              <AnimationDemoCard key={demo.id} demo={demo} reduce={reduce} />
            ))}
          </div>
        </div>
      </SectionShell>

      {/* FULL EXAMPLE */}
      <SectionShell id="full-example">
        <div className="mx-auto max-w-6xl">
          <SectionHead
            eyebrow="הזמנה מלאה"
            title="כל הפרטים החשובים, בתוך עיצוב אחד מרגש"
            lede="הזמנה לחתונה היא לא רק שני שמות ותאריך. המפתח הוא לא להעמיס את המידע, אלא ליצור היררכיה טיפוגרפית יפה שבה לכל פרט יש מקום."
          />
          <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.05fr]">
            <div className="space-y-5 text-base leading-8 text-[#5C4A38] md:text-lg">
              <p>
                היא יכולה לכלול את שמות בני הזוג, משפט פתיחה אישי, תאריך החתונה, שם האולם, כתובת, שעות קבלת הפנים
                והחופה, שמות ההורים והמשפחות ופרטים נוספים שחשוב לשתף.
              </p>
              <ul className="space-y-2 text-sm md:text-base">
                <li>שמות בני הזוג במרכז הקומפוזיציה</li>
                <li>שעות קבלת פנים וחופה עם היררכיה ברורה</li>
                <li>שמות ההורים בתחתית, בשתי קבוצות מאוזנות</li>
              </ul>
              <p className="text-sm text-[#8A7458]">{DEMO_COUPLE.disclaimer}</p>
            </div>
            <div className="mx-auto w-full max-w-md shadow-[0_30px_80px_rgba(58,39,20,0.16)]">
              <InvitationArt id="classic-ivory" />
            </div>
          </div>
        </div>
      </SectionShell>

      {/* CUSTOMIZE */}
      <SectionShell id="customize" className="bg-[#F3EADF]">
        <div className="mx-auto max-w-6xl">
          <SectionHead
            eyebrow="התאמה אישית"
            title="הפרטים שלכם. הסגנון שלכם. ההזמנה שלכם."
            lede="יש זוגות שמעדיפים הזמנה קלאסית, ויש מי שרוצים עיצוב שמרגיש אישי במיוחד. להלן מה שניתן לערוך במערכת בפועל."
          />
          <div className="grid gap-4 md:grid-cols-2">
            {CUSTOMIZE_OPTIONS.map((item) => (
              <div key={item.title} className="rounded-[22px] border border-[#E6D2AA] bg-white/80 p-5 md:p-6">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <h3 className="font-[family-name:var(--font-invite-display)] text-xl text-[#241E18]">{item.title}</h3>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                      item.status === "supported"
                        ? "bg-[#E7EFE0] text-[#4F6B3E]"
                        : item.status === "depends"
                          ? "bg-[#F3EADF] text-[#8A642E]"
                          : "bg-[#17120E] text-[#E8D1A5]"
                    }`}
                  >
                    {item.status === "supported"
                      ? "נתמך במערכת"
                      : item.status === "depends"
                        ? "תלוי בסוג הקובץ"
                        : "דרך עיצוב אישי"}
                  </span>
                </div>
                <p className="text-sm leading-7 text-[#5C4A38]">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </SectionShell>

      {/* PROCESS */}
      <SectionShell id="process">
        <div className="mx-auto max-w-6xl">
          <SectionHead
            eyebrow="איך זה עובד"
            title="מהעיצוב הראשון ועד לרגע שהאורחים פותחים את ההזמנה"
          />
          <ol className="grid gap-4 md:grid-cols-5">
            {PROCESS_STEPS.map((step) => (
              <li key={step.n} className="rounded-[22px] border border-[#E6D2AA] bg-white/75 p-5">
                <p className="text-sm font-bold tracking-[0.2em] text-[#A77A38]">{step.n}</p>
                <h3 className="mt-2 font-[family-name:var(--font-invite-display)] text-xl text-[#241E18]">{step.title}</h3>
                <p className="mt-2 text-sm leading-7 text-[#5C4A38]">{step.text}</p>
              </li>
            ))}
          </ol>

          <div className="mt-12 grid items-center gap-8 rounded-[28px] border border-[#E6D2AA] bg-[#17120E] p-6 text-[#F3E7D2] md:grid-cols-[1.15fr_0.85fr] md:p-8">
            <div>
              <p className="text-sm font-bold tracking-[0.16em] text-[#E8D1A5]">מסע האורח</p>
              <h3 className="mt-2 font-[family-name:var(--font-invite-display)] text-3xl text-[#F7F1E6]">
                מההזמנה ועד לאישור ההגעה
              </h3>
              <p className="mt-4 text-sm leading-7 text-[#D8C4A4] md:text-base">
                סרטון אמיתי של מסע האורח במערכת: פתיחת הקישור, צפייה בהזמנה והמשך לאישור הגעה. אין כאן עורך תבניות
                מדומה — זה תהליך השיתוף והאישור כפי שהוא עובד במוצר.
              </p>
            </div>
            <div className="mx-auto w-full max-w-[280px] overflow-hidden rounded-[22px] border border-white/10 bg-black shadow-[0_24px_60px_rgba(0,0,0,0.35)]">
              <PublicAutoplayVideo
                src="/marketing/videos/hero-guest-journey.webm"
                poster="/marketing/videos/hero-guest-journey-poster.jpg"
                title="מסע אורח: הזמנה דיגיטלית ואישור הגעה"
                shellClassName="w-full"
                className="aspect-[9/16] w-full"
                frameBg="#000000"
              />
            </div>
          </div>
        </div>
      </SectionShell>

      {/* PRINT VS DIGITAL */}
      <SectionShell id="print-vs-digital" className="bg-[#F3EADF]">
        <div className="mx-auto max-w-6xl">
          <SectionHead
            eyebrow="דיגיטלית או מודפסת"
            title="מה ההבדל בין הזמנה דיגיטלית להזמנה מודפסת?"
            lede="אין צורך לראות בהן שתי אפשרויות שמתחרות זו בזו. זוגות יכולים לבחור בהזמנה דיגיטלית בלבד, או לשלב בין הזמנה מודפסת למוזמנים מסוימים לבין הזמנה דיגיטלית לשאר האורחים."
          />
          <div className="overflow-x-auto rounded-[24px] border border-[#E6D2AA] bg-white/80">
            <table className="min-w-full text-right text-sm md:text-base">
              <caption className="sr-only">השוואה בין הזמנה דיגיטלית להזמנה מודפסת</caption>
              <thead className="bg-[#17120E] text-[#F3E7D2]">
                <tr>
                  <th className="px-4 py-4 font-bold">היבט</th>
                  <th className="px-4 py-4 font-bold">הזמנה דיגיטלית</th>
                  <th className="px-4 py-4 font-bold">הזמנה מודפסת</th>
                </tr>
              </thead>
              <tbody>
                {PRINT_VS_DIGITAL.map((row) => (
                  <tr key={row.aspect} className="border-t border-[#EADDC8]">
                    <th className="px-4 py-4 font-bold text-[#3F3025]">{row.aspect}</th>
                    <td className="px-4 py-4 text-[#5C4A38]">{row.digital}</td>
                    <td className="px-4 py-4 text-[#5C4A38]">{row.print}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-center text-sm text-[#8A7458]">
            ההשוואה אינה כוללת טענת חיסכון כספי — המחיר תלוי בחבילה ובעיצוב שנבחרו.
          </p>
        </div>
      </SectionShell>

      {/* TIMING */}
      <SectionShell id="timing">
        <div className="mx-auto max-w-6xl">
          <SectionHead
            eyebrow="תזמון"
            title="לא מוקדם מדי, לא ברגע האחרון — בזמן שמתאים לאורחים שלכם"
            lede="לחתונות רבות אפשר לשקול לשלוח את ההזמנה הרשמית כחודש עד חודש וחצי לפני האירוע, כאשר פרטי החתונה כבר סגורים."
          />
          <div className="mx-auto max-w-3xl space-y-5 text-base leading-8 text-[#5C4A38]">
            <p>
              אם יש אורחים מחו״ל, חתונת קיץ, חופשות או חגים, כדאי להודיע על התאריך מוקדם יותר באמצעות Save the Date או
              הודעה מוקדמת אחרת.
            </p>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              ["Save the Date", "הודעה מוקדמת לשריון התאריך.", "/rsvp/save-the-date"],
              ["הזמנה רשמית", "שיתוף פרטי החתונה המלאים.", "#gallery"],
              ["אישורי הגעה", "איסוף תשובות לקראת האירוע, בהתאם למועד שבו האולם צריך את המספרים.", "/rsvp/chatuna"],
            ].map(([title, text, href]) => (
              <Link
                key={title}
                href={href}
                className="rounded-[22px] border border-[#E6D2AA] bg-white/80 p-6 transition hover:-translate-y-0.5 hover:bg-white"
              >
                <h3 className="font-[family-name:var(--font-invite-display)] text-2xl text-[#241E18]">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-[#5C4A38]">{text}</p>
              </Link>
            ))}
          </div>
          <p className="mt-8 text-center">
            <Link
              href="/info/guides/when-to-send-rsvp"
              className="font-bold text-[#8A642E] underline-offset-4 hover:underline"
            >
              למדריך: מתי שולחים הזמנה ואישורי הגעה
            </Link>
          </p>
        </div>
      </SectionShell>

      {/* RSVP COMBO */}
      <SectionShell id="with-rsvp" dark>
        <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <p className="mb-3 text-sm font-bold tracking-[0.18em] text-[#E8D1A5]">הזמנה + אישורי הגעה</p>
            <h2 className="font-[family-name:var(--font-invite-display)] text-3xl font-medium leading-tight text-[#F7F1E6] md:text-5xl">
              ההזמנה מרגשת. אישורי ההגעה עושים סדר.
            </h2>
            <div className="mt-6 space-y-4 text-base leading-8 text-[#D8C4A4]">
              <p>
                הזמנה דיגיטלית מאפשרת לאורחים להכיר את פרטי החתונה. כאשר משלבים אותה עם מערכת אישורי הגעה, אפשר להפוך
                את החוויה גם לתהליך מסודר של קבלת תשובות.
              </p>
              <p>
                האורחים פותחים את הקישור האישי, צופים בהזמנה ומשיבים אם הם מגיעים, בהתאם להגדרות האירוע. אתם יכולים
                לעקוב אחרי התשובות דרך מערכת ניהול המוזמנים.
              </p>
            </div>
            <Link href="/rsvp/chatuna" className={`${primaryCta} mt-8`}>
              לגלות איך עובדים אישורי ההגעה לחתונה
            </Link>
          </div>
          <div className="mx-auto w-full max-w-[300px] overflow-hidden rounded-[28px] border border-white/10 bg-black shadow-2xl">
            <PublicAutoplayVideo
              src="/marketing/videos/hero-guest-journey.webm"
              poster="/marketing/videos/hero-guest-journey-poster.jpg"
              title="מסע אורח: הזמנה דיגיטלית ואישור הגעה"
              shellClassName="w-full"
              className="aspect-[9/16] w-full"
              frameBg="#000000"
            />
          </div>
        </div>
      </SectionShell>

      {/* VS WEDDING WEBSITE */}
      <SectionShell id="vs-website">
        <div className="mx-auto max-w-6xl">
          <SectionHead
            eyebrow="הזמנה או אתר"
            title="הזמנה דיגיטלית ואתר חתונה — מה ההבדל?"
            lede="הזמנה דיגיטלית ממוקדת בהזמנת האורחים לאירוע ובהצגת הפרטים החשובים. אתר חתונה יכול להציע חוויה רחבה יותר. ב־Invistimo אלה שני רכיבים שונים."
          />
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-[28px] border border-[#E6D2AA] bg-white/80 p-6">
              <h3 className="font-[family-name:var(--font-invite-display)] text-2xl text-[#241E18]">הזמנה דיגיטלית</h3>
              <p className="mt-3 text-sm leading-7 text-[#5C4A38]">
                תמונה או עיצוב שמוצג בקישור האישי של האורח, עם פרטי האירוע ואפשרות להמשך לאישור הגעה.
              </p>
              <PhoneFrame className="mt-6">
                <Image
                  src={REAL_EXAMPLE_INVITE.src}
                  alt={REAL_EXAMPLE_INVITE.alt}
                  width={REAL_EXAMPLE_INVITE.width}
                  height={REAL_EXAMPLE_INVITE.height}
                  className="h-auto w-full"
                  sizes="280px"
                />
              </PhoneFrame>
            </div>
            <div className="rounded-[28px] border border-[#E6D2AA] bg-[#17120E] p-6 text-[#F3E7D2]">
              <h3 className="font-[family-name:var(--font-invite-display)] text-2xl text-[#F7F1E6]">אתר חתונה</h3>
              <p className="mt-3 text-sm leading-7 text-[#D8C4A4]">
                תבניות אתר מלאות עם סקשנים, גלריות ואנימציות — מסך נפרד מההזמנה לאישור.
              </p>
              <div
                className="mt-6 overflow-hidden rounded-[18px] border border-white/10 bg-[radial-gradient(circle_at_top,#2A221C_0%,#0a0a0a_70%)] px-5 py-10 text-center"
                aria-label="המחשת אתר חתונה בסגנון יוקרתי"
              >
                <p className="text-[10px] font-bold tracking-[0.35em] text-[#C9A962]">WEDDING SITE</p>
                <p className="mt-4 font-[family-name:var(--font-invite-display)] text-3xl text-white">
                  {DEMO_COUPLE.bride} & {DEMO_COUPLE.groom}
                </p>
                <p className="mt-3 text-sm text-white/55">{DEMO_COUPLE.date}</p>
                <div className="mx-auto mt-8 grid max-w-[200px] grid-cols-3 gap-2">
                  <div className="aspect-square rounded-lg bg-white/10" />
                  <div className="aspect-square rounded-lg bg-white/15" />
                  <div className="aspect-square rounded-lg bg-white/10" />
                </div>
                <p className="mt-8 text-xs tracking-[0.2em] text-[#C9A962]">GALLERY · STORY · RSVP</p>
              </div>
              <Link href="/wedding-website" className={`${secondaryCta} mt-6 border-[#C9A962]/40 bg-transparent text-[#F3E7D2]`}>
                לגלות את אתרי החתונה
              </Link>
            </div>
          </div>
        </div>
      </SectionShell>

      {/* TEMPLATE VS CUSTOM */}
      <SectionShell id="custom-design" className="bg-[#F3EADF]">
        <div className="mx-auto max-w-6xl">
          <SectionHead
            eyebrow="עיצוב"
            title="להתחיל מעיצוב שאתם אוהבים, או ליצור משהו משלכם"
            lede="תבנית מוכנה או העלאת עיצוב קיים היא דרך נוחה להתחיל. עיצוב אישי מתאים לזוגות שרוצים שפה גרפית ייחודית."
          />
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-[24px] border border-[#E6D2AA] bg-white/85 p-6">
              <InvitationArt id="modern-editorial" compact className="mx-auto mb-5 max-w-[220px] shadow-lg" />
              <h3 className="font-[family-name:var(--font-invite-display)] text-2xl text-[#241E18]">העלאת עיצוב קיים</h3>
              <p className="mt-3 text-sm leading-7 text-[#5C4A38]">
                מעלים קובץ JPEG, PNG או WebP שיצרתם או שקיבלתם ממעצב, ובודקים את התצוגה לפני השליחה.
              </p>
            </div>
            <div className="rounded-[24px] border border-[#E6D2AA] bg-white/85 p-6">
              <InvitationArt id="pearl-romance" compact className="mx-auto mb-5 max-w-[220px] shadow-lg" />
              <h3 className="font-[family-name:var(--font-invite-display)] text-2xl text-[#241E18]">עיצוב אישי</h3>
              <p className="mt-3 text-sm leading-7 text-[#5C4A38]">
                שירות בתשלום נפרד לפי המחירון הפעיל: {designMessages} ₪ בחבילת הודעות, או {designCalls} ₪ בחבילות
                שיחות. אינו כלול אוטומטית בכל חבילה.
              </p>
            </div>
          </div>
        </div>
      </SectionShell>

      {/* PRICING */}
      <SectionShell id="pricing">
        <div className="mx-auto max-w-3xl text-center">
          <SectionHead
            eyebrow="מחיר"
            title="הזמנה שמתאימה לסגנון שלכם וגם לתקציב"
            lede="מחיר הזמנה דיגיטלית תלוי בשירות שנבחר: שימוש בעיצוב קיים, יצירת הזמנה מותאמת אישית, שילוב עם Save the Date או רכישת שירותים נוספים כגון אישורי הגעה."
          />
          <div className="rounded-[28px] border border-[#E6D2AA] bg-white/85 p-8 text-right shadow-[0_18px_50px_rgba(91,63,32,0.08)]">
            <ul className="space-y-4 text-sm leading-7 text-[#5C4A38] md:text-base">
              <li>
                <strong className="text-[#241E18]">הזמנה דיגיטלית מלאה</strong> — כלולה בחבילות Invistimo. מחיר
                החבילה נקבע במחשבון לפי מספר רשומות וסוג שירות.
              </li>
              <li>
                <strong className="text-[#241E18]">עיצוב הזמנה בהתאמה אישית</strong> — תוספת {designMessages} ₪
                בחבילת הודעות, או {designCalls} ₪ בחבילות שיחות.
              </li>
              <li>
                לפני שבוחרים, כדאי לבדוק מה כלול במחיר ומהם שירותי השליחה והניהול הנלווים במחשבון החבילות.
              </li>
            </ul>
            <Link href="/pricing" className={`${primaryCta} mt-8`}>
              לבדיקת חבילות ומחירים
            </Link>
          </div>
        </div>
      </SectionShell>

      {/* STYLE IDEAS */}
      <SectionShell id="styles" className="bg-[#F3EADF]">
        <div className="mx-auto max-w-6xl">
          <SectionHead eyebrow="לפי סגנון החתונה" title="איזו הזמנה מתאימה לחתונה שלכם?" />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {WEDDING_STYLE_IDEAS.map((item) => (
              <button
                key={item.title}
                type="button"
                onClick={() => {
                  const design = INVITATION_DESIGNS.find((d) => d.id === item.designId);
                  if (design) setActiveDesign(design);
                }}
                className="rounded-[24px] border border-[#E6D2AA] bg-white/80 p-4 text-right transition hover:-translate-y-1 hover:bg-white"
              >
                <InvitationArt id={item.designId} compact className="mb-4 shadow-md" />
                <h3 className="font-[family-name:var(--font-invite-display)] text-2xl text-[#241E18]">{item.title}</h3>
                <p className="mt-2 text-sm leading-7 text-[#5C4A38]">{item.text}</p>
              </button>
            ))}
          </div>
        </div>
      </SectionShell>

      {/* CHECKLIST */}
      <SectionShell id="checklist">
        <div className="mx-auto max-w-6xl">
          <SectionHead
            eyebrow="לפני השליחה"
            title="לפני שלוחצים על שליחה, בודקים את הפרטים הקטנים"
            lede="לפני שההזמנה מגיעה לאורחים, כדאי לעבור עליה פעם נוספת ולוודא שכל הפרטים נכונים."
          />
          <Checklist />
        </div>
      </SectionShell>

      {/* FAQ */}
      <SectionShell id="faq" className="bg-[#F3EADF]">
        <div className="mx-auto max-w-3xl">
          <SectionHead eyebrow="שאלות ותשובות" title="כל מה שרציתם לדעת על הזמנות דיגיטליות לחתונה" />
          <div className="space-y-3">
            {INVITATION_FAQS.map((item, index) => {
              const open = openFaq === index;
              return (
                <div key={item.q} className="rounded-[20px] border border-[#E6D2AA] bg-white/85">
                  <button
                    type="button"
                    className="flex w-full items-start justify-between gap-4 px-5 py-4 text-right"
                    aria-expanded={open}
                    onClick={() => setOpenFaq(open ? null : index)}
                  >
                    <h3 className="text-base font-bold leading-7 text-[#241E18] md:text-lg">{item.q}</h3>
                    <span className="mt-1 text-[#A77A38]" aria-hidden>
                      {open ? "−" : "+"}
                    </span>
                  </button>
                  {open ? <p className="border-t border-[#EADDC8] px-5 py-4 text-sm leading-7 text-[#5C4A38] md:text-base">{item.a}</p> : null}
                </div>
              );
            })}
          </div>
        </div>
      </SectionShell>

      {/* CLOSING */}
      <SectionShell id="closing" dark className="pb-24">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-[family-name:var(--font-invite-display)] text-3xl font-medium leading-tight text-[#F7F1E6] md:text-5xl">
            החתונה שלכם מתחילה בהזמנה אחת מיוחדת
          </h2>
          <div className="mt-6 space-y-4 text-base leading-8 text-[#D8C4A4]">
            <p>
              יש דברים שנשארים בזיכרון הרבה אחרי האירוע. ההזמנה היא הרגע שבו אתם משתפים את האנשים האהובים עליכם
              בהתרגשות, בתאריך ובסיפור שלכם.
            </p>
            <p>
              בין אם אתם אוהבים עיצוב קלאסי, מינימליסטי, רומנטי או מלא אופי — ההזמנה צריכה להרגיש שלכם.
            </p>
            <p>
              ב־Invistimo תוכלו להתחיל מהעיצוב, לשתף את פרטי החתונה ולהמשיך לניהול מסודר של האורחים, בהתאם לשירותים
              שתבחרו.
            </p>
          </div>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <button type="button" onClick={scrollToGallery} className={primaryCta}>
              בואו למצוא את ההזמנה שלנו
            </button>
            <Link href="/pricing" className={`${secondaryCta} border-[#C9A962]/40 bg-transparent text-[#F3E7D2]`}>
              לצפייה בחבילות
            </Link>
          </div>

          <div className="mt-14 flex flex-wrap justify-center gap-3 text-sm">
            {[
              ["/invitations/chatuna", "הזמנות דיגיטליות"],
              ["/rsvp/save-the-date", "Save the Date"],
              ["/rsvp/chatuna", "אישורי הגעה לחתונה"],
              ["/rsvp/whatsapp", "אישורי הגעה ב־WhatsApp"],
              ["/info/guides/when-to-send-rsvp", "מתי שולחים"],
              ["/info/guides/send-digital-invitation", "איך שולחים הזמנה"],
              ["/info/guides/save-the-date-vs-invitation", "STD מול הזמנה"],
              ["/info/guides/cost-rsvp-wedding", "מחיר לפי רשומות"],
              ["/wedding-website", "אתרי חתונה"],
              ["/pricing", "מחירים"],
            ].map(([href, label]) => (
              <Link
                key={href}
                href={href}
                className="rounded-full border border-[#C9A962]/30 px-4 py-2 text-[#E8D1A5] transition hover:bg-white/5"
              >
                {label}
              </Link>
            ))}
          </div>

          <p className="mt-10 text-xs text-[#A89070]">עודכן לאחרונה: 25 באוקטובר 2026</p>
        </div>
      </SectionShell>

      {activeDesign ? <GalleryModal design={activeDesign} onClose={() => setActiveDesign(null)} /> : null}
    </div>
  );
}
