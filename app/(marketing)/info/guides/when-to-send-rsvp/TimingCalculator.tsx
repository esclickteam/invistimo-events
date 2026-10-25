"use client";

import { useMemo, useState } from "react";

/** Matches active Invistimo packages (packageQuote / SEO answers). */
const PACKAGE_PRESETS = [
  { id: "messages", label: "הודעות בלבד — 2 WhatsApp", wa: 2, phone: 0 },
  { id: "recorded", label: "שיחות מוקלטות — 2 WhatsApp + 3 שיחות", wa: 2, phone: 3 },
  { id: "human", label: "שיחות אנושיות — 2 WhatsApp + 3 שיחות", wa: 2, phone: 3 },
  { id: "mixed", label: "שיחות משולבות — 2 WhatsApp + 3 שיחות", wa: 2, phone: 3 },
] as const;

type RoundCount = 0 | 1 | 2 | 3;

/** Explicit operational spacing (calendar days), Asia/Jerusalem planning. */
export const TIMING_RULES = {
  /** Days for guests to reply between WhatsApp rounds */
  waGapDays: 5,
  /** Days between last WhatsApp and first phone round */
  waToPhoneGapDays: 3,
  /** Days between phone rounds */
  phoneGapDays: 3,
  /** Days after last outreach before venue deadline (finish collecting answers) */
  bufferBeforeVenueDays: 2,
} as const;

type TimelineItem = {
  id: string;
  title: string;
  date: Date;
  dateLabel: string;
  purpose: string;
  kind: "whatsapp" | "phone" | "milestone";
};

