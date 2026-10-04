import { randomUUID } from "crypto";

import RoundGuestDelivery from "@/models/RoundGuestDelivery";
import WhatsappQueue from "@/models/WhatsappQueue";
import InvitationGuest from "@/models/InvitationGuest";
import Invitation from "@/models/Invitation";
import User from "@/models/User";
import Event from "@/models/Event";
import { shortenUrl } from "@/lib/shortenUrl";
import { sendSmsDetailed, normalizeSmsPhone, type SmsSendResult } from "@/lib/sendSMS";
import { assertExternalSendAllowed } from "@/lib/env/externalSends";
import { buildGuestInviteUrl, getInvitationRsvpSiteMode } from "@/lib/guestInviteUrl";
import { buildReminderNavigationUrl } from "@/lib/messages/reminderNavigationLink";
import { buildReminderSmsTemplateForGuest } from "@/lib/messages/resolveReminderSmsTemplate";
import {
  getInvitationEventId,
  getReminderSmsBody,
} from "@/lib/messages/reminderSmsSettings";
import {
  ROUND_SMS_TEMPLATES,
  countBusinessSmsParts,
  getRsvpSmsRoundTemplate,
} from "@/lib/sms/roundSmsTemplates";
import { getSmsReasonLabel } from "@/lib/whatsapp/roundDeliveryTracking";
import {
  applyLiveEventPlaceholders,
  resolveLiveEventMessageDetails,
} from "@/lib/messages/liveEventDetails";

/* ======================================================
   CONFIG
====================================================== */

const STALE_CLAIM_MS = 5 * 60 * 1000;
const DEFER_WHILE_WHATSAPP_IN_PROGRESS_MS = 2 * 60 * 1000;
const MAX_SMS_ATTEMPTS = 3;
const RETRY_BACKOFF_MS = 2 * 60 * 1000;
const DEFAULT_LIMIT_PER_RUN = 40;

const FALLBACK_TYPES = new Set(["rsvp", "reminder", "table", "thankyou", "custom"]);

/** סיבות אי-שליחה של WhatsApp שבהן SMS fallback אינו רלוונטי */
const NON_ELIGIBLE_WHATSAPP_REASONS: Record<string, string> = {
  ROUND_CANCELLED: "ROUND_CANCELLED",
  ALREADY_SENT: "WHATSAPP_ALREADY_SENT",
  DUPLICATE: "WHATSAPP_ALREADY_SENT",
};

function getMaxAgeMs() {
  const hours = Number(process.env.WHATSAPP_SMS_FALLBACK_MAX_AGE_HOURS);
  return (Number.isFinite(hours) && hours > 0 ? hours : 24) * 60 * 60 * 1000;
}

export function isWhatsappSmsFallbackEnabled() {
  return String(process.env.WHATSAPP_SMS_FALLBACK_DISABLED || "").trim() !== "1";
}

/* ======================================================
   DEPENDENCIES (injectable for tests)
====================================================== */

export type SmsFallbackDeps = {
  sendSms: (input: { to: string; message: string }) => Promise<SmsSendResult>;
  shorten: (url: string) => Promise<string>;
  gate: (phone: string) => { allowed: boolean; reason: string };
  now: () => Date;
};

const defaultDeps: SmsFallbackDeps = {
  sendSms: (input) => sendSmsDetailed(input),
  shorten: (url) => shortenUrl(url),
  gate: (phone) => assertExternalSendAllowed({ channel: "sms", to: phone }),
  now: () => new Date(),
};

/* ======================================================
   HELPERS
====================================================== */

export function isValidSmsPhone(phoneRaw: unknown) {
  const phone = normalizeSmsPhone(String(phoneRaw || ""));
  if (!phone) return false;
  if (phone.startsWith("972")) {
    return phone.length === 12 && phone.startsWith("9725");
  }
  return phone.length >= 10 && phone.length <= 15;
}

/** One SMS per delivery attempt. Attempt 1 keeps the original key shape. */
export function buildSmsFallbackIdempotencyKey(record: {
  invitationId: any;
  roundKey: string;
  guestId: any;
  attempt?: number | null;
}) {
  const attempt = Number(record.attempt || 1);
  return [
    "sms_fallback",
    String(record.invitationId),
    record.roundKey,
    String(record.guestId),
    "sms",
    ...(attempt > 1 ? [`attempt${attempt}`] : []),
  ].join(":");
}

