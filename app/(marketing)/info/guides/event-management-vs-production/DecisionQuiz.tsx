"use client";

import { useMemo, useState } from "react";
import TrackedCtaLink from "@/components/seo/TrackedCtaLink";

type AnswerKey = "venue" | "vendors" | "place" | "external" | "time" | "dayOf";

type Answers = Record<AnswerKey, string | null>;

type ResultId = "self" | "manager" | "producer" | "combo";

type Result = {
  id: ResultId;
  title: string;
  summary: string;
  why: string[];
  checkNext: string[];
};

const QUESTIONS: {
  key: AnswerKey;
  q: string;
  options: { value: string; label: string }[];
}[] = [
  {
    key: "venue",
    q: "האם כבר סגרתם אולם?",
    options: [
      { value: "yes", label: "כן, האולם סגור" },
      { value: "almost", label: "בתהליך בחירה / כמעט סגור" },
      { value: "no", label: "עדיין לא" },
    ],
  },
  {
    key: "vendors",
    q: "האם רוב הספקים כבר נבחרו?",
    options: [
      { value: "yes", label: "כן, רובם סגורים" },
      { value: "partial", label: "חלקם בלבד" },
      { value: "no", label: "עדיין לא התחלנו" },
    ],
  },
  {
    key: "place",
    q: "האם מדובר בחתונה באולם, בגן אירועים או בשטח?",
    options: [
      { value: "hall", label: "אולם / גן עם צוות מובנה" },
      { value: "garden", label: "גן אירועים עם חלק מהתשתיות" },
      { value: "field", label: "שטח / מקום שדורש תשתיות" },
    ],
  },
  {
    key: "external",
    q: "האם יש ספקים חיצוניים רבים?",
    options: [
      { value: "many", label: "כן, הרבה ספקים מחוץ לאולם" },
      { value: "some", label: "כמה ספקים חיצוניים" },
      { value: "few", label: "מעט, רוב השירות דרך האולם" },
    ],
  },
  {
    key: "time",
    q: "האם יש לכם זמן לנהל את ההכנות?",
    options: [
      { value: "yes", label: "כן, אנחנו רוצים לנהל בעצמנו" },
      { value: "limited", label: "יש זמן חלקי" },
      { value: "no", label: "כמעט אין זמן פנוי" },
    ],
  },
  {
    key: "dayOf",
    q: "האם אתם רוצים גורם מקצועי שיתאם את יום האירוע?",
    options: [
      { value: "yes", label: "כן, חשוב לנו גורם שירכז" },
      { value: "maybe", label: "רק אם האולם לא מכסה הכול" },
      { value: "no", label: "לא, נסתמך על האולם / המשפחה" },
    ],
  },
];

function scoreResult(a: Answers): ResultId {
  let producer = 0;
  let manager = 0;
  let self = 0;

  if (a.venue === "no" || a.venue === "almost") producer += 2;
  if (a.vendors === "no") producer += 2;
  if (a.vendors === "partial") producer += 1;
  if (a.place === "field") {
    producer += 2;
    manager += 1;
  }
  if (a.place === "garden") producer += 1;
  if (a.external === "many") {
    manager += 2;
    producer += 1;
  }
  if (a.external === "some") manager += 1;
  if (a.time === "no") producer += 2;
  if (a.time === "limited") manager += 1;
  if (a.time === "yes") self += 2;
  if (a.dayOf === "yes") manager += 2;
  if (a.dayOf === "maybe") manager += 1;
  if (a.dayOf === "no") self += 1;

  if (a.venue === "yes" && a.vendors === "yes" && a.time === "yes" && a.dayOf === "no") {
    return "self";
  }
  if (a.venue === "yes" && a.vendors === "yes" && a.dayOf === "yes") {
    return manager >= producer ? "manager" : "combo";
  }
  if (producer >= manager + 2 && producer >= self + 2) return "producer";
  if (manager >= producer && manager >= self) return "manager";
  if (self >= manager && self >= producer) return "self";
  if (producer >= 3 && manager >= 3) return "combo";
  return producer > manager ? "producer" : manager > self ? "manager" : "self";
}

