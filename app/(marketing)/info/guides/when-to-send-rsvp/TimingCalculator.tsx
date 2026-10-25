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
 * First RSVP round starts ~14–18 days before the event (Sun–Thu).
 * Later rounds spread evenly from that first day through the last send day
 * before the venue guest-count deadline. 14–18 is NOT an end window.
 */
export const TIMING_RULES = {
  /** Preferred first-round start: this many days before the event */
  firstRoundEarliestDaysBeforeEvent: 18,
  /** Latest acceptable first-round start within the recommended band */
  firstRoundLatestDaysBeforeEvent: 14,
  /** Last round must be at least this many days before the venue deadline */
  bufferBeforeVenueDays: 1,
} as const;

type TimelineKind = "invite" | "whatsapp" | "phone" | "milestone" | "followup";

type TimelineItem = {
  id: string;
  title: string;
  date: Date;
  dateLabel: string;
  weekdayLabel: string;
  lineLabel: string;
  purpose: string;
  kind: TimelineKind;
  /** Soft note under the step (past date / Fri–Sat send caveat) */
  note?: string;
};

type ReminderTiming = "day_before" | "day_of";

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

function addMonths(base: Date, months: number) {
  const next = new Date(base.getTime());
  next.setUTCMonth(next.getUTCMonth() + months);
  return next;
}

function daysBetween(a: Date, b: Date) {
  return Math.round((b.getTime() - a.getTime()) / (24 * 60 * 60 * 1000));
}

function isWeekend(d: Date) {
  const day = d.getUTCDay();
  return day === 5 || day === 6;
}

