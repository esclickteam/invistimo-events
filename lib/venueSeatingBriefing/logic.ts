/**
 * Pure rules for the hall-seating event briefing.
 * Nothing here reads or writes the database, and nothing here changes
 * assignment, contacts, or payment records.
 */

import { normalizeEventDateValue } from "@/lib/eventDetails/centralEventDetails";
import { clockMinusMinutes, normalizeClockTime } from "@/lib/seatingSchedule";
import { normalizeSmsPhone } from "@/lib/sendSMS";
import {
  displayContactPhone,
  hasActiveVenueSeatingUpsell,
  israelCalendarDate,
  isValidContactPhone,
  isVenueSeatingEventCancelled,
  type EventTimingInput,
  type VenueSeatingUpsellSource,
} from "@/lib/venueSeatingContacts/logic";
import { DEFAULT_EVENT_TIMEZONE } from "@/lib/weddingChallenges/timezone";

export const BRIEFING_SEND_HOUR = "09:00";
export const BRIEFING_ARRIVAL_LEAD_MINUTES = 30;
export const BRIEFING_SEND_STALE_MS = 2 * 60 * 1000;

export type BriefingRole = "seating_staff" | "producer" | "both";
export type BriefingDispatchStatus = "pending" | "sending" | "sent" | "failed";
export type BriefingSendKind = "automatic" | "manual";

export type BriefingContact = {
  fullName?: unknown;
  phone?: unknown;
  relation?: unknown;
};

export type BriefingPayment = {
  amount?: unknown;
  status?: unknown;
  type?: unknown;
};

export type BriefingFacts = {
  hostsNames?: unknown;
  title?: unknown;
  eventType?: unknown;
  date?: unknown;
  venueName?: unknown;
  city?: unknown;
  receptionTime?: unknown;
  arrivalTimeManual?: unknown;
  arrivalManual?: unknown;
  primary?: BriefingContact | null;
  secondary?: BriefingContact | null;
  totalDealAmount?: unknown;
  paidAmount?: unknown;
  payments?: BriefingPayment[] | null;
};

export type BriefingRecipient = {
  userId: string;
  name: string;
  phone: string;
  role: BriefingRole;
};

const EVENT_KIND_LABEL: Record<string, string> = {
  wedding: "החתונה",
  "bar-mitzvah": "בר המצווה",
  "bat-mitzvah": "בת המצווה",
  brit: "הברית",
  brita: "הבריתה",
  henna: "החינה",
  business: "האירוע",
  other: "האירוע",
};

function clean(value: unknown) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

export function israelClock(value: Date, timeZone = DEFAULT_EVENT_TIMEZONE) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(value);
  const read = (type: string) =>
    parts.find((part) => part.type === type)?.value || "";
  const hour = read("hour") === "24" ? "00" : read("hour");
  return `${hour}:${read("minute")}`;
}