function historyEntry(
  at: Date,
  event: string,
  status: string | null,
  reasonCode: string | null = null,
  message: string | null = null,
  meta: Record<string, any> | null = null
) {
  return { at, channel: "sms", event, status, reasonCode, message, meta };
}

type SmsUpdate = { $set: Record<string, any>; $push?: { history: any } };

/**
 * Writes the worker's result for the attempt it claimed. If an explicit resend archived that
 * attempt meanwhile (lock no longer on the live sms), the result is recorded on the archived
 * attempt instead, so the new attempt is never touched and attempt history stays complete.
 */
async function settleClaimedSms(
  own: Record<string, any>,
  lockId: string,
  update: SmsUpdate,
  archivedOverride: Record<string, any> = {}
) {
  const res = await RoundGuestDelivery.updateOne(own, update);
  if (res.matchedCount > 0) return;

  const set: Record<string, any> = {};
  for (const [key, value] of Object.entries({ ...update.$set, ...archivedOverride })) {
    if (key.startsWith("sms.")) set[`previousAttempts.$[claimed].${key}`] = value;
  }
  set["previousAttempts.$[claimed].sms.lockId"] = null;
  set["previousAttempts.$[claimed].sms.lockedAt"] = null;

  await RoundGuestDelivery.collection.updateOne(
    { _id: own._id, "previousAttempts.sms.lockId": lockId },
    { $set: set, ...(update.$push ? { $push: update.$push } : {}) },
    { arrayFilters: [{ "claimed.sms.lockId": lockId }] }
  );
}

const SUPERSEDED_SMS = {
  "sms.status": "SKIPPED",
  "sms.reasonCode": "SUPERSEDED_BY_RESEND",
  "sms.reasonMessage": getSmsReasonLabel("SUPERSEDED_BY_RESEND"),
};

type Evaluation =
  | { action: "skip"; reasonCode: string; message?: string }
  | { action: "defer"; untilMs: number; reason: string }
  | {
      action: "send";
      phone: string;
      text: string;
      parts: number;
      ownerId: any;
      chargeOwner: boolean;
    };

async function buildFallbackText({
  record,
  invitation,
  guest,
  deps,
}: {
  record: any;
  invitation: any;
  guest: any;
  deps: SmsFallbackDeps;
}): Promise<{ text: string } | { skip: string }> {
  const type = String(record.type);
  const live = resolveLiveEventMessageDetails(invitation);
  const shareId = String(invitation?.shareId || "").trim() || live.shareId;
  const token = String(guest?.token || "").trim();

  if (type === "rsvp") {
    if (!shareId || !token) return { skip: "MISSING_PERSONAL_LINK" };

    const personalUrl = buildGuestInviteUrl({
      shareId,
      token,
      rsvpSiteMode: getInvitationRsvpSiteMode(invitation),
    });
    const rsvpLink = await deps.shorten(personalUrl);

    return {
      text: applyLiveEventPlaceholders(getRsvpSmsRoundTemplate(Number(record.round)), live, {
        name: guest.name || "",
        rsvpLink,
      }),
    };
  }

  if (type === "reminder" || type === "table") {
    if (!shareId) return { skip: "MISSING_PERSONAL_LINK" };

    const eventId = getInvitationEventId(invitation);
    const event: any = eventId
      ? await Event.findById(eventId)
          .select("hideTableNumberForAll hiddenTableIds checkInEnabled")
          .lean()
      : null;

    const built = buildReminderSmsTemplateForGuest({
      body: await getReminderSmsBody(),
      event,
      guest,
    });

    const navigationUrl = buildReminderNavigationUrl({
      shareId,
      guestToken: token,
      checkInEnabled: event?.checkInEnabled,
    });
    const navigationLink = navigationUrl ? await deps.shorten(navigationUrl) : "";

    return {
      text: applyLiveEventPlaceholders(built.template, live, {
        name: guest.name || "",
        tableName: built.tableName,
        navigationLink,
      }),
    };
  }

  if (type === "thankyou" || type === "custom") {
    return {
      text: applyLiveEventPlaceholders(ROUND_SMS_TEMPLATES.thankyou.content || "", live, {
        name: guest.name || "",
      }),
    };
  }

  return { skip: "NO_SMS_TEMPLATE" };
}

