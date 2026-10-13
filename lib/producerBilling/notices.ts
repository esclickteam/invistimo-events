import { isOperationalNoticeDue } from "@/lib/notifications/israelQuietHours";
import { israelCalendarDate } from "@/lib/venueSeatingContacts/logic";
import { wallTimeInZoneToUtc } from "@/lib/weddingChallenges/timezone";
import { roundMoney } from "@/lib/producerBilling/calc";

export const ISRAEL_TZ = "Asia/Jerusalem";
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export type CollectionNotice = {
  incidentKey: string;
  type: string;
  category: "admin_urgent" | "admin_important" | "admin_info";
  severity: "urgent" | "important" | "info";
  title: string;
  body: string;
  actionHref: string;
  customerId: string | null;
  eventId?: string | null;
  eventTitle: string;
  debt: boolean;
  reopen: false;
};

export type CollectionFollowUpState = {
  snoozeUntil?: Date | string | null;
  handledCycleKey?: string | null;
  firedSnoozeAt?: Date | string | null;
  noticeBalance?: number | null;
};

export type DebtScheduleInput = {
  clientId: string;
  producerId: string;
  producerName: string;
  clientName?: string;
  eventName: string;
  eventId?: string | null;
  eventDate?: Date | string | null;
  finalRecordsUpdatedAt?: Date | string | null;
  createdAt?: Date | string | null;
  confirmed: boolean;
  finalRecords: number | null;
  amountDue: number | null;
  balance: number | null;
  now: Date;
  followUp?: CollectionFollowUpState | null;
};

export type DebtSchedulePlan = {
  notices: CollectionNotice[];
  retainKeys: string[];
  resolveAllDebt: boolean;
  clearSchedule: boolean;
  markSnoozeFired: boolean;
  firedSnoozeAt: Date | null;
  noticeBalance: number | null;
  cycleKey: string;
  openDebt: number;
};

export function formatShekels(value: number) {
  const negative = value < -0.001;
  const amount = roundMoney(Math.abs(value));
  const [whole, fraction] = amount.toFixed(2).split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const text = fraction === "00" ? grouped : `${grouped}.${fraction}`;
  if (negative) return `יתרת זכות ${text} ₪`;
  return `${text} ₪`;
}

export function israelClock(now: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: ISRAEL_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const read = (type: string) => parts.find((part) => part.type === type)?.value || "";
  const hour = Number(read("hour"));
  return {
    dateKey: `${read("year")}-${read("month")}-${read("day")}`,
    hour: hour === 24 ? 0 : hour,
    minute: Number(read("minute") || 0),
  };
}

export function isIsraelSummaryHour(now: Date) {
  return israelClock(now).hour === 9;
}

export function israelWeekdayIndex(dateKey: string) {
  const atNoon = wallTimeInZoneToUtc(`${dateKey}T12:00`, ISRAEL_TZ);
  if (!atNoon) return 0;
  const label = new Intl.DateTimeFormat("en-US", {
    timeZone: ISRAEL_TZ,
    weekday: "short",
  }).format(atNoon);
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return map[label] ?? 0;
}

export function addIsraelDays(dateKey: string, days: number) {
  const start = wallTimeInZoneToUtc(`${dateKey}T12:00`, ISRAEL_TZ);
  if (!start) return dateKey;
  return israelCalendarDate(new Date(start.getTime() + days * DAY_MS), ISRAEL_TZ);
}

export function israelMorning(dateKey: string, hour = 9) {
  const hh = String(hour).padStart(2, "0");
  return wallTimeInZoneToUtc(`${dateKey}T${hh}:00`, ISRAEL_TZ);
}

export function eventDateKey(value: Date | string | null | undefined) {
  if (!value) return null;
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    return value.trim();
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return israelCalendarDate(date, ISRAEL_TZ);
}

export function formatIsraelDateLabel(value: Date | string | null | undefined) {
  const key = eventDateKey(value);
  if (!key) return "שטרם נקבע";
  const [year, month, day] = key.split("-");
  return `${Number(day)}.${Number(month)}.${year}`;
}

