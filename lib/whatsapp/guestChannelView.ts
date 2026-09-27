/**
 * Per-guest view of the two channels of a WhatsApp round: WhatsApp and its SMS fallback.
 * Pure (no server imports) — shared by the report UI and the Excel export.
 */

export type WhatsappChannelStatus =
  | "NOT_SENT"
  | "PENDING"
  | "SENT"
  | "DELIVERED"
  | "READ"
  | "FAILED"
  | "CANCELLED"
  | "NOT_IN_ROUND";

export type SmsChannelStatus =
  | "NOT_NEEDED"
  | "PENDING"
  | "SENT"
  | "DELIVERED"
  | "FAILED"
  | "SKIPPED"
  | "NONE";

export type ChannelFilter =
  | "wa_failed"
  | "wa_not_sent"
  | "sms_sent"
  | "sms_delivered"
  | "sms_failed"
  | "sms_skipped"
  | "sms_pending";

export const WHATSAPP_CHANNEL_LABELS: Record<WhatsappChannelStatus, string> = {
  NOT_SENT: "לא נשלח",
  PENDING: "ממתין לשליחה",
  SENT: "נשלח",
  DELIVERED: "נמסר",
  READ: "נקרא",
  FAILED: "נכשל",
  CANCELLED: "בוטל",
  NOT_IN_ROUND: "לא בסבב",
};

export const SMS_CHANNEL_LABELS: Record<SmsChannelStatus, string> = {
  NOT_NEEDED: "לא נדרש",
  PENDING: "ממתין",
  SENT: "נשלח",
  DELIVERED: "נמסר",
  FAILED: "נכשל",
  SKIPPED: "דולג",
  NONE: "—",
};

export const CHANNEL_FILTER_LABELS: Record<ChannelFilter, string> = {
  wa_failed: "WhatsApp נכשל",
  wa_not_sent: "WhatsApp לא נשלח",
  sms_sent: "SMS נשלח",
  sms_delivered: "SMS נמסר",
  sms_failed: "SMS נכשל",
  sms_skipped: "SMS דולג",
  sms_pending: "SMS ממתין",
};

export type RoundChipLike = {
  roundKey: string;
  title?: string;
  status: string;
  notSentReason?: string | null;
  reasonText?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  sentAt?: string | Date | null;
  deliveredAt?: string | Date | null;
  readAt?: string | Date | null;
  failedAt?: string | Date | null;
  notSentAt?: string | Date | null;
  tracked?: boolean;
  sms?: {
    status?: string | null;
    reasonCode?: string | null;
    reasonText?: string | null;
    errorCode?: string | null;
    errorMessage?: string | null;
    triggeredAt?: string | Date | null;
    sentAt?: string | Date | null;
    deliveredAt?: string | Date | null;
    failedAt?: string | Date | null;
    skippedAt?: string | Date | null;
  } | null;
};

export type GuestChannelView = {
  roundKey: string | null;
  roundTitle: string | null;
  whatsapp: {
    status: WhatsappChannelStatus;
    label: string;
    reason: string | null;
    errorCode: string | null;
    at: string | Date | null;
  };
  sms: {
    status: SmsChannelStatus;
    label: string;
    reason: string | null;
    errorCode: string | null;
    at: string | Date | null;
  };
};

const WA_STATUS_MAP: Record<string, WhatsappChannelStatus> = {
  not_sent: "NOT_SENT",
  pending: "PENDING",
  scheduled: "PENDING",
  sending: "PENDING",
  sent: "SENT",
  delivered: "DELIVERED",
  read: "READ",
  failed: "FAILED",
  cancelled: "CANCELLED",
  not_in_audience: "NOT_IN_ROUND",
};

