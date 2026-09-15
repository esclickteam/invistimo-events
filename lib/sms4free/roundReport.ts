/**
 * SMS4FREE rounds report helpers.
 * Statuses reflect what the system actually stores — no WhatsApp "read"/fake delivery.
 */

export type SmsReportStatusKey =
  | "not_sent"
  | "scheduled"
  | "pending"
  | "sending"
  | "sent"
  | "failed"
  | "cancelled";

/** Best-ever progress. Failed does not erase a prior successful send. */
export const SMS_PROGRESS_RANK: Record<SmsReportStatusKey, number> = {
  not_sent: 0,
  cancelled: 0,
  failed: 0,
  scheduled: 10,
  pending: 15,
  sending: 20,
  sent: 40,
};

export const SMS_STATUS_LABELS: Record<SmsReportStatusKey, string> = {
  not_sent: "לא נשלח",
  scheduled: "מתוזמן",
  pending: "ממתין",
  sending: "ממתין",
  sent: "נשלח",
  failed: "נכשל",
  cancelled: "בוטל",
};

export const SMS_ROUND_TYPE_ORDER = [
  "save_the_date",
  "invitation_only",
  "rsvp",
  "reminder",
  "table",
  "thankyou",
  "custom",
] as const;

export function normalizeSmsStatus(value: unknown): string {
  return String(value || "")
    .trim()
    .toLowerCase();
}

export function getSmsStatusLabel(status: SmsReportStatusKey | string) {
  const key = normalizeSmsStatus(status) as SmsReportStatusKey;
  return SMS_STATUS_LABELS[key] || SMS_STATUS_LABELS.not_sent;
}

export function getTimestamp(value: unknown) {
  if (!value) return 0;
  const time = new Date(value as any).getTime();
  return Number.isNaN(time) ? 0 : time;
}

export function normalizePhoneDigits(phoneRaw: unknown) {
  let phone = String(phoneRaw || "").replace(/\D/g, "");
  if (!phone) return "";
  if (phone.startsWith("0")) phone = "972" + phone.slice(1);
  else if (!phone.startsWith("972") && phone.length <= 10) {
    phone = "972" + phone;
  }
  return phone;
}