const RESULTS: Record<ResultId, Result> = {
  self: {
    id: "self",
    title: "מערכת ניהול עצמאית",
    summary:
      "נראה שאתם מעדיפים לנהל את ההכנות בעצמכם, במיוחד אם האולם והספקים כבר מסודרים.",
    why: [
      "יש לכם זמן ורצון לרכז משימות, ספקים ותקציב.",
      "רוב התכנון כבר מאחוריכם או שאתם מרגישים בנוח לנהל אותו.",
      "יום האירוע עשוי להיות מכוסה על ידי האולם או גורם שמיניתם.",
    ],
    checkNext: [
      "מה בדיוק כולל שירות מנהל האולם ביום האירוע?",
      "מי מתאם ספקים חיצוניים אם יתעורר עיכוב?",
      "האם יש לכם מקום אחד לריכוז משימות, חוזים ולו״ז?",
    ],
  },
  manager: {
    id: "manager",
    title: "מנהל אירוע חיצוני",
    summary:
      "רוב התכנון כבר בידיים שלכם, אבל כדאי שיהיה גורם מקצועי שירכז את התפעול ביום האירוע.",
    why: [
      "האולם והספקים כבר נבחרו או קרובים לסגירה.",
      "יש תיאומים שכדאי שמישהו ירכז מטעמכם ביום עצמו.",
      "אתם רוצים להיות נוכחים כזוג — לא כמרכז שליטה.",
    ],
    checkNext: [
      "מה כלול בשעות העבודה ובנוכחות באולם?",
      "מי אחראי על ספקים חיצוניים מול מנהל האולם?",
      "האם ההושבה, הרזרבות והציוד האישי נכללים באחריות?",
    ],
  },
  producer: {
    id: "producer",
    title: "מפיק אירועים",
    summary:
      "נראה שדרוש ליווי רחב יותר — מהתכנון והספקים ועד תיאום ההפקה, לא רק יום האירוע.",
    why: [
      "עדיין יש החלטות גדולות פתוחות (אולם, ספקים או קונספט).",
      "הזמן הפנוי מוגבל או שהאירוע מורכב יותר.",
      "ייתכן שתצטרכו ליווי לאורך שבועות או חודשים — לא רק ביום עצמו.",
    ],
    checkNext: [
      "מה נכלל בהפקה מלאה ומה נחשב תוספת?",
      "מתי מתחיל הליווי וכמה פגישות כלולות?",
      "האם נוכחות ביום האירוע כלולה בהסכם?",
    ],
  },
  combo: {
    id: "combo",
    title: "שילוב שירותים",
    summary:
      "האירוע שלכם נראה מורכב מספיק כדי לשקול שילוב — למשל מערכת דיגיטלית עם ליווי או מנהל בשטח.",
    why: [
      "יש גם צורך בריכוז תכנון וגם בתיאום תפעולי ביום האירוע.",
      "מספר ספקים או אופי המקום דורשים יותר מגורם אחד.",
      "אפשר לבנות שכבות: ניהול עצמי + ליווי + נוכחות בשטח לפי הצורך.",
    ],
    checkNext: [
      "אילו תפקידים כבר מכוסים על ידי האולם?",
      "האם הליווי והניהול בשטח הם אותו אדם או שירותים נפרדים?",
      "מה הזמינות באזור ובתאריך שלכם לפני שסוגרים?",
    ],
  },
};

const ctaPrimary =
  "inline-flex min-h-12 items-center justify-center rounded-full bg-gradient-to-l from-[#3A2B22] via-[#5A4333] to-[#2C211B] px-7 py-3 text-sm font-black text-white";
const ctaSecondary =
  "inline-flex min-h-12 items-center justify-center rounded-full border border-[#DCC7A6] bg-white px-7 py-3 text-sm font-black text-[#5E4735]";

