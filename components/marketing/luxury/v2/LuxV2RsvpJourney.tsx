"use client";

import { useEffect, useState, type Ref } from "react";
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
    cta: "לפתיחת ההזמנה",
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

function useWideScreen() {
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const sync = () => setWide(mq.matches);
    sync();
    mq.addEventListener?.("change", sync);
    return () => mq.removeEventListener?.("change", sync);
  }, []);
  return wide;
}

/**
 * WhatsApp journey you can actually step through: open the invitation,
 * then confirm attendance. Scroll still advances the story on desktop.
 */
export default function LuxV2RsvpJourney() {
  const { ref, progress, reduceMotion } = useScrollProgress();
  const wide = useWideScreen();
  const scrollIndex = reduceMotion || !wide ? 0 : progress < 0.42 ? 0 : progress < 0.74 ? 1 : 2;
  const [picked, setPicked] = useState<number | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [rsvp, setRsvp] = useState<null | "yes" | "no">(null);
  const stepIndex = picked ?? scrollIndex;
  const active = STEPS[stepIndex];
  const titleIn = reduceMotion || !wide ? 1 : 0.86 + segment(progress, 0, 0.22) * 0.14;
  const onDark = wide && progress > 0.45;

  const chooseStep = (index: number) => {
    setPicked(index);
    setInviteOpen(false);
  };

  return (
    <section
      ref={ref as Ref<HTMLElement>}
      dir="rtl"
      aria-labelledby="lux-v2-rsvp"
      className="relative lg:pb-[10vh]"
      style={{
        background:
          "linear-gradient(165deg, #F5EEE8 0%, #E8CFD8 28%, #B57591 62%, #842B4C 100%)",
      }}
    >
      <div className="flex items-start overflow-x-clip lg:sticky lg:top-0">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          aria-hidden
          style={{
            backgroundImage:
              "radial-gradient(circle at 15% 20%, rgba(245,238,232,0.55), transparent 35%), radial-gradient(circle at 85% 70%, rgba(66,24,47,0.25), transparent 40%)",
          }}
        />

        <div
          className="pointer-events-none absolute inset-x-0 top-0 z-[5] h-16 bg-gradient-to-b from-[#E8D9C8] to-transparent"
          aria-hidden
        />

        <div className="relative z-10 mx-auto grid w-full max-w-[1200px] items-center gap-10 px-4 py-16 sm:px-6 md:grid-cols-[1fr_0.95fr] md:px-10">
          <div
            style={{
              opacity: titleIn,
              transform:
                reduceMotion || !wide ? undefined : `translateY(${(1 - titleIn) * 24}px)`,
            }}
          >
            <p
              className={`text-xs font-bold tracking-[0.28em] ${
                onDark ? "text-[#F5EEE8]/85" : "text-[#842B4C]"
              }`}
            >
              אישורי הגעה · WhatsApp
            </p>
            <h2
              id="lux-v2-rsvp"
              className={`mt-4 text-[36px] font-black leading-[1.08] tracking-[-0.035em] sm:text-[48px] md:text-[56px] ${
                onDark ? "text-[#F5EEE8]" : "text-[#42182F]"
              }`}
            >
              מההודעה הראשונה
              <span className="mt-1 block">עד שכולם אומרים מגיעים</span>
            </h2>
            <p
              className={`mt-5 max-w-md text-lg leading-8 ${
                onDark ? "text-[#F5EEE8]/88" : "text-[#6B5360]"
              }`}
            >
              לא צריך לבקש התחייבות חודשים מראש. שולחים את ההודעה הנכונה בזמן הנכון —
              והתשובות מתרכזות במקום אחד.
            </p>

            <ol className="mt-8 space-y-3">
              {STEPS.map((step, i) => {
                const on = i === stepIndex;
                return (
                  <li key={step.title}>
                    <button
                      type="button"
                      onClick={() => chooseStep(i)}
                      aria-pressed={on}
                      className={`w-full border px-4 py-3 text-right transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C5A582] ${
                        on
                          ? onDark
                            ? "border-[#F5EEE8] bg-[#F5EEE8]/15 text-[#F5EEE8]"
                            : "border-[#42182F] bg-[#42182F] text-[#F5EEE8]"
                          : onDark
                            ? "border-[#F5EEE8]/25 text-[#F5EEE8]/70 hover:border-[#F5EEE8]/60"
                            : "border-[#C5A582]/40 text-[#6B5360] hover:border-[#842B4C]"
                      }`}
                    >
                      <p className="text-[11px] font-bold tracking-[0.14em] opacity-80">
                        {step.when}
                      </p>
                      <p className="mt-1 text-base font-extrabold">{step.title}</p>
                      {on ? <p className="mt-1 text-sm leading-6 opacity-90">{step.body}</p> : null}
                    </button>
                  </li>
                );
              })}
            </ol>

            <div className="mt-8 flex flex-wrap gap-3">
              <TrackedCtaLink href="/rsvp" location="lux_v2_rsvp" className={luxBtnPrimary}>
                איך עובדים אישורי ההגעה
              </TrackedCtaLink>
              <TrackedCtaLink href="/rsvp/whatsapp" location="lux_v2_wa" className={luxBtnSecondary}>
                WhatsApp
              </TrackedCtaLink>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[380px]">
            <div className="overflow-hidden border border-[#C5A582]/40 bg-[#EDE4DC] shadow-[0_40px_100px_rgba(66,24,47,0.18)]">
              <div className="flex items-center gap-3 bg-[#075E54] px-3.5 py-2.5 text-white">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#C5A582] text-xs font-black text-[#42182F]">
                  IN
                </span>
                <div>
                  <p className="text-sm font-black">Invistimo</p>
                  <p className="text-[11px] text-white/70">עסק</p>
                </div>
              </div>
              <div
                className="relative min-h-[460px] px-2.5 py-3"
                style={{
                  backgroundImage: "radial-gradient(rgba(0,0,0,0.04) 1px, transparent 1px)",
                  backgroundSize: "14px 14px",
                  backgroundColor: "#EDE4DC",
                }}
              >
                {inviteOpen ? (
                  <div className="flex min-h-[430px] flex-col bg-[#F5EEE8]">
                    <img
                      src={active.image}
                      alt=""
                      className="h-44 w-full object-cover object-top"
                    />
                    <div className="flex flex-1 flex-col px-4 py-4 text-[#42182F]">
                      <p className="text-base font-black">החתונה של מיה ואלון</p>
                      <p className="mt-1 text-sm text-[#6B5360]">24.06.2027 · אולמי אלכסנדר</p>
                      {rsvp ? (
                        <p className="mt-5 border border-[#C5A582] px-3 py-3 text-sm font-bold" role="status">
                          {rsvp === "yes"
                            ? "האישור נשמר · מגיעים"
                            : "האישור נשמר · לא מגיעים"}
                        </p>
                      ) : (
                        <div className="mt-5 grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setRsvp("yes")}
                            className="border border-[#42182F] bg-[#42182F] px-3 py-3 text-sm font-extrabold text-[#F5EEE8]"
                          >
                            מגיעים
                          </button>
                          <button
                            type="button"
                            onClick={() => setRsvp("no")}
                            className="border border-[#C5A582] bg-[#F5EEE8] px-3 py-3 text-sm font-extrabold text-[#42182F]"
                          >
                            לא מגיעים
                          </button>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => setInviteOpen(false)}
                        className="mt-4 text-right text-xs font-bold text-[#842B4C]"
                      >
                        חזרה להודעה
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mr-auto max-w-[94%] overflow-hidden bg-white shadow-sm">
                    <img
                      src={active.image}
                      alt=""
                      className="aspect-[4/3] w-full object-cover object-top"
                      decoding="async"
                    />
                    <div className="whitespace-pre-line px-3 py-2.5 text-[13px] leading-[1.55] text-[#111B21]">
                      {active.message}
                    </div>
                    {active.cta ? (
                      <button
                        type="button"
                        onClick={() => setInviteOpen(true)}
                        className="block w-full border-t border-[#E9EDEF] px-3 py-2.5 text-center text-[13.5px] font-semibold text-[#027EB5]"
                      >
                        {active.cta}
                      </button>
                    ) : null}
                    {rsvp && stepIndex === 2 ? (
                      <p className="border-t border-[#E9EDEF] px-3 py-2 text-[12px] font-bold text-[#075E54]" role="status">
                        {rsvp === "yes" ? "התקבל אישור הגעה" : "התקבל עדכון: לא מגיעים"}
                      </p>
                    ) : null}
                    <div className="px-3 pb-1.5 text-left text-[10px] text-[#667781]">{active.time}</div>
                  </div>
                )}
              </div>
            </div>
            <p
              className={`mt-4 text-center text-[11px] font-medium tracking-wide ${
                onDark ? "text-[#F5EEE8]/75" : "text-[#42182F]/60"
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