/**
 * בדיקה חוזרת מול השרת לפני כל שליחה: סטטוס WhatsApp חי בתור, האורח, הזכאות.
 */
async function evaluateRecord(
  record: any,
  deps: SmsFallbackDeps,
  now: Date
): Promise<Evaluation> {
  const whatsapp = record.whatsapp || {};

  if (whatsapp.queueId) {
    const queue: any = await WhatsappQueue.findById(whatsapp.queueId)
      .select("status providerStatus deliveredAt readAt")
      .lean();

    if (queue) {
      const providerStatus = String(queue.providerStatus || "").toLowerCase();
      const queueStatus = String(queue.status || "").toLowerCase();

      if (
        queue.readAt ||
        queue.deliveredAt ||
        providerStatus === "delivered" ||
        providerStatus === "read"
      ) {
        return { action: "skip", reasonCode: "WHATSAPP_SUCCEEDED" };
      }

      if (["pending", "scheduled", "sending"].includes(queueStatus)) {
        return {
          action: "defer",
          untilMs: now.getTime() + DEFER_WHILE_WHATSAPP_IN_PROGRESS_MS,
          reason: `WHATSAPP_STILL_${queueStatus.toUpperCase()}`,
        };
      }

      if (queueStatus === "cancelled") {
        return { action: "skip", reasonCode: "ROUND_CANCELLED" };
      }

      // A later attempt on the same queue row was accepted by WhatsApp.
      if (queueStatus === "sent" && providerStatus !== "failed") {
        return { action: "skip", reasonCode: "WHATSAPP_SUCCEEDED" };
      }
    }
  }

  if (!FALLBACK_TYPES.has(String(record.type))) {
    return { action: "skip", reasonCode: "NO_SMS_TEMPLATE" };
  }

  const nonEligible = NON_ELIGIBLE_WHATSAPP_REASONS[String(whatsapp.reasonCode || "")];
  if (nonEligible) {
    return { action: "skip", reasonCode: nonEligible };
  }

  const finalAt = new Date(
    whatsapp.failedAt || whatsapp.notSentAt || whatsapp.updatedAt || record.createdAt || now
  );
  if (now.getTime() - finalAt.getTime() > getMaxAgeMs()) {
    return { action: "skip", reasonCode: "FALLBACK_WINDOW_EXPIRED" };
  }

  const invitation: any = await Invitation.findById(record.invitationId)
    .select(
      "_id title shareId ownerId eventDate eventId productionEventId linkedEventId invitationSettings rsvpSiteMode guestExperienceType"
    )
    .lean();
  if (!invitation) {
    return { action: "skip", reasonCode: "INVITATION_NOT_FOUND" };
  }

  const guest: any = await InvitationGuest.findOne({
    _id: record.guestId,
    invitationId: record.invitationId,
  }).lean();
  if (!guest) {
    return { action: "skip", reasonCode: "GUEST_DELETED" };
  }

  const rawPhone = String(guest.phone || "").trim();
  if (!rawPhone) return { action: "skip", reasonCode: "NO_PHONE" };
  if (!isValidSmsPhone(rawPhone)) return { action: "skip", reasonCode: "INVALID_PHONE" };

  if (String(whatsapp.errorCode || "") === "131050") {
    return { action: "skip", reasonCode: "OPTED_OUT" };
  }

  const type = String(record.type);
  const rsvp = String(guest.rsvp || "pending");

  if (type === "rsvp" && rsvp !== "pending") {
    return { action: "skip", reasonCode: "ALREADY_RESPONDED" };
  }
  if (
    (type === "reminder" || type === "table" || type === "thankyou") &&
    rsvp !== "yes"
  ) {
    return { action: "skip", reasonCode: "NOT_IN_AUDIENCE_ANYMORE" };
  }

  if ((type === "rsvp" || type === "reminder" || type === "table") && invitation.eventDate) {
    const eventTime = new Date(invitation.eventDate).getTime();
    if (Number.isFinite(eventTime) && eventTime + 24 * 60 * 60 * 1000 < now.getTime()) {
      return { action: "skip", reasonCode: "EVENT_PASSED" };
    }
  }

  const built = await buildFallbackText({ record, invitation, guest, deps });
  if ("skip" in built) return { action: "skip", reasonCode: built.skip };

  const parts = countBusinessSmsParts(built.text);
  if (parts === -1) return { action: "skip", reasonCode: "MESSAGE_TOO_LONG" };

  const owner: any = invitation.ownerId
    ? await User.findById(invitation.ownerId)
        .select("maxMessages smsUsed allowedMessageRounds planLimits")
        .lean()
    : null;
  if (!owner) return { action: "skip", reasonCode: "NO_SMS_BALANCE" };

  const usesNewLogic =
    Boolean(owner.allowedMessageRounds) ||
    Boolean(owner.planLimits?.allowedMessageRounds);

  if (!usesNewLogic) {
    const remaining = Math.max(
      (typeof owner.maxMessages === "number" ? owner.maxMessages : 0) -
        (typeof owner.smsUsed === "number" ? owner.smsUsed : 0),
      0
    );
    if (remaining < parts) return { action: "skip", reasonCode: "NO_SMS_BALANCE" };
  }

  const phone = normalizeSmsPhone(rawPhone);
  const gate = deps.gate(phone);
  if (!gate.allowed) {
    return { action: "skip", reasonCode: "BLOCKED_BY_SAFETY_GATE", message: gate.reason };
  }

  return {
    action: "send",
    phone,
    text: built.text,
    parts,
    ownerId: owner._id,
    chargeOwner: !usesNewLogic,
  };
}

