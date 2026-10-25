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

/**
 * Recommended RSVP planning window: 14–18 days before the event.
 * Rounds are spread evenly on Sun–Thu send days inside that window
 * (further clipped by the venue guest-count deadline). No fixed gap.
 */
export const TIMING_RULES = {
  windowEarliestDaysBeforeEvent: 18,
  windowLatestDaysBeforeEvent: 14,
  /** Last round must be at least this many days before the venue deadline */
  bufferBeforeVenueDays: 1,
} as const;

type TimelineItem = {
  id: string;
  title: string;
  date: Date;
  dateLabel: string;
  weekdayLabel: string;
  lineLabel: string;
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

/** Send days: Sunday–Thursday only (no Friday / Saturday). */
function isSendDay(d: Date) {
  const day = d.getUTCDay();
  return day !== 5 && day !== 6;
}

function listSendDaysInclusive(start: Date, end: Date): Date[] {
  const out: Date[] = [];
  if (daysBetween(start, end) < 0) return out;
  let cur = start;
  while (daysBetween(cur, end) >= 0) {
    if (isSendDay(cur)) out.push(new Date(cur.getTime()));
    cur = addDays(cur, 1);
  }
  return out;
}

/** Pick n distinct days evenly across the available send-day list. */
function pickEvenlySpaced(days: Date[], n: number): Date[] | null {
  if (n <= 0) return [];
  if (days.length < n) return null;
  if (n === 1) return [days[0]];

  const used = new Set<number>();
  const idxs: number[] = [];
  for (let i = 0; i < n; i += 1) {
    let idx = Math.round((i * (days.length - 1)) / (n - 1));
    if (used.has(idx)) {
      let delta = 1;
      let found = false;
      while (delta < days.length) {
        if (idx + delta < days.length && !used.has(idx + delta)) {
          idx = idx + delta;
          found = true;
          break;
        }
        if (idx - delta >= 0 && !used.has(idx - delta)) {
          idx = idx - delta;
          found = true;
          break;
        }
        delta += 1;
      }
      if (!found) return null;
    }
    used.add(idx);
    idxs.push(idx);
  }
  idxs.sort((a, b) => a - b);
  return idxs.map((i) => days[i]);
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

const WA_TITLE: Record<number, string> = {
  1: "סבב WhatsApp ראשון",
  2: "סבב WhatsApp שני",
  3: "סבב WhatsApp שלישי",
};

const PHONE_TITLE: Record<number, string> = {
  1: "שיחה טלפונית ראשונה",
  2: "שיחה טלפונית שנייה",
  3: "שיחה טלפונית שלישית",
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
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  const rules = [
    `חלון התכנון המומלץ: ${TIMING_RULES.windowLatestDaysBeforeEvent}–${TIMING_RULES.windowEarliestDaysBeforeEvent} ימים לפני האירוע (שבועיים עד שבועיים וחצי).`,
    "כל הסבבים שנבחרו נפרסים באופן מאוזן על ימי שליחה בתוך החלון הזמין — בלי מרווח קבוע מראש.",
    "ימי שליחה: ראשון עד חמישי בלבד (לא יום שישי ולא שבת).",
    "כל הסבבים מסתיימים לפני מועד מסירת המספרים לאולם, עם מרווח קצר לעדכון הרשימה.",
    "התאריכים הם המלצת תכנון — לא התחייבות למועדי שליחה בפועל במערכת.",
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
    return { ok: false, errors, warnings, items: [], rules };
  }

  if (daysBetween(today, event) <= 0) {
    errors.push("תאריך האירוע חייב להיות בעתיד.");
  }
  if (daysBetween(venue, event) <= 0) {
    errors.push("תאריך מסירת המספרים לאולם חייב להיות לפני תאריך האירוע.");
  }
  const totalRounds = input.waRounds + input.phoneRounds;
  if (totalRounds < 1) {
    errors.push("יש לבחור לפחות סבב WhatsApp אחד או סבב שיחות אחד.");
  }
  if (input.waRounds === 3) {
    warnings.push(
      "בחבילת ההודעות הסטנדרטית כלולים שני סבבי WhatsApp. סבב שלישי אינו חלק מחבילת ההודעות הבסיסית."
    );
  }

  if (errors.length) {
    return { ok: false, errors, warnings, items: [], rules };
  }

  // Begin at ~18 days before the event (start of the 14–18 day guidance).
  // End by the earlier of: ~14 days before the event (ideal), or venue − buffer.
  // If the ideal sub-window lacks enough Sun–Thu days for all rounds, extend toward
  // the venue deadline only — never before day −18 and never on/after the venue date.
  const windowStart = addDays(event, -TIMING_RULES.windowEarliestDaysBeforeEvent);
  const idealWindowEnd = addDays(event, -TIMING_RULES.windowLatestDaysBeforeEvent);
  const latestAllowedByVenue = addDays(venue, -TIMING_RULES.bufferBeforeVenueDays);

  if (daysBetween(windowStart, latestAllowedByVenue) < 0) {
    errors.push(
      "הלו״ז אינו ישים: מועד מסירת המספרים לאולם חל לפני או בתוך תחילת חלון 14–18 הימים לפני האירוע. לא ממציאים תאריכי סבבים מחוץ לחלון — יש להקדים את תחילת התהליך או להתאים את דד־ליין האולם."
    );
    return { ok: false, errors, warnings, items: [], rules };
  }

  // Earlier of ideal end (event − 14) and venue − buffer
  let windowEnd =
    daysBetween(idealWindowEnd, latestAllowedByVenue) >= 0 ? idealWindowEnd : latestAllowedByVenue;
  let sendDays = listSendDaysInclusive(windowStart, windowEnd);

  if (sendDays.length < totalRounds) {
    // Need more days: extend only up to venue buffer (still starting at day −18)
    if (daysBetween(windowEnd, latestAllowedByVenue) > 0) {
      windowEnd = latestAllowedByVenue;
      sendDays = listSendDaysInclusive(windowStart, windowEnd);
      if (sendDays.length >= totalRounds) {
        warnings.push(
          "כדי לפרוס את כל הסבבים לפני מועד האולם, חלק מהסבבים יוצאים אחרי 14 ימים לפני האירוע — עדיין בתוך התכנון שמתחיל כ־18 ימים לפני, ולפני הדד־ליין."
        );
      }
    }
  }

  if (sendDays.length < totalRounds) {
    errors.push(
      `הלו״ז אינו ישים: בין ${formatJerusalem(windowStart)} ל־${formatJerusalem(latestAllowedByVenue)} יש רק ${sendDays.length} ימי שליחה (א׳–ה׳), וצריך ${totalRounds} סבבים. לא דוחסים לשישי/שבת ולא קובעים תאריכים אחרי דד־ליין האולם או לפני חלון 18 הימים.`
    );
    return { ok: false, errors, warnings, items: [], rules };
  }

  const picked = pickEvenlySpaced(sendDays, totalRounds);
  if (!picked) {
    errors.push("הלו״ז אינו ישים: לא ניתן לפרוס את כל הסבבים באופן מאוזן בחלון הזמין.");
    return { ok: false, errors, warnings, items: [], rules };
  }

  // Last picked must still be strictly before venue
  const last = picked[picked.length - 1];
  if (daysBetween(last, venue) <= 0) {
    errors.push(
      "הלו״ז אינו ישים: סבב אחרון לא מסתיים לפני מועד מסירת המספרים לאולם."
    );
    return { ok: false, errors, warnings, items: [], rules };
  }

  const roundItems: TimelineItem[] = [];
  let cursor = 0;
  for (let i = 1; i <= input.waRounds; i += 1) {
    const date = picked[cursor++];
    const weekdayLabel = weekdayJerusalem(date);
    const dateLabel = formatJerusalem(date);
    const title = input.waRounds === 1 ? "סבב WhatsApp" : WA_TITLE[i];
    roundItems.push({
      id: `wa-${i}`,
      title,
      date,
      dateLabel,
      weekdayLabel,
      lineLabel: `${title} — ${weekdayLabel}, ${dateLabel}`,
      purpose: WA_PURPOSE[i],
      kind: "whatsapp",
    });
  }
  for (let i = 1; i <= input.phoneRounds; i += 1) {
    const date = picked[cursor++];
    const weekdayLabel = weekdayJerusalem(date);
    const dateLabel = formatJerusalem(date);
    const title = input.phoneRounds === 1 ? "שיחה טלפונית" : PHONE_TITLE[i];
    roundItems.push({
      id: `phone-${i}`,
      title,
      date,
      dateLabel,
      weekdayLabel,
      lineLabel: `${title} — ${weekdayLabel}, ${dateLabel}`,
      purpose: PHONE_PURPOSE[i],
      kind: "phone",
    });
  }

  const items: TimelineItem[] = [
    ...roundItems,
    {
      id: "venue",
      title: "מסירת מספר המוזמנים לאולם",
      date: venue,
      dateLabel: formatJerusalem(venue),
      weekdayLabel: weekdayJerusalem(venue),
      lineLabel: `מסירת מספר המוזמנים לאולם — ${weekdayJerusalem(venue)}, ${formatJerusalem(venue)}`,
      purpose: "הדד־ליין מול האולם או הקייטרינג.",
      kind: "milestone",
    },
    {
      id: "event",
      title: "תאריך האירוע",
      date: event,
      dateLabel: formatJerusalem(event),
      weekdayLabel: weekdayJerusalem(event),
      lineLabel: `תאריך האירוע — ${weekdayJerusalem(event)}, ${formatJerusalem(event)}`,
      purpose: "יום האירוע עצמו.",
      kind: "milestone",
    },
  ];

  if (daysBetween(today, picked[0]) < 0) {
    warnings.push(
      "לפי החלון המומלץ, הסבב הראשון כבר היה צריך לצאת — בדקו אם עדיין ניתן להתחיל עכשיו או שיש לעדכן את התוכנית."
    );
  }

  return { ok: true, errors, warnings, items, rules };
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
            המלצת תכנון בלבד — לא מועד שליחה מחייב במערכת. הסבבים נפרסו בחלון 14–18 ימים לפני
            האירוע (בכפוף לדד־ליין האולם).
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
                  {String(idx + 1).padStart(2, "0")}
                </p>
                <p className="mt-1 text-lg font-black text-[#2C241C]">{item.lineLabel}</p>
                {item.purpose ? (
                  <p className="mt-1 text-[14px] leading-6 text-[#6D5B4A]">{item.purpose}</p>
                ) : null}
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