export function openDebtAmount(input: {
  confirmed: boolean;
  amountDue: number | null;
  balance: number | null;
}) {
  if (!input.confirmed) return 0;
  if (input.amountDue == null || input.amountDue <= 0) return 0;
  const balance = roundMoney(Number(input.balance || 0));
  if (balance <= 0) return 0;
  return balance;
}

function asDate(value: Date | string | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function cleanLabel(value: string | null | undefined, fallback: string) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return (text || fallback).slice(0, 80);
}

export function collectionCycleKey(input: {
  finalRecordsUpdatedAt?: Date | string | null;
  createdAt?: Date | string | null;
  finalRecords: number | null;
}) {
  const anchor = asDate(input.finalRecordsUpdatedAt) || asDate(input.createdAt);
  return `${anchor ? anchor.toISOString() : "unset"}:${input.finalRecords ?? "none"}`;
}

export function producerBillingHref(producerId: string, clientId?: string | null) {
  const base = `/admin/users/producers/${encodeURIComponent(producerId)}/billing`;
  if (!clientId) return base;
  return `${base}?client=${encodeURIComponent(clientId)}`;
}

function notice(input: CollectionNotice): CollectionNotice {
  return {
    ...input,
    title: input.title.slice(0, 140),
    body: input.body.slice(0, 500),
    actionHref: input.actionHref.slice(0, 300),
    reopen: false,
  };
}

export function planProducerOpenedClient(input: {
  clientId: string;
  producerId: string;
  producerName: string;
  clientName: string;
  eventDate?: Date | string | null;
  eventId?: string | null;
}) {
  const producer = cleanLabel(input.producerName, "מפיק");
  const client = cleanLabel(input.clientName, "לקוח");
  const when = formatIsraelDateLabel(input.eventDate);
  const body = `המפיק/ה ${producer} פתח/ה לקוח חדש: ${client}, אירוע בתאריך ${when}.`;
  return notice({
    incidentKey: `producer-billing:opened:${input.clientId}`,
    type: "admin.producerBilling.opened",
    category: "admin_info",
    severity: "info",
    title: "לקוח חדש של מפיק",
    body,
    actionHref: producerBillingHref(input.producerId, input.clientId),
    customerId: input.clientId,
    eventId: input.eventId || null,
    eventTitle: client,
    debt: false,
    reopen: false,
  });
}

export function planFinalRecordsNotice(input: {
  clientId: string;
  producerId: string;
  producerName: string;
  eventName: string;
  eventId?: string | null;
  previous: number | null;
  next: number;
  amountDue: number | null;
  updatedAt: Date;
}) {
  if (input.previous === input.next) return null;
  const producer = cleanLabel(input.producerName, "מפיק");
  const eventName = cleanLabel(input.eventName, "האירוע");
  const from = input.previous == null ? "טרם נקבעה" : String(input.previous);
  const direction =
    input.previous == null
      ? ""
      : input.next > input.previous
        ? " הכמות גדלה."
        : " הכמות קטנה.";
  const amount = input.amountDue == null ? "טרם נקבע" : formatShekels(input.amountDue);
  const body = `המפיק/ה ${producer} עדכן/ה כמות רשומות סופית באירוע ${eventName} מ־${from} ל־${input.next}.${direction} סכום החיוב המעודכן: ${amount}.`;
  return notice({
    incidentKey: `producer-billing:final:${input.clientId}:${input.updatedAt.toISOString()}:${input.previous ?? "none"}:${input.next}`,
    type: "admin.producerBilling.finalRecords",
    category: "admin_info",
    severity: "info",
    title: "עודכנה כמות רשומות סופית",
    body,
    actionHref: producerBillingHref(input.producerId, input.clientId),
    customerId: input.clientId,
    eventId: input.eventId || null,
    eventTitle: eventName,
    debt: false,
    reopen: false,
  });
}

