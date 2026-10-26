"use client";

import { useMemo, useState, type ReactNode } from "react";
import { PACKAGES, type PackageId } from "@/lib/pricing/packageQuote";

type Answers = {
  recordsBand: "small" | "medium" | "large" | null;
  channel: "messages" | "calls" | null;
  human: "yes" | "no" | null;
  seating: "yes" | "no" | null;
  manage: "yes" | "no" | null;
  live: "yes" | "no" | null;
};

const EMPTY: Answers = {
  recordsBand: null,
  channel: null,
  human: null,
  seating: null,
  manage: null,
  live: null,
};

function recommend(answers: Answers): {
  packageId: PackageId;
  addons: string[];
  note: string;
} {
  let packageId: PackageId = "messages";
  const addons: string[] = [];

  if (answers.channel === "calls") {
    if (answers.human === "yes") packageId = "personal";
    else packageId = "voice";
  }

  // If they want human but also prefer a mixed path later — keep personal when human=yes.
  // Hybrid only when they want calls, not full human desk, and explicitly mixed needs.
  if (answers.channel === "calls" && answers.human === "no" && answers.recordsBand === "large") {
    packageId = "hybrid";
  }

  if (answers.seating === "yes") addons.push("הושבה דיגיטלית");
  if (answers.manage === "yes") addons.push("מערכת עצמאית לניהול ומעקב אירוע");
  if (answers.live === "yes") addons.push("שירותי LIVE / Wedding Challenges כשירות נפרד");

  const note =
    addons.length > 0
      ? "על סמך הבחירות שלכם, החבילה הזו כוללת את השירותים הרלוונטיים ביותר. התוספות שצוינו אינן כלולות אוטומטית ומופיעות במחשבון."
      : "על סמך הבחירות שלכם, החבילה הזו כוללת את השירותים הרלוונטיים ביותר.";

  return { packageId, addons, note };
}

function OptionButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`rounded-2xl border px-4 py-3 text-right text-sm font-bold transition ${
        selected
          ? "border-[#C89545] bg-[#FFF3DF] text-[#8A4E19]"
          : "border-[#E5D3B8] bg-white text-[#5A3E25] hover:border-[#D7B98D]"
      }`}
    >
      {children}
    </button>
  );
}

export default function PackageQuiz() {
  const [answers, setAnswers] = useState<Answers>(EMPTY);
  const complete = Object.values(answers).every((v) => v !== null);
  const result = useMemo(() => (complete ? recommend(answers) : null), [answers, complete]);

  return (
    <div className="rounded-[28px] border border-[#E6D2AA] bg-white p-5 sm:p-7">
      <ol className="space-y-6">
        <li>
          <p className="font-black text-[#35281F]">1. כמה רשומות קשר יש לכם?</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <OptionButton
              selected={answers.recordsBand === "small"}
              onClick={() => setAnswers((a) => ({ ...a, recordsBand: "small" }))}
            >
              עד כ־150
            </OptionButton>
            <OptionButton
              selected={answers.recordsBand === "medium"}
              onClick={() => setAnswers((a) => ({ ...a, recordsBand: "medium" }))}
            >
              150–350
            </OptionButton>
            <OptionButton
              selected={answers.recordsBand === "large"}
              onClick={() => setAnswers((a) => ({ ...a, recordsBand: "large" }))}
            >
              מעל 350
            </OptionButton>
          </div>
        </li>
        <li>
          <p className="font-black text-[#35281F]">2. האם אתם רוצים אישורי הגעה בהודעות בלבד או גם שיחות?</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <OptionButton
              selected={answers.channel === "messages"}
              onClick={() => setAnswers((a) => ({ ...a, channel: "messages", human: "no" }))}
            >
              הודעות בלבד
            </OptionButton>
            <OptionButton
              selected={answers.channel === "calls"}
              onClick={() => setAnswers((a) => ({ ...a, channel: "calls" }))}
            >
              גם שיחות
            </OptionButton>
          </div>
        </li>
        <li>
          <p className="font-black text-[#35281F]">3. האם חשוב לכם מוקד אנושי?</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <OptionButton
              selected={answers.human === "yes"}
              onClick={() => setAnswers((a) => ({ ...a, human: "yes", channel: "calls" }))}
            >
              כן
            </OptionButton>
            <OptionButton
              selected={answers.human === "no"}
              onClick={() => setAnswers((a) => ({ ...a, human: "no" }))}
            >
              לא הכרחי
            </OptionButton>
          </div>
        </li>
        <li>
          <p className="font-black text-[#35281F]">4. האם אתם צריכים סידורי הושבה?</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <OptionButton
              selected={answers.seating === "yes"}
              onClick={() => setAnswers((a) => ({ ...a, seating: "yes" }))}
            >
              כן
            </OptionButton>
            <OptionButton
              selected={answers.seating === "no"}
              onClick={() => setAnswers((a) => ({ ...a, seating: "no" }))}
            >
              לא כרגע
            </OptionButton>
          </div>
        </li>
        <li>
          <p className="font-black text-[#35281F]">5. האם אתם רוצים ניהול אירוע עצמאי?</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <OptionButton
              selected={answers.manage === "yes"}
              onClick={() => setAnswers((a) => ({ ...a, manage: "yes" }))}
            >
              כן
            </OptionButton>
            <OptionButton
              selected={answers.manage === "no"}
              onClick={() => setAnswers((a) => ({ ...a, manage: "no" }))}
            >
              לא כרגע
            </OptionButton>
          </div>
        </li>
        <li>
          <p className="font-black text-[#35281F]">6. האם אתם זקוקים לשירותים נוספים ביום האירוע?</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <OptionButton
              selected={answers.live === "yes"}
              onClick={() => setAnswers((a) => ({ ...a, live: "yes" }))}
            >
              כן (LIVE / אתגרים)
            </OptionButton>
            <OptionButton
              selected={answers.live === "no"}
              onClick={() => setAnswers((a) => ({ ...a, live: "no" }))}
            >
              לא
            </OptionButton>
          </div>
        </li>
      </ol>

      {result ? (
        <div className="mt-8 rounded-[22px] border border-[#D4B06E] bg-[#FFF8EA] p-5">
          <p className="text-sm font-black text-[#8A4E19]">המלצה לפי התכולה בפועל</p>
          <p className="mt-2 text-2xl font-black text-[#35281F]">
            {PACKAGES[result.packageId].hebrewName}
          </p>
          <p className="text-sm font-bold text-[#A07C52]">{PACKAGES[result.packageId].name}</p>
          <p className="mt-3 leading-7 text-[#5C4A3A]">{result.note}</p>
          {result.addons.length > 0 ? (
            <ul className="mt-3 list-disc pr-5 text-sm leading-7 text-[#5C4A3A]">
              {result.addons.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : null}
          <div className="mt-5 flex flex-wrap gap-3">
            <a
              href="#pricing-calculator"
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#3E2D20] px-5 text-sm font-black text-white"
            >
              למחשבון עם החבילה הזו
            </a>
            <a
              href="/contact"
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#DCC7A6] bg-white px-5 text-sm font-black text-[#2C241C]"
            >
              לייעוץ אישי
            </a>
          </div>
        </div>
      ) : (
        <p className="mt-6 text-sm leading-6 text-[#9C866D]">ענו על כל השאלות כדי לקבל המלצה מבוססת תכולה.</p>
      )}
    </div>
  );
}
