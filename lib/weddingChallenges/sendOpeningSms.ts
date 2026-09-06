import InvitationGuest from "@/models/InvitationGuest";
import User from "@/models/User";
import WeddingChallengeConfig from "@/models/WeddingChallengeConfig";
import { isSendableSmsPhone, sendSMS } from "@/lib/sendSMS";
import { shortenUrl } from "@/lib/shortenUrl";
import { assertExternalSendAllowed } from "@/lib/env/externalSends";
import { DEFAULT_PUBLIC_ORIGIN } from "@/lib/guestInviteUrl";
import { LIVE_PATH_PREFIX, WEDDING_CHALLENGES_MAX_GUESTS } from "./constants";
import { attendingGuestMongoFilter } from "./sourceType";
import { buildWeddingChallengesSms, coupleNamesFromTitle } from "./sms";
import { loadEventChallengeContext } from "./service";
import {
  normalizeWeddingChallengeSettings,
  openingSmsAlreadySent,
  smsSchedulePublic,
} from "./settings";
import { DEFAULT_EVENT_TIMEZONE } from "./timezone";
import {
  claimOpeningSmsFilter,
  finalizeOpeningSmsBatch,
  isStaleSending,
  logWeddingChallengesSms,
  logWeddingChallengesSmsError,
  openingSmsQuotaRemaining,
} from "./openingSms";
import { userHasWeddingChallengesEntitlement } from "./entitlement";
import WeddingChallengeGuest from "@/models/WeddingChallengeGuest";

function countBusinessSms(text: string) {
  const length = [...text].length;
  if (length <= 200) return 1;
  if (length <= 320) return 2;
  return 3;
}

export async function scheduleWeddingChallengesOpeningSms(params: {
  eventId: string;
  scheduledAt: Date;
  timezone?: string;
}) {
  const context = await loadEventChallengeContext(params.eventId);
  if (!context?.invitation) {
    return { ok: false as const, error: "EVENT_NOT_FOUND" };
  }

  const current = normalizeWeddingChallengeSettings(context.config.settings);
  if (openingSmsAlreadySent(current)) {
    return { ok: false as const, error: "ALREADY_SENT", sentAt: current.sms.sentAt };
  }
  if (current.sms.status === "sending" && !isStaleSending(current.sms)) {
    return { ok: false as const, error: "SENDING" };
  }
  if (params.scheduledAt.getTime() <= Date.now()) {
    return {
      ok: false as const,
      error: "SCHEDULE_IN_PAST",
      details: {
        scheduledAtUtc: params.scheduledAt.toISOString(),
        timezone: params.timezone || current.sms.timezone || DEFAULT_EVENT_TIMEZONE,
        nowUtc: new Date().toISOString(),
      },
    };
  }

  context.config.settings.sms.timezone =
    String(params.timezone || current.sms.timezone || DEFAULT_EVENT_TIMEZONE).trim() ||
    DEFAULT_EVENT_TIMEZONE;
  context.config.settings.sms.scheduledAt = params.scheduledAt;
  context.config.settings.sms.status = "scheduled";
  context.config.settings.sms.cancelledAt = null;
  context.config.settings.sms.lastError = null;
  context.config.settings.sms.sentAt = null;
  context.config.settings.sms.sentCount = 0;
  await context.config.save();

  const next = normalizeWeddingChallengeSettings(context.config.settings);
  logWeddingChallengesSms("schedule saved", {
    eventId: params.eventId,
    timezone: next.sms.timezone,
    scheduledAtUtc: next.sms.scheduledAt,
    scheduledAtLocal: next.sms.scheduledAt
      ? params.scheduledAt.toISOString()
      : null,
    sourceType: context.sourceType,
    enabled: next.enabled,
  });
  return { ok: true as const, sms: smsSchedulePublic(next) };
}

export async function cancelWeddingChallengesOpeningSms(eventId: string) {
  const context = await loadEventChallengeContext(eventId);
  if (!context?.invitation) {
    return { ok: false as const, error: "EVENT_NOT_FOUND" };
  }

  const current = normalizeWeddingChallengeSettings(context.config.settings);
  if (openingSmsAlreadySent(current)) {
    return { ok: false as const, error: "ALREADY_SENT", sentAt: current.sms.sentAt };
  }
  if (current.sms.status === "sending" && !isStaleSending(current.sms)) {
    return { ok: false as const, error: "SENDING" };
  }

  context.config.settings.sms.status = "cancelled";
  context.config.settings.sms.scheduledAt = null;
  context.config.settings.sms.cancelledAt = new Date();
  context.config.settings.sms.lastError = null;
  await context.config.save();

  const next = normalizeWeddingChallengeSettings(context.config.settings);
  logWeddingChallengesSms("schedule cancelled", { eventId });
  return { ok: true as const, sms: smsSchedulePublic(next) };
}