export function planPaymentNotice(input: {
  clientId: string;
  producerId: string;
  eventName: string;
  eventId?: string | null;
  amount: number;
  balance: number | null;
  recordedAt: Date;
}) {
  const eventName = cleanLabel(input.eventName, "האירוע");
  const balance = input.balance == null ? "טרם נקבעה" : formatShekels(input.balance);
  const body = `נרשם תשלום בסך ${formatShekels(input.amount)} עבור ${eventName}. יתרה נוכחית: ${balance}.`;
  return notice({
    incidentKey: `producer-billing:payment:${input.clientId}:${input.recordedAt.toISOString()}:${roundMoney(input.amount)}`,
    type: "admin.producerBilling.payment",
    category: "admin_info",
    severity: "info",
    title: "נרשם תשלום",
    body,
    actionHref: producerBillingHref(input.producerId, input.clientId),
    customerId: input.clientId,
    eventId: input.eventId || null,
    eventTitle: eventName,
    debt: false,
    reopen: false,
  });
}

export function planDailySummary(input: {
  now: Date;
  rows: Array<{
    confirmed: boolean;
    amountDue: number | null;
    balance: number | null;
    eventDate?: Date | string | null;
  }>;
}) {
  if (!isIsraelSummaryHour(input.now)) return null;
  const open = input.rows
    .map((row) => ({
      debt: openDebtAmount(row),
      eventKey: eventDateKey(row.eventDate || null),
    }))
    .filter((row) => row.debt > 0);
  if (open.length === 0) return null;
  const total = roundMoney(open.reduce((sum, row) => sum + row.debt, 0));
  const today = israelClock(input.now).dateKey;
  const saturday = addIsraelDays(today, 6 - israelWeekdayIndex(today));
  const thisWeek = open.filter(
    (row) => row.eventKey && row.eventKey >= today && row.eventKey <= saturday,
  ).length;
  const body = `סיכום גבייה יומי: ${open.length} אירועים ממתינים לתשלום, יתרה כוללת ${formatShekels(total)}. מתוכם ${thisWeek} אירועים מתקיימים השבוע.`;
  return notice({
    incidentKey: `producer-billing:daily:${today}`,
    type: "admin.producerBilling.daily",
    category: "admin_info",
    severity: "info",
    title: "סיכום גבייה יומי",
    body,
    actionHref: "/admin/users/collection",
    customerId: null,
    eventTitle: "גבייה",
    debt: false,
    reopen: false,
  });
}

function emptyPlan(cycleKey: string, openDebt: number, extras?: Partial<DebtSchedulePlan>): DebtSchedulePlan {
  return {
    notices: [],
    retainKeys: [],
    resolveAllDebt: false,
    clearSchedule: false,
    markSnoozeFired: false,
    firedSnoozeAt: null,
    noticeBalance: null,
    cycleKey,
    openDebt,
    ...extras,
  };
}

