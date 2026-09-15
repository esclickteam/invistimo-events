/**
 * Shared helpers for the WhatsApp rounds report.
 * Aggregation only — does not change send/webhook/RSVP flows.
 */

export const ROUND_TYPE_ORDER = [
  "save_the_date",
  "invitation_only",
  "rsvp",
  "reminder",
  "table",
  "thankyou",
  "custom",
] as const;

export type ReportStatusKey =
  | "not_sent"
  | "scheduled"
  | "pending"
  | "sending"
  | "sent"
  | "delivered"
  | "read"
  | "failed"
  | "cancelled";

export const STATUS_RANK: Record<ReportStatusKey, number> = {
  not_sent: 0,
  cancelled: 5,
  scheduled: 10,
  pending: 15,
  sending: 20,
  failed: 25,
  sent: 40,
  delivered: 50,
  read: 60,
};

/** Best-ever / progress rank ignores failed so a later failure does not erase prior read. */
export const PROGRESS_RANK: Record<ReportStatusKey, number> = {
  not_sent: 0,
  cancelled: 0,
  scheduled: 5,
  pending: 5,
  sending: 10,
  failed: 0,
  sent: 40,
  delivered: 50,
  read: 60,
};

export const STATUS_LABELS: Record<ReportStatusKey, string> = {
  not_sent: "לא נשלח",
  scheduled: "מתוזמן",
  pending: "ממתין",
  sending: "ממתין",
  sent: "נשלח",
  delivered: "נמסר",
  read: "נקרא",
  failed: "נכשל",
  cancelled: "בוטל",
};

export type RoundType =
  | "rsvp"
  | "reminder"
  | "thankyou"
  | "table"
  | "custom"
  | "save_the_date"
  | "invitation_only";

export function normalizeStatus(value: unknown) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

export function getTimestamp(value: unknown) {
  if (!value) return 0;
  const date = new Date(value as any);
  const time = date.getTime();
  return Number.isNaN(time) ? 0 : time;
}

export function normalizePhoneDigits(phoneRaw: unknown) {
  let phone = String(phoneRaw || "").replace(/\D/g, "");
  if (!phone) return "";

  if (phone.startsWith("0")) {
    phone = "972" + phone.slice(1);
  } else if (!phone.startsWith("972") && phone.length <= 10) {
    phone = "972" + phone;
  }

  return phone;
}

export function isValidWhatsappPhone(phoneRaw: unknown) {
  const phone = normalizePhoneDigits(phoneRaw);
  // Israeli mobile: 9725xxxxxxxx (12 digits) or similar international length
  if (!phone) return false;
  if (phone.startsWith("972")) {
    return phone.length === 12 && phone.startsWith("9725");
  }
  return phone.length >= 10 && phone.length <= 15;
}

export function normalizeRoundType(item: any): RoundType {
  const type = String(item?.type || "").trim().toLowerCase();

  if (
    [
      "rsvp",
      "reminder",
      "thankyou",
      "table",
      "custom",
      "save_the_date",
      "invitation_only",
    ].includes(type)
  ) {
    return type as RoundType;
  }

  const templateName = String(item?.templateName || "").toLowerCase();

  if (templateName.includes("save_the_date")) return "save_the_date";
  if (templateName.includes("event_invitation")) return "invitation_only";
  if (templateName.includes("thank")) return "thankyou";
  if (templateName.includes("table")) return "table";
  if (templateName.includes("reminder")) return "reminder";
  if (templateName.includes("rsvp")) return "rsvp";

  return (type as RoundType) || "custom";
}

export function normalizeRoundNumber(item: any, type: string) {
  const round = Number(item?.round || item?.roundNumber || 0);

  if (type === "rsvp") {
    if (round === 2 || round === 3) return round;
    return 1;
  }

  return round > 0 ? round : 1;
}

export function getRoundTypeLabel(type: string) {
  const labels: Record<string, string> = {
    rsvp: "הזמנה / RSVP",
    reminder: "תזכורת",
    table: "מספר שולחן",
    thankyou: "תודה",
    save_the_date: "Save the Date",
    invitation_only: "הזמנה",
    custom: "מותאם",
  };

  return labels[type] || type || "אחר";
}