function makeItem(input: {
  id: string;
  title: string;
  date: Date;
  purpose: string;
  kind: TimelineKind;
  note?: string;
}): TimelineItem {
  const weekdayLabel = weekdayJerusalem(input.date);
  const dateLabel = formatJerusalem(input.date);
  return {
    id: input.id,
    title: input.title,
    date: input.date,
    dateLabel,
    weekdayLabel,
    lineLabel: `${input.title} — ${weekdayLabel}, ${dateLabel}`,
    purpose: input.purpose,
    kind: input.kind,
    note: input.note,
  };
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

/**
 * First round: prefer the earliest send day in the 14–18 day band
 * (event − 18 … event − 14). If that band has no Sun–Thu day, fall back
 * to the nearest send day just before the band.
 */
function pickFirstRoundDate(event: Date): Date | null {
  const earliest = addDays(event, -TIMING_RULES.firstRoundEarliestDaysBeforeEvent);
  const latest = addDays(event, -TIMING_RULES.firstRoundLatestDaysBeforeEvent);
  let cur = earliest;
  while (daysBetween(cur, latest) >= 0) {
    if (isSendDay(cur)) return new Date(cur.getTime());
    cur = addDays(cur, 1);
  }
  cur = addDays(earliest, -1);
  for (let i = 0; i < 7; i += 1) {
    if (isSendDay(cur)) return new Date(cur.getTime());
    cur = addDays(cur, -1);
  }
  return null;
}

/** Last outreach day: last Sun–Thu strictly before the venue deadline. */
function pickLastRoundDate(venue: Date): Date | null {
  let cur = addDays(venue, -TIMING_RULES.bufferBeforeVenueDays);
  for (let i = 0; i < 14; i += 1) {
    if (isSendDay(cur) && daysBetween(cur, venue) > 0) {
      return new Date(cur.getTime());
    }
    cur = addDays(cur, -1);
  }
  return null;
}

/** Pick n distinct days evenly across the available send-day list (first & last fixed). */
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
  3: "סבב נוסף למי שעדיין ממתינים לתשובה.",
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
  reminderTiming?: ReminderTiming;
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
  const reminderTiming = input.reminderTiming ?? "day_before";
  const rules = [
    `הסבב הראשון מתחיל כ־${TIMING_RULES.firstRoundLatestDaysBeforeEvent}–${TIMING_RULES.firstRoundEarliestDaysBeforeEvent} ימים לפני האירוע (יום שליחה א׳–ה׳).`,
    "יתר הסבבים נפרסים באופן מאוזן מהסבב הראשון ועד יום השליחה האחרון לפני מועד מסירת המספרים לאולם.",
    "הסבב האחרון סמוך לדד־ליין האולם (יום חול אחרון לפניו) — לא מסיימים שבוע מוקדם בלי סיבה.",
    "אין סבבים בשישי או שבת; כל סבב ביום נפרד; קודם WhatsApp ואז שיחות.",
    "Save the Date (כ־4 חודשים לפני) והזמנה דיגיטלית (כ־5 שבועות לפני) הן המלצות תכנון בלבד.",
    "תזכורת: יום לפני האירוע או ביום האירוע (לבחירה). הודעת תודה: יום אחרי האירוע.",
    "אבני הדרך אינן הודעות שנשלחות אוטומטית, ואינן בהכרח כלולות בכל חבילה.",
    "התאריכים הם המלצת תכנון — לא התחייבות למועדי שליחה בפועל במערכת.",
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
  if (errors.length) {
    return { ok: false, errors, warnings, items: [], rules };
  }

  // First round ≈ 14–18 days before the event; last round = last send day before venue.
  // Spread all rounds evenly across Sun–Thu days between those anchors.
  const firstRound = pickFirstRoundDate(event);
  const lastRoundAnchor = pickLastRoundDate(venue);

  if (!firstRound || !lastRoundAnchor) {
    errors.push(
      "הלו״ז אינו ישים: לא נמצאו ימי שליחה מתאימים (א׳–ה׳) בין תחילת חלון הסבב הראשון לבין מועד האולם."
    );
    return { ok: false, errors, warnings, items: [], rules };
  }

  if (daysBetween(firstRound, lastRoundAnchor) < 0) {
    errors.push(
      "הלו״ז אינו ישים: מועד מסירת המספרים לאולם חל לפני או בתוך חלון 14–18 הימים המומלץ לסבב הראשון. התזמון הרגיל אינו אפשרי — יש להקדים את תחילת התהליך או להתאים את דד־ליין האולם."
    );
    return { ok: false, errors, warnings, items: [], rules };
  }

  const sendDays = listSendDaysInclusive(firstRound, lastRoundAnchor);

  if (sendDays.length < totalRounds) {
    errors.push(
      `הלו״ז אינו ישים: בין ${formatJerusalem(firstRound)} ל־${formatJerusalem(lastRoundAnchor)} יש רק ${sendDays.length} ימי שליחה (א׳–ה׳), וצריך ${totalRounds} סבבים. לא דוחסים שני סבבים לאותו יום ולא קובעים שישי/שבת.`
    );
    return { ok: false, errors, warnings, items: [], rules };
  }

  const picked = pickEvenlySpaced(sendDays, totalRounds);
  if (!picked) {
    errors.push("הלו״ז אינו ישים: לא ניתן לפרוס את כל הסבבים באופן מאוזן בחלון הזמין.");
    return { ok: false, errors, warnings, items: [], rules };
  }

  // Ensure anchors: first = first send day, last = last send day before venue
  picked[0] = sendDays[0];
  picked[picked.length - 1] = sendDays[sendDays.length - 1];
  // Re-resolve middle collisions if anchors collided with evenly spaced picks
  {
    const used = new Set<number>([0, sendDays.length - 1]);
    for (let i = 1; i < picked.length - 1; i += 1) {
      let idx = Math.round((i * (sendDays.length - 1)) / (picked.length - 1));
      if (used.has(idx)) {
        let delta = 1;
        let found = false;
        while (delta < sendDays.length) {
          if (idx + delta < sendDays.length - 1 && !used.has(idx + delta)) {
            idx = idx + delta;
            found = true;
            break;
          }
          if (idx - delta > 0 && !used.has(idx - delta)) {
            idx = idx - delta;
            found = true;
            break;
          }
          delta += 1;
        }
        if (!found) {
          errors.push("הלו״ז אינו ישים: לא ניתן לפרוס את כל הסבבים באופן מאוזן בחלון הזמין.");
          return { ok: false, errors, warnings, items: [], rules };
        }
      }
      used.add(idx);
      picked[i] = sendDays[idx];
    }
    picked.sort((a, b) => a.getTime() - b.getTime());
  }

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
    const title = input.waRounds === 1 ? "סבב WhatsApp" : WA_TITLE[i];
    roundItems.push(
      makeItem({
        id: `wa-${i}`,
        title,
        date,
        purpose: WA_PURPOSE[i],
        kind: "whatsapp",
      })
    );
  }
  for (let i = 1; i <= input.phoneRounds; i += 1) {
    const date = picked[cursor++];
    const title = input.phoneRounds === 1 ? "שיחה טלפונית" : PHONE_TITLE[i];
    roundItems.push(
      makeItem({
        id: `phone-${i}`,
        title,
        date,
        purpose: PHONE_PURPOSE[i],
        kind: "phone",
      })
    );
  }

  const pastNote = (d: Date) =>
    daysBetween(today, d) < 0
      ? "התאריך המומלץ כבר עבר — מוצג לתכנון בלבד, לא כשליחה עתידית."
      : undefined;

  const weekendSendNote = (d: Date) =>
    isWeekend(d)
      ? "התאריך חל ביום שישי או שבת. השליחה בפועל תלויה בהגדרות השירות ובמגבלות השליחה — יום האירוע עצמו לא הוזז."
      : undefined;

  // Planning milestones (do not move RSVP round dates)
  const saveTheDate = addMonths(event, -4);
  const digitalInvite = addDays(event, -35); // ~5 weeks
  // Close the list on venue day (last outreach already sits on the prior send day)
  const collectionDate = venue;

  const reminderDate =
    reminderTiming === "day_of" ? new Date(event.getTime()) : addDays(event, -1);
  const thankYouDate = addDays(event, 1);

  // Fixed chronological stage order (RSVP dates unchanged)
  const items: TimelineItem[] = [
    makeItem({
      id: "save-the-date",
      title: "Save the Date — שמרו את התאריך",
      date: saveTheDate,
      purpose: "הודעה מוקדמת לאורחים כדי שיוכלו לשריין את התאריך ולהיערך מראש.",
      kind: "invite",
      note: pastNote(saveTheDate),
    }),
    makeItem({
      id: "digital-invite",
      title: "שליחת ההזמנה הדיגיטלית",
      date: digitalInvite,
      purpose:
        "שליחת ההזמנה הרשמית עם שמות בני הזוג, פרטי האירוע, שעות קבלת הפנים והחופה ומיקום האולם.",
      kind: "invite",
      note: pastNote(digitalInvite),
    }),
    ...roundItems,
    makeItem({
      id: "collect-end",
      title: "סיום איסוף אישורי ההגעה",
      date: collectionDate,
      purpose: "זמן לסגור פתוחים ולעדכן את הרשימה לפני מסירת המספרים לאולם.",
      kind: "milestone",
    }),
    makeItem({
      id: "venue",
      title: "המועד האחרון למסירת מספר המוזמנים לאולם",
      date: venue,
      purpose: "הדד־ליין מול האולם או הקייטרינג.",
      kind: "milestone",
    }),
    makeItem({
      id: "reminder",
      title: "תזכורת לאורחים — האירוע מתקרב!",
      date: reminderDate,
      purpose:
        "תזכורת לאורחים עם פרטי האירוע וקישור ניווט. כאשר שירות ההושבה פעיל והשיבוץ הושלם, אפשר לכלול גם את מספר השולחן בהתאם ליכולות המערכת.",
      kind: "followup",
      note: weekendSendNote(reminderDate),
    }),
    makeItem({
      id: "event",
      title: "יום האירוע",
      date: event,
      purpose: "יום האירוע עצמו.",
      kind: "milestone",
    }),
    makeItem({
      id: "thank-you",
      title: "הודעת תודה לאורחים ❤️",
      date: thankYouDate,
      purpose: "הודעת תודה אישית לאורחים על כך שהיו חלק מהשמחה שלכם.",
      kind: "followup",
      note: weekendSendNote(thankYouDate),
    }),
  ];

  if (daysBetween(today, picked[0]) < 0) {
    warnings.push(
      "לפי החלון המומלץ, הסבב הראשון כבר היה צריך לצאת — בדקו אם עדיין ניתן להתחיל עכשיו או שיש לעדכן את התוכנית."
    );
  }

  return { ok: true, errors, warnings, items, rules };
}