export function planDebtSchedule(input: DebtScheduleInput): DebtSchedulePlan {
  const cycleKey = collectionCycleKey(input);
  const openDebt = openDebtAmount(input);
  if (!input.confirmed || openDebt <= 0) {
    return emptyPlan(cycleKey, 0, {
      resolveAllDebt: true,
      clearSchedule: input.confirmed,
    });
  }

  const follow = input.followUp || {};
  const handled = String(follow.handledCycleKey || "") === cycleKey && cycleKey !== "unset:none";
  const snoozeUntil = asDate(follow.snoozeUntil);
  const producer = cleanLabel(input.producerName, "מפיק");
  const eventName = cleanLabel(input.eventName, "האירוע");
  const href = producerBillingHref(input.producerId, input.clientId);
  const balanceText = formatShekels(openDebt);

  if (handled || (snoozeUntil && input.now.getTime() < snoozeUntil.getTime())) {
    return emptyPlan(cycleKey, openDebt);
  }

  if (snoozeUntil && input.now.getTime() >= snoozeUntil.getTime()) {
    const key = `producer-billing:snooze:${input.clientId}:${snoozeUntil.toISOString()}:${openDebt}`;
    const already =
      asDate(follow.firedSnoozeAt)?.getTime() === snoozeUntil.getTime() &&
      roundMoney(Number(follow.noticeBalance || 0)) === openDebt;
    if (already) {
      return emptyPlan(cycleKey, openDebt, { retainKeys: [key] });
    }
    const body = `תזכורת גבייה: ${producer}, אירוע ${eventName}. יתרה לתשלום: ${balanceText}.`;
    const item = notice({
      incidentKey: key,
      type: "admin.producerBilling.snooze",
      category: "admin_important",
      severity: "important",
      title: "תזכורת גבייה",
      body,
      actionHref: href,
      customerId: input.clientId,
      eventId: input.eventId || null,
      eventTitle: eventName,
      debt: true,
      reopen: false,
    });
    return emptyPlan(cycleKey, openDebt, {
      notices: [item],
      retainKeys: [key],
      markSnoozeFired: true,
      firedSnoozeAt: snoozeUntil,
      noticeBalance: openDebt,
    });
  }

  const anchor = asDate(input.finalRecordsUpdatedAt) || asDate(input.createdAt);
  const age = anchor ? input.now.getTime() - anchor.getTime() : null;
  const notices: CollectionNotice[] = [];
  const retainKeys: string[] = [];
  const stageDebt = (ready: boolean, due: boolean, item: CollectionNotice) => {
    if (!ready) return;
    retainKeys.push(item.incidentKey);
    if (due) notices.push(item);
  };
  if (anchor && age != null) {
    const due24At = new Date(anchor.getTime() + DAY_MS);
    stageDebt(
      age >= DAY_MS,
      isOperationalNoticeDue(due24At, input.now),
      notice({
        incidentKey: `producer-billing:due24h:${input.clientId}:${cycleKey}:${openDebt}`,
        type: "admin.producerBilling.due24h",
        category: "admin_important",
        severity: "important",
        title: "ממתין לתשלום",
        body: `ממתין לתשלום: ${producer}, אירוע ${eventName}, יתרה ${balanceText}.`,
        actionHref: href,
        customerId: input.clientId,
        eventId: input.eventId || null,
        eventTitle: eventName,
        debt: true,
        reopen: false,
      }),
    );
    const due72At = new Date(anchor.getTime() + 3 * DAY_MS);
    stageDebt(
      age >= 3 * DAY_MS,
      isOperationalNoticeDue(due72At, input.now),
      notice({
        incidentKey: `producer-billing:due3d:${input.clientId}:${cycleKey}:${openDebt}`,
        type: "admin.producerBilling.due3d",
        category: "admin_important",
        severity: "important",
        title: "חוב פתוח",
        body: `חוב פתוח למפיק/ה ${producer}, אירוע ${eventName}. יתרה לתשלום: ${balanceText}.`,
        actionHref: href,
        customerId: input.clientId,
        eventId: input.eventId || null,
        eventTitle: eventName,
        debt: true,
        reopen: false,
      }),
    );
  }

  const today = israelClock(input.now).dateKey;
  const eventKey = eventDateKey(input.eventDate);
  if (eventKey) {
    const start = wallTimeInZoneToUtc(`${today}T12:00`, ISRAEL_TZ);
    const end = wallTimeInZoneToUtc(`${eventKey}T12:00`, ISRAEL_TZ);
    const days =
      start && end ? Math.round((end.getTime() - start.getTime()) / DAY_MS) : null;
    if (days != null && days >= 0 && days <= 3) {
      const key = `producer-billing:event-soon:${input.clientId}:${cycleKey}:${eventKey}:${openDebt}`;
      notices.push(
        notice({
          incidentKey: key,
          type: "admin.producerBilling.eventSoon",
          category: "admin_urgent",
          severity: "urgent",
          title: "אירוע מתקרב עם חוב פתוח",
          body: `אירוע מתקרב עם חוב פתוח: ${eventName}, ${formatIsraelDateLabel(eventKey)}. מפיק/ה: ${producer}. יתרה: ${balanceText}.`,
          actionHref: href,
          customerId: input.clientId,
          eventId: input.eventId || null,
          eventTitle: eventName,
          debt: true,
          reopen: false,
        }),
      );
    }
  }

  for (const item of notices) {
    if (!retainKeys.includes(item.incidentKey)) retainKeys.push(item.incidentKey);
  }

  return emptyPlan(cycleKey, openDebt, {
    notices,
    retainKeys,
  });
}