export function isValidSmsPhone(phoneRaw: unknown) {
  const phone = normalizePhoneDigits(phoneRaw);
  if (!phone) return false;
  if (phone.startsWith("972")) {
    return phone.length === 12 && phone.startsWith("9725");
  }
  return phone.length >= 10 && phone.length <= 15;
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

export function getSmsRoundTypeLabel(type: string) {
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

export function getSmsMessageTypeLabel(type: string, round?: number) {
  if (type === "rsvp" && round === 1) return "הזמנה";
  if (type === "rsvp" && (round === 2 || round === 3)) return "תזכורת";
  if (type === "reminder") return "תזכורת";
  if (type === "table") return "מספר שולחן";
  if (type === "thankyou") return "תודה";
  if (type === "save_the_date") return "Save the Date";
  if (type === "invitation_only") return "הזמנה";
  return "אחר";
}

export function getSmsRoundTitle(type: string, round: number) {
  if (type === "rsvp" && round === 1) return "סבב 1 - הזמנה";
  if (type === "rsvp" && round === 2) return "סבב 2 - תזכורת אישור הגעה";
  if (type === "rsvp" && round === 3) return "סבב 3 - תזכורת אישור הגעה";
  if (type === "reminder" || type === "table") return "סבב תזכורת / מספר שולחן";
  if (type === "thankyou") return "סבב תודה";
  if (type === "save_the_date") return "Save the Date";
  if (type === "invitation_only") return "הזמנה (ללא RSVP)";
  if (type === "custom") return "סבב SMS מותאם";
  return `סבב SMS · ${type} ${round}`.trim();
}

export function getSmsRoundKey(type: string, round: number) {
  return `sms:${type}:${round}`;
}

export function normalizeSmsRoundNumber(item: any, type: string) {
  const round = Number(item?.round || item?.roundNumber || 0);
  if (type === "rsvp") {
    if (round === 2 || round === 3) return round;
    return 1;
  }
  return round > 0 ? round : 1;
}

export function normalizeSmsRoundType(item: any) {
  const type = String(item?.type || item?.templateKey || "")
    .trim()
    .toLowerCase();
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
    return type;
  }
  return type || "custom";
}

export function mapScheduleStatusToReport(
  scheduleStatus: unknown
): SmsReportStatusKey {
  const status = normalizeSmsStatus(scheduleStatus);
  if (status === "scheduled") return "scheduled";
  if (status === "sending") return "sending";
  if (status === "sent") return "sent";
  if (status === "failed") return "failed";
  if (status === "cancelled" || status === "canceled") return "cancelled";
  return "pending";
}

export type SmsNotSentReasonKey =
  | "missing_phone"
  | "invalid_phone"
  | "added_after_round"
  | "not_selected"
  | "round_not_sent"
  | "no_per_guest_log"
  | "not_in_sent_list"
  | null;

export const SMS_NOT_SENT_REASON_LABELS: Record<
  Exclude<SmsNotSentReasonKey, null>,
  string
> = {
  missing_phone: "חסר מספר טלפון",
  invalid_phone: "מספר לא תקין",
  added_after_round: "נוסף לאחר ביצוע הסבב",
  not_selected: "לא נבחר לסבב",
  round_not_sent: "הסבב טרם נשלח",
  no_per_guest_log: "אין פירוט שליחה ברמת אורח",
  not_in_sent_list: "לא נכלל ברשימת הנמענים שנשלחו",
};

export function inferSmsNotSentReason(params: {
  guest: any;
  roundMeta?: {
    type: string;
    round: number;
    hasSentActivity: boolean;
    firstActivityAt: number;
    audienceFilter?: string;
    hasPerGuestTracking: boolean;
  } | null;
}): { key: SmsNotSentReasonKey; text: string | null } {
  const { guest, roundMeta } = params;
  const rawPhone = guest?.phone;

  if (!rawPhone || !String(rawPhone).trim()) {
    return {
      key: "missing_phone",
      text: SMS_NOT_SENT_REASON_LABELS.missing_phone,
    };
  }

  if (!isValidSmsPhone(rawPhone)) {
    return {
      key: "invalid_phone",
      text: SMS_NOT_SENT_REASON_LABELS.invalid_phone,
    };
  }

  if (!roundMeta) {
    return { key: null, text: null };
  }

  if (!roundMeta.hasSentActivity) {
    return {
      key: "round_not_sent",
      text: SMS_NOT_SENT_REASON_LABELS.round_not_sent,
    };
  }

  const guestCreatedAt = getTimestamp(guest?.createdAt);
  if (
    roundMeta.firstActivityAt > 0 &&
    guestCreatedAt > 0 &&
    guestCreatedAt > roundMeta.firstActivityAt
  ) {
    return {
      key: "added_after_round",
      text: SMS_NOT_SENT_REASON_LABELS.added_after_round,
    };
  }

  if (
    roundMeta.type === "rsvp" &&
    (roundMeta.round === 2 || roundMeta.round === 3) &&
    String(guest?.rsvp || "pending") !== "pending"
  ) {
    return {
      key: "not_selected",
      text: SMS_NOT_SENT_REASON_LABELS.not_selected,
    };
  }

  if (
    roundMeta.audienceFilter === "pending" &&
    String(guest?.rsvp || "pending") !== "pending"
  ) {
    return {
      key: "not_selected",
      text: SMS_NOT_SENT_REASON_LABELS.not_selected,
    };
  }

  if (!roundMeta.hasPerGuestTracking) {
    return {
      key: "no_per_guest_log",
      text: SMS_NOT_SENT_REASON_LABELS.no_per_guest_log,
    };
  }

  return {
    key: "not_in_sent_list",
    text: SMS_NOT_SENT_REASON_LABELS.not_in_sent_list,
  };
}

export function emptySmsGuestSummary() {
  return {
    totalGuests: 0,
    receivedAtLeastOne: 0,
    receivedNone: 0,
    sentAtLeastOnce: 0,
    failedAtLeastOnce: 0,
    pending: 0,
    scheduled: 0,
    receivedMultiple: 0,
    totalSmsAttempts: 0,
  };
}

/** Rebuild guest KPIs from an already-filtered guest list (Excel export context). */
export function summarizeSmsGuests(guests: any[]) {
  const summary = emptySmsGuestSummary();
  summary.totalGuests = guests.length;
  for (const guest of guests) {
    if (guest.receivedCount > 0) {
      summary.receivedAtLeastOne += 1;
      summary.sentAtLeastOnce += 1;
    }
    if (guest.receivedCount === 0) summary.receivedNone += 1;
    if (guest.everFailed) summary.failedAtLeastOnce += 1;
    if (guest.pendingCount > 0) summary.pending += 1;
    if ((guest.scheduledCount || 0) > 0) summary.scheduled += 1;
    if (guest.messagesCount >= 2) summary.receivedMultiple += 1;
    summary.totalSmsAttempts += Number(guest.messagesCount || 0);
  }
  return summary;
}

export function emptySmsRoundSummary() {
  return {
    intended: 0,
    sent: 0,
    failed: 0,
    pending: 0,
    scheduled: 0,
    cancelled: 0,
    notSent: 0,
    totalAttempts: 0,
  };
}

export function applySmsReportGuestFilters(
  guests: any[],
  {
    roundKey,
    status,
    rsvp,
    messageCount,
    search,
  }: {
    roundKey?: string;
    status?: string;
    rsvp?: string;
    messageCount?: string;
    search?: string;
  }
) {
  const q = String(search || "")
    .trim()
    .toLowerCase();
  const qDigits = q.replace(/\D/g, "");

  return guests.filter((guest) => {
    if (roundKey && roundKey !== "all") {
      const roundHit = guest.roundStatuses?.find(
        (item: any) => item.roundKey === roundKey
      );
      if (!roundHit) return false;
    }

    if (status && status !== "all") {
      const statusKey = String(status).toLowerCase();
      if (roundKey && roundKey !== "all") {
        const roundHit = guest.roundStatuses?.find(
          (item: any) => item.roundKey === roundKey
        );
        if (String(roundHit?.status || "") !== statusKey) return false;
      } else if (statusKey === "failed") {
        if (!guest.everFailed && guest.lastStatus !== "failed") return false;
      } else if (statusKey === "not_sent") {
        if (guest.receivedCount > 0) return false;
      } else if (
        statusKey === "scheduled" ||
        statusKey === "pending" ||
        statusKey === "sending"
      ) {
        if (
          guest.pendingCount <= 0 &&
          guest.scheduledCount <= 0 &&
          guest.lastStatus !== statusKey
        ) {
          return false;
        }
      } else if (
        guest.overallStatus !== statusKey &&
        guest.lastStatus !== statusKey
      ) {
        return false;
      }
    }

    if (rsvp && rsvp !== "all" && guest.rsvp !== rsvp) return false;

    if (messageCount && messageCount !== "all") {
      if (messageCount === "0" && guest.messagesCount !== 0) return false;
      if (messageCount === "1" && guest.messagesCount !== 1) return false;
      if (messageCount === "1+" && guest.receivedCount < 1) return false;
      if (
        (messageCount === "2+" || messageCount === "2") &&
        guest.messagesCount < 2
      ) {
        return false;
      }
    }

    if (q || qDigits) {
      const hay = [
        guest.name,
        guest.phone,
        guest.overallStatusLabel,
        guest.lastStatusLabel,
        guest.lastError,
        guest.notSentReason,
        guest.rsvpLabel,
      ]
        .map((v) => String(v || "").toLowerCase())
        .join(" ");
      const matchText = q ? hay.includes(q) : false;
      const matchPhone = qDigits
        ? String(guest.phone || "").replace(/\D/g, "").includes(qDigits)
        : false;
      if (!(matchText || matchPhone)) return false;
    }

    return true;
  });
}

export function guestMatchesSmsAudience(
  guest: any,
  filter: string | undefined,
  type: string,
  round: number
) {
  const audience =
    filter ||
    (type === "rsvp" && (round === 2 || round === 3) ? "pending" : "all");

  if (audience === "pending") {
    return String(guest?.rsvp || "pending") === "pending";
  }
  if (audience === "withTable") {
    return Boolean(guest?.tableName) || typeof guest?.tableNumber === "number";
  }
  return true;
}
