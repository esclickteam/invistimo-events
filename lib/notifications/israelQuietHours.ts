/**
 * Delivery window for operational notices measured in 24 or 72 hours.
 * Real-time outcomes and explicitly scheduled rounds do not use this module.
 * All wall clocks are Asia/Jerusalem, including daylight-saving changes.
 */

import {
  addCalendarDays,
  israelClock,
} from "@/lib/venueSeatingContacts/smsSchedule";
import {
  DEFAULT_EVENT_TIMEZONE,
  wallTimeInZoneToUtc,
} from "@/lib/weddingChallenges/timezone";

export const OPERATIONAL_WINDOW_START_HOUR = 10;
/** 19:00 itself is outside the window and moves to the next morning. */
export const OPERATIONAL_WINDOW_END_HOUR = 19;

function atIsrael(isoDate: string, hour: number, minute = 0) {
  return wallTimeInZoneToUtc(
    `${isoDate}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
    DEFAULT_EVENT_TIMEZONE
  );
}

export function isIsraelOperationalWindow(now: Date) {
  const clock = israelClock(now);
  return (
    clock.hour >= OPERATIONAL_WINDOW_START_HOUR &&
    clock.hour < OPERATIONAL_WINDOW_END_HOUR
  );
}

export type OperationalDelivery = {
  at: Date;
  /** The quiet-hour shift would have landed on or after the event. */
  pulledEarlier: boolean;
};

/**
 * Before 10:00 stays on that morning at 10:00.
 * At or after 19:00 moves to 10:00 the next civil day.
 * A pre-event notice that would then miss the event uses the latest
 * earlier 10:00 that is still before the event.
 */
export function planOperationalDelivery(
  calculatedAt: Date,
  mustBefore?: Date | null
): OperationalDelivery {
  const clock = israelClock(calculatedAt);
  let shifted = calculatedAt;
  if (clock.hour < OPERATIONAL_WINDOW_START_HOUR) {
    shifted = atIsrael(clock.date, OPERATIONAL_WINDOW_START_HOUR) || calculatedAt;
  } else if (clock.hour >= OPERATIONAL_WINDOW_END_HOUR) {
    const next = addCalendarDays(clock.date, 1);
    shifted = (next && atIsrael(next, OPERATIONAL_WINDOW_START_HOUR)) || calculatedAt;
  }

  if (!mustBefore || shifted.getTime() < mustBefore.getTime()) {
    return { at: shifted, pulledEarlier: false };
  }

  let cursor = israelClock(mustBefore).date;
  for (let i = 0; i < 4; i += 1) {
    const morning = atIsrael(cursor, OPERATIONAL_WINDOW_START_HOUR);
    if (morning && morning.getTime() < mustBefore.getTime()) {
      return { at: morning, pulledEarlier: true };
    }
    const previous = addCalendarDays(cursor, -1);
    if (!previous) break;
    cursor = previous;
  }

  return { at: shifted, pulledEarlier: true };
}

export function isOperationalNoticeDue(
  calculatedAt: Date,
  now: Date,
  mustBefore?: Date | null
) {
  if (mustBefore && now.getTime() >= mustBefore.getTime()) return false;
  const delivery = planOperationalDelivery(calculatedAt, mustBefore);
  if (now.getTime() < delivery.at.getTime()) return false;
  return isIsraelOperationalWindow(now);
}
