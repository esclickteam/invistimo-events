"use client";

import { useEffect, useMemo, useState } from "react";
import TrackedCtaLink from "@/components/seo/TrackedCtaLink";
import { EVENT_INVITATION_BODY } from "@/lib/whatsapp/approvedTemplates";
import { luxBtnPrimary, luxBtnSecondary } from "@/lib/ui/luxuryButtonClasses";
import { cn } from "@/lib/utils";

type Step = "message" | "invite" | "rsvp" | "done";

const INVITE_TEXT = EVENT_INVITATION_BODY.replace("{{1}}", "החתונה של מיה ואלון")
  .replace("{{2}}", "24.06.2027")
  .replace("{{3}}", "אולמי אלכסנדר");

/**
 * Click-through WhatsApp → personal invite → RSVP demo.
 * Sample data only — never sends messages.
 */
export default function LuxV2RsvpJourney() {
  const [step, setStep] = useState<Step>("message");
  const [status, setStatus] = useState<"yes" | "no" | null>(null);
  const [guests, setGuests] = useState(2);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [pulse, setPulse] = useState(0);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduceMotion(mq.matches);
    sync();
    mq.addEventListener?.("change", sync);
    return () => mq.removeEventListener?.("change", sync);
  }, []);

  useEffect(() => {
    setPulse((n) => n + 1);
  }, [step, status, guests]);

  const darkBand = step === "rsvp" || step === "done";

  const stepsMeta = useMemo(
    () =>
      [
        { id: "message" as const, label: "הודעת WhatsApp", body: "הודעה אישית מגיעה לאורח." },
        { id: "invite" as const, label: "קישור להזמנה", body: "פתיחת ההזמנה הדיגיטלית." },
        { id: "rsvp" as const, label: "אישור הגעה", body: "מגיעים / לא מגיעים + מספר אורחים." },
        { id: "done" as const, label: "סטטוס מעודכן", body: "התשובה נשמרת במערכת לדוגמה." },
      ] as const,
    [],
  );

  const go = (next: Step) => {
    if (next === "done" && !status) return;
    setStep(next);
  };

  const reset = () => {
    setStep("message");
    setStatus(null);
    setGuests(2);
  };

  const confirmRsvp = (next: "yes" | "no") => {
    setStatus(next);
    if (next === "no") setGuests(0);
    else if (guests < 1) setGuests(1);
    setStep("done");
  };

  return (
    <section
      dir="rtl"
      aria-labelledby="lux-v2-rsvp"
      className={cn(
        "relative overflow-hidden px-4 py-16 sm:px-6 md:px-10 md:py-24",
        !reduceMotion && "transition-[background] duration-700",
      )}
      style={{
        background: darkBand
          ? "linear-gradient(165deg, #B57591 0%, #842B4C 48%, #42182F 100%)"
          : "linear-gradient(165deg, #F5EEE8 0%, #E8CFD8 55%, #F5EEE8 100%)",
      }}
    >
      <div className="relative z-10 mx-auto grid w-full max-w-[1200px] items-start gap-10 md:grid-cols-[1fr_0.95fr]">
        <div>
          <p
            className={cn(
              "text-xs font-bold tracking-[0.28em] transition-colors duration-500",
              darkBand ? "text-[#F5EEE8]/85" : "text-[#842B4C]",
            )}
          >
            אישורי הגעה · WhatsApp
          </p>
          <h2
            id="lux-v2-rsvp"
            className={cn(
              "mt-4 text-[36px] font-black leading-[1.08] tracking-[-0.035em] transition-colors duration-500 sm:text-[48px] md:text-[56px]",
              darkBand ? "text-[#F5EEE8]" : "text-[#42182F]",
            )}
          >
            מההודעה הראשונה
            <span className="mt-1 block">עד שכולם אומרים מגיעים</span>
          </h2>
          <p
            className={cn(
              "mt-5 max-w-md text-lg leading-8 transition-colors duration-500",
              darkBand ? "text-[#F5EEE8]/88" : "text-[#6B5360]",
            )}
          >
            הדגמה אינטראקטיבית עם נתוני דוגמה בלבד — בלי שליחת הודעות אמיתיות. עברו בין
            השלבים בלחיצה.
          </p>

          <ol className="mt-8 space-y-3" aria-live="polite">
            {stepsMeta.map((item) => {
              const on = item.id === step;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => go(item.id)}
                    className={cn(
                      "w-full border px-4 py-3 text-right transition duration-300",
                      on
                        ? darkBand
                          ? "border-[#F5EEE8] bg-[#F5EEE8]/15 text-[#F5EEE8] shadow-[0_10px_30px_rgba(42,15,29,0.25)]"
                          : "border-[#42182F] bg-[#42182F] text-[#F5EEE8] shadow-[0_12px_28px_rgba(66,24,47,0.16)]"
                        : darkBand
                          ? "border-[#F5EEE8]/25 text-[#F5EEE8]/70 hover:border-[#F5EEE8]/50"
                          : "border-[#C5A582]/40 text-[#6B5360] hover:border-[#842B4C]/50",
                    )}
                  >
                    <p className="text-[11px] font-bold tracking-[0.14em] opacity-80">{item.label}</p>
                    {on ? <p className="mt-1 text-sm leading-6 opacity-90">{item.body}</p> : null}
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
          <div
            className={cn(
              "overflow-hidden border border-[#C5A582]/40 bg-[#EDE4DC] shadow-[0_40px_100px_rgba(66,24,47,0.18)]",
              !reduceMotion && "transition-shadow duration-500",
            )}
          >
            <div className="flex items-center gap-3 bg-[#075E54] px-3.5 py-2.5 text-white">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#C5A582] text-xs font-black text-[#2A0F1D]">
                IN
              </span>
              <div>
                <p className="text-sm font-black">Invistimo</p>
                <p className="text-[11px] text-white/70">הדגמה · לא שיחה חיה</p>
              </div>
            </div>

            <div
              className="relative min-h-[460px] overflow-hidden px-2.5 py-3"
              style={{
                backgroundImage: "radial-gradient(rgba(0,0,0,0.04) 1px, transparent 1px)",
                backgroundSize: "14px 14px",
                backgroundColor: "#EDE4DC",
              }}
            >
              <div
                key={`${step}-${pulse}`}
                className={cn(!reduceMotion && "lux-rsvp-panel")}
              >
                {step === "message" || step === "invite" ? (
                  <div className="mr-auto max-w-[94%] overflow-hidden rounded-xl rounded-tr-sm bg-white shadow-sm">
                    <img
                      src="/marketing/invites/invite-wedding-mia-alon.webp"
                      alt=""
                      className="aspect-[4/3] w-full object-cover object-top"
                      loading="lazy"
                      decoding="async"
                    />
                    <div className="whitespace-pre-line px-3 py-2.5 text-[13px] leading-[1.55] text-[#111B21]">
                      {INVITE_TEXT}
                    </div>
                    <button
                      type="button"
                      onClick={() => setStep(step === "message" ? "invite" : "rsvp")}
                      className="w-full border-t border-[#E9EDEF] px-3 py-2.5 text-center text-[13.5px] font-semibold text-[#027EB5] transition hover:bg-[#F7FBFE] active:bg-[#EEF6FB]"
                    >
                      {step === "message" ? "לפתוח קישור אישי" : "לאישור הגעה"}
                    </button>
                    <div className="px-3 pb-1.5 text-left text-[10px] text-[#667781]">18:40</div>
                  </div>
                ) : null}

                {step === "rsvp" ? (
                  <div className="mx-auto max-w-[94%] overflow-hidden rounded-xl bg-white p-4 shadow-sm">
                    <p className="text-[11px] font-bold tracking-[0.16em] text-[#842B4C]">
                      אישור הגעה אישי
                    </p>
                    <h3 className="mt-2 text-lg font-black text-[#42182F]">מיה ואלון · 24.06.2027</h3>
                    <p className="mt-2 text-sm leading-6 text-[#6B5360]">
                      בחרו סטטוס ועדכנו את מספר האורחים. הנתונים לדוגמה בלבד.
                    </p>
                    <div className="mt-5 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => confirmRsvp("yes")}
                        className="border border-[#42182F] bg-[#42182F] px-3 py-3 text-sm font-extrabold text-[#F5EEE8] transition hover:bg-[#842B4C] active:scale-[0.98]"
                      >
                        מגיעים
                      </button>
                      <button
                        type="button"
                        onClick={() => confirmRsvp("no")}
                        className="border border-[#C5A582]/60 bg-[#F5EEE8] px-3 py-3 text-sm font-extrabold text-[#42182F] transition hover:border-[#842B4C] active:scale-[0.98]"
                      >
                        לא מגיעים
                      </button>
                    </div>
                    <div className="mt-5 flex items-center justify-between gap-3 border border-[#C5A582]/35 px-3 py-2.5">
                      <span className="text-sm font-bold text-[#42182F]">מספר אורחים</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="h-8 w-8 border border-[#C5A582]/50 text-lg font-bold text-[#42182F] transition active:bg-[#E8D9C8]"
                          onClick={() => setGuests((n) => Math.max(1, n - 1))}
                          aria-label="הקטן מספר אורחים"
                        >
                          −
                        </button>
                        <span className="min-w-[1.5rem] text-center text-lg font-black tabular-nums text-[#42182F]">
                          {guests}
                        </span>
                        <button
                          type="button"
                          className="h-8 w-8 border border-[#C5A582]/50 text-lg font-bold text-[#42182F] transition active:bg-[#E8D9C8]"
                          onClick={() => setGuests((n) => Math.min(8, n + 1))}
                          aria-label="הגדל מספר אורחים"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                ) : null}

                {step === "done" ? (
                  <div className="mx-auto max-w-[94%] overflow-hidden rounded-xl bg-white p-4 shadow-sm ring-2 ring-[#C5A582]/50">
                    <p className="text-[11px] font-bold tracking-[0.16em] text-[#842B4C]">עודכן ✓</p>
                    <h3 className="mt-2 text-lg font-black text-[#42182F]">
                      {status === "yes" ? "מגיעים · נשמר" : "לא מגיעים · נשמר"}
                    </h3>
                    <p className="mt-3 text-sm leading-6 text-[#6B5360]">
                      סטטוס לדוגמה:{" "}
                      <strong className="text-[#42182F]">
                        {status === "yes" ? `${guests} אורחים מגיעים` : "לא מגיעים"}
                      </strong>
                      . במערכת האמיתית התשובה מתרכזת אצלכם מיד.
                    </p>
                    <button
                      type="button"
                      onClick={reset}
                      className="mt-5 w-full border border-[#C5A582]/50 bg-[#F5EEE8] px-3 py-2.5 text-sm font-extrabold text-[#42182F] transition hover:border-[#842B4C]"
                    >
                      להריץ את ההדגמה שוב
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
          <p
            className={cn(
              "mt-4 text-center text-[11px] font-medium tracking-wide transition-colors duration-500",
              darkBand ? "text-[#F5EEE8]/75" : "text-[#42182F]/60",
            )}
          >
            הדגמה עם תבניות הודעה אמיתיות · ללא שליחה
          </p>
        </div>
      </div>
    </section>
  );
}