export function getMessageTypeLabel(type: string, round?: number) {
  if (type === "rsvp" && round === 1) return "הזמנה";
  if (type === "rsvp" && (round === 2 || round === 3)) return "תזכורת";
  if (type === "reminder") return "תזכורת";
  if (type === "table") return "מספר שולחן";
  if (type === "thankyou") return "תודה";
  if (type === "save_the_date") return "Save the Date";
  if (type === "invitation_only") return "הזמנה";
  if (type === "custom") return "אחר";
  return "אחר";
}

export function getRoundTitle(type: string, round: number) {
  if (type === "rsvp" && round === 1) return "סבב 1 - הזמנה";
  if (type === "rsvp" && round === 2) return "סבב 2 - תזכורת אישור הגעה";
  if (type === "rsvp" && round === 3) return "סבב 3 - תזכורת אישור הגעה";
  if (type === "reminder" || type === "table") return "סבב תזכורת / מספר שולחן";
  if (type === "thankyou") return "סבב תודה";
  if (type === "save_the_date") return "Save the Date";
  if (type === "invitation_only") return "הזמנה (ללא RSVP)";
  if (type === "custom") return "סבב WhatsApp מותאם";

  return `סבב WhatsApp · ${type} ${round}`.trim();
}

export function getRoundKey(type: string, round: number) {
  return `${type}:${round}`;
}

export function getFailureText(item: any) {
  const code = String(item.errorCode || item.failReason?.code || "");

  const message =
    item.errorMessage ||
    item.lastError ||
    item.failReason?.message ||
    item.failReason?.raw?.message ||
    item.failReason?.raw?.title ||
    "";

  if (code === "131049") {
    return {
      code: "131049",
      text: "Meta/WhatsApp לא מסרה את ההודעה בגלל מגבלת הודעות שיווקיות לנמען זה.",
    };
  }

  if (code === "131026") {
    return {
      code: "131026",
      text: "לא ניתן למסור את ההודעה למספר זה ב-WhatsApp.",
    };
  }

  if (code === "131047") {
    return {
      code: "131047",
      text: "לא ניתן למסור את ההודעה בגלל מגבלת חלון שיחה ב-WhatsApp.",
    };
  }

  const status = getReportStatus(item);

  return {
    code,
    text:
      message ||
      (status === "failed" ? "ההודעה לא נמסרה לנמען זה." : ""),
  };
}

export function getReportStatus(item: any): ReportStatusKey {
  if (!item) return "not_sent";

  const status = normalizeStatus(item.status);
  const providerStatus = normalizeStatus(item.providerStatus);

  if (providerStatus === "read" || item.readAt) return "read";
  if (providerStatus === "delivered" || item.deliveredAt) return "delivered";
  if (providerStatus === "failed" || status === "failed") return "failed";
  if (providerStatus === "sent" || status === "sent" || item.sentAt) return "sent";
  if (status === "sending" || status === "processing") return "sending";
  if (status === "cancelled" || status === "canceled") return "cancelled";
  if (status === "scheduled") return "scheduled";
  if (status === "pending" || status === "queued") return "pending";

  return "pending";
}

export function getStatusLabel(status: ReportStatusKey | string) {
  const key = normalizeStatus(status) as ReportStatusKey;
  return STATUS_LABELS[key] || STATUS_LABELS.not_sent;
}

export function pickLatestQueueItem(current: any, next: any) {
  if (!current) return next;

  const nextTime = Math.max(
    getTimestamp(next.updatedAt),
    getTimestamp(next.sentAt),
    getTimestamp(next.deliveredAt),
    getTimestamp(next.readAt),
    getTimestamp(next.failedAt),
    getTimestamp(next.scheduledAt),
    getTimestamp(next.createdAt)
  );
  const currentTime = Math.max(
    getTimestamp(current.updatedAt),
    getTimestamp(current.sentAt),
    getTimestamp(current.deliveredAt),
    getTimestamp(current.readAt),
    getTimestamp(current.failedAt),
    getTimestamp(current.scheduledAt),
    getTimestamp(current.createdAt)
  );

  if (nextTime !== currentTime) {
    return nextTime > currentTime ? next : current;
  }

  const nextRank = STATUS_RANK[getReportStatus(next)] || 0;
  const currentRank = STATUS_RANK[getReportStatus(current)] || 0;

  return nextRank >= currentRank ? next : current;
}

