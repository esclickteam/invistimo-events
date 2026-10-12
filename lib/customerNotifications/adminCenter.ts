/**
 * Pure admin-notice rules. Nothing here reads or writes the database,
 * and nothing here changes message, call, IVR, shift, payment, or seating behavior.
 *
 * Late-start grace is 15 minutes. SMS, WhatsApp, and IVR workers already run
 * every minute, so a notice is created only after several missed ticks.
 * Lookback is 36 hours so finished history is not replayed.
 */

export const ADMIN_START_GRACE_MS = 15 * 60 * 1000;
export const ADMIN_LATE_LOOKBACK_MS = 36 * 60 * 60 * 1000;
export const ADMIN_SUMMARY_WINDOW_MS = 6 * 60 * 60 * 1000;
export const ADMIN_PRE_EVENT_HOURS = 24;
export const ADMIN_BALANCE_HOURS = 24 * 7;

export type AdminIncident = {
  incidentKey: string;
  type: string;
  category: "admin_urgent" | "admin_important" | "admin_info";
  severity: "urgent" | "important" | "info";
  title: string;
  body: string;
  actionHref: string;
  eventId?: string | null;
  customerId?: string | null;
  eventTitle?: string;
  reopen: boolean;
};

export type AdminListItem = {
  type: string;
  eventId: string | null;
  eventTitle: string;
  severity: "info" | "important" | "urgent";
  status: "active" | "resolved";
  read: boolean;
};

export type AdminListFilter = {
  type?: string;
  eventId?: string;
  severity?: string;
  status?: string;
};

const NOT_STARTED_CALL_STATUSES = new Set([
  "scheduled",
  "waiting_for_assignment",
  "waiting_for_previous_round",
]);

export function dedupeDecision(
  existing: "active" | "resolved" | null,
  reopenResolved: boolean
) {
  if (!existing) return "create" as const;
  if (existing === "active") return "skip" as const;
  return reopenResolved ? ("reopen" as const) : ("skip" as const);
}

export function isLateUnstarted(input: {
  scheduledAt: Date | null;
  now: Date;
  graceMs?: number;
  lookbackMs?: number;
}) {
  if (!input.scheduledAt || Number.isNaN(input.scheduledAt.getTime())) return false;
  const grace = input.graceMs ?? ADMIN_START_GRACE_MS;
  const lookback = input.lookbackMs ?? ADMIN_LATE_LOOKBACK_MS;
  const scheduled = input.scheduledAt.getTime();
  const now = input.now.getTime();
  if (now < scheduled + grace) return false;
  if (scheduled < now - lookback) return false;
  return true;
}

export function hoursUntil(start: Date | null, now: Date) {
  if (!start || Number.isNaN(start.getTime())) return null;
  return (start.getTime() - now.getTime()) / (60 * 60 * 1000);
}

export function adminCustomerHref(customerId: string | null | undefined) {
  const id = String(customerId || "").trim();
  if (/^[a-f0-9]{24}$/i.test(id)) {
    return `/admin/users?impersonate=${encodeURIComponent(id)}`;
  }
  return "/admin/users";
}

function eventName(value: string | null | undefined) {
  const title = String(value || "").trim();
  return title || "האירוע";
}

function incident(input: AdminIncident): AdminIncident {
  return {
    ...input,
    title: input.title.slice(0, 140),
    body: input.body.slice(0, 220),
    actionHref: input.actionHref.slice(0, 300),
    eventTitle: eventName(input.eventTitle || input.title),
  };
}

export function planMessageNotStarted(input: {
  scheduleId: string;
  channel: "sms" | "whatsapp";
  round: number | null;
  eventTitle: string;
  status: string;
  scheduledAt: Date | null;
  now: Date;
  eventId?: string | null;
  customerId?: string | null;
}): AdminIncident | null {
  if (String(input.status || "") !== "scheduled") return null;
  if (!isLateUnstarted({ scheduledAt: input.scheduledAt, now: input.now })) return null;
  const name = eventName(input.eventTitle);
  const channel = input.channel === "sms" ? "SMS" : "WhatsApp";
  const round = input.round ? `סבב ${input.round}` : "הסבב";
  return incident({
    incidentKey: `msg-not-started:${input.scheduleId}`,
    type: "admin.message.notStarted",
    category: "admin_urgent",
    severity: "urgent",
    title: `סבב הודעות לא התחיל במועד – ${name}`,
    body: `${round} ב${channel} עדיין לא התחיל.`,
    actionHref: "/admin",
    eventId: input.eventId,
    customerId: input.customerId,
    eventTitle: name,
    reopen: true,
  });
}

