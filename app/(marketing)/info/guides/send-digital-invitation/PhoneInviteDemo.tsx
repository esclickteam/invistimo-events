"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

type Step = "message" | "invite" | "rsvp" | "count" | "thanks";

const STEPS: { id: Step; label: string }[] = [
  { id: "message", label: "הודעה" },
  { id: "invite", label: "הזמנה" },
  { id: "rsvp", label: "אישור" },
  { id: "count", label: "מגיעים" },
  { id: "thanks", label: "אישור קליטה" },
];

/**
 * Visual-only guest journey demo — no real messages, no production DB writes.
 */
export default function PhoneInviteDemo() {
  const [step, setStep] = useState<Step>("message");
  const [attending, setAttending] = useState<boolean | null>(null);
  const [count, setCount] = useState(2);

  const stepIndex = STEPS.findIndex((s) => s.id === step);

  function goNext() {
    if (step === "message") setStep("invite");
    else if (step === "invite") setStep("rsvp");
    else if (step === "rsvp") {
      if (attending === false) setStep("thanks");
      else setStep("count");
    } else if (step === "count") setStep("thanks");
  }

  function reset() {
    setStep("message");
    setAttending(null);
    setCount(2);
  }

  return (
    <div
      id="phone-demo"
      className="rounded-[28px] border border-[#E6D2AA] bg-[#FFFDF8] p-5 shadow-[0_14px_36px_rgba(58,39,20,0.06)] md:p-7"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black tracking-[0.12em] text-[#8A642E]">הדגמה אינטראקטיבית</p>
          <h3 className="mt-2 text-xl font-black text-[#2C241C] md:text-2xl">
            כך ההזמנה שלכם מגיעה לאורח
          </h3>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-[#7A6042]">
            נתוני דמו בלבד — אין שליחת הודעות אמיתיות ואין שמירה במסד הייצור.
          </p>
        </div>
        <span className="rounded-full border border-[#EADDC8] bg-white px-3 py-1.5 text-xs font-bold text-[#7A6042]">
          Demo
        </span>
      </div>

      <ol className="mt-5 flex flex-wrap gap-2" aria-label="שלבי ההדגמה">
        {STEPS.map((s, i) => (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => setStep(s.id)}
              className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                step === s.id
                  ? "border-[#C7A56B] bg-[#FFF8EA] text-[#5E4735]"
                  : i < stepIndex
                    ? "border-[#D4C4A8] bg-white text-[#7A6042]"
                    : "border-[#EADDC8] bg-white/70 text-[#9A8570]"
              }`}
            >
              {i + 1}. {s.label}
            </button>
          </li>
        ))}
      </ol>

      <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,280px)_1fr]">
        <div className="mx-auto w-full max-w-[260px]">
          <div className="relative overflow-hidden rounded-[36px] border-[10px] border-[#2C241C] bg-[#1A1512] shadow-[0_24px_60px_rgba(44,36,28,0.28)]">
            <div className="absolute left-1/2 top-2 z-10 h-5 w-24 -translate-x-1/2 rounded-full bg-[#0D0A08]" aria-hidden />
            <div className="min-h-[480px] bg-[#F5EFE4] pt-8" dir="rtl">
              {step === "message" && (
                <div className="space-y-3 px-3 pb-6">
                  <p className="text-center text-[10px] font-bold text-[#8A7A68]">היום 10:24</p>
                  <div className="mr-auto max-w-[90%] rounded-2xl rounded-bl-md bg-[#DCF8C6] px-3 py-2.5 text-[13px] leading-5 text-[#1A2E14] shadow-sm">
                    <p className="font-bold">מיה ואלון</p>
                    <p className="mt-1">
                      משפחה וחברים יקרים, בהתרגשות גדולה אנחנו מזמינים אתכם לחגוג איתנו.
                    </p>
                    <p className="mt-2 font-semibold text-[#1B5E20] underline">
                      invistimo.com/i/demo
                    </p>
                    <p className="mt-2 text-[10px] text-[#5A6B52]">נתוני דמו · לא קישור אמיתי</p>
                  </div>
                  <button
                    type="button"
                    onClick={goNext}
                    className="w-full rounded-xl bg-[#2C241C] py-2.5 text-sm font-bold text-white"
                  >
                    לפתיחת הקישור
                  </button>
                </div>
              )}

              {step === "invite" && (
                <div className="flex flex-col">
                  <div className="relative mx-2 overflow-hidden rounded-2xl border border-[#E6D2AA] bg-white">
                    <Image
                      src="/marketing/invites/invite-wedding-mia-alon.webp"
                      alt="דוגמת הזמנה דיגיטלית לחתונה — מיה ואלון"
                      width={640}
                      height={900}
                      className="h-auto w-full object-cover"
                      sizes="240px"
                    />
                  </div>
                  <div className="space-y-2 px-3 py-3">
                    <p className="text-center text-xs font-bold text-[#5C4A3A]">
                      יום חמישי · 17 ביוני 2027 · דמו
                    </p>
                    <button
                      type="button"
                      onClick={goNext}
                      className="w-full rounded-xl bg-[#8A642E] py-2.5 text-sm font-bold text-white"
                    >
                      לאישור הגעה
                    </button>
                  </div>
                </div>
              )}

              {step === "rsvp" && (
                <div className="space-y-4 px-4 py-6">
                  <p className="text-center text-sm font-black text-[#2C241C]">האם תגיעו?</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setAttending(true)}
                      className={`rounded-2xl border py-4 text-sm font-bold ${
                        attending === true
                          ? "border-[#8A642E] bg-[#FFF8EA] text-[#5E4735]"
                          : "border-[#EADDC8] bg-white text-[#5C4A3A]"
                      }`}
                    >
                      מגיעים
                    </button>
                    <button
                      type="button"
                      onClick={() => setAttending(false)}
                      className={`rounded-2xl border py-4 text-sm font-bold ${
                        attending === false
                          ? "border-[#8A642E] bg-[#FFF8EA] text-[#5E4735]"
                          : "border-[#EADDC8] bg-white text-[#5C4A3A]"
                      }`}
                    >
                      לא מגיעים
                    </button>
                  </div>
                  <button
                    type="button"
                    disabled={attending === null}
                    onClick={goNext}
                    className="w-full rounded-xl bg-[#2C241C] py-2.5 text-sm font-bold text-white disabled:opacity-40"
                  >
                    המשך
                  </button>
                </div>
              )}

              {step === "count" && (
                <div className="space-y-4 px-4 py-6">
                  <p className="text-center text-sm font-black text-[#2C241C]">כמה מגיעים?</p>
                  <div className="flex items-center justify-center gap-4">
                    <button
                      type="button"
                      aria-label="הפחתה"
                      onClick={() => setCount((c) => Math.max(1, c - 1))}
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-[#DCC7A6] bg-white text-lg font-black"
                    >
                      −
                    </button>
                    <span className="min-w-[3rem] text-center text-3xl font-black text-[#8A642E]">{count}</span>
                    <button
                      type="button"
                      aria-label="הוספה"
                      onClick={() => setCount((c) => Math.min(12, c + 1))}
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-[#DCC7A6] bg-white text-lg font-black"
                    >
                      +
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={goNext}
                    className="w-full rounded-xl bg-[#2C241C] py-2.5 text-sm font-bold text-white"
                  >
                    שליחת תשובה
                  </button>
                </div>
              )}

              {step === "thanks" && (
                <div className="flex flex-col items-center justify-center space-y-3 px-4 py-16 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#E8F5E9] text-2xl text-[#2E7D32]">
                    ✓
                  </div>
                  <p className="text-lg font-black text-[#2C241C]">התגובה נקלטה</p>
                  <p className="text-sm leading-6 text-[#5C4A3A]">
                    {attending === false
                      ? "רשמנו שלא תגיעו. תודה על העדכון."
                      : `רשמנו ${count} מגיעים. נתראה באירוע.`}
                  </p>
                  <p className="text-[11px] text-[#9A8570]">הדגמה בלבד · לא נשמר באירוע אמיתי</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-[22px] border border-[#EADDC8] bg-white/90 p-5">
            <p className="text-xs font-black tracking-[0.1em] text-[#8A642E]">מה קורה בשלב הזה</p>
            {step === "message" && (
              <p className="mt-3 text-sm leading-7 text-[#5C4A3A] md:text-base">
                האורח מקבל הודעה עם קישור אישי. בשליחה ידנית אתם כותבים את הנוסח; בסבבי המערכת
                נשלחת תבנית מאושרת עם הקישור. האורח לא צריך להוריד אפליקציה.
              </p>
            )}
            {step === "invite" && (
              <p className="mt-3 text-sm leading-7 text-[#5C4A3A] md:text-base">
                הקישור נפתח בדפדפן ומציג את ההזמנה עם פרטי האירוע. זו הזמנה דיגיטלית מקושרת לרשומה —
                לא קובץ תמונה שנשלח לקבוצה.
              </p>
            )}
            {step === "rsvp" && (
              <p className="mt-3 text-sm leading-7 text-[#5C4A3A] md:text-base">
                אם ההזמנה מחוברת לאישורי הגעה, האורח בוחר אם מגיע או לא. התשובה משויכת לרשומה של
                הקישור האישי.
              </p>
            )}
            {step === "count" && (
              <p className="mt-3 text-sm leading-7 text-[#5C4A3A] md:text-base">
                כשמגיעים — מעדכנים כמה אנשים ברשומה. חשוב לעקוב אחרי מספר המגיעים, לא רק אחרי מספר
                הרשומות שאישרו.
              </p>
            )}
            {step === "thanks" && (
              <p className="mt-3 text-sm leading-7 text-[#5C4A3A] md:text-base">
                האורח רואה אישור ברור שהתגובה נקלטה. בלוח הבקרה שלכם הסטטוס מתעדכן לפי הרשומה —
                מגיע, לא מגיע, או טרם השיב.
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            {step !== "thanks" ? (
              <button
                type="button"
                onClick={goNext}
                disabled={step === "rsvp" && attending === null}
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-gradient-to-l from-[#3A2B22] via-[#5A4333] to-[#2C211B] px-6 py-2.5 text-sm font-black text-white disabled:opacity-40"
              >
                לשלב הבא
              </button>
            ) : null}
            <button
              type="button"
              onClick={reset}
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#DCC7A6] bg-white px-6 py-2.5 text-sm font-black text-[#5E4735]"
            >
              איפוס הדגמה
            </button>
            <Link
              href="/try"
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#DCC7A6] bg-white px-6 py-2.5 text-sm font-black text-[#8A642E]"
            >
              לצפייה בדמו האמיתי
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
