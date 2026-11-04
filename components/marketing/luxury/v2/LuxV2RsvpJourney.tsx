"use client";

import type { Ref } from "react";
import TrackedCtaLink from "@/components/seo/TrackedCtaLink";
import { EVENT_INVITATION_BODY } from "@/lib/whatsapp/approvedTemplates";
import { luxBtnPrimary, luxBtnSecondary } from "@/lib/ui/luxuryButtonClasses";
import { segment, useScrollProgress } from "./useScrollProgress";

const STD =
  "Save The Date\nמיה ואלון\n\nאנחנו מתרגשים להזמין אתכם לשריין את התאריך\n24.06.2027\n\nפרטים נוספים יישלחו בקרוב 🤍";

const INVITE = EVENT_INVITATION_BODY.replace("{{1}}", "החתונה של מיה ואלון")
  .replace("{{2}}", "24.06.2027")
  .replace("{{3}}", "אולמי אלכסנדר");

const RSVP =
  "משפחה וחברים יקרים,\nהנכם מוזמנים לחתונה של מיה ואלון 🤍\n\n📅 תאריך: 24.06.2027\n📍 מיקום: אולמי אלכסנדר\n\nלאישור הגעה לחצו על הכפתור למטה 👇";

const STEPS = [
  {
    when: "3–6 חודשים לפני",
    title: "שומרים את התאריך",
    body: "ההתרגשות מתחילה עוד לפני שההזמנה מוכנה.",
    message: STD,
    image: "/marketing/videos/home-save-the-date-poster.jpg",
    cta: null as string | null,
    time: "10:12",
  },
  {
    when: "חודש לפני",
    title: "שולחים את ההזמנה",
    body: "משתפים את הרגע — בלי לבקש התחייבות מוקדמת מדי.",
    message: INVITE,
    image: "/marketing/invites/invite-wedding-mia-alon.webp",
    cta: null,
    time: "18:40",
  },
  {
    when: "שבועיים לפני",
    title: "מקבלים תשובות",
    body: "כל אורח עם קישור אישי — והתשובות מתרכזות במערכת.",
    message: RSVP,
    image: "/marketing/invites/invite-wedding-mia-alon.webp",
    cta: "לאישור הגעה",
    time: "11:05",
  },
] as const;