export type FollowUpMode = "handled" | "tomorrow" | "in_3_days" | "date";

export function planFollowUp(input: {
  mode: string;
  now: Date;
  remindOn?: string | null;
  cycleKey: string;
}):
  | {
      ok: true;
      snoozeUntil: Date | null;
      handledCycleKey: string;
      firedSnoozeAt: null;
      noticeBalance: null;
    }
  | { ok: false; error: "INVALID_REMINDER" | "PAST_DATE" } {
  const today = israelClock(input.now).dateKey;
  if (input.mode === "handled") {
    return {
      ok: true,
      snoozeUntil: null,
      handledCycleKey: input.cycleKey,
      firedSnoozeAt: null,
      noticeBalance: null,
    };
  }
  let dateKey = "";
  if (input.mode === "tomorrow") dateKey = addIsraelDays(today, 1);
  else if (input.mode === "in_3_days") dateKey = addIsraelDays(today, 3);
  else if (input.mode === "date") {
    dateKey = String(input.remindOn || "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
      return { ok: false, error: "INVALID_REMINDER" };
    }
    if (dateKey < today) return { ok: false, error: "PAST_DATE" };
  } else {
    return { ok: false, error: "INVALID_REMINDER" };
  }

  const morning = israelMorning(dateKey, 9);
  if (!morning) return { ok: false, error: "INVALID_REMINDER" };
  const snoozeUntil = morning.getTime() <= input.now.getTime() ? input.now : morning;
  return {
    ok: true,
    snoozeUntil,
    handledCycleKey: "",
    firedSnoozeAt: null,
    noticeBalance: null,
  };
}

export function buildFollowUpUpdate(input: {
  snoozeUntil: Date | null;
  handledCycleKey: string;
  firedSnoozeAt: Date | null;
  noticeBalance: number | null;
  note?: string | null;
  at: Date;
  by: unknown;
  noteOnly?: boolean;
}) {
  if (input.noteOnly) {
    return {
      $set: {
        "producerBilling.collectionFollowUp.note": String(input.note || "").slice(0, 500),
        "producerBilling.collectionFollowUp.noteUpdatedAt": input.at,
        "producerBilling.collectionFollowUp.noteUpdatedBy": input.by,
      },
    };
  }
  const set: Record<string, unknown> = {
    "producerBilling.collectionFollowUp.snoozeUntil": input.snoozeUntil,
    "producerBilling.collectionFollowUp.handledCycleKey": input.handledCycleKey,
    "producerBilling.collectionFollowUp.firedSnoozeAt": input.firedSnoozeAt,
    "producerBilling.collectionFollowUp.noticeBalance": input.noticeBalance,
  };
  if (input.note != null) {
    set["producerBilling.collectionFollowUp.note"] = String(input.note).slice(0, 500);
    set["producerBilling.collectionFollowUp.noteUpdatedAt"] = input.at;
    set["producerBilling.collectionFollowUp.noteUpdatedBy"] = input.by;
  }
  return { $set: set };
}

export function buildClearFollowUpScheduleUpdate() {
  return {
    $set: {
      "producerBilling.collectionFollowUp.snoozeUntil": null,
      "producerBilling.collectionFollowUp.handledCycleKey": "",
      "producerBilling.collectionFollowUp.firedSnoozeAt": null,
      "producerBilling.collectionFollowUp.noticeBalance": null,
    },
  };
}

export function followUpHasSchedule(followUp: CollectionFollowUpState | null | undefined) {
  if (!followUp) return false;
  return Boolean(
    followUp.snoozeUntil ||
      followUp.handledCycleKey ||
      followUp.firedSnoozeAt ||
      followUp.noticeBalance,
  );
}
