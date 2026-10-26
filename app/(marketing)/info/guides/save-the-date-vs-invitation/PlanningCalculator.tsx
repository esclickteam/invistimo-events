"use client";

import { useMemo, useState } from "react";

function parseLocalDate(iso: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 10, 0, 0));
}

function addDays(base: Date, days: number) {
  const next = new Date(base.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function addMonths(base: Date, months: number) {
  const next = new Date(base.getTime());
  next.setUTCMonth(next.getUTCMonth() + months);
  return next;
}

function formatHe(d: Date) {
  return new Intl.DateTimeFormat("he-IL", {
    timeZone: "Asia/Jerusalem",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

function daysBetween(a: Date, b: Date) {
  return Math.round((b.getTime() - a.getTime()) / (24 * 60 * 60 * 1000));
}

function startOfTodayUtc() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 10, 0, 0));
}

type PlanRow = {
  title: string;
  date: Date | null;
  label: string;
  purpose: string;
  past: boolean;
  warn?: string;
};

export default function PlanningCalculator() {
  const [weddingIso, setWeddingIso] = useState("");
  const [abroad, setAbroad] = useState(false);
  const [dateFinal, setDateFinal] = useState(true);
  const [venueClosed, setVenueClosed] = useState(false);

  const plan = useMemo(() => {
    const event = parseLocalDate(weddingIso);
    if (!event) return null;

    const today = startOfTodayUtc();
    const daysLeft = daysBetween(today, event);

    const stdMonthsBefore = abroad ? 9 : 6;
    const inviteWeeksBefore = abroad ? 10 : 8;
    const rsvpDaysBefore = 16;

    const stdDate = addMonths(event, -stdMonthsBefore);
    const inviteDate = addDays(event, -(inviteWeeksBefore * 7));
    const rsvpDate = addDays(event, -rsvpDaysBefore);

    const rows: PlanRow[] = [];

    if (!dateFinal) {
      rows.push({
        title: "Save the Date",
        date: null,
        label: "להמתין",
        purpose: "התאריך עדיין לא סופי — עדיף לא לשלוח הודעת שמירת תאריך.",
        past: false,
        warn: "אל תשלחו Save the Date לפני שהתאריך מאושר.",
      });
    } else if (daysLeft < 90) {
      rows.push({
        title: "Save the Date",
        date: null,
        label: "לשקול דילוג",
        purpose:
          "החתונה קרובה יחסית. אם הפרטים סגורים, לרוב עדיף לעבור להזמנה מלאה במקום הודעה מוקדמת נפרדת.",
        past: false,
      });
    } else {
      const past = daysBetween(stdDate, today) > 0;
      rows.push({
        title: "Save the Date",
        date: stdDate,
        label: formatHe(stdDate),
        purpose: abroad
          ? "טווח תכנון מוצע לאורחים מחו״ל — כשישה עד שנים־עשר חודשים לפני, כאן הצגה סביב תשעה חודשים."
          : "טווח תכנון מוצע סביב שישה חודשים לפני — במיוחד אם האורחים צריכים להיערך מוקדם.",
        past,
        warn: past ? "המועד המוצע כבר עבר — אם עדיין לא נשלח, בדקו אם עדיין רלוונטי או עברו להזמנה." : undefined,
      });
    }

    rows.push({
      title: "הכנת הזמנה מלאה",
      date: venueClosed ? inviteDate : null,
      label: venueClosed ? formatHe(inviteDate) : "אחרי סגירת האולם והשעות",
      purpose: venueClosed
        ? "כשהאולם והשעות סגורים — אפשר להכין הזמנה מלאה כמה שבועות לפני האירוע."
        : "השלימו שם אולם, כתובת ושעות לפני שליחת הזמנה מלאה.",
      past: venueClosed ? daysBetween(inviteDate, today) > 0 : false,
      warn: !venueClosed ? "בלי אולם סגור עדיף לא לשלוח הזמנה כאילו הפרטים סופיים." : undefined,
    });

    rows.push({
      title: "מעקב אישורי הגעה",
      date: rsvpDate,
      label: formatHe(rsvpDate),
      purpose: "נקודת מוצא לתחילת מעקב — כשבועיים עד שבועיים וחצי לפני, בהתאם לחבילה ולמועד סגירת כמויות.",
      past: daysBetween(rsvpDate, today) > 0,
      warn:
        daysBetween(rsvpDate, today) > 0
          ? "המועד המוצע כבר עבר — התאימו לוח זמנים למצב הנוכחי."
          : undefined,
    });

    return { event, daysLeft, rows };
  }, [abroad, dateFinal, venueClosed, weddingIso]);

  const planText = useMemo(() => {
    if (!plan) return "";
    const lines = [
      `תכנון שליחות — חתונה ב־${formatHe(plan.event)}`,
      `נותרו כ־${plan.daysLeft} ימים עד האירוע`,
      `אורחים מחו״ל: ${abroad ? "כן" : "לא"}`,
      `תאריך סופי: ${dateFinal ? "כן" : "לא"}`,
      `אולם סגור: ${venueClosed ? "כן" : "לא"}`,
      "",
      ...plan.rows.map(
        (r) =>
          `• ${r.title}: ${r.label}${r.warn ? ` (${r.warn})` : ""}\n  ${r.purpose}`
      ),
      "",
      "המלצות גמישות בלבד — לא מועדים מחייבים.",
    ];
    return lines.join("\n");
  }, [abroad, dateFinal, plan, venueClosed]);

  return (
    <div className="rounded-[28px] border border-[#E6D2AA] bg-[#FFFDF8] p-5 shadow-[0_14px_36px_rgba(58,39,20,0.06)] md:p-7">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs font-bold text-[#7A6042]">
          תאריך החתונה
          <input
            type="date"
            value={weddingIso}
            onChange={(e) => setWeddingIso(e.target.value)}
            className="rounded-xl border border-[#E6D2AA] bg-white px-3 py-2.5 text-sm font-semibold text-[#2C241C]"
          />
        </label>
        <div className="grid gap-3 self-end">
          {[
            { id: "final", label: "התאריך סופי", value: dateFinal, set: setDateFinal },
            { id: "venue", label: "האולם סגור", value: venueClosed, set: setVenueClosed },
            { id: "abroad", label: "יש אורחים מחו״ל", value: abroad, set: setAbroad },
          ].map((opt) => (
            <label
              key={opt.id}
              className="flex cursor-pointer items-center gap-3 rounded-xl border border-[#EADDC8] bg-white px-3 py-2.5 text-sm font-bold text-[#3F3025]"
            >
              <input
                type="checkbox"
                checked={opt.value}
                onChange={(e) => opt.set(e.target.checked)}
                className="h-4 w-4 accent-[#8A642E]"
              />
              {opt.label}
            </label>
          ))}
        </div>
      </div>

      {!plan ? (
        <p className="mt-6 rounded-2xl border border-dashed border-[#E6D2AA] bg-[#FBF6EE] px-4 py-5 text-sm leading-7 text-[#7A6042]">
          בחרו תאריך חתונה כדי לקבל לוח זמנים מוצע. ההמלצות גמישות בלבד.
        </p>
      ) : (
        <div className="mt-6 space-y-4">
          <p className="text-sm font-semibold text-[#7A6042]">
            נותרו כ־{plan.daysLeft} ימים עד האירוע · לוח מוצע לתכנון בלבד
          </p>
          <ol className="space-y-3">
            {plan.rows.map((row) => (
              <li
                key={row.title}
                className="rounded-2xl border border-[#EADDC8] bg-white px-4 py-4"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-base font-black text-[#2C241C]">{row.title}</h3>
                  <span className="text-sm font-bold text-[#8A642E]">{row.label}</span>
                </div>
                <p className="mt-2 text-sm leading-7 text-[#5C4A3A]">{row.purpose}</p>
                {row.warn ? (
                  <p className="mt-2 rounded-xl bg-[#FBF0F0] px-3 py-2 text-sm font-semibold text-[#7A3535]">
                    {row.warn}
                  </p>
                ) : null}
              </li>
            ))}
          </ol>
          <div className="flex flex-wrap gap-2 print:hidden">
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(planText);
                } catch {
                  /* ignore */
                }
              }}
              className="rounded-full border border-[#DCC7A6] bg-white px-4 py-2 text-xs font-bold text-[#5E4735]"
            >
              העתקת התכנון
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-full border border-[#DCC7A6] bg-white px-4 py-2 text-xs font-bold text-[#5E4735]"
            >
              הדפסה
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