/* ======================================================
   RECOVERY (server restart / crashed worker)
====================================================== */

async function recoverStaleClaims(now: Date) {
  const staleBefore = new Date(now.getTime() - STALE_CLAIM_MS);

  // Claimed but never reached the provider → safe to retry.
  const released = await RoundGuestDelivery.updateMany(
    {
      "sms.status": "PENDING",
      "sms.lockedAt": { $lt: staleBefore },
      "sms.dispatchStartedAt": null,
    },
    {
      $set: { "sms.status": null, "sms.lockId": null, "sms.lockedAt": null },
      $push: {
        history: historyEntry(now, "SMS_CLAIM_RELEASED", null, null, "stale claim released"),
      },
    }
  );

  // Reached the provider but the outcome was never written → never resend.
  const unknown = await RoundGuestDelivery.updateMany(
    {
      "sms.status": "PENDING",
      "sms.dispatchStartedAt": { $lt: staleBefore },
    },
    {
      $set: {
        "sms.status": "OUTCOME_UNKNOWN",
        "sms.reasonCode": "DISPATCH_OUTCOME_UNKNOWN",
        "sms.reasonMessage": getSmsReasonLabel("DISPATCH_OUTCOME_UNKNOWN"),
        "sms.errorCode": "DISPATCH_OUTCOME_UNKNOWN",
        "sms.unknownAt": now,
        "sms.lockId": null,
        "sms.lockedAt": null,
      },
      $push: {
        history: historyEntry(now, "SMS_OUTCOME_UNKNOWN", "OUTCOME_UNKNOWN", "DISPATCH_OUTCOME_UNKNOWN"),
      },
    }
  );

  return {
    released: released.modifiedCount || 0,
    unknown: unknown.modifiedCount || 0,
  };
}

/* ======================================================
   WORKER
====================================================== */

export type SmsFallbackRunStats = {
  enabled: boolean;
  claimed: number;
  sent: number;
  failed: number;
  skipped: number;
  retried: number;
  deferred: number;
  released: number;
  unknown: number;
};