function formatJerusalem(d: Date) {
  return new Intl.DateTimeFormat("he-IL", {
    timeZone: "Asia/Jerusalem",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

function weekdayJerusalem(d: Date) {
  return new Intl.DateTimeFormat("he-IL", {
    timeZone: "Asia/Jerusalem",
    weekday: "long",
  }).format(d);
}

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

function daysBetween(a: Date, b: Date) {
  return Math.round((b.getTime() - a.getTime()) / (24 * 60 * 60 * 1000));
}

/** Saturday in Asia/Jerusalem for our UTC-noon calendar dates. */
function isSaturday(d: Date) {
  return d.getUTCDay() === 6;
}

/** Move to the nearest earlier (or same) non-Saturday send day. */
function snapBackFromSaturday(d: Date) {
  let cur = d;
  let guard = 0;
  while (isSaturday(cur) && guard < 8) {
    cur = addDays(cur, -1);
    guard += 1;
  }
  return cur;
}

function asRoundCount(n: number): RoundCount {
  if (n <= 0) return 0;
  if (n === 1) return 1;
  if (n === 2) return 2;
  return 3;
}

const WA_PURPOSE: Record<number, string> = {
  1: "פנייה ראשונה לרשימת המוזמנים עם קישור אישי לאישור הגעה.",
  2: "פנייה לאורחים שעדיין לא השיבו.",
  3: "סבב נוסף למי שעדיין ממתינים לתשובה — מעבר לחבילת ההודעות הסטנדרטית (2 סבבים).",
};

const PHONE_PURPOSE: Record<number, string> = {
  1: "השלמת תשובות בטלפון למי שלא ענה בהודעות — בהתאם לחבילת השיחות.",
  2: "סבב שיחות נוסף למי שעדיין פתוח.",
  3: "סבב שיחות אחרון לפני סגירת המספרים מול האולם.",
};

export function planRsvpTimeline(input: {
  eventIso: string;
  venueIso: string;
  waRounds: RoundCount;
  phoneRounds: RoundCount;
  todayIso?: string;
}): {
  ok: boolean;
  errors: string[];
  warnings: string[];
  items: TimelineItem[];
  rules: string[];
  daysNeeded: number;
  daysAvailable: number;
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  const rules = [
    "תכנון לאחור ממועד מסירת המספרים לאולם (Asia/Jerusalem).",
    `מרווח בין סבבי WhatsApp: כ־${TIMING_RULES.waGapDays} ימים.`,
    `מרווח בין WhatsApp לשיחות: כ־${TIMING_RULES.waToPhoneGapDays} ימים.`,
    `מרווח בין סבבי שיחות: כ־${TIMING_RULES.phoneGapDays} ימים.`,
    `מרווח להשלמת תשובות לפני מועד האולם: כ־${TIMING_RULES.bufferBeforeVenueDays} ימים.`,
    "תאריכי שליחה לא נופלים על שבת; מועדים בחגים דורשים בדיקה ידנית מול לוח השנה ומדיניות השליחה.",
    "התאריכים הם המלצת תכנון — לא התחייבות למועדי שליחה אוטומטיים בפועל.",
    "בחבילת ההודעות כלולים שני סבבי WhatsApp. עד שלושה סבבי שיחות — בחבילות השיחה הנפרדות.",
  ];

  const event = parseLocalDate(input.eventIso);
  const venue = parseLocalDate(input.venueIso);
  const today = parseLocalDate(
    input.todayIso ||
      new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Jerusalem",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date())
  );

  if (!event) errors.push("נא לבחור תאריך אירוע.");
  if (!venue) errors.push("נא לבחור תאריך אחרון למסירת מספר המוזמנים לאולם.");
  if (!event || !venue || !today) {
    return { ok: false, errors, warnings, items: [], rules, daysNeeded: 0, daysAvailable: 0 };
  }

  if (daysBetween(today, event) <= 0) {
    errors.push("תאריך האירוע חייב להיות בעתיד.");
  }
  if (daysBetween(venue, event) <= 0) {
    errors.push("תאריך מסירת המספרים לאולם חייב להיות לפני תאריך האירוע.");
  }
  if (input.waRounds + input.phoneRounds < 1) {
    errors.push("יש לבחור לפחות סבב WhatsApp אחד או סבב שיחות אחד.");
  }
  if (input.waRounds === 3) {
    warnings.push(
      "בחבילת ההודעות הסטנדרטית כלולים שני סבבי WhatsApp. סבב שלישי אינו חלק מחבילת ההודעות הבסיסית."
    );
  }

  if (errors.length) {
    return { ok: false, errors, warnings, items: [], rules, daysNeeded: 0, daysAvailable: 0 };
  }

  const { waGapDays, waToPhoneGapDays, phoneGapDays, bufferBeforeVenueDays } = TIMING_RULES;

  // Days needed from first send through venue (inclusive gaps)
  let daysNeeded = bufferBeforeVenueDays;
  if (input.phoneRounds > 0) {
    daysNeeded += (input.phoneRounds - 1) * phoneGapDays;
    if (input.waRounds > 0) daysNeeded += waToPhoneGapDays;
  }
  if (input.waRounds > 0) {
    daysNeeded += (input.waRounds - 1) * waGapDays;
  }

  const daysAvailable = daysBetween(today, venue);
  if (daysBetween(today, venue) < 0) {
    errors.push("מועד מסירת המספרים לאולם כבר חלף — אין אפשרות לתכנן סבבים קדימה ממנו.");
    return { ok: false, errors, warnings, items: [], rules, daysNeeded, daysAvailable };
  }

  // Build backwards from venue:
  // venue → collection end → last outreach (day before when possible) → earlier rounds
  const collectionEnd = snapBackFromSaturday(addDays(venue, -bufferBeforeVenueDays));
  let lastOutreach = snapBackFromSaturday(addDays(collectionEnd, -1));
  if (daysBetween(lastOutreach, collectionEnd) <= 0) {
    lastOutreach = collectionEnd;
  }

  const phoneItems: TimelineItem[] = [];
  if (input.phoneRounds > 0) {
    let phoneCursor = lastOutreach;
    for (let i = input.phoneRounds; i >= 1; i -= 1) {
      phoneItems.unshift({
        id: `phone-${i}`,
        title:
          input.phoneRounds === 1
            ? "שיחה טלפונית"
            : `שיחה טלפונית ${["", "ראשונה", "שנייה", "שלישית"][i]}`,
        date: phoneCursor,
        dateLabel: formatJerusalem(phoneCursor),
        purpose: PHONE_PURPOSE[i],
        kind: "phone",
      });
      if (i > 1) phoneCursor = snapBackFromSaturday(addDays(phoneCursor, -phoneGapDays));
    }
  }

  const waItems: TimelineItem[] = [];
  if (input.waRounds > 0) {
    let waCursor =
      phoneItems.length > 0
        ? snapBackFromSaturday(addDays(phoneItems[0].date, -waToPhoneGapDays))
        : lastOutreach;
    for (let i = input.waRounds; i >= 1; i -= 1) {
      waItems.unshift({
        id: `wa-${i}`,
        title:
          input.waRounds === 1
            ? "סבב WhatsApp"
            : `סבב WhatsApp ${["", "ראשון", "שני", "שלישי"][i]}`,
        date: waCursor,
        dateLabel: formatJerusalem(waCursor),
        purpose: WA_PURPOSE[i],
        kind: "whatsapp",
      });
      if (i > 1) waCursor = snapBackFromSaturday(addDays(waCursor, -waGapDays));
    }
  }

  const outreach = [...waItems, ...phoneItems];

  // Chronology check
  for (let i = 1; i < outreach.length; i += 1) {
    if (daysBetween(outreach[i - 1].date, outreach[i].date) <= 0) {
      errors.push("לא נשאר מספיק זמן לפזר את הסבבים בימים נפרדים לפני מועד האולם.");
      break;
    }
  }

  const firstSend = outreach[0]?.date;
  if (firstSend && daysBetween(today, firstSend) < 0) {
    warnings.push(
      "לפי התכנון, סבב ראשון היה צריך לצאת לפני היום — מומלץ להקדים את תחילת התהליך או לצמצם סבבים."
    );
  }

  const spanNeeded = firstSend ? daysBetween(firstSend, venue) : daysNeeded;
  if (firstSend && daysBetween(today, venue) < spanNeeded) {
    warnings.push(
      "מועד האולם קרוב מדי להשלמת כל הסבבים במרווחים סבירים. מומלץ להקדים את תחילת התהליך או להתאים את מספר הסבבים — לא דוחסים הכל לאותו יום."
    );
  }

  if (errors.length) {
    return { ok: false, errors, warnings, items: [], rules, daysNeeded: spanNeeded, daysAvailable };
  }

  const items: TimelineItem[] = [
    ...outreach,
    {
      id: "collect-end",
      title: "סיום מומלץ של איסוף התשובות",
      date: collectionEnd,
      dateLabel: formatJerusalem(collectionEnd),
      purpose: "זמן לסגור פתוחים לפני מסירת המספרים לאולם.",
      kind: "milestone",
    },
    {
      id: "venue",
      title: "מסירת מספר המוזמנים לאולם",
      date: venue,
      dateLabel: formatJerusalem(venue),
      purpose: "הדד־ליין מול האולם או הקייטרינג.",
      kind: "milestone",
    },
    {
      id: "event",
      title: "תאריך האירוע",
      date: event,
      dateLabel: formatJerusalem(event),
      purpose: "יום האירוע עצמו.",
      kind: "milestone",
    },
  ];

  return {
    ok: true,
    errors,
    warnings,
    items,
    rules,
    daysNeeded: spanNeeded,
    daysAvailable,
  };
}

export default function TimingCalculator() {
  const [eventDate, setEventDate] = useState("");
  const [venueDeadline, setVenueDeadline] = useState("");
  const [waRounds, setWaRounds] = useState<RoundCount>(2);
  const [phoneRounds, setPhoneRounds] = useState<RoundCount>(0);
  const [preset, setPreset] = useState<string>("messages");

  const result = useMemo(
    () =>
      planRsvpTimeline({
        eventIso: eventDate,
        venueIso: venueDeadline,
        waRounds,
        phoneRounds,
      }),
    [eventDate, venueDeadline, waRounds, phoneRounds]
  );

  function applyPreset(id: string) {
    setPreset(id);
    const found = PACKAGE_PRESETS.find((p) => p.id === id);
    if (!found) return;
    setWaRounds(asRoundCount(found.wa));
    setPhoneRounds(asRoundCount(found.phone));
  }

  const showTimeline = Boolean(eventDate && venueDeadline);
  const inputClass =
    "min-h-12 rounded-2xl border border-[#E6D2AA] bg-white px-4 text-base font-semibold text-[#2C241C]";

  return (
    <div className="rounded-[32px] border border-[#E6D2AA] bg-[#FFFDF8] p-6 shadow-[0_22px_50px_rgba(95,68,34,0.08)] md:p-8">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-1.5 text-sm font-bold text-[#5E4735]">
          תאריך האירוע <span className="font-semibold text-[#A0673A]">(חובה)</span>
          <input
            type="date"
            required
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            onInput={(e) => setEventDate((e.target as HTMLInputElement).value)}
            className={inputClass}
          />
        </label>
        <label className="grid gap-1.5 text-sm font-bold text-[#5E4735]">
          תאריך אחרון למסירת מספר המוזמנים לאולם{" "}
          <span className="font-semibold text-[#A0673A]">(חובה)</span>
          <input
            type="date"
            required
            value={venueDeadline}
            onChange={(e) => setVenueDeadline(e.target.value)}
            onInput={(e) => setVenueDeadline((e.target as HTMLInputElement).value)}
            className={inputClass}
          />
        </label>
        <label className="grid gap-1.5 text-sm font-bold text-[#5E4735] md:col-span-2">
          מילוי לפי חבילה קיימת (אופציונלי)
          <select
            value={preset}
            onChange={(e) => applyPreset(e.target.value)}
            className={inputClass}
          >
            {PACKAGE_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
            <option value="custom">בחירה ידנית של סבבים</option>
          </select>
        </label>
        <label className="grid gap-1.5 text-sm font-bold text-[#5E4735]">
          מספר סבבי הודעות WhatsApp
          <select
            value={waRounds}
            onChange={(e) => {
              setPreset("custom");
              setWaRounds(asRoundCount(Number(e.target.value)));
            }}
            className={inputClass}
          >
            {[0, 1, 2, 3].map((n) => (
              <option key={n} value={n}>
                {n}
                {n === 2 ? " (כלול בחבילת ההודעות)" : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5 text-sm font-bold text-[#5E4735]">
          מספר סבבי שיחות טלפוניות
          <select
            value={phoneRounds}
            onChange={(e) => {
              setPreset("custom");
              setPhoneRounds(asRoundCount(Number(e.target.value)));
            }}
            className={inputClass}
          >
            {[0, 1, 2, 3].map((n) => (
              <option key={n} value={n}>
                {n}
                {n === 3 ? " (חבילות השיחה)" : ""}
              </option>
            ))}
          </select>
        </label>
      </div>

      {!showTimeline ? (
        <p className="mt-6 text-sm leading-7 text-[#7A6042]">
          מלאו את תאריך האירוע ואת מועד מסירת המספרים לאולם כדי לראות לוח זמנים מומלץ.
        </p>
      ) : null}

      {showTimeline && result.errors.length ? (
        <ul className="mt-6 space-y-2 rounded-[24px] border border-[#E8B4A0] bg-[#FFF5F0] p-5 text-sm font-semibold text-[#8A4B2E]">
          {result.errors.map((e) => (
            <li key={e}>⚠ {e}</li>
          ))}
        </ul>
      ) : null}

      {showTimeline && result.ok ? (
        <div className="mt-8 space-y-5 rounded-[24px] border border-[#E6D2AA] bg-[#FBF6EE] p-5 md:p-6">
          <h3 className="text-xl font-black text-[#2C241C] md:text-2xl">
            לוח הזמנים המומלץ לאישורי ההגעה שלכם
          </h3>
          <p className="text-sm leading-7 text-[#7A6042]">
            המלצת תכנון בלבד — לא מועד שליחה מחייב במערכת.
          </p>

          <ol className="relative mt-2 space-y-0 border-r-2 border-[#E6D2AA] pr-6">
            {result.items.map((item, idx) => (
              <li key={item.id} className="relative pb-6 last:pb-0">
                <span
                  className={`absolute -right-[1.55rem] top-1.5 h-3.5 w-3.5 rounded-full border-2 ${
                    item.kind === "whatsapp"
                      ? "border-[#C9A45C] bg-[#FFF8EF]"
                      : item.kind === "phone"
                        ? "border-[#5E4735] bg-[#E8DCC8]"
                        : "border-[#8A642E] bg-[#C9A45C]"
                  }`}
                  aria-hidden
                />
                <p className="text-xs font-black tracking-wide text-[#8A642E]">
                  {String(idx + 1).padStart(2, "0")} · {weekdayJerusalem(item.date)}
                </p>
                <p className="mt-1 text-lg font-black text-[#2C241C]">{item.title}</p>
                <p className="mt-0.5 text-base font-bold text-[#5E4735]">{item.dateLabel}</p>
                <p className="mt-1 text-[14px] leading-6 text-[#6D5B4A]">{item.purpose}</p>
              </li>
            ))}
          </ol>

          {result.warnings.length ? (
            <ul className="space-y-2 text-sm font-semibold text-[#8A4B2E]">
              {result.warnings.map((w) => (
                <li key={w}>⚠ {w}</li>
              ))}
            </ul>
          ) : null}

          <details className="text-sm text-[#6D5B4A]">
            <summary className="cursor-pointer font-black text-[#7A5530]">כללי החישוב</summary>
            <ul className="mt-2 list-disc space-y-1 pr-5">
              {result.rules.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </details>
        </div>
      ) : null}
    </div>
  );
}
