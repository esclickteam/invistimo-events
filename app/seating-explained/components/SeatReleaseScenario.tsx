"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const STEPS = [
  {
    id: "before",
    title: "לפני האירוע",
    body: "משפחת כהן: 4 משתתפים אישרו הגעה. הוקצו להם 4 מקומות בשולחן 8.",
    seats: [
      { state: "planned" as const, label: "מתוכנן" },
      { state: "planned" as const, label: "מתוכנן" },
      { state: "planned" as const, label: "מתוכנן" },
      { state: "planned" as const, label: "מתוכנן" },
    ],
    note: "4 משובצים מתוך 10 בקיבולת השולחן",
  },
  {
    id: "reception",
    title: "במהלך קבלת הפנים",
    body: "2 משתתפים הגיעו. 2 נוספים עדיין לא הגיעו — ממתינים לבירור.",
    seats: [
      { state: "arrived" as const, label: "הגיע" },
      { state: "arrived" as const, label: "הגיע" },
      { state: "waiting" as const, label: "ממתין" },
      { state: "waiting" as const, label: "ממתין" },
    ],
    note: "המקומות עדיין שמורים — אין שחרור אוטומטי",
  },
  {
    id: "confirmed",
    title: "לאחר בירור",
    body: "מתקבל אישור ששני המשתתפים הנוספים לא יגיעו. מעדכנים את הרשומה.",
    seats: [
      { state: "arrived" as const, label: "הגיע" },
      { state: "arrived" as const, label: "הגיע" },
      { state: "wont" as const, label: "לא יגיע" },
      { state: "wont" as const, label: "לא יגיע" },
    ],
    note: "אפשר לשחרר כיסאות בפעולה מפורשת במערכת",
  },
  {
    id: "released",
    title: "תוצאה",
    body: "2 מקומות משתחררים ויכולים לשמש כרזרבה זמינה, לפי מצב השולחן והחלטת הצוות.",
    seats: [
      { state: "arrived" as const, label: "הגיע" },
      { state: "arrived" as const, label: "הגיע" },
      { state: "free" as const, label: "רזרבה" },
      { state: "free" as const, label: "רזרבה" },
    ],
    note: "2 מתוך 4 הכיסאות שוחררו — המקומות זמינים לשיבוץ מחדש",
  },
] as const;

const seatStyles: Record<string, string> = {
  planned: "border-[#C9A45C] bg-[#F3E6CF] text-[#5E4735]",
  arrived: "border-[#5C7A4A] bg-[#E8F0E2] text-[#2F4428]",
  waiting: "border-[#C4A35A] bg-[#FFF8E8] text-[#7A5530]",
  wont: "border-[#B07070] bg-[#F8EAEA] text-[#7A3535]",
  free: "border-[#8A642E] bg-white text-[#8A642E]",
};

export default function SeatReleaseScenario() {
  const [step, setStep] = useState(0);
  const current = STEPS[step];

  return (
    <div className="rounded-[28px] border border-[#E6D2AA] bg-white p-5 shadow-[0_18px_40px_rgba(95,68,34,0.08)] md:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black tracking-[0.14em] text-[#7A5530]">המחשת תהליך</p>
          <h3 className="mt-1 text-xl font-black text-[#2C241C] md:text-2xl">
            ארבעה אישרו · שניים הגיעו
          </h3>
        </div>
        <p className="rounded-full border border-[#E6D2AA] bg-[#FFFDF8] px-3 py-1 text-xs font-bold text-[#8A6B45]">
          לא צילום מערכת · המחשה בלבד
        </p>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {STEPS.map((item, index) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setStep(index)}
            className={`min-h-10 rounded-full px-3.5 py-2 text-sm font-bold transition ${
              index === step
                ? "bg-[#2C241C] text-white"
                : "border border-[#E6D2AA] bg-[#FFFDF8] text-[#5E4735] hover:bg-white"
            }`}
          >
            {index + 1}. {item.title}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={current.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.28 }}
          className="mt-6"
        >
          <p className="text-base font-semibold leading-7 text-[#5C4A3A]">{current.body}</p>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {current.seats.map((seat, index) => (
              <div
                key={`${current.id}-${index}`}
                className={`flex min-h-[88px] flex-col items-center justify-center rounded-2xl border-2 px-3 py-4 text-center ${seatStyles[seat.state]}`}
              >
                <span className="text-lg font-black">{index + 1}</span>
                <span className="mt-1 text-xs font-bold">{seat.label}</span>
              </div>
            ))}
          </div>
          <p className="mt-4 rounded-xl bg-[#FBF6EE] px-4 py-3 text-sm font-semibold leading-6 text-[#5C4A3A]">
            {current.note}
          </p>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