export default function DecisionQuiz() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({
    venue: null,
    vendors: null,
    place: null,
    external: null,
    time: null,
    dayOf: null,
  });
  const [done, setDone] = useState(false);

  const current = QUESTIONS[step];
  const progress = ((done ? QUESTIONS.length : step) / QUESTIONS.length) * 100;

  const result = useMemo(() => {
    if (!done) return null;
    return RESULTS[scoreResult(answers)];
  }, [answers, done]);

  function choose(value: string) {
    const next = { ...answers, [current.key]: value };
    setAnswers(next);
    if (step >= QUESTIONS.length - 1) {
      setDone(true);
      return;
    }
    setStep((s) => s + 1);
  }

  function reset() {
    setStep(0);
    setDone(false);
    setAnswers({
      venue: null,
      vendors: null,
      place: null,
      external: null,
      time: null,
      dayOf: null,
    });
  }

  return (
    <div className="rounded-[28px] border border-[#E6D2AA] bg-[#FFFDF8] p-5 shadow-[0_18px_40px_rgba(58,39,20,0.06)] md:p-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-black tracking-[0.12em] text-[#7A5530]">שאלון התאמה</p>
          <h3 className="mt-2 text-2xl font-black text-[#2C241C] md:text-3xl">
            מה באמת מתאים לאירוע שלכם?
          </h3>
        </div>
        <p className="text-sm font-semibold text-[#7A6042]">
          {done ? "המלצה מוכנה" : `שאלה ${step + 1} מתוך ${QUESTIONS.length}`}
        </p>
      </div>

      <div className="mt-5 h-2 overflow-hidden rounded-full bg-[#E8DCC8]" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}>
        <div
          className="h-full rounded-full bg-gradient-to-l from-[#B8892D] to-[#E8D4A8] transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {!done && current ? (
        <div className="mt-8">
          <p className="text-lg font-black leading-8 text-[#35281F] md:text-xl">{current.q}</p>
          <div className="mt-5 grid gap-3" role="group" aria-label={current.q}>
            {current.options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => choose(opt.value)}
                className="rounded-2xl border border-[#E6D2AA] bg-white px-5 py-4 text-right text-base font-bold text-[#3F3025] transition hover:border-[#C7A56B] hover:bg-[#FFF9F0]"
              >
                {opt.label}
              </button>
            ))}
          </div>
          {step > 0 ? (
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              className="mt-5 text-sm font-bold text-[#7A6042] underline-offset-4 hover:underline"
            >
              חזרה לשאלה הקודמת
            </button>
          ) : null}
        </div>
      ) : null}

      {done && result ? (
        <div className="mt-8 space-y-6">
          <div className="rounded-2xl border border-[#E6D2AA] bg-white p-5 md:p-6">
            <p className="text-sm font-black text-[#A67C3D]">המלצה מנומקת — לא קביעה מוחלטת</p>
            <h4 className="mt-2 text-2xl font-black text-[#2C241C]">{result.title}</h4>
            <p className="mt-3 text-base leading-8 text-[#5C4A3A]">{result.summary}</p>
          </div>

          <div>
            <p className="font-black text-[#35281F]">למה הכיוון הזה?</p>
            <ul className="mt-3 space-y-2">
              {result.why.map((item) => (
                <li key={item} className="flex gap-3 text-[#5C4A3A]">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#C7A56B]" aria-hidden />
                  <span className="leading-7">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="font-black text-[#35281F]">לפני החלטה — בדקו גם:</p>
            <ul className="mt-3 space-y-2">
              {result.checkNext.map((item) => (
                <li key={item} className="flex gap-3 text-[#5C4A3A]">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#A67C3D]" aria-hidden />
                  <span className="leading-7">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <TrackedCtaLink href="/event-management" className={ctaPrimary} location="quiz_cta:/info/guides/event-management-vs-production">
              לשירותי ניהול האירוע
            </TrackedCtaLink>
            <TrackedCtaLink href="/pricing" className={ctaSecondary} location="quiz_cta:/info/guides/event-management-vs-production">
              למחשבון החבילות
            </TrackedCtaLink>
            <button type="button" onClick={reset} className={ctaSecondary}>
              להתחיל שאלון מחדש
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
