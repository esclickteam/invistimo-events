"use client";

import { useMemo, useState } from "react";

type EventKind = "wedding" | "bar_mitzvah" | "brit" | "corporate" | "other";

const EVENT_LABELS: Record<EventKind, string> = {
  wedding: "חתונה",
  bar_mitzvah: "בר/בת מצווה",
  brit: "ברית / בריתה",
  corporate: "אירוע עסקי",
  other: "אירוע אחר",
};

/** Format a Date in Asia/Jerusalem as DD.MM.YYYY */
function formatJerusalem(d: Date) {
  return new Intl.DateTimeFormat("he-IL", {
    timeZone: "Asia/Jerusalem",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

function parseLocalDate(iso: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [y, m, d] = iso.split("-").map(Number);
  // Noon UTC avoids DST edge flip for calendar-day math display
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

export default function TimingCalculator() {
  const [eventDate, setEventDate] = useState("");
  const [eventKind, setEventKind] = useState<EventKind>("wedding");
  const [venueDeadline, setVenueDeadline] = useState("");
  const [abroad, setAbroad] = useState(false);
  const [nearHoliday, setNearHoliday] = useState(false);
  const [specialPrep, setSpecialPrep] = useState(false);

  const result = useMemo(() => {
    const event = parseLocalDate(eventDate);
    if (!event) return null;

    const venue = venueDeadline ? parseLocalDate(venueDeadline) : null;
    const warnings: string[] = [];
    const rules: string[] = [
      "חישוב לפי ימי לוח באזור הזמן Asia/Jerusalem.",
      "החלונות הם המלצות תכנון — לא כללים מחייבים.",
      "סמיכות לחג הוזנה על ידכם; לא נטען לוח חגים אוטומטי.",
    ];

    // Baseline windows (days before event)
    let stdStart = 180;
    let stdEnd = 90;
    let inviteStart = 45;
    let inviteEnd = 30;
    let rsvpStart = 18;
    let rsvpEnd = 14;
    let secondGap = 5;

    if (eventKind === "brit") {
      stdStart = 60;
      stdEnd = 30;
      inviteStart = 21;
      inviteEnd = 14;
      rsvpStart = 10;
      rsvpEnd = 7;
      secondGap = 3;
      rules.push("לברית/בריתה לוח הזמנים בדרך כלל קצר יותר.");
    } else if (eventKind === "corporate") {
      stdStart = 120;
      stdEnd = 60;
      inviteStart = 45;
      inviteEnd = 21;
      rsvpStart = 21;
      rsvpEnd = 14;
      rules.push("לאירוע עסקי לעיתים נדרשת הודעה מוקדמת יותר למשתתפים.");
    }

    if (abroad) {
      stdStart = Math.max(stdStart, 210);
      inviteStart = Math.max(inviteStart, 60);
      rules.push("אורחים מחו״ל: מומלץ להקדים Save the Date והזמנה לצורך תכנון נסיעה.");
    }
    if (nearHoliday) {
      rsvpStart = Math.max(rsvpStart, 21);
      secondGap = Math.max(secondGap, 6);
      rules.push("סמיכות לחג: הוזן על ידכם — הוקדמו חלונות האישורים והמרווח לסבב נוסף.");
    }
    if (specialPrep) {
      stdStart = Math.max(stdStart, 180);
      inviteStart = Math.max(inviteStart, 45);
      rules.push("היערכות מיוחדת: הודעה מוקדמת יותר על התאריך והפרטים.");
    }

    if (venue) {
      const daysToVenue = daysBetween(venue, event);
      if (daysToVenue < 0) {
        warnings.push("תאריך סגירת המנות מאוחר מתאריך האירוע — בדקו את הקלט.");
      } else {
        // First RSVP should finish with room for second round before venue deadline
        const needBeforeVenue = secondGap + 3;
        const latestFirstRsvp = addDays(venue, -needBeforeVenue);
        const daysBeforeEventForFirst = daysBetween(latestFirstRsvp, event);
        if (daysBeforeEventForFirst > rsvpStart) {
          rsvpStart = daysBeforeEventForFirst;
          rsvpEnd = Math.max(rsvpEnd, daysBeforeEventForFirst - 4);
        }
        rules.push(
          `תוכנן לאחור ממועד סגירת המנות (${formatJerusalem(venue)}): נשאר מרווח לסבב נוסף לפני הדד־ליין.`
        );
        if (daysBetween(new Date(), venue) < 10 && daysBetween(new Date(), venue) >= 0) {
          warnings.push("מועד סגירת המנות קרוב מאוד — ייתכן שכבר צריך להתחיל או להאיץ את הסבבים.");
        }
      }
    } else {
      warnings.push("לא הוזן מועד סגירת מנות — התוצאה ראשונית בלבד. מומלץ לבדוק מול האולם.");
    }

    const windowLabel = (startDays: number, endDays: number) => {
      const from = addDays(event, -startDays);
      const to = addDays(event, -endDays);
      return `${formatJerusalem(from)} – ${formatJerusalem(to)}`;
    };

    return {
      std: windowLabel(stdStart, stdEnd),
      invite: windowLabel(inviteStart, inviteEnd),
      rsvp: windowLabel(rsvpStart, Math.min(rsvpEnd, rsvpStart - 1)),
      secondGap,
      warnings,
      rules,
      eventLabel: formatJerusalem(event),
      kindLabel: EVENT_LABELS[eventKind],
    };
  }, [eventDate, eventKind, venueDeadline, abroad, nearHoliday, specialPrep]);

  return (
    <div className="rounded-[32px] border border-[#E6D2AA] bg-[#FFFDF8] p-6 shadow-[0_22px_50px_rgba(95,68,34,0.08)] md:p-8">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-1.5 text-sm font-bold text-[#5E4735]">
          תאריך האירוע
          <input
            type="date"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            className="min-h-12 rounded-2xl border border-[#E6D2AA] bg-white px-4 text-base font-semibold text-[#2C241C]"
          />
        </label>
        <label className="grid gap-1.5 text-sm font-bold text-[#5E4735]">
          סוג האירוע
          <select
            value={eventKind}
            onChange={(e) => setEventKind(e.target.value as EventKind)}
            className="min-h-12 rounded-2xl border border-[#E6D2AA] bg-white px-4 text-base font-semibold text-[#2C241C]"
          >
            {(Object.keys(EVENT_LABELS) as EventKind[]).map((k) => (
              <option key={k} value={k}>
                {EVENT_LABELS[k]}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5 text-sm font-bold text-[#5E4735] md:col-span-2">
          תאריך שבו האולם מבקש מספר מנות (אופציונלי)
          <input
            type="date"
            value={venueDeadline}
            onChange={(e) => setVenueDeadline(e.target.value)}
            className="min-h-12 rounded-2xl border border-[#E6D2AA] bg-white px-4 text-base font-semibold text-[#2C241C]"
          />
        </label>
      </div>

      <fieldset className="mt-5 grid gap-3">
        <legend className="text-sm font-black text-[#7A5530]">מאפיינים נוספים</legend>
        {[
          { checked: abroad, set: setAbroad, label: "יש אורחים מחו״ל או נסיעה משמעותית" },
          { checked: nearHoliday, set: setNearHoliday, label: "האירוע סמוך לחג או לחופשה" },
          { checked: specialPrep, set: setSpecialPrep, label: "צפויה היערכות מיוחדת" },
        ].map((row) => (
          <label key={row.label} className="flex items-center gap-3 text-[15px] font-semibold text-[#3F3025]">
            <input
              type="checkbox"
              checked={row.checked}
              onChange={(e) => row.set(e.target.checked)}
              className="h-5 w-5 accent-[#8A642E]"
            />
            {row.label}
          </label>
        ))}
      </fieldset>

      {result ? (
        <div className="mt-8 space-y-4 rounded-[24px] border border-[#E6D2AA] bg-[#FBF6EE] p-5">
          <p className="text-sm font-bold text-[#7A6042]">
            תוצאה ל־{result.kindLabel} בתאריך {result.eventLabel}
          </p>
          <ul className="space-y-3 text-[15px] leading-7 text-[#3F3025]">
            <li>
              <strong className="font-black">Save the Date:</strong> {result.std}
            </li>
            <li>
              <strong className="font-black">הזמנה:</strong> {result.invite}
            </li>
            <li>
              <strong className="font-black">סבב אישורים ראשון:</strong> {result.rsvp}
            </li>
            <li>
              <strong className="font-black">מרווח מוצע לסבב נוסף:</strong> כ־{result.secondGap} ימים
              לאחר הסבב הראשון, ולפני מועד סגירת המנות.
            </li>
          </ul>
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
      ) : (
        <p className="mt-6 text-sm leading-7 text-[#7A6042]">בחרו תאריך אירוע כדי לראות חלונות מומלצים.</p>
      )}
    </div>
  );
}
