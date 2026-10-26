"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useReducedMotion } from "framer-motion";

const JOURNEY_VIDEO = {
  src: "/marketing/videos/hero-guest-journey.webm",
  poster: "/marketing/videos/hero-guest-journey-poster.jpg",
} as const;

const STEPS_VIDEO = {
  src: "/videos/rsvp-steps-wa.mp4",
  poster: "/images/rsvp/rsvp-steps-wa-poster.jpg",
} as const;

type ScreenId = "whatsapp" | "invite" | "rsvp" | "thanks";

const REAL_SCREENS: {
  id: ScreenId;
  label: string;
  src: string;
  alt: string;
  caption: string;
}[] = [
  {
    id: "whatsapp",
    label: "הודעת WhatsApp",
    src: "/images/rsvp/chatuna/phone-whatsapp.jpg",
    alt: "צילום מסך אמיתי: הודעת WhatsApp עם הזמנה דיגיטלית מ־Invistimo",
    caption: "האורח מקבל הודעה עם קישור אישי — לא קובץ לקבוצה.",
  },
  {
    id: "invite",
    label: "ההזמנה",
    src: "/images/rsvp/chatuna/phone-invite.jpg",
    alt: "צילום מסך אמיתי: הזמנה דיגיטלית שנפתחת בטלפון ב־Invistimo",
    caption: "לחיצה על הקישור פותחת את ההזמנה הדיגיטלית בדפדפן.",
  },
  {
    id: "rsvp",
    label: "אישור הגעה",
    src: "/images/rsvp/chatuna/phone-rsvp-form.jpg",
    alt: "צילום מסך אמיתי: טופס אישור הגעה בעמוד האישי ב־Invistimo",
    caption: "כפתורי האישור נמצאים בעמוד שנפתח מהקישור — לא בגוף הודעת WhatsApp.",
  },
  {
    id: "thanks",
    label: "אישור קליטה",
    src: "/images/rsvp/chatuna/phone-thanks.jpg",
    alt: "צילום מסך אמיתי: מסך תודה אחרי שליחת אישור הגעה ב־Invistimo",
    caption: "האורח רואה שהתגובה נקלטה; הסטטוס מתעדכן ברשומה במערכת.",
  },
];

const VIDEO_CAPTIONS = [
  { start: 0, end: 6, text: "הודעה אישית מגיעה לטלפון של האורח" },
  { start: 6, end: 12, text: "פתיחת הקישור להזמנה הדיגיטלית" },
  { start: 12, end: 18, text: "צפייה בפרטי האירוע בהזמנה" },
  { start: 18, end: 90, text: "המשך לאישור הגעה בעמוד האישי" },
] as const;

/**
 * Real product journey — uses recorded Invistimo videos and product screenshots.
 * No invented WhatsApp UI, no fake RSVP widgets, no production writes.
 */