export function planCallNotStarted(input: {
  userId: string;
  round: number;
  scheduledAt: Date | null;
  status: string;
  ivr: boolean;
  eventTitle: string;
  now: Date;
  eventId?: string | null;
}): AdminIncident | null {
  if (!NOT_STARTED_CALL_STATUSES.has(String(input.status || ""))) return null;
  if (!isLateUnstarted({ scheduledAt: input.scheduledAt, now: input.now })) return null;
  if (!input.scheduledAt) return null;
  const name = eventName(input.eventTitle);
  const kind = input.ivr ? "IVR" : "שיחות אנושיות";
  return incident({
    incidentKey: `call-not-started:${input.userId}:${input.round}:${input.scheduledAt.toISOString()}`,
    type: "admin.call.notStarted",
    category: "admin_urgent",
    severity: "urgent",
    title: `סבב ${kind} לא התחיל במועד – ${name}`,
    body: `סבב ${input.round} עדיין לא התחיל.`,
    actionHref: "/admin/shift-management",
    eventId: input.eventId,
    customerId: input.userId,
    eventTitle: name,
    reopen: true,
  });
}

export function planShiftNotStarted(input: {
  employeeId: string;
  employeeName: string;
  dateKey: string;
  todayKey: string;
  shiftStart: Date | null;
  hasStartedSession: boolean;
  now: Date;
}): AdminIncident | null {
  if (input.dateKey !== input.todayKey) return null;
  if (input.hasStartedSession) return null;
  if (!isLateUnstarted({ scheduledAt: input.shiftStart, now: input.now })) return null;
  const name = String(input.employeeName || "").trim() || "עובד";
  return incident({
    incidentKey: `shift-not-started:${input.employeeId}:${input.dateKey}`,
    type: "admin.shift.notStarted",
    category: "admin_urgent",
    severity: "urgent",
    title: `עובד לא התחיל משמרת – ${name}`,
    body: "המשמרת לא נפתחה במועד שנקבע.",
    actionHref: "/admin/shift-management",
    eventTitle: name,
    reopen: true,
  });
}

export function planCriticalMissing(input: {
  eventId: string;
  title: string;
  start: Date | null;
  now: Date;
  cancelled: boolean;
  missingLocation: boolean;
  missingTime: boolean;
  customerId?: string | null;
}): AdminIncident | null {
  if (input.cancelled) return null;
  const hours = hoursUntil(input.start, input.now);
  if (hours == null || hours <= 0 || hours > ADMIN_PRE_EVENT_HOURS) return null;
  if (!input.missingLocation && !input.missingTime) return null;
  const name = eventName(input.title);
  const missing = [
    input.missingTime ? "שעה" : "",
    input.missingLocation ? "מיקום" : "",
  ].filter(Boolean);
  return incident({
    incidentKey: `critical-missing:${input.eventId}`,
    type: "admin.critical.missing",
    category: "admin_urgent",
    severity: "urgent",
    title: `נתונים קריטיים חסרים – ${name}`,
    body: `חסרים ${missing.join(" ו")} לפני האירוע.`,
    actionHref: adminCustomerHref(input.customerId),
    eventId: input.eventId,
    customerId: input.customerId,
    eventTitle: name,
    reopen: true,
  });
}

export function seatingTeamGap(input: {
  requiredStaff: number;
  assignedStaffIds: string[];
  hallShiftEmployeeIds: string[];
}) {
  const required = Math.max(0, Math.floor(Number(input.requiredStaff) || 0));
  const ids = new Set(
    [...input.assignedStaffIds, ...input.hallShiftEmployeeIds]
      .map((value) => String(value || "").trim())
      .filter(Boolean)
  );
  return {
    required,
    assigned: ids.size,
    short: required > 0 && ids.size < required,
  };
}