export async function processWhatsappSmsFallbacks(
  options: { deps?: Partial<SmsFallbackDeps>; limit?: number } = {}
): Promise<SmsFallbackRunStats> {
  const stats: SmsFallbackRunStats = {
    enabled: isWhatsappSmsFallbackEnabled(),
    claimed: 0,
    sent: 0,
    failed: 0,
    skipped: 0,
    retried: 0,
    deferred: 0,
    released: 0,
    unknown: 0,
  };

  if (!stats.enabled) return stats;

  const deps: SmsFallbackDeps = { ...defaultDeps, ...(options.deps || {}) };
  const limit = options.limit ?? DEFAULT_LIMIT_PER_RUN;

  const recovered = await recoverStaleClaims(deps.now());
  stats.released = recovered.released;
  stats.unknown = recovered.unknown;

  for (let i = 0; i < limit; i++) {
    const now = deps.now();
    const lockId = randomUUID();

    const record: any = await RoundGuestDelivery.findOneAndUpdate(
      {
        "whatsapp.status": { $in: ["FAILED", "NOT_SENT"] },
        "sms.status": null,
        $or: [{ "sms.notBefore": null }, { "sms.notBefore": { $lte: now } }],
      },
      {
        $set: {
          "sms.status": "PENDING",
          "sms.lockId": lockId,
          "sms.lockedAt": now,
          "sms.dispatchStartedAt": null,
        },
      },
      { sort: { "sms.notBefore": 1, _id: 1 }, new: true }
    ).lean();

    if (!record) break;
    stats.claimed++;

    const own = { _id: record._id, "sms.lockId": lockId, "sms.status": "PENDING" };
    const attemptNo = Number(record.attempt || 1);
    const entry = (...args: Parameters<typeof historyEntry>) => ({
      ...historyEntry(...args),
      attempt: attemptNo,
    });
    const supersede = (at: Date) =>
      settleClaimedSms(own, lockId, { $set: { "sms.skippedAt": at } }, SUPERSEDED_SMS);
    let dispatched = false;

    try {
      if (!record.sms?.idempotencyKey || !record.sms?.triggeredAt) {
        await RoundGuestDelivery.updateOne(own, {
          $set: {
            "sms.idempotencyKey": buildSmsFallbackIdempotencyKey(record),
            "sms.triggeredAt": record.sms?.triggeredAt || now,
          },
          $push: {
            history: entry(now, "SMS_FALLBACK_TRIGGERED", "PENDING", null, null, {
              whatsappStatus: record.whatsapp?.status,
              whatsappReason: record.whatsapp?.reasonCode || null,
              whatsappFailedAt: record.whatsapp?.failedAt || record.whatsapp?.notSentAt || null,
            }),
          },
        });
      }

      const evaluation = await evaluateRecord(record, deps, now);

      if (evaluation.action === "defer") {
        const deferred = await RoundGuestDelivery.updateOne(own, {
          $set: {
            "sms.status": null,
            "sms.lockId": null,
            "sms.lockedAt": null,
            "sms.notBefore": new Date(evaluation.untilMs),
          },
        });
        if (deferred.matchedCount === 0) await supersede(now);
        stats.deferred++;
        continue;
      }

      if (evaluation.action === "skip") {
        await settleClaimedSms(own, lockId, {
          $set: {
            "sms.status": "SKIPPED",
            "sms.reasonCode": evaluation.reasonCode,
            "sms.reasonMessage": getSmsReasonLabel(evaluation.reasonCode),
            "sms.skippedAt": now,
            "sms.lockId": null,
            "sms.lockedAt": null,
          },
          $push: {
            history: entry(
              now,
              "SMS_SKIPPED",
              "SKIPPED",
              evaluation.reasonCode,
              evaluation.message || getSmsReasonLabel(evaluation.reasonCode)
            ),
          },
        });
        stats.skipped++;
        continue;
      }

      const marked = await RoundGuestDelivery.updateOne(
        { ...own, "sms.dispatchStartedAt": null },
        {
          $set: {
            "sms.dispatchStartedAt": now,
            "sms.phone": evaluation.phone,
            "sms.text": evaluation.text,
            "sms.parts": evaluation.parts,
          },
          $inc: { "sms.attempts": 1 },
        }
      );
      if (marked.modifiedCount !== 1) {
        await supersede(now);
        continue;
      }
      dispatched = true;

      const result = await deps.sendSms({ to: evaluation.phone, message: evaluation.text });
      const doneAt = deps.now();
      const attempts = Number(record.sms?.attempts || 0) + 1;
      const evidence = {
        "sms.provider": result.provider,
        "sms.providerStatus": result.providerStatus,
        "sms.providerResponse": result.rawResponse ?? null,
        "sms.httpStatus": result.httpStatus ?? null,
      };
      const evidenceMeta = {
        phone: result.recipient || evaluation.phone,
        httpStatus: result.httpStatus ?? null,
        providerStatus: result.providerStatus,
        providerResponse: result.rawResponse ?? null,
        attempt: attempts,
        deliveryAttempt: attemptNo,
      };
      console.info("[sms-fallback] provider outcome", {
        recordId: String(record._id),
        roundKey: record.roundKey,
        guestId: String(record.guestId),
        phone: `***${String(evidenceMeta.phone || "").slice(-4)}`,
        ok: result.ok,
        errorCode: result.ok ? null : result.errorCode,
        httpStatus: evidenceMeta.httpStatus,
        providerStatus: evidenceMeta.providerStatus,
        providerResponse: evidenceMeta.providerResponse,
      });

      // SENT = the provider explicitly accepted the request. It does not mean delivered to the handset.
      if (result.ok) {
        await settleClaimedSms(own, lockId, {
          $set: {
            ...evidence,
            "sms.status": "SENT",
            "sms.sentAt": doneAt,
            "sms.providerMessageId": result.providerMessageId,
            "sms.reasonCode": null,
            "sms.reasonMessage": null,
            "sms.errorCode": null,
            "sms.errorMessage": null,
            "sms.lockId": null,
            "sms.lockedAt": null,
          },
          $push: {
            history: entry(doneAt, "SMS_SENT", "SENT", null, null, {
              ...evidenceMeta,
              providerMessage: result.providerMessage,
              parts: evaluation.parts,
            }),
          },
        });

        if (evaluation.chargeOwner && evaluation.parts > 0) {
          await User.updateOne(
            { _id: evaluation.ownerId },
            { $inc: { smsUsed: evaluation.parts } }
          );
        }

        stats.sent++;
        continue;
      }

      if (result.retryable && attempts < MAX_SMS_ATTEMPTS) {
        await settleClaimedSms(
          own,
          lockId,
          {
            $set: {
              "sms.status": null,
              "sms.notBefore": new Date(doneAt.getTime() + RETRY_BACKOFF_MS * attempts),
              "sms.dispatchStartedAt": null,
              "sms.lockId": null,
              "sms.lockedAt": null,
              "sms.errorCode": result.errorCode,
              "sms.errorMessage": result.errorMessage,
            },
            $push: {
              history: entry(
                doneAt,
                "SMS_RETRY_SCHEDULED",
                null,
                result.errorCode,
                result.errorMessage,
                evidenceMeta
              ),
            },
          },
          { ...evidence, "sms.status": "FAILED", "sms.failedAt": doneAt }
        );
        stats.retried++;
        continue;
      }

      if (result.outcomeUnknown) {
        await settleClaimedSms(own, lockId, {
          $set: {
            ...evidence,
            "sms.status": "OUTCOME_UNKNOWN",
            "sms.unknownAt": doneAt,
            "sms.reasonCode": result.errorCode,
            "sms.reasonMessage": getSmsReasonLabel(result.errorCode),
            "sms.errorCode": result.errorCode,
            "sms.errorMessage": result.errorMessage,
            "sms.lockId": null,
            "sms.lockedAt": null,
          },
          $push: {
            history: entry(
              doneAt,
              "SMS_OUTCOME_UNKNOWN",
              "OUTCOME_UNKNOWN",
              result.errorCode,
              result.errorMessage,
              evidenceMeta
            ),
          },
        });
        stats.unknown++;
        continue;
      }

      await settleClaimedSms(own, lockId, {
        $set: {
          ...evidence,
          "sms.status": "FAILED",
          "sms.failedAt": doneAt,
          "sms.reasonCode": result.errorCode,
          "sms.reasonMessage": getSmsReasonLabel(result.errorCode),
          "sms.errorCode": result.errorCode,
          "sms.errorMessage": result.errorMessage,
          "sms.lockId": null,
          "sms.lockedAt": null,
        },
        $push: {
          history: entry(doneAt, "SMS_FAILED", "FAILED", result.errorCode, result.errorMessage, evidenceMeta),
        },
      });
      stats.failed++;
    } catch (err: any) {
      console.error("❌ SMS FALLBACK ERROR:", {
        recordId: String(record._id),
        error: err?.message || err,
      });

      // Before dispatch: release so a later run can retry.
      // After dispatch: leave PENDING; recovery marks DISPATCH_OUTCOME_UNKNOWN (no resend).
      if (!dispatched) {
        await settleClaimedSms(
          own,
          lockId,
          {
            $set: {
              "sms.status": null,
              "sms.lockId": null,
              "sms.lockedAt": null,
              "sms.notBefore": new Date(now.getTime() + RETRY_BACKOFF_MS),
            },
          },
          { ...SUPERSEDED_SMS, "sms.skippedAt": now }
        ).catch(() => null);
      }
    }
  }

  return stats;
}