export function getMessageActivityAt(item: any) {
  return Math.max(
    getTimestamp(item?.sentAt),
    getTimestamp(item?.deliveredAt),
    getTimestamp(item?.readAt),
    getTimestamp(item?.failedAt),
    getTimestamp(item?.scheduledAt),
    getTimestamp(item?.createdAt),
    getTimestamp(item?.updatedAt)
  );
}

export function isAttemptedStatus(status: ReportStatusKey) {
  return (
    status === "sent" ||
    status === "delivered" ||
    status === "read" ||
    status === "failed" ||
    status === "sending"
  );
}

export function isReceivedStatus(status: ReportStatusKey) {
  return status === "sent" || status === "delivered" || status === "read";
}

export function emptyRoundSummary() {
  return {
    total: 0,
    intended: 0,
    sent: 0,
    delivered: 0,
    read: 0,
    failed: 0,
    pending: 0,
    sending: 0,
    cancelled: 0,
    notSent: 0,
    scheduled: 0,
    failedButResponded: 0,
    failedAndStillPending: 0,
  };
}

export function emptyGuestSummary() {
  return {
    totalGuests: 0,
    receivedAtLeastOne: 0,
    receivedNone: 0,
    readAtLeastOnce: 0,
    deliveredAtLeastOnce: 0,
    failedAtLeastOnce: 0,
    receivedMultiple: 0,
    pending: 0,
  };
}

export type NotSentReasonKey =
  | "missing_phone"
  | "invalid_phone"
  | "added_after_round"
  | "not_selected"
  | "round_not_sent"
  | null;

export const NOT_SENT_REASON_LABELS: Record<
  Exclude<NotSentReasonKey, null>,
  string
> = {
  missing_phone: "חסר מספר טלפון",
  invalid_phone: "מספר לא תקין",
  added_after_round: "נוסף לאחר ביצוע הסבב",
  not_selected: "לא נבחר לסבב",
  round_not_sent: "הסבב טרם נשלח",
};

export function inferNotSentReason(params: {
  guest: any;
  roundMeta?: {
    type: string;
    round: number;
    hasAnyMessages: boolean;
    firstActivityAt: number;
    audienceFilter?: "all" | "pending" | "withTable" | string;
  } | null;
}): { key: NotSentReasonKey; text: string | null } {
  const { guest, roundMeta } = params;
  const rawPhone = guest?.phone;

  if (!rawPhone || !String(rawPhone).trim()) {
    return { key: "missing_phone", text: NOT_SENT_REASON_LABELS.missing_phone };
  }

  if (!isValidWhatsappPhone(rawPhone)) {
    return { key: "invalid_phone", text: NOT_SENT_REASON_LABELS.invalid_phone };
  }

  if (!roundMeta) {
    return { key: null, text: null };
  }

  if (!roundMeta.hasAnyMessages) {
    return { key: "round_not_sent", text: NOT_SENT_REASON_LABELS.round_not_sent };
  }

  const guestCreatedAt = getTimestamp(guest?.createdAt);
  if (
    roundMeta.firstActivityAt > 0 &&
    guestCreatedAt > 0 &&
    guestCreatedAt > roundMeta.firstActivityAt
  ) {
    return {
      key: "added_after_round",
      text: NOT_SENT_REASON_LABELS.added_after_round,
    };
  }

  if (
    roundMeta.type === "rsvp" &&
    (roundMeta.round === 2 || roundMeta.round === 3) &&
    String(guest?.rsvp || "pending") !== "pending"
  ) {
    return { key: "not_selected", text: NOT_SENT_REASON_LABELS.not_selected };
  }

  if (
    roundMeta.audienceFilter === "pending" &&
    String(guest?.rsvp || "pending") !== "pending"
  ) {
    return { key: "not_selected", text: NOT_SENT_REASON_LABELS.not_selected };
  }

  // Round ran but this guest has no queue row — likely not in audience.
  return { key: "not_selected", text: NOT_SENT_REASON_LABELS.not_selected };
}

export function mapRsvpLabel(rsvp: unknown) {
  const value = String(rsvp || "pending").toLowerCase();
  if (value === "yes") return "אישר";
  if (value === "no") return "סירב";
  return "לא ענה";
}

export function mapRsvpFilterValue(rsvp: unknown): "yes" | "no" | "pending" {
  const value = String(rsvp || "pending").toLowerCase();
  if (value === "yes") return "yes";
  if (value === "no") return "no";
  return "pending";
}