function kindDotClass(kind: TimelineKind) {
  if (kind === "whatsapp") return "border-[#C9A45C] bg-[#FFF8EF]";
  if (kind === "phone") return "border-[#5E4735] bg-[#E8DCC8]";
  if (kind === "invite") return "border-[#B8862D]/70 bg-[#F7EBD9]";
  if (kind === "followup") return "border-[#8A642E]/80 bg-[#EFE4D2]";
  return "border-[#8A642E] bg-[#C9A45C]";
}

export default function TimingCalculator() {
  const [eventDate, setEventDate] = useState("");
  const [venueDeadline, setVenueDeadline] = useState("");
  const [waRounds, setWaRounds] = useState<RoundCount>(2);
  const [phoneRounds, setPhoneRounds] = useState<RoundCount>(0);
  const [preset, setPreset] = useState<string>("messages");
  const [reminderTiming, setReminderTiming] = useState<ReminderTiming>("day_before");

  const result = useMemo(
    () =>
      planRsvpTimeline({
        eventIso: eventDate,
        venueIso: venueDeadline,
        waRounds,
        phoneRounds,
        reminderTiming,
      }),
    [eventDate, venueDeadline, waRounds, phoneRounds, reminderTiming]
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
              </option>
            ))}
          </select>
        </label>
        <fieldset className="md:col-span-2">
          <legend className="mb-2 text-sm font-bold text-[#5E4735]">מועד תזכורת לאירוע</legend>
          <div className="flex flex-wrap gap-4 text-[15px] font-semibold text-[#3F3025]">
            <label className="inline-flex items-center gap-2">
              <input
                type="radio"
                name="reminder-timing"
                checked={reminderTiming === "day_before"}
                onChange={() => setReminderTiming("day_before")}
                className="h-4 w-4 accent-[#8A642E]"
              />
              יום לפני האירוע
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="radio"
                name="reminder-timing"
                checked={reminderTiming === "day_of"}
                onChange={() => setReminderTiming("day_of")}
                className="h-4 w-4 accent-[#8A642E]"
              />
              ביום האירוע
            </label>
          </div>
        </fieldset>
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
            לוח תכנון בלבד — לא מועדי שליחה מחייבים ולא הבטחה שכל השלבים כלולים בכל חבילה. הסבב
            הראשון בחלון 14–18 ימים לפני האירוע; יתר הסבבים עד לפני מועד מסירת המספרים לאולם.
          </p>

          <ol className="relative mt-2 space-y-0 border-r-2 border-[#E6D2AA] pr-6">
            {result.items.map((item, idx) => (
              <li key={item.id} className="relative pb-6 last:pb-0">
                <span
                  className={`absolute -right-[1.55rem] top-1.5 h-3.5 w-3.5 rounded-full border-2 ${kindDotClass(item.kind)}`}
                  aria-hidden
                />
                <p className="text-xs font-black tracking-wide text-[#8A642E]">
                  {String(idx + 1).padStart(2, "0")}
                </p>
                <p className="mt-1 text-lg font-black text-[#2C241C]">{item.lineLabel}</p>
                {item.purpose ? (
                  <p className="mt-1 text-[14px] leading-6 text-[#6D5B4A]">{item.purpose}</p>
                ) : null}
                {item.note ? (
                  <p className="mt-1 text-[13px] font-semibold leading-6 text-[#8A4B2E]">{item.note}</p>
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