function toTime(value: unknown) {
  if (!value) return 0;
  const time = new Date(value as any).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function chipActivityAt(chip: RoundChipLike) {
  return Math.max(
    toTime(chip.readAt),
    toTime(chip.deliveredAt),
    toTime(chip.sentAt),
    toTime(chip.failedAt),
    toTime(chip.notSentAt),
    toTime(chip.sms?.sentAt),
    toTime(chip.sms?.failedAt),
    toTime(chip.sms?.skippedAt)
  );
}

/** The round shown for a guest: the selected round, or the guest's latest round they were part of. */
export function pickGuestRoundChip<T extends RoundChipLike>(
  roundStatuses: T[] | undefined,
  selectedRoundKey: string
): T | null {
  const chips = roundStatuses || [];
  if (selectedRoundKey && selectedRoundKey !== "all") {
    return chips.find((chip) => chip.roundKey === selectedRoundKey) || null;
  }

  const relevant = chips.filter((chip) => chip.status !== "not_in_audience");
  if (!relevant.length) return null;

  let best = relevant[relevant.length - 1];
  let bestAt = chipActivityAt(best);
  for (const chip of relevant) {
    const at = chipActivityAt(chip);
    if (at > bestAt) {
      best = chip;
      bestAt = at;
    }
  }
  return best;
}

function whatsappTimestamp(chip: RoundChipLike, status: WhatsappChannelStatus) {
  if (status === "READ") return chip.readAt || chip.deliveredAt || chip.sentAt || null;
  if (status === "DELIVERED") return chip.deliveredAt || chip.sentAt || null;
  if (status === "SENT") return chip.sentAt || null;
  if (status === "FAILED") return chip.failedAt || null;
  if (status === "NOT_SENT") return chip.notSentAt || null;
  return null;
}

export function getGuestChannelView(
  roundStatuses: RoundChipLike[] | undefined,
  selectedRoundKey: string
): GuestChannelView {
  const chip = pickGuestRoundChip(roundStatuses, selectedRoundKey);

  if (!chip) {
    const status: WhatsappChannelStatus = roundStatuses?.length ? "NOT_IN_ROUND" : "NOT_SENT";
    return {
      roundKey: null,
      roundTitle: null,
      whatsapp: {
        status,
        label: WHATSAPP_CHANNEL_LABELS[status],
        reason: null,
        errorCode: null,
        at: null,
      },
      sms: { status: "NONE", label: SMS_CHANNEL_LABELS.NONE, reason: null, errorCode: null, at: null },
    };
  }

  const waStatus = WA_STATUS_MAP[String(chip.status || "").toLowerCase()] || "PENDING";
  const waReason =
    waStatus === "FAILED"
      ? chip.reasonText || chip.errorMessage || null
      : waStatus === "NOT_SENT"
        ? chip.notSentReason || chip.reasonText || null
        : null;

  const whatsapp = {
    status: waStatus,
    label: WHATSAPP_CHANNEL_LABELS[waStatus],
    reason: waReason,
    errorCode: waStatus === "FAILED" || waStatus === "NOT_SENT" ? chip.errorCode || null : null,
    at: whatsappTimestamp(chip, waStatus),
  };

  return {
    roundKey: chip.roundKey,
    roundTitle: chip.title || null,
    whatsapp,
    sms: getSmsChannel(chip, waStatus),
  };
}

function getSmsChannel(chip: RoundChipLike, waStatus: WhatsappChannelStatus): GuestChannelView["sms"] {
  const sms = chip.sms || null;
  const raw = String(sms?.status || "").toUpperCase();
  const waSucceeded = waStatus === "SENT" || waStatus === "DELIVERED" || waStatus === "READ";

  const build = (
    status: SmsChannelStatus,
    reason: string | null = null,
    at: string | Date | null = null
  ) => ({
    status,
    label: SMS_CHANNEL_LABELS[status],
    reason,
    errorCode: status === "FAILED" ? sms?.errorCode || null : null,
    at,
  });

  if (raw === "SKIPPED" && sms?.reasonCode === "WHATSAPP_SUCCEEDED") {
    return build("NOT_NEEDED", sms.reasonText || null, sms.skippedAt || null);
  }
  if (raw === "SENT") return build("SENT", null, sms?.sentAt || null);
  if (raw === "DELIVERED") return build("DELIVERED", null, sms?.deliveredAt || sms?.sentAt || null);
  if (raw === "FAILED") {
    return build("FAILED", sms?.reasonText || sms?.errorMessage || null, sms?.failedAt || null);
  }
  if (raw === "SKIPPED") return build("SKIPPED", sms?.reasonText || null, sms?.skippedAt || null);
  if (raw === "PENDING" || raw === "WAITING") {
    return build("PENDING", raw === "WAITING" ? "ממתין לבדיקת גיבוי" : "בתהליך שליחה", sms?.triggeredAt || null);
  }

  if (waSucceeded) return build("NOT_NEEDED");
  if (waStatus === "PENDING") return build("NONE", "ממתין לתוצאת WhatsApp");
  if ((waStatus === "FAILED" || waStatus === "NOT_SENT") && !chip.tracked) {
    return build("NONE", "גיבוי SMS לא היה פעיל בזמן הסבב");
  }
  return build("NONE");
}

export function matchesChannelFilter(view: GuestChannelView, filter: ChannelFilter) {
  switch (filter) {
    case "wa_failed":
      return view.whatsapp.status === "FAILED";
    case "wa_not_sent":
      return view.whatsapp.status === "NOT_SENT";
    case "sms_sent":
      return view.sms.status === "SENT";
    case "sms_delivered":
      return view.sms.status === "DELIVERED";
    case "sms_failed":
      return view.sms.status === "FAILED";
    case "sms_skipped":
      return view.sms.status === "SKIPPED";
    case "sms_pending":
      return view.sms.status === "PENDING";
    default:
      return false;
  }
}

export function countChannelFilters(views: GuestChannelView[]) {
  const counts = {} as Record<ChannelFilter, number>;
  for (const key of Object.keys(CHANNEL_FILTER_LABELS) as ChannelFilter[]) {
    counts[key] = views.filter((view) => matchesChannelFilter(view, key)).length;
  }
  return counts;
}
