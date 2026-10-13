/**
 * When to send the reserve-contact SMS.
 *
 * One day before the event at 10:00 Asia/Jerusalem. Shabbat and Israeli
 * Yom Tov move that morning earlier, still at 10:00, including two-day
 * holidays and a holiday next to Shabbat. Chol HaMoed and Erev do not.
 * The day check uses @hebcal/core at 10:00 in Jerusalem, not a fixed list
 * of Gregorian dates and not the server timezone.
 */

import {
  DEFAULT_EVENT_TIMEZONE,
  wallTimeInZoneToUtc,
} from "@/lib/weddingChallenges/timezone";

type JerusalemLocation = { getIsrael: () => boolean };

type HolidayCalendar = {
  isAssurBemlacha: (
    currentTime: Date,
    location: JerusalemLocation,
    useElevation: boolean
  ) => boolean;
  jerusalem: JerusalemLocation;
};

let loaded: HolidayCalendar | null = null;
let loading: Promise<HolidayCalendar> | null = null;

/** Loads @hebcal/core once. The package is ESM-only, so this stays dynamic. */
export function ensureVenueSeatingHolidayCalendar() {
  if (loaded) return Promise.resolve(loaded);
  if (!loading) {
    loading = import("@hebcal/core")
      .then((mod) => {
        const jerusalem = mod.Location.lookup("Jerusalem");
        if (!jerusalem?.getIsrael()) {
          throw new Error(
            "Hebrew calendar is missing the Israel schedule for Jerusalem"
          );
        }
        const calendar: HolidayCalendar = {
          isAssurBemlacha: (currentTime, location, useElevation) =>
            mod.isAssurBemlacha(currentTime, location as never, useElevation),
          jerusalem,
        };
        loaded = calendar;
        return calendar;
      })
      .catch((error) => {
        loading = null;
        throw error;
      });
  }
  return loading;
}

function holidayCalendar() {
  if (!loaded) {
    throw new Error("Hebrew calendar is not loaded");
  }
  return loaded;
}

const SEND_HOUR = 10;
/** Same-day catch-up stays in daylight. Midnight and late night never send. */
const LATEST_SEND_HOUR = 22;
const MAX_LOOKBACK_DAYS = 14;

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function addCalendarDays(isoDate: string, days: number) {
  const match = ISO_DATE.exec(isoDate);
  if (!match) return null;
  const utc = new Date(Date.UTC(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]) + days
  ));
  return utc.toISOString().slice(0, 10);
}

export function israelClock(value: Date, timeZone = DEFAULT_EVENT_TIMEZONE) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(value);
  const read = (type: string) =>
    parts.find((part) => part.type === type)?.value || "";
  const hour = Number(read("hour"));
  return {
    date: `${read("year")}-${read("month")}-${read("day")}`,
    hour: hour === 24 ? 0 : hour,
    minute: Number(read("minute")),
  };
}

/**
 * True when this civil date is Shabbat or an Israeli Yom Tov at the given hour.
 * Friday, Erev, Chol HaMoed, fasts, and modern days are not blocked.
 * The hour matters only for the Jerusalem instant passed to the calendar.
 */
export function isBlockedIsraelSendSlot(isoDate: string, hour: number) {
  const at = wallTimeInZoneToUtc(
    `${isoDate}T${String(hour).padStart(2, "0")}:00`,
    DEFAULT_EVENT_TIMEZONE
  );
  if (!at) return true;
  const calendar = holidayCalendar();
  return calendar.isAssurBemlacha(at, calendar.jerusalem, false);
}

/** Day before the event, walked back while that send hour is Shabbat or Yom Tov. */
export function scheduledDayBeforeObservance(eventDate: string, hour: number) {
  const previous = addCalendarDays(eventDate, -1);
  if (!previous) return null;
  let cursor = previous;
  for (let i = 0; i < MAX_LOOKBACK_DAYS; i += 1) {
    if (!isBlockedIsraelSendSlot(cursor, hour)) return cursor;
    const earlier = addCalendarDays(cursor, -1);
    if (!earlier) return null;
    cursor = earlier;
  }
  return null;
}

/**
 * True when 10:00 on this civil date falls on Shabbat or an Israeli Yom Tov.
 * Friday morning, Erev, Chol HaMoed, fasts, and modern days are not blocked.
 */
export function isBlockedVenueSeatingSmsMorning(isoDate: string) {
  return isBlockedIsraelSendSlot(isoDate, SEND_HOUR);
}

export function scheduledVenueSeatingSmsDate(eventDate: string) {
  return scheduledDayBeforeObservance(eventDate, SEND_HOUR);
}

export type VenueSeatingSmsTiming = {
  eventDate: string;
  sendDate: string;
  sendAt: Date;
  mentionsTomorrow: boolean;
};

export function venueSeatingSmsTiming(eventDate: string | null | undefined): VenueSeatingSmsTiming | null {
  const date = String(eventDate || "").trim();
  if (!ISO_DATE.test(date)) return null;
  const sendDate = scheduledVenueSeatingSmsDate(date);
  if (!sendDate) return null;
  const sendAt = wallTimeInZoneToUtc(
    `${sendDate}T${String(SEND_HOUR).padStart(2, "0")}:00`,
    DEFAULT_EVENT_TIMEZONE
  );
  if (!sendAt) return null;
  return {
    eventDate: date,
    sendDate,
    sendAt,
    mentionsTomorrow: addCalendarDays(sendDate, 1) === date,
  };
}

export function isVenueSeatingSmsDue(eventDate: string | null | undefined, now: Date) {
  const timing = venueSeatingSmsTiming(eventDate);
  if (!timing) return false;
  if (now.getTime() < timing.sendAt.getTime()) return false;
  const clock = israelClock(now);
  if (clock.date !== timing.sendDate) return false;
  return clock.hour >= SEND_HOUR && clock.hour < LATEST_SEND_HOUR;
}

export function venueSeatingSmsWhenPhrase(eventDate: string | null | undefined) {
  const timing = venueSeatingSmsTiming(eventDate);
  if (!timing || timing.mentionsTomorrow) return "מחר";
  const noon = wallTimeInZoneToUtc(`${timing.eventDate}T12:00`, DEFAULT_EVENT_TIMEZONE);
  if (!noon) return "מחר";
  const formatted = new Intl.DateTimeFormat("he-IL", {
    timeZone: DEFAULT_EVENT_TIMEZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(noon);
  return `ב${formatted}`;
}
