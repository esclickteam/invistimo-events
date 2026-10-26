"use client";

import { useState } from "react";

/**
 * Visual-only demo — does not touch real event data.
 */
export default function TableChangeDemo() {
  const [step, setStep] = useState<"before" | "after">("before");

  return (
    <div className="rounded-[28px] border border-[#E6D2AA] bg-[#FFFDF8] p-5 shadow-[0_14px_36px_rgba(58,39,20,0.06)] md:p-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black tracking-[0.12em] text-[#8A642E]">הדגמה אינטראקטיבית</p>
          <h3 className="mt-2 text-xl font-black text-[#2C241C] md:text-2xl">
            מה קורה כשאורח עובר שולחן אחרי השליחה?
          </h3>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-[#7A6042]">
            הדגמה ויזואלית בלבד — לא משנה נתוני אירוע אמיתיים במערכת.
          </p>
        </div>
        <span className="rounded-full border border-[#EADDC8] bg-white px-3 py-1.5 text-xs font-bold text-[#7A6042]">
          Demo
        </span>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div
          className={`rounded-[22px] border px-5 py-5 transition ${
            step === "before"
              ? "border-[#C9A45C] bg-[#FFF8EA] shadow-[0_10px_28px_rgba(138,100,46,0.12)]"
              : "border-[#EADDC8] bg-white/80"
          }`}
        >
          <p className="text-xs font-black tracking-[0.1em] text-[#8A642E]">מצב ראשון</p>
          <p className="mt-3 text-lg font-black text-[#2C241C]">אורח משובץ בשולחן 8</p>
          <p className="mt-2 text-sm leading-7 text-[#5C4A3A]">
            נשלחה הודעה: «מספר השולחן שלך: שולחן 8». ההודעה כבר במכשיר של האורח.
          </p>
          <div className="mt-4 rounded-2xl border border-[#E7D3B0] bg-[#FBF6EE] px-4 py-3 font-mono text-sm text-[#3F3025]" dir="rtl">
            מספר השולחן שלך:
            <br />
            <span className="font-black text-[#8A642E]">שולחן 8</span>
          </div>
        </div>

        <div
          className={`rounded-[22px] border px-5 py-5 transition ${
            step === "after"
              ? "border-[#C9A45C] bg-[#FFF8EA] shadow-[0_10px_28px_rgba(138,100,46,0.12)]"
              : "border-[#EADDC8] bg-white/80"
          }`}
        >
          <p className="text-xs font-black tracking-[0.1em] text-[#8A642E]">מצב שני</p>
          <p className="mt-3 text-lg font-black text-[#2C241C]">האורח הועבר לשולחן 11</p>
          <p className="mt-2 text-sm leading-7 text-[#5C4A3A]">
            עדכון במפה משנה את השיבוץ במערכת — אבל לא מוחק את ההודעה הישנה בטלפון.
          </p>
          {step === "after" ? (
            <div className="mt-4 space-y-3">
              <div className="rounded-2xl border border-[#B7D4BC] bg-[#F3FAF4] px-4 py-3 text-sm leading-7 text-[#2F5A38]">
                מומלץ לשלוח הודעת תיקון לאורח ולהעביר לצוות הקבלה את הרשימה העדכנית.
              </div>
              <div className="rounded-2xl border border-[#E7D3B0] bg-white px-4 py-3 text-sm leading-7 text-[#3F3025]">
                <p className="font-black text-[#2C241C]">דוגמה להודעת תיקון</p>
                <p className="mt-2">
                  שלום [שם], שימו לב לעדכון קטן בסידורי ההושבה ❤️ מספר השולחן המעודכן שלכם הוא{" "}
                  <strong className="text-[#8A642E]">שולחן 11</strong>. אנא הסתמכו על הודעה זו במקום על
                  המספר שנשלח קודם.
                </p>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm font-semibold text-[#7A6042]">לחצו «שינוי שיבוץ» כדי לראות את התיקון.</p>
          )}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => setStep("after")}
          disabled={step === "after"}
          className="inline-flex min-h-11 items-center justify-center rounded-full bg-gradient-to-l from-[#3A2B22] via-[#5A4333] to-[#2C211B] px-6 py-2.5 text-sm font-black text-white disabled:cursor-default disabled:opacity-60"
        >
          שינוי שיבוץ
        </button>
        <button
          type="button"
          onClick={() => setStep("before")}
          className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#DCC7A6] bg-white px-6 py-2.5 text-sm font-black text-[#5E4735]"
        >
          איפוס הדגמה
        </button>
      </div>
    </div>
  );
}