export function formatEventDate(value: unknown) {
  const date = normalizeEventDateValue(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return "";
  const [year, month, day] = date.split("-");
  return `${day}.${month}.${year}`;
}

export function formatIlsAmount(value: number) {
  const rounded = Math.round(Number(value) || 0);
  return `${rounded.toLocaleString("en-US")} ₪`;
}

export function formatBriefingPhone(value: unknown) {
  if (!isValidContactPhone(value)) return "";
  const digits = displayContactPhone(value).replace(/\D/g, "");
  if (digits.length === 10) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  if (digits.length === 9) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  return displayContactPhone(value);
}

/**
 * Same balance the payment system already stores:
 * deal amount minus payments actually marked paid.
 * A stored event-day figure is never read here.
 */
export function collectibleBalance(input: {
  totalDealAmount?: unknown;
  paidAmount?: unknown;
  payments?: BriefingPayment[] | null;
}) {
  const total = Math.max(0, Number(input.totalDealAmount || 0));
  const payments = Array.isArray(input.payments) ? input.payments : [];
  let paid = 0;
  if (payments.length > 0) {
    paid = payments.reduce((sum, payment) => {
      const amount = Math.max(0, Number(payment?.amount || 0));
      const status = String(payment?.status || "").toLowerCase();
      const type = String(payment?.type || "").toLowerCase();
      if (status !== "paid") return sum;
      if (type === "refund") return sum - amount;
      return sum + amount;
    }, 0);
    paid = Math.max(0, paid);
  } else {
    paid = Math.max(0, Number(input.paidAmount || 0));
  }
  return Math.max(0, Math.round((total - paid) * 100) / 100);
}

export function resolveArrivalTime(input: {
  receptionTime?: unknown;
  arrivalTimeManual?: unknown;
  arrivalManual?: unknown;
}) {
  const manualClock = normalizeClockTime(input.arrivalTimeManual);
  if (input.arrivalManual && manualClock) {
    return { time: manualClock, manual: true };
  }
  const reception = normalizeClockTime(input.receptionTime);
  if (!reception) return { time: "", manual: false };
  return {
    time: clockMinusMinutes(reception, BRIEFING_ARRIVAL_LEAD_MINUTES),
    manual: false,
  };
}

export function eventOwnersLine(input: {
  hostsNames?: unknown;
  title?: unknown;
  eventType?: unknown;
}) {
  const hosts = clean(input.hostsNames);
  const title = clean(input.title);
  if (hosts) {
    if (/חתונה|מצווה|ברית|חינה|אירוע/.test(hosts)) return hosts;
    const kind =
      EVENT_KIND_LABEL[clean(input.eventType)] || EVENT_KIND_LABEL.wedding;
    return `${kind} של ${hosts}`;
  }
  return title;
}

function contactReady(contact: BriefingContact | null | undefined) {
  return Boolean(
    clean(contact?.fullName).length >= 2 && isValidContactPhone(contact?.phone)
  );
}

function contactTouched(contact: BriefingContact | null | undefined) {
  if (!contact) return false;
  return Boolean(
    clean(contact.fullName) || clean(contact.phone) || clean(contact.relation)
  );
}

function contactBlock(label: string, contact: BriefingContact) {
  const phone = formatBriefingPhone(contact.phone);
  const lines = [`${label}:`, `${clean(contact.fullName)} – ${phone}`];
  const relation = clean(contact.relation);
  if (relation) lines.push(`תפקיד: ${relation}`);
  return lines.join("\n");
}

export function buildVenueSeatingBriefing(facts: BriefingFacts) {
  const alerts: string[] = [];
  const owners = eventOwnersLine(facts);
  const dateLabel = formatEventDate(facts.date);
  const venue = clean(facts.venueName);
  const city = clean(facts.city);
  const reception = normalizeClockTime(facts.receptionTime);
  const arrival = resolveArrivalTime(facts);
  const balance = collectibleBalance(facts);
  const balanceLabel = formatIlsAmount(balance);

  if (!owners) alerts.push("חסרים שמות בעלי האירוע");
  if (!dateLabel) alerts.push("חסר תאריך אירוע");
  if (!venue && !city) alerts.push("חסרים שם האולם ועיר האירוע");
  else if (!venue) alerts.push("חסר שם האולם");
  else if (!city) alerts.push("חסרה עיר האירוע");
  if (!reception) alerts.push("חסרה שעת קבלת הפנים");
  if (!arrival.time) {
    alerts.push("לא ניתן להציג שעת התייצבות בלי שעת קבלת פנים או שעה ידנית");
  }

  const primaryReady = contactReady(facts.primary);
  const secondaryReady = contactReady(facts.secondary);
  if (!primaryReady) {
    alerts.push("חסרים פרטי איש הקשר הראשי (שם וטלפון תקינים)");
  }
  if (contactTouched(facts.secondary) && !secondaryReady) {
    alerts.push("איש הקשר הנוסף חסר שם או טלפון תקינים");
  }

  const payments = Array.isArray(facts.payments) ? facts.payments : [];
  const total = Number(facts.totalDealAmount || 0);
  const paid = Number(facts.paidAmount || 0);
  if (total <= 0 && payments.length === 0 && paid <= 0) {
    alerts.push("לא נמצאו סכום עסקה או תשלומים שנקלטו לחישוב היתרה");
  }

  const lines = ["Invistimo | פרטי אירוע", ""];
  if (owners) lines.push(`אירוע: ${owners}`);
  if (dateLabel) lines.push(`תאריך: ${dateLabel}`);
  if (owners || dateLabel) lines.push("");

  if (venue || city) {
    lines.push(`אולם: ${[venue, city].filter(Boolean).join(", ")}`);
    lines.push("");
  }
  if (reception) {
    lines.push(`קבלת פנים: ${reception}`);
    lines.push("");
  }
  if (arrival.time) {
    lines.push(`שעת התייצבות: ${arrival.time}`);
    lines.push("");
  }
  if (primaryReady && facts.primary) {
    lines.push(contactBlock("איש קשר ראשי", facts.primary));
    lines.push("");
  }
  if (secondaryReady && facts.secondary) {
    lines.push(contactBlock("איש קשר נוסף", facts.secondary));
    lines.push("");
  }

  lines.push(`יתרה לגבייה באירוע: ${balanceLabel}`);
  if (primaryReady) {
    lines.push("");
    lines.push("יש לתאם את גביית היתרה מול איש הקשר האחראי לתשלום.");
  }

  return {
    owners,
    dateLabel,
    venue,
    city,
    receptionTime: reception,
    arrivalTime: arrival.time,
    arrivalManual: arrival.manual,
    balance,
    balanceLabel,
    alerts,
    text: lines.join("\n").replace(/\n{3,}/g, "\n\n").trim(),
  };
}

export function isPastEventDate(
  event: EventTimingInput | null | undefined,
  now: Date
) {
  const date = normalizeEventDateValue(event?.date);
  if (!date) return true;
  return date < israelCalendarDate(now);
}

export function isBriefingEventDay(
  event: EventTimingInput | null | undefined,
  now: Date
) {
  const date = normalizeEventDateValue(event?.date);
  if (!date) return false;
  return date === israelCalendarDate(now);
}

export function isAtOrAfterBriefingHour(now: Date) {
  return israelClock(now) >= BRIEFING_SEND_HOUR;
}

export function briefingAccess(input: {
  user: VenueSeatingUpsellSource;
  event: EventTimingInput | null | undefined;
  now: Date;
}) {
  const upsell = hasActiveVenueSeatingUpsell(input.user);
  const cancelled = isVenueSeatingEventCancelled(input.event);
  const past = isPastEventDate(input.event, input.now);
  const eventDay = isBriefingEventDay(input.event, input.now);
  const open = upsell && !cancelled && !past;
  return {
    upsell,
    cancelled,
    past,
    eventDay,
    showInAdmin: open,
    allowManualSend: open,
    allowAutomaticSend:
      open && eventDay && isAtOrAfterBriefingHour(input.now),
    showToAssignee: open && eventDay,
  };
}

export function dedupeRecipients(people: BriefingRecipient[]) {
  const byUser = new Map<string, BriefingRecipient>();
  for (const person of people) {
    const userId = clean(person.userId);
    if (!userId) continue;
    const current = byUser.get(userId);
    if (!current) {
      byUser.set(userId, {
        userId,
        name: clean(person.name),
        phone: clean(person.phone),
        role: person.role === "both" ? "seating_staff" : person.role,
      });
      continue;
    }
    if (current.role !== person.role) current.role = "both";
    if (!current.phone && person.phone) current.phone = clean(person.phone);
    if (!current.name && person.name) current.name = clean(person.name);
  }

  const byPhone = new Map<string, BriefingRecipient>();
  const withoutPhone: BriefingRecipient[] = [];
  for (const person of byUser.values()) {
    const phone = normalizeSmsPhone(person.phone);
    if (!phone) {
      withoutPhone.push(person);
      continue;
    }
    const current = byPhone.get(phone);
    if (!current) {
      byPhone.set(phone, person);
      continue;
    }
    if (current.role !== person.role) current.role = "both";
    if (!current.name && person.name) current.name = person.name;
  }
  return [...byPhone.values(), ...withoutPhone];
}

export function roleLabel(role: BriefingRole) {
  if (role === "producer") return "מפיק";
  if (role === "both") return "מפיק ועובד הושבה";
  return "עובד הושבה";
}

export function statusLabel(status: BriefingDispatchStatus | "pending") {
  if (status === "sent") return "נשלח";
  if (status === "failed") return "נכשל";
  return "ממתין לשליחה";
}

type ClaimRecord = {
  status?: BriefingDispatchStatus | null;
  lastAttemptAt?: Date | string | null;
} | null;

function attemptAge(record: ClaimRecord, now: Date) {
  const at = record?.lastAttemptAt ? new Date(record.lastAttemptAt).getTime() : 0;
  if (!at || Number.isNaN(at)) return Number.POSITIVE_INFINITY;
  return now.getTime() - at;
}

export function automaticClaimDecision(record: ClaimRecord, now: Date) {
  if (!record || record.status === "pending") return "claim" as const;
  if (record.status === "sending" && attemptAge(record, now) > BRIEFING_SEND_STALE_MS) {
    return "claim" as const;
  }
  return "skip" as const;
}

export function manualClaimDecision(record: ClaimRecord, now: Date) {
  if (!record) return "claim" as const;
  if (record.status === "sending" && attemptAge(record, now) <= BRIEFING_SEND_STALE_MS) {
    return "skip" as const;
  }
  return "claim" as const;
}

export function publicStatus(
  status: BriefingDispatchStatus | null | undefined
): "pending" | "sent" | "failed" {
  if (status === "sent") return "sent";
  if (status === "failed") return "failed";
  return "pending";
}