export function planSeatingTeamMissing(input: {
  eventId: string;
  title: string;
  start: Date | null;
  now: Date;
  cancelled: boolean;
  venueSeating: boolean;
  requiredStaff: number;
  assignedStaffIds: string[];
  hallShiftEmployeeIds: string[];
  customerId?: string | null;
}): AdminIncident | null {
  if (!input.venueSeating || input.cancelled) return null;
  const hours = hoursUntil(input.start, input.now);
  if (hours == null || hours <= 0 || hours > ADMIN_PRE_EVENT_HOURS) return null;
  const gap = seatingTeamGap(input);
  if (!gap.short) return null;
  const name = eventName(input.title);
  return incident({
    incidentKey: `seating-team:${input.eventId}`,
    type: "admin.seating.teamMissing",
    category: "admin_urgent",
    severity: "urgent",
    title: `אין צוות הושבה כנדרש – ${name}`,
    body: `שובצו ${gap.assigned} מתוך ${gap.required} אנשי צוות.`,
    actionHref: "/admin/employees/shifts",
    eventId: input.eventId,
    customerId: input.customerId,
    eventTitle: name,
    reopen: true,
  });
}

export function planSeatingIncomplete(input: {
  eventId: string;
  title: string;
  hoursUntil: number | null;
  venueSeating: boolean;
  seatingEnabled: boolean;
  totalTables: number;
  seatedGuests: number;
  confirmedGuests: number;
  customerId?: string | null;
}): AdminIncident | null {
  if (!input.venueSeating && !input.seatingEnabled) return null;
  const hours = input.hoursUntil;
  if (hours == null || hours <= 0 || hours > ADMIN_PRE_EVENT_HOURS) return null;
  const noMap = input.totalTables <= 0;
  const partial =
    input.totalTables > 0 &&
    input.confirmedGuests > 0 &&
    input.seatedGuests < input.confirmedGuests;
  if (!(input.venueSeating && noMap) && !partial) return null;
  const name = eventName(input.title);
  return incident({
    incidentKey: `seating-incomplete:${input.eventId}`,
    type: "admin.seating.incomplete",
    category: "admin_important",
    severity: "important",
    title: `הושבה לא הושלמה – ${name}`,
    body: noMap ? "עדיין אין מפת הושבה לאירוע." : "נשארו אורחים בלי שיבוץ.",
    actionHref: adminCustomerHref(input.customerId),
    eventId: input.eventId,
    customerId: input.customerId,
    eventTitle: name,
    reopen: true,
  });
}

export function planBalanceDue(input: {
  userId: string;
  eventId: string;
  title: string;
  hoursUntil: number | null;
  remainingAmount: number;
  paymentMode: string;
  cancelled: boolean;
}): AdminIncident | null {
  if (input.cancelled) return null;
  if (String(input.paymentMode || "") === "free") return null;
  if (!(Number(input.remainingAmount) > 0)) return null;
  const hours = input.hoursUntil;
  if (hours == null || hours <= 0 || hours > ADMIN_BALANCE_HOURS) return null;
  const name = eventName(input.title);
  return incident({
    incidentKey: `balance-due:${input.userId}`,
    type: "admin.balance.due",
    category: "admin_important",
    severity: "important",
    title: `יתרה לתשלום – ${name}`,
    body: "יש יתרה לתשלום לפני האירוע.",
    actionHref: adminCustomerHref(input.userId),
    eventId: input.eventId,
    customerId: input.userId,
    eventTitle: name,
    reopen: true,
  });
}

export function planEventSummary(input: {
  eventId: string;
  title: string;
  start: Date | null;
  now: Date;
  cancelled: boolean;
  hasClock: boolean;
  customerId?: string | null;
}): AdminIncident | null {
  if (input.cancelled || !input.hasClock || !input.start) return null;
  const elapsed = input.now.getTime() - input.start.getTime();
  if (elapsed < 0 || elapsed > ADMIN_SUMMARY_WINDOW_MS) return null;
  const name = eventName(input.title);
  return incident({
    incidentKey: `event-summary:${input.eventId}`,
    type: "admin.event.summary",
    category: "admin_important",
    severity: "important",
    title: `סיכום אירוע – ${name}`,
    body: "האירוע הסתיים.",
    actionHref: adminCustomerHref(input.customerId),
    eventId: input.eventId,
    customerId: input.customerId,
    eventTitle: name,
    reopen: false,
  });
}

export function planNewCustomer(input: { customerId: string; name: string }): AdminIncident {
  const name = String(input.name || "").trim() || "לקוח חדש";
  return incident({
    incidentKey: `new-customer:${input.customerId}`,
    type: "admin.customer.created",
    category: "admin_important",
    severity: "important",
    title: `לקוח חדש – ${name}`,
    body: "נפתח לקוח חדש במערכת.",
    actionHref: adminCustomerHref(input.customerId),
    customerId: input.customerId,
    eventTitle: name,
    reopen: false,
  });
}

