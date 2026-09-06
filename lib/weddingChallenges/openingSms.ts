import { WEDDING_CHALLENGES_MAX_GUESTS } from "./constants";
import type { SmsScheduleStatus, WeddingChallengeSettings } from "./types";

export const WEDDING_CHALLENGES_SMS_LOG = "[wedding-challenges-sms]";
export const STALE_SENDING_MS = 5 * 60 * 1000;

export const WEDDING_CHALLENGES_SMS_ERROR_COPY: Record<string, string> = {
  EVENT_ID_REQUIRED: "חסר מזהה אירוע",
  ACTION_REQUIRED: "יש לבחור תזמון או שליחה עכשיו.",
  UNKNOWN_ACTION: "פעולת SMS לא מוכרת",
  EVENT_NOT_FOUND: "האירוע לא נמצא",
  SCHEDULED_AT_REQUIRED: "יש לבחור תאריך ושעת שליחה",
  SCHEDULE_IN_PAST: "יש לבחור זמן עתידי, או לשלוח עכשיו במפורש.",
  ALREADY_SENT: "ה-SMS כבר נשלח. לא ניתן לשלוח שוב.",
  SENDING: "השליחה כבר רצה. נסו שוב בעוד כמה דקות.",
  OWNER_NOT_FOUND: "לא נמצא בעל האירוע",
  NO_ELIGIBLE_GUESTS: "אין אורחים זכאים לשליחת SMS",
  NO_VALID_RECIPIENTS: "אין מספרי טלפון תקינים לשליחה",
  SEND_FAILED: "שליחת ה-SMS נכשלה",
  EXTERNAL_SENDS_BLOCKED: "שליחת SMS חסומה בסביבה זו",
  ENTITLEMENT_INACTIVE: "אין הרשאת Wedding Challenges פעילה לאירוע זה",
};

export type WeddingChallengesSmsErrorBody = {
  success: false;
  error: string;
  code: string;
  details: unknown;
};

export function weddingChallengesSmsErrorBody(
  code: string,
  details?: unknown,
  errorOverride?: string
): WeddingChallengesSmsErrorBody {
  return {
    success: false,
    error:
      errorOverride ||
      WEDDING_CHALLENGES_SMS_ERROR_COPY[code] ||
      "פעולת SMS נכשלה",
    code,
    details: details ?? null,
  };
}

export function logWeddingChallengesSms(
  event: string,
  details: Record<string, unknown>
) {
  console.info(WEDDING_CHALLENGES_SMS_LOG, event, details);
}

export function logWeddingChallengesSmsError(
  event: string,
  details: Record<string, unknown>
) {
  console.error(WEDDING_CHALLENGES_SMS_LOG, event, details);
}

export function openingSmsQuotaRemaining(owner: {
  maxMessages?: number | null;
  smsUsed?: number | null;
  weddingChallengesOnly?: boolean | null;
  accessModules?: { weddingChallenges?: boolean | null } | null;
}) {
  // Opening SMS is part of the paid Wedding Challenges product (up to 800 guests).
  // Game-only / admin-created accounts often have invite maxMessages=0; that must
  // not block or zero-out the batch.
  const entitled =
    owner?.weddingChallengesOnly === true ||
    owner?.accessModules?.weddingChallenges === true;
  if (entitled) {
    return WEDDING_CHALLENGES_MAX_GUESTS * 3;
  }
  return Math.max(Number(owner?.maxMessages || 0) - Number(owner?.smsUsed || 0), 0);
}

export function isStaleSending(
  sms: Pick<WeddingChallengeSettings["sms"], "status" | "lastAttemptAt">,
  now = new Date(),
  staleMs = STALE_SENDING_MS
) {
  if (sms.status !== "sending") return false;
  if (!sms.lastAttemptAt) return true;
  const at = new Date(sms.lastAttemptAt).getTime();
  if (!Number.isFinite(at)) return true;
  return now.getTime() - at >= staleMs;
}

export function finalizeOpeningSmsBatch(params: {
  sent: number;
  failed: number;
  skipped: number;
  total: number;
  blockedReason?: string | null;
  lastProviderError?: string | null;
}) {
  const sent = Math.max(0, Number(params.sent) || 0);
  const failed = Math.max(0, Number(params.failed) || 0);
  const skipped = Math.max(0, Number(params.skipped) || 0);
  const total = Math.max(0, Number(params.total) || 0);

  if (sent > 0) {
    return {
      ok: true as const,
      status: "sent" as const satisfies SmsScheduleStatus,
      sentAt: new Date(),
      sentCount: sent,
      lastError:
        failed > 0
          ? `נשלחו ${sent}, נכשלו ${failed}, דולגו ${skipped}`
          : null,
      code: "SENT",
    };
  }

  let code = "SEND_FAILED";
  let lastError = params.lastProviderError || "שליחת ה-SMS נכשלה";
  if (total === 0) {
    code = "NO_ELIGIBLE_GUESTS";
    lastError = WEDDING_CHALLENGES_SMS_ERROR_COPY.NO_ELIGIBLE_GUESTS;
  } else if (params.blockedReason) {
    code = "EXTERNAL_SENDS_BLOCKED";
    lastError = params.blockedReason;
  } else if (failed === 0) {
    code = "NO_VALID_RECIPIENTS";
    lastError = WEDDING_CHALLENGES_SMS_ERROR_COPY.NO_VALID_RECIPIENTS;
  }

  return {
    ok: false as const,
    status: "failed" as const satisfies SmsScheduleStatus,
    sentAt: null,
    sentCount: 0,
    lastError,
    code,
  };
}

export function dueWeddingChallengesSmsFilter(
  now = new Date(),
  staleSendingBefore = new Date(Date.now() - STALE_SENDING_MS)
) {
  return {
    $and: [
      { "settings.sms.scheduledAt": { $lte: now } },
      {
        $or: [
          { "settings.sms.sentAt": null },
          { "settings.sms.sentAt": { $exists: false } },
          { "settings.sms.sentCount": { $lte: 0 } },
        ],
      },
      {
        $or: [
          { "settings.sms.status": "scheduled" },
          {
            "settings.sms.status": "sending",
            $or: [
              { "settings.sms.lastAttemptAt": { $lte: staleSendingBefore } },
              { "settings.sms.lastAttemptAt": null },
              { "settings.sms.lastAttemptAt": { $exists: false } },
            ],
          },
        ],
      },
    ],
  };
}

export function claimOpeningSmsFilter(params: {
  force?: boolean;
  staleSendingBefore?: Date;
}) {
  if (params.force) return {};
  const stale =
    params.staleSendingBefore || new Date(Date.now() - STALE_SENDING_MS);
  return {
    $and: [
      {
        $or: [
          { "settings.sms.status": { $ne: "sent" } },
          { "settings.sms.sentCount": { $lte: 0 } },
        ],
      },
      {
        $or: [
          { "settings.sms.status": { $ne: "sending" } },
          { "settings.sms.lastAttemptAt": { $lte: stale } },
          { "settings.sms.lastAttemptAt": null },
          { "settings.sms.lastAttemptAt": { $exists: false } },
        ],
      },
    ],
  };
}