function PhoneFrame({
  step,
  opacity,
}: {
  step: (typeof STEPS)[number];
  opacity: number;
}) {
  return (
    <div
      className="absolute inset-0 transition-opacity duration-300"
      style={{ opacity }}
      aria-hidden={opacity < 0.2}
    >
      <div className="mx-auto w-full max-w-[360px] overflow-hidden border border-[#C5A582]/40 bg-[#EDE4DC] shadow-[0_40px_100px_rgba(66,24,47,0.18)]">
        <div className="flex items-center gap-3 bg-[#075E54] px-3.5 py-2.5 text-white">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#C5A582] text-xs font-black text-[#2A0F1D]">
            IN
          </span>
          <div>
            <p className="text-sm font-black">Invistimo</p>
            <p className="text-[11px] text-white/70">עסק</p>
          </div>
        </div>
        <div
          className="min-h-[420px] px-2.5 py-3"
          style={{
            backgroundImage: "radial-gradient(rgba(0,0,0,0.04) 1px, transparent 1px)",
            backgroundSize: "14px 14px",
            backgroundColor: "#EDE4DC",
          }}
        >
          <div className="mr-auto max-w-[94%] overflow-hidden rounded-xl rounded-tr-sm bg-white shadow-sm">
            <img
              src={step.image}
              alt=""
              className="aspect-[4/3] w-full object-cover object-top"
              loading="lazy"
              decoding="async"
            />
            <div className="whitespace-pre-line px-3 py-2.5 text-[13px] leading-[1.55] text-[#111B21]">
              {step.message}
            </div>
            {step.cta ? (
              <div className="border-t border-[#E9EDEF] px-3 py-2.5 text-center text-[13.5px] font-semibold text-[#027EB5]">
                {step.cta}
              </div>
            ) : null}
            <div className="px-3 pb-1.5 text-left text-[10px] text-[#667781]">{step.time}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Leading interaction: sticky WhatsApp process — real message templates
 * advance with scroll on dusty-rose layered backgrounds.
 */
export default function LuxV2RsvpJourney() {
  const { ref, progress, reduceMotion } = useScrollProgress();
  const stepIndex = reduceMotion
    ? 2
    : progress < 0.33
      ? 0
      : progress < 0.66
        ? 1
        : 2;
  const active = STEPS[stepIndex];
  const titleIn = reduceMotion ? 1 : segment(progress, 0, 0.15);

  return (
    <section
      ref={ref as Ref<HTMLElement>}
      dir="rtl"
      aria-labelledby="lux-v2-rsvp"
      className="relative h-[175vh]"
      style={{
        background:
          "linear-gradient(165deg, #F5EEE8 0%, #E8CFD8 28%, #B57591 62%, #842B4C 100%)",
      }}
    >
      <div className="sticky top-0 flex min-h-[100svh] items-center overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          aria-hidden
          style={{
            backgroundImage:
              "radial-gradient(circle at 15% 20%, rgba(245,238,232,0.55), transparent 35%), radial-gradient(circle at 85% 70%, rgba(66,24,47,0.25), transparent 40%)",
          }}
        />

        <div className="relative z-10 mx-auto grid w-full max-w-[1200px] items-center gap-10 px-4 py-16 sm:px-6 md:grid-cols-[1fr_0.95fr] md:px-10">
          <div
            style={{
              opacity: titleIn,
              transform: reduceMotion ? undefined : `translateY(${(1 - titleIn) * 24}px)`,
            }}
          >
            <p
              className={`text-xs font-bold tracking-[0.28em] ${
                progress > 0.45 ? "text-[#F5EEE8]/85" : "text-[#842B4C]"
              }`}
            >
              אישורי הגעה · WhatsApp
            </p>
            <h2
              id="lux-v2-rsvp"
              className={`mt-4 text-[36px] font-black leading-[1.08] tracking-[-0.035em] sm:text-[48px] md:text-[56px] ${
                progress > 0.45 ? "text-[#F5EEE8]" : "text-[#42182F]"
              }`}
            >
              מההודעה הראשונה
              <span className="mt-1 block">עד שכולם אומרים מגיעים</span>
            </h2>
            <p
              className={`mt-5 max-w-md text-lg leading-8 ${
                progress > 0.45 ? "text-[#F5EEE8]/88" : "text-[#6B5360]"
              }`}
            >
              לא צריך לבקש התחייבות חודשים מראש. שולחים את ההודעה הנכונה בזמן הנכון —
              והתשובות מתרכזות במקום אחד.
            </p>

            <ol className="mt-8 space-y-3" aria-live="polite">
              {STEPS.map((step, i) => {
                const on = i === stepIndex;
                return (
                  <li
                    key={step.title}
                    className={`border px-4 py-3 transition-colors ${
                      on
                        ? progress > 0.45
                          ? "border-[#F5EEE8] bg-[#F5EEE8]/15 text-[#F5EEE8]"
                          : "border-[#42182F] bg-[#42182F] text-[#F5EEE8]"
                        : progress > 0.45
                          ? "border-[#F5EEE8]/25 text-[#F5EEE8]/70"
                          : "border-[#C5A582]/40 text-[#6B5360]"
                    }`}
                  >
                    <p className="text-[11px] font-bold tracking-[0.14em] opacity-80">
                      {step.when}
                    </p>
                    <p className="mt-1 text-base font-extrabold">{step.title}</p>
                    {on ? <p className="mt-1 text-sm leading-6 opacity-90">{step.body}</p> : null}
                  </li>
                );
              })}
            </ol>

            <div className="mt-8 flex flex-wrap gap-3">
              <TrackedCtaLink
                href="/rsvp"
                location="lux_v2_rsvp"
                className={progress > 0.45 ? luxBtnPrimary : luxBtnPrimary}
              >
                איך עובדים אישורי ההגעה
              </TrackedCtaLink>
              <TrackedCtaLink
                href="/rsvp/whatsapp"
                location="lux_v2_wa"
                className={luxBtnSecondary}
              >
                WhatsApp
              </TrackedCtaLink>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[380px]">
            <div className="relative h-[520px] w-full">
              {STEPS.map((step, i) => (
                <PhoneFrame
                  key={step.title}
                  step={step}
                  opacity={reduceMotion ? (i === 2 ? 1 : 0) : i === stepIndex ? 1 : 0}
                />
              ))}
            </div>
            <p
              className={`mt-4 text-center text-[11px] font-medium tracking-wide ${
                progress > 0.45 ? "text-[#F5EEE8]/75" : "text-[#42182F]/60"
              }`}
            >
              הדגמה עם תבניות ההודעות האמיתיות · לא מערכת חיה
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