export async function sendWeddingChallengesOpeningSms(params: {
  eventId: string;
  force?: boolean;
  source?: "cron" | "send_now";
}) {
  const source = params.source || "send_now";
  const context = await loadEventChallengeContext(params.eventId);
  if (!context?.invitation) {
    logWeddingChallengesSmsError("send aborted", {
      eventId: params.eventId,
      source,
      code: "EVENT_NOT_FOUND",
    });
    return { ok: false as const, error: "EVENT_NOT_FOUND" };
  }

  const current = normalizeWeddingChallengeSettings(context.config.settings);
  if (openingSmsAlreadySent(current, params.force)) {
    logWeddingChallengesSms("already sent", {
      eventId: params.eventId,
      source,
      sentAt: current.sms.sentAt,
      sentCount: current.sms.sentCount,
    });
    return {
      ok: false as const,
      error: "ALREADY_SENT",
      sentAt: current.sms.sentAt,
      sentCount: current.sms.sentCount,
    };
  }

  const claimed = await WeddingChallengeConfig.findOneAndUpdate(
    {
      _id: context.config._id,
      ...claimOpeningSmsFilter({ force: params.force }),
    },
    {
      $set: {
        "settings.sms.status": "sending",
        "settings.sms.lastAttemptAt": new Date(),
        "settings.sms.lastError": null,
      },
    },
    { new: true }
  );

  if (!claimed) {
    const fresh = normalizeWeddingChallengeSettings(
      (await WeddingChallengeConfig.findById(context.config._id).lean())?.settings
    );
    const code = openingSmsAlreadySent(fresh) ? "ALREADY_SENT" : "SENDING";
    logWeddingChallengesSms("claim skipped", {
      eventId: params.eventId,
      source,
      code,
      status: fresh.sms.status,
      sentCount: fresh.sms.sentCount,
    });
    return { ok: false as const, error: code, sentAt: fresh.sms.sentAt, sentCount: fresh.sms.sentCount };
  }

  const restoreFailed = async (
    code: string,
    lastError: string,
    extra: { failed?: number; skipped?: number; total?: number; sourceType?: string } = {}
  ) => {
    claimed.settings.sms.status = "failed";
    claimed.settings.sms.sentAt = null;
    claimed.settings.sms.sentCount = 0;
    claimed.settings.sms.lastError = lastError;
    claimed.settings.sms.lastAttemptAt = new Date();
    await claimed.save();
    logWeddingChallengesSmsError("send failed", {
      eventId: params.eventId,
      source,
      code,
      lastError,
      smsSentAt: claimed.settings.sms.sentAt || null,
      ...extra,
    });
    return {
      ok: false as const,
      error: code,
      lastError,
      sent: 0,
      failed: extra?.failed ?? 0,
      skipped: extra?.skipped ?? 0,
      total: extra?.total ?? 0,
      details: extra || null,
    };
  };

  try {
    const owner = await User.findById(context.event.userId);
    if (!owner) {
      return await restoreFailed("OWNER_NOT_FOUND", "לא נמצא בעל האירוע");
    }

    const [guests, progressGuestCount] = await Promise.all([
      InvitationGuest.find({
        invitationId: context.invitation._id,
        phone: { $exists: true, $nin: ["", null] },
        token: { $exists: true, $nin: ["", null] },
        ...attendingGuestMongoFilter(context.sourceType),
      })
        .select("name phone token")
        .limit(WEDDING_CHALLENGES_MAX_GUESTS)
        .lean(),
      WeddingChallengeGuest.countDocuments({ eventId: params.eventId }),
    ]);

    logWeddingChallengesSms("eligible guest count", {
      eventId: params.eventId,
      source,
      sourceType: context.sourceType,
      eligible: guests.length,
      weddingChallengeGuestRows: progressGuestCount,
      entitled: userHasWeddingChallengesEntitlement(owner),
      weddingChallengesOnly: owner.weddingChallengesOnly === true,
      timezone: claimed.settings.sms.timezone,
      scheduledAt: claimed.settings.sms.scheduledAt,
    });

    if (guests.length === 0) {
      return await restoreFailed(
        "NO_ELIGIBLE_GUESTS",
        "אין אורחים זכאים לשליחת SMS",
        { total: 0, sourceType: context.sourceType }
      );
    }

    const coupleNames = coupleNamesFromTitle(
      context.invitation?.title || context.event?.title
    );
    const remaining = openingSmsQuotaRemaining(owner);

    let sent = 0;
    let failed = 0;
    let skipped = 0;
    let partsUsed = 0;
    let lastProviderError: string | null = null;
    let blockedReason: string | null = null;

    logWeddingChallengesSms("send attempt", {
      eventId: params.eventId,
      source,
      eligible: guests.length,
      quotaRemaining: remaining,
    });

    for (const guest of guests) {
      const phone = String(guest.phone || "").trim();
      if (!phone || !isSendableSmsPhone(phone)) {
        skipped += 1;
        logWeddingChallengesSms("recipient skipped", {
          eventId: params.eventId,
          guestId: String(guest._id || ""),
          reason: "invalid_phone",
        });
        continue;
      }

      let personalLink: string;
      try {
        personalLink = await shortenUrl(
          `${DEFAULT_PUBLIC_ORIGIN}${LIVE_PATH_PREFIX}/${guest.token}`
        );
      } catch (err) {
        failed += 1;
        lastProviderError = err instanceof Error ? err.message : "shortenUrl failed";
        logWeddingChallengesSmsError("shorten failed", {
          eventId: params.eventId,
          guestId: String(guest._id || ""),
          reason: lastProviderError,
        });
        continue;
      }

      const message = buildWeddingChallengesSms({
        coupleNames,
        personalLink,
        template: claimed.settings.sms.template === "short" ? "short" : "full",
      });
      const parts = countBusinessSms(message);

      if (remaining - partsUsed < parts) {
        failed += 1;
        lastProviderError = "QUOTA_EXHAUSTED";
        logWeddingChallengesSmsError("quota exhausted", {
          eventId: params.eventId,
          guestId: String(guest._id || ""),
          remaining,
          partsUsed,
          parts,
        });
        continue;
      }

      const allowed = assertExternalSendAllowed({ channel: "sms", to: phone });
      if (!allowed.allowed) {
        skipped += 1;
        blockedReason = allowed.reason;
        logWeddingChallengesSms("recipient skipped", {
          eventId: params.eventId,
          guestId: String(guest._id || ""),
          reason: allowed.reason,
        });
        continue;
      }

      try {
        await sendSMS({ to: phone, message });
        sent += 1;
        partsUsed += parts;
        logWeddingChallengesSms("provider response", {
          eventId: params.eventId,
          guestId: String(guest._id || ""),
          ok: true,
        });
      } catch (err) {
        failed += 1;
        lastProviderError = err instanceof Error ? err.message : "SMS provider error";
        logWeddingChallengesSmsError("provider response", {
          eventId: params.eventId,
          guestId: String(guest._id || ""),
          ok: false,
          reason: lastProviderError,
        });
      }
    }

    if (partsUsed > 0) {
      await User.updateOne({ _id: owner._id }, { $inc: { smsUsed: partsUsed } });
    }

    const finalized = finalizeOpeningSmsBatch({
      sent,
      failed,
      skipped,
      total: guests.length,
      blockedReason,
      lastProviderError,
    });

    claimed.settings.sms.sentAt = finalized.sentAt;
    claimed.settings.sms.sentCount = finalized.sentCount;
    claimed.settings.sms.status = finalized.status;
    claimed.settings.sms.lastError = finalized.lastError;
    claimed.settings.sms.lastAttemptAt = new Date();
    await claimed.save();

    logWeddingChallengesSms("final smsSentAt", {
      eventId: params.eventId,
      source,
      ok: finalized.ok,
      code: finalized.code,
      sent,
      failed,
      skipped,
      total: guests.length,
      smsSentAt: finalized.sentAt ? finalized.sentAt.toISOString() : null,
      lastError: finalized.lastError,
    });

    if (!finalized.ok) {
      return {
        ok: false as const,
        error: finalized.code,
        lastError: finalized.lastError,
        sent,
        failed,
        skipped,
        total: guests.length,
        details: {
          sent,
          failed,
          skipped,
          total: guests.length,
          lastError: finalized.lastError,
          sourceType: context.sourceType,
        },
      };
    }

    return {
      ok: true as const,
      sent,
      failed,
      skipped,
      total: guests.length,
    };
  } catch (err) {
    const lastError = err instanceof Error ? err.message : "שליחת ה-SMS נכשלה";
    return await restoreFailed("SEND_FAILED", lastError);
  }
}
