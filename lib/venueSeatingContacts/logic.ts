/**
 * Pure rules for hall-seating contacts and reminders.
 *
 * The purchased upsell key in this system is `venueSeating`
 * ("הושבה באולם"). Digital seating and a table map do not qualify.
 * Nothing here reads or writes the database.
 */

import { normalizeEventDateValue } from "@/lib/eventDetails/centralEventDetails";
import { normalizeClockTime } from "@/lib/seatingSchedule";
import {
  DEFAULT_EVENT_TIMEZONE,
  wallTimeInZoneToUtc,
} from "@/lib/weddingChallenges/timezone";
import {
  isVenueSeatingSmsDue,
  venueSeatingSmsWhenPhrase,
} from "@/lib/venueSeatingContacts/smsSchedule";

export const VENUE_SEATING_UPSELL_KEY = "venueSeating";

export const VENUE_SEATING_RESPONSIBILITY_VERSION =
  "venue-seating-responsibility-2026-10-11";

export const VENUE_SEATING_RESPONSIBILITY_TEXT =
  "אני מאשר/ת כי אנשי הקשר שמסרנו מודעים לתפקידם, יהיו זמינים לצוות ההושבה החל מתחילת קבלת הפנים ולאורך ההושבה, ומוסמכים מטעמנו לאשר פתיחת שולחנות רזרבה בהתאם להרשאות שנמסרו.\n\nידוע לנו כי באחריותנו ליידע את אנשי הקשר, לוודא את זמינותם ולדאוג להעברת יתרת התשלום ביום האירוע לגורם האחראי מטעמנו, ככל שקיימת יתרה לתשלום.";

export const VENUE_SEATING_NOTIFICATION_CATEGORY = "venue_seating_contacts";

export type ReminderStage = "initial" | "h72" | "h24";
export type ReminderChannel = "in_app" | "sms";

export type PlannedReminder = {
  stage: ReminderStage;
  channels: ReminderChannel[];
};

export type ContactDraft = {
  fullName: string;
  phone: string;
  relation: string;
  canApproveReserves: boolean;
};

export type VenueSeatingUpsellSource = {
  salesUpsells?: {
    venueSeating?: { enabled?: boolean | null } | null;
    digitalSeating?: { enabled?: boolean | null } | null;
  } | null;
  venueSeatingService?: { enabled?: boolean | null } | null;
  includeDigitalSeating?: boolean | null;
  venueSeatingTemplateId?: unknown;
  packageName?: string | null;
} | null;

export type EventTimingInput = {
  date?: unknown;
  time?: unknown;
  receptionTime?: unknown;
  status?: unknown;
  paymentStatus?: unknown;
};

const HOUR_MS = 60 * 60 * 1000;

export function israelCalendarDate(value: Date, timeZone = DEFAULT_EVENT_TIMEZONE) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const read = (type: string) =>
    parts.find((part) => part.type === type)?.value || "";
  return `${read("year")}-${read("month")}-${read("day")}`;
}

export function hasActiveVenueSeatingUpsell(user: VenueSeatingUpsellSource) {
  if (!user) return false;
  return Boolean(
    user.salesUpsells?.venueSeating?.enabled || user.venueSeatingService?.enabled
  );
}

export function isVenueSeatingEventCancelled(event: EventTimingInput | null | undefined) {
  const status = String(event?.status || "").toLowerCase();
  const payment = String(event?.paymentStatus || "").toLowerCase();
  return status === "archived" || status === "cancelled" || payment === "refunded";
}

/** Event start in Israel time. Missing clock falls back to reception, then 00:00. */
export function resolveEventStart(
  event: EventTimingInput | null | undefined,
  timeZone = DEFAULT_EVENT_TIMEZONE
): Date | null {
  const date = normalizeEventDateValue(event?.date);
  if (!date) return null;
  const clock =
    normalizeClockTime(event?.time) ||
    normalizeClockTime(event?.receptionTime) ||
    "00:00";
  return wallTimeInZoneToUtc(`${date}T${clock}`, timeZone);
}

export function eventStartKey(event: EventTimingInput | null | undefined) {
  return normalizeEventDateValue(event?.date);
}

export function isEventStartInFuture(start: Date | null, now: Date) {
  return Boolean(start && start.getTime() > now.getTime());
}

export function isEventDayOrUpcoming(
  event: EventTimingInput | null | undefined,
  now: Date
) {
  const date = normalizeEventDateValue(event?.date);
  if (!date) return false;
  return date >= israelCalendarDate(now);
}

export type EventAccess = {
  upsellActive: boolean;
  cancelled: boolean;
  future: boolean;
  eventDayOrUpcoming: boolean;
  showTab: boolean;
  allowEdit: boolean;
  runAutomations: boolean;
  contributesToBell: boolean;
};