export function planShiftEnded(input: {
  employeeId: string;
  employeeName: string;
  dateKey: string;
}): AdminIncident {
  const name = String(input.employeeName || "").trim() || "עובד";
  return incident({
    incidentKey: `shift-ended:${input.employeeId}:${input.dateKey}`,
    type: "admin.shift.ended",
    category: "admin_important",
    severity: "important",
    title: `עובד סיים משמרת – ${name}`,
    body: "המשמרת נסגרה.",
    actionHref: "/admin/shift-management",
    eventTitle: name,
    reopen: false,
  });
}

export function planTaskCompleted(input: {
  taskId: string;
  title: string;
  eventTitle: string;
  eventId?: string | null;
  customerId?: string | null;
}): AdminIncident {
  const name = eventName(input.eventTitle);
  const task = String(input.title || "").trim() || "משימה";
  return incident({
    incidentKey: `task-done:${input.taskId}`,
    type: "admin.task.done",
    category: "admin_info",
    severity: "info",
    title: `משימה הושלמה – ${name}`,
    body: task,
    actionHref: adminCustomerHref(input.customerId),
    eventId: input.eventId,
    customerId: input.customerId,
    eventTitle: name,
    reopen: false,
  });
}

export function planDetailsCompleted(input: {
  eventId: string;
  title: string;
  customerId?: string | null;
}): AdminIncident {
  const name = eventName(input.title);
  return incident({
    incidentKey: `details-completed:${input.eventId}`,
    type: "admin.details.completed",
    category: "admin_info",
    severity: "info",
    title: `לקוח השלים פרטים – ${name}`,
    body: "הושלמו פרטים שחסרו לאירוע.",
    actionHref: adminCustomerHref(input.customerId),
    eventId: input.eventId,
    customerId: input.customerId,
    eventTitle: name,
    reopen: false,
  });
}

export function planTeamAssigned(input: {
  eventId: string;
  title: string;
  customerId?: string | null;
}): AdminIncident {
  const name = eventName(input.title);
  return incident({
    incidentKey: `seating-team-assigned:${input.eventId}`,
    type: "admin.seating.teamAssigned",
    category: "admin_info",
    severity: "info",
    title: `צוות הושבה שובץ – ${name}`,
    body: "צוות ההושבה שובץ לאירוע.",
    actionHref: "/admin/employees/shifts",
    eventId: input.eventId,
    customerId: input.customerId,
    eventTitle: name,
    reopen: false,
  });
}

function textOf(value: unknown) {
  return String(value || "").trim();
}

function locationText(value: unknown) {
  if (!value || typeof value !== "object") return textOf(value);
  const location = value as {
    name?: unknown;
    address?: unknown;
    formattedAddress?: unknown;
    placeName?: unknown;
  };
  return [
    location.name,
    location.address,
    location.formattedAddress,
    location.placeName,
  ]
    .map(textOf)
    .find(Boolean) || "";
}

export function classifyEventDetailChanges(
  before: Record<string, unknown> | null | undefined,
  after: Record<string, unknown> | null | undefined
) {
  const left = before || {};
  const right = after || {};
  const significant: string[] = [];
  const completed: string[] = [];

  const pairs: Array<{ label: string; previous: string; next: string; critical?: boolean }> = [
    {
      label: "שם האירוע",
      previous: textOf(left.title),
      next: textOf(right.title),
    },
    {
      label: "תאריך",
      previous: textOf(left.eventDate || left.date),
      next: textOf(right.eventDate || right.date),
      critical: true,
    },
    {
      label: "שעה",
      previous: textOf(left.eventTime || left.time || left.ceremonyTime || left.receptionTime),
      next: textOf(right.eventTime || right.time || right.ceremonyTime || right.receptionTime),
      critical: true,
    },
    {
      label: "מיקום",
      previous: locationText(left.location),
      next: locationText(right.location),
      critical: true,
    },
  ];

  for (const pair of pairs) {
    if (pair.previous === pair.next) continue;
    if (pair.previous && pair.next) significant.push(pair.label);
    else if (!pair.previous && pair.next && pair.critical) completed.push(pair.label);
  }

  return { significant, completed };
}