export default function PhoneInviteDemo() {
  const reduce = useReducedMotion();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [time, setTime] = useState(0);
  const [screen, setScreen] = useState<ScreenId>("whatsapp");
  const activeCaption =
    VIDEO_CAPTIONS.find((c) => time >= c.start && time < c.end) ?? VIDEO_CAPTIONS[0];
  const activeScreen = REAL_SCREENS.find((s) => s.id === screen) ?? REAL_SCREENS[0];

  useEffect(() => {
    const el = videoRef.current;
    if (!el || reduce) return;
    const onTime = () => setTime(el.currentTime || 0);
    el.addEventListener("timeupdate", onTime);
    return () => el.removeEventListener("timeupdate", onTime);
  }, [reduce]);

  return (
    <div
      id="phone-demo"
      className="rounded-[28px] border border-[#E6D2AA] bg-[#FFFDF8] p-5 shadow-[0_14px_36px_rgba(58,39,20,0.06)] md:p-7"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black tracking-[0.12em] text-[#8A642E]">מסע האורח · מהמערכת</p>
          <h3 className="mt-2 text-xl font-black text-[#2C241C] md:text-2xl">
            כך ההזמנה שלכם מגיעה לאורח
          </h3>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-[#7A6042]">
            סרטון וצילומי מסך אמיתיים מ־Invistimo — הודעת WhatsApp, פתיחת ההזמנה, אישור הגעה ומסך
            תודה. אין כאן עיצוב מדומה של הודעה.
          </p>
        </div>
        <span className="rounded-full border border-[#EADDC8] bg-white px-3 py-1.5 text-xs font-bold text-[#7A6042]">
          צילום מוצר
        </span>
      </div>

      <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,300px)_1fr]">
        <div className="mx-auto w-full max-w-[280px]">
          <div className="overflow-hidden rounded-[28px] border border-[#2C241C]/90 bg-[#0B0908] shadow-[0_24px_60px_rgba(44,36,28,0.28)]">
            {reduce ? (
              <Image
                src={JOURNEY_VIDEO.poster}
                alt="פוסטר סרטון מסע האורח — הזמנה דיגיטלית ב־Invistimo"
                width={720}
                height={1280}
                className="h-auto w-full object-cover"
                sizes="280px"
              />
            ) : (
              <video
                ref={videoRef}
                src={JOURNEY_VIDEO.src}
                poster={JOURNEY_VIDEO.poster}
                controls
                playsInline
                preload="metadata"
                className="aspect-[9/16] h-auto w-full object-cover"
                aria-label="סרטון אמיתי: מסע האורח מהזמנה דיגיטלית לאישור הגעה ב־Invistimo"
              >
                הסרטון אינו נתמך בדפדפן זה
              </video>
            )}
          </div>
          <p className="mt-3 text-center text-xs leading-6 text-[#9A8570]">
            סרטון מוצר · `/marketing/videos/hero-guest-journey.webm`
          </p>
        </div>

        <div className="space-y-4">
          <p className="text-xs font-black tracking-[0.1em] text-[#8A642E]">מה רואים בסרטון</p>
          <ol className="space-y-2">
            {VIDEO_CAPTIONS.map((c, i) => {
              const active = c.text === activeCaption.text;
              return (
                <li
                  key={c.text}
                  className={`rounded-2xl border px-4 py-3 text-sm leading-7 transition ${
                    active
                      ? "border-[#C7A56B] bg-[#FFF8EA] font-bold text-[#2C241C]"
                      : "border-[#EADDC8] bg-white/80 font-semibold text-[#5C4A3A]"
                  }`}
                >
                  <span className="tabular-nums text-[#C7A56B]">{i + 1}. </span>
                  {c.text}
                </li>
              );
            })}
          </ol>
          <p className="text-sm leading-7 text-[#7A6042]">
            האישור מתבצע בעמוד שנפתח מהקישור האישי — לא כבחירה בתוך גוף הודעת WhatsApp עצמה.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/try"
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-gradient-to-l from-[#3A2B22] via-[#5A4333] to-[#2C211B] px-6 py-2.5 text-sm font-black text-white"
            >
              לצפייה בדמו האמיתי
            </Link>
            <Link
              href="/invitations/chatuna"
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#DCC7A6] bg-white px-6 py-2.5 text-sm font-black text-[#5E4735]"
            >
              לעמוד ההזמנות
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-10 border-t border-[#EADDC8] pt-8">
        <p className="text-xs font-black tracking-[0.12em] text-[#8A642E]">צילומי מסך מהמערכת</p>
        <h4 className="mt-2 text-lg font-black text-[#2C241C] md:text-xl">
          אותם שלבים במסכי מוצר אמיתיים
        </h4>
        <ol className="mt-4 flex flex-wrap gap-2" aria-label="מסכי מוצר">
          {REAL_SCREENS.map((s, i) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => setScreen(s.id)}
                className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                  screen === s.id
                    ? "border-[#C7A56B] bg-[#FFF8EA] text-[#5E4735]"
                    : "border-[#EADDC8] bg-white text-[#7A6042] hover:border-[#C7A56B]"
                }`}
              >
                {i + 1}. {s.label}
              </button>
            </li>
          ))}
        </ol>

        <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,280px)_1fr]">
          <div className="overflow-hidden rounded-[24px] border border-[#E6D2AA] bg-white shadow-[0_14px_36px_rgba(58,39,20,0.08)]">
            <Image
              src={activeScreen.src}
              alt={activeScreen.alt}
              width={900}
              height={1600}
              className="h-auto w-full object-cover object-top"
              sizes="(max-width:1024px) 100vw, 280px"
            />
          </div>
          <div className="rounded-[22px] border border-[#EADDC8] bg-white/90 p-5">
            <p className="text-sm font-black text-[#2C241C]">{activeScreen.label}</p>
            <p className="mt-3 text-sm leading-7 text-[#5C4A3A] md:text-base">{activeScreen.caption}</p>
            <p className="mt-4 text-xs leading-6 text-[#9A8570]">
              צילום מסך ממסכי Invistimo · לא הדמיה מעוצבת במדריך
            </p>
          </div>
        </div>
      </div>

      <div className="mt-10 overflow-hidden rounded-[24px] border border-[#E6D2AA] bg-[#17120E] p-5 md:p-6">
        <div className="grid items-center gap-6 lg:grid-cols-[1fr_minmax(0,240px)]">
          <div>
            <p className="text-xs font-black tracking-[0.12em] text-[#E8D1A5]">סרטון נוסף · WhatsApp</p>
            <p className="mt-2 text-lg font-black text-[#F7F1E6] md:text-xl">
              מסע מלא: הודעה → הזמנה → אישור → תודה
            </p>
            <p className="mt-3 text-sm leading-7 text-[#D8C4A4]">
              סרטון מוצר נוסף מתוך תהליך אישורי ההגעה ב־WhatsApp — אותה חוויה שהאורח עובר אחרי
              פתיחת הקישור האישי.
            </p>
          </div>
          <div className="mx-auto w-full max-w-[220px] overflow-hidden rounded-[22px] border border-white/10 bg-black">
            <video
              src={STEPS_VIDEO.src}
              poster={STEPS_VIDEO.poster}
              controls
              playsInline
              preload="none"
              className="aspect-[9/16] h-auto w-full object-cover"
              aria-label="סרטון אמיתי: שלבי אישור הגעה ב־WhatsApp ב־Invistimo"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