export function classifyEventAccess(input: {
  user: VenueSeatingUpsellSource;
  event: EventTimingInput | null | undefined;
  now: Date;
}): EventAccess {
  const upsellActive = hasActiveVenueSeatingUpsell(input.user);
  const cancelled = isVenueSeatingEventCancelled(input.event);
  const start = resolveEventStart(input.event);
  const future = isEventStartInFuture(start, input.now);
  const eventDayOrUpcoming = isEventDayOrUpcoming(input.event, input.now);
  const open = upsellActive && !cancelled && eventDayOrUpcoming;
  return {
    upsellActive,
    cancelled,
    future,
    eventDayOrUpcoming,
    showTab: open,
    allowEdit: open,
    runAutomations: upsellActive && !cancelled && future,
    contributesToBell: !cancelled && future,
  };
}

export function shouldShowNotificationBell(
  events: Array<EventTimingInput | null | undefined>,
  now: Date
) {
  return events.some((event) =>
    classifyEventAccess({ user: null, event, now }).contributesToBell
  );
}

export function normalizeContactPhone(value: unknown) {
  let digits = String(value ?? "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = `972${digits.slice(1)}`;
  else if (!digits.startsWith("972")) digits = `972${digits}`;
  return digits;
}

export function isValidContactPhone(value: unknown) {
  return /^972\d{8,9}$/.test(normalizeContactPhone(value));
}

export function displayContactPhone(value: unknown) {
  const normalized = normalizeContactPhone(value);
  if (!/^972\d{8,9}$/.test(normalized)) return String(value ?? "").trim();
  return `0${normalized.slice(3)}`;
}

function cleanText(value: unknown) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

export function isBlankContact(contact: ContactDraft | null | undefined) {
  if (!contact) return true;
  return (
    !cleanText(contact.fullName) &&
    !cleanText(contact.phone) &&
    !cleanText(contact.relation) &&
    !contact.canApproveReserves
  );
}

function normalizeContact(contact: ContactDraft) {
  return {
    fullName: cleanText(contact.fullName),
    phone: displayContactPhone(contact.phone),
    phoneNormalized: normalizeContactPhone(contact.phone),
    relation: cleanText(contact.relation),
    canApproveReserves: Boolean(contact.canApproveReserves),
  };
}

export function validateVenueSeatingContacts(input: {
  primary: ContactDraft;
  secondary?: ContactDraft | null;
  responsibilityAccepted: boolean;
}) {
  const errors: string[] = [];
  const primary = normalizeContact(input.primary);
  const secondaryBlank = isBlankContact(input.secondary);
  const secondary = secondaryBlank ? null : normalizeContact(input.secondary as ContactDraft);

  if (primary.fullName.length < 2) errors.push("יש להזין שם מלא לאיש הקשר הראשי");
  if (!isValidContactPhone(input.primary.phone)) {
    errors.push("מספר הטלפון של איש הקשר הראשי אינו תקין");
  }
  if (primary.relation.length < 2) {
    errors.push("יש להזין תפקיד או קרבה לאיש הקשר הראשי");
  }

  if (secondary) {
    if (secondary.fullName.length < 2) errors.push("יש להזין שם מלא לאיש הקשר הנוסף");
    if (!isValidContactPhone(input.secondary?.phone)) {
      errors.push("מספר הטלפון של איש הקשר הנוסף אינו תקין");
    }
    if (secondary.relation.length < 2) {
      errors.push("יש להזין תפקיד או קרבה לאיש הקשר הנוסף");
    }
  }

  const someoneCanApprove =
    primary.canApproveReserves || Boolean(secondary?.canApproveReserves);
  if (!someoneCanApprove) {
    errors.push("לפחות איש קשר אחד חייב להיות מוסמך לאשר פתיחת רזרבות");
  }

  if (!input.responsibilityAccepted) {
    errors.push("יש לאשר את הצהרת האחריות כדי לשמור את הטופס");
  }

  if (errors.length) return { ok: false as const, errors };

  return {
    ok: true as const,
    primary,
    secondary,
    responsibilityVersion: VENUE_SEATING_RESPONSIBILITY_VERSION,
    responsibilityText: VENUE_SEATING_RESPONSIBILITY_TEXT,
  };
}

export function isLateCompletion(eventStart: Date, completedAt: Date) {
  return eventStart.getTime() - completedAt.getTime() < 24 * HOUR_MS;
}

export type CompletionStatus = "missing" | "complete" | "complete_late";

export function completionStatus(input: {
  completedAt: Date | string | null | undefined;
  completedLate?: boolean | null;
}): CompletionStatus {
  if (!input.completedAt) return "missing";
  return input.completedLate ? "complete_late" : "complete";
}

export function completionStatusLabel(status: CompletionStatus) {
  if (status === "complete") return "פרטי אנשי קשר הושלמו";
  if (status === "complete_late") return "הושלמו באיחור";
  return "חסרים אנשי קשר";
}

export function hoursUntil(start: Date, now: Date) {
  return (start.getTime() - now.getTime()) / HOUR_MS;
}

/**
 * Decide which reminders may be created on this run.
 * Already-sent stages are for the current event date only.
 * A purchase inside the 72h window does not backfill the 72h reminder.
 * The in-app 24h alert still opens inside that window.
 * The customer SMS is separate: 10:00 Asia/Jerusalem on the permitted day
 * before the event, once per event date. A prior send for that date,
 * including one that went out at the wrong hour, is not repeated.
 */
export function planVenueSeatingReminders(input: {
  now: Date;
  eventStart: Date | null;
  /** Civil event date, YYYY-MM-DD. SMS is not scheduled without it. */
  eventDate?: string | null;
  cancelled: boolean;
  upsellActive: boolean;
  contactsComplete: boolean;
  /** Channels already recorded for the current event date. */
  alreadySent: Array<{ stage: ReminderStage; channel: ReminderChannel }>;
  initialSentAt: Date | null;
}): {
  actions: PlannedReminder[];
  resolveActive: boolean;
  automation: "run" | "stop";
} {
  if (!input.eventStart || input.cancelled || !input.upsellActive) {
    return { actions: [], resolveActive: true, automation: "stop" };
  }
  if (input.eventStart.getTime() <= input.now.getTime()) {
    return { actions: [], resolveActive: true, automation: "stop" };
  }
  if (input.contactsComplete) {
    return { actions: [], resolveActive: true, automation: "stop" };
  }

  const actions: PlannedReminder[] = [];
  const remaining = hoursUntil(input.eventStart, input.now);
  const sent = new Set(
    input.alreadySent.map((item) => `${item.stage}:${item.channel}`)
  );
  const missing = (stage: ReminderStage, channels: ReminderChannel[]) =>
    channels.filter((channel) => !sent.has(`${stage}:${channel}`));

  const initialChannels = missing("initial", ["in_app"]);
  if (initialChannels.length) {
    actions.push({ stage: "initial", channels: initialChannels });
  }

  const initialPredatesWindow =
    input.initialSentAt != null &&
    input.initialSentAt.getTime() <= input.eventStart.getTime() - 72 * HOUR_MS;

  if (remaining <= 72 && remaining > 24 && initialPredatesWindow) {
    const channels = missing("h72", ["in_app"]);
    if (channels.length) actions.push({ stage: "h72", channels });
  }

  const smsDue =
    !sent.has("h24:sms") && isVenueSeatingSmsDue(input.eventDate, input.now);

  if (remaining <= 24) {
    const channels = missing("h24", ["in_app"]);
    if (smsDue) channels.push("sms");
    if (channels.length) actions.push({ stage: "h24", channels });
  } else if (smsDue) {
    actions.push({ stage: "h24", channels: ["sms"] });
  }

  return { actions, resolveActive: false, automation: "run" };
}

export function buildVenueSeatingUrgentSms(
  link: string,
  options?: { eventDate?: string | null }
) {
  const safeLink = String(link || "").trim();
  const when = venueSeatingSmsWhenPhrase(options?.eventDate);
  return [
    "שלום,",
    `לקראת האירוע שלכם ${when}, טרם הושלמו פרטי אנשי הקשר המוסמכים לאישור רזרבות.`,
    "",
    "יש להשלים את הפרטים בהקדם באזור האישי:",
    safeLink,
    "",
    "צוות Invistimo",
  ].join("\n");
}

export function notificationCopy(stage: ReminderStage) {
  if (stage === "h72") {
    return {
      type: "venue_seating_contacts.h72",
      severity: "important" as const,
      title: "תזכורת: אנשי קשר להושבה באולם",
      body: "בעוד כ־72 שעות מתחיל האירוע, ופרטי אנשי הקשר המוסמכים לאישור רזרבות עדיין חסרים. יש להשלים אותם באזור האישי.",
    };
  }
  if (stage === "h24") {
    return {
      type: "venue_seating_contacts.h24",
      severity: "urgent" as const,
      title: "דחוף: חסרים אנשי קשר להושבה באולם",
      body: "האירוע מתחיל בקרוב וטרם הושלמו פרטי אנשי הקשר המוסמכים לאישור רזרבות. יש להשלים את הפרטים עכשיו באזור האישי.",
    };
  }
  return {
    type: "venue_seating_contacts.initial",
    severity: "important" as const,
    title: "השלימו אנשי קשר להושבה באולם",
    body: "שירות ההושבה באולם פעיל. יש להזין איש קשר ראשי, לסמן מי מוסמך לאשר רזרבות, ולאשר את הצהרת האחריות.",
  };
}

export function notificationDedupeKey(input: {
  eventId: string;
  stage: ReminderStage;
  startKey: string;
}) {
  if (input.stage === "initial") {
    return `venue-seating-contacts:${input.eventId}:initial`;
  }
  return `venue-seating-contacts:${input.eventId}:${input.stage}:${input.startKey}`;
}

export function contactsActionHref(eventId: string) {
  return `/dashboard/venue-seating?eventId=${encodeURIComponent(eventId)}`;
}

export function showMissingContactsAlert(input: {
  status: CompletionStatus;
  eventStart: Date | null;
  now: Date;
}) {
  if (input.status !== "missing" || !input.eventStart) return false;
  const remaining = hoursUntil(input.eventStart, input.now);
  return remaining > 0 && remaining <= 24;
}