export function planEventDetailChange(input: {
  eventId: string;
  title: string;
  fields: string[];
  hourBucket: string;
  upcoming: boolean;
  customerId?: string | null;
}): AdminIncident | null {
  if (!input.upcoming || input.fields.length === 0) return null;
  const name = eventName(input.title);
  const fields = input.fields.slice(0, 4).join(", ");
  return incident({
    incidentKey: `event-change:${input.eventId}:${input.fields.slice().sort().join("+")}:${input.hourBucket}`,
    type: "admin.event.changed",
    category: "admin_important",
    severity: "important",
    title: `שינוי בפרטי אירוע – ${name}`,
    body: `עודכנו: ${fields}.`,
    actionHref: adminCustomerHref(input.customerId),
    eventId: input.eventId,
    customerId: input.customerId,
    eventTitle: name,
    reopen: false,
  });
}

export function describeTestPushResult(input: {
  configured: boolean;
  attempted: number;
  sent: number;
}) {
  if (!input.configured) {
    return {
      acceptedByPushService: false,
      displayed: false,
      message: "שרת ה-Push לא מוגדר, ולכן לא נשלחה התראת בדיקה.",
    };
  }
  if (input.attempted <= 0) {
    return {
      acceptedByPushService: false,
      displayed: false,
      message: "אין מכשיר שאישר Push לחשבון הזה, ולכן לא אומתה מסירה.",
    };
  }
  if (input.sent <= 0) {
    return {
      acceptedByPushService: false,
      displayed: false,
      message: "שירות ה-Push לא קיבל את ההתראה. המסירה לא אומתה.",
    };
  }
  return {
    acceptedByPushService: true,
    displayed: false,
    message: "שירות ה-Push קיבל את הבקשה. ההצגה על המכשיר עצמו לא אומתה.",
  };
}

export function adminNoticeStatusLabels(input: {
  status: "active" | "resolved";
  read: boolean;
}) {
  return {
    handled: input.status === "resolved" ? "טופל" : "פתוח",
    read: input.read ? "נקרא" : "לא נקרא",
  };
}

export function filterAdminNotifications<T extends AdminListItem>(
  items: T[],
  filter: AdminListFilter
) {
  const type = String(filter.type || "").trim();
  const eventId = String(filter.eventId || "").trim();
  const severity = String(filter.severity || "").trim();
  const status = String(filter.status || "").trim();
  return items.filter((item) => {
    if (type && item.type !== type) return false;
    if (eventId && item.eventId !== eventId) return false;
    if (severity && item.severity !== severity) return false;
    if (status === "open" && item.status !== "active") return false;
    if (status === "resolved" && item.status !== "resolved") return false;
    if (status === "read" && !item.read) return false;
    if (status === "unread" && item.read) return false;
    return true;
  });
}

export const ADMIN_TYPE_LABELS: Record<string, string> = {
  "admin.message.notStarted": "סבב הודעות שלא התחיל",
  "admin.call.notStarted": "סבב שיחות שלא התחיל",
  "admin.shift.notStarted": "משמרת שלא התחילה",
  "admin.critical.missing": "נתונים קריטיים חסרים",
  "admin.seating.teamMissing": "צוות הושבה חסר",
  "rsvp.round.error": "כשל בסבב הודעות",
  "rsvp.round.unsent": "הודעות שלא נשלחו",
  "rsvp.round.partial": "הודעות חלקיות",
  "rsvp.whatsapp.unsent": "וואטסאפ שלא נשלח",
  "rsvp.calls.failed": "כשל בסבב שיחות",
  "system.error": "תקלת מערכת",
  "rsvp.round.done": "סיום סבב הודעות",
  "rsvp.humanCalls.done": "סיום שיחות אנושיות",
  "rsvp.calls.done": "סיום סבב IVR",
  "rsvp.phones.review": "טלפונים לבדיקה",
  "admin.customer.created": "לקוח חדש",
  "admin.event.changed": "שינוי פרטי אירוע",
  "admin.seating.incomplete": "הושבה לא הושלמה",
  "admin.shift.ended": "סיום משמרת",
  "admin.balance.due": "יתרה לתשלום",
  "admin.event.summary": "סיכום אירוע",
  "admin.event.missing": "נתונים חסרים",
  "admin.details.completed": "פרטים הושלמו",
  "admin.seating.teamAssigned": "צוות הושבה שובץ",
  "admin.task.done": "משימה הושלמה",
  "admin.push.test": "התראת בדיקה",
};
