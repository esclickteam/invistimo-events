import InvitationGuest from "@/models/InvitationGuest";
import User from "@/models/User";
import WeddingChallengeConfig from "@/models/WeddingChallengeConfig";
import { sendSMS } from "@/lib/sendSMS";
import { shortenUrl } from "@/lib/shortenUrl";
import { assertExternalSendAllowed } from "@/lib/env/externalSends";
import { DEFAULT_PUBLIC_ORIGIN } from "@/lib/guestInviteUrl";
import { LIVE_PATH_PREFIX } from "./constants";
import { attendingGuestMongoFilter } from "./sourceType";
import { buildWeddingChallengesSms, coupleNamesFromTitle } from "./sms";
import { loadEventChallengeContext } from "./service";
import { normalizeWeddingChallengeSettings, openingSmsAlreadySent, smsSchedulePublic } from "./settings";
import { DEFAULT_EVENT_TIMEZONE } from "./timezone";

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
  if (current.sms.status === "sending") {
    return { ok: false as const, error: "SENDING" };
  }
  if (params.scheduledAt.getTime() <= Date.now()) {
    return { ok: false as const, error: "SCHEDULE_IN_PAST" };
  }

  context.config.settings.sms.timezone =
    String(params.timezone || current.sms.timezone || DEFAULT_EVENT_TIMEZONE).trim() ||
    DEFAULT_EVENT_TIMEZONE;
  context.config.settings.sms.scheduledAt = params.scheduledAt;
  context.config.settings.sms.status = "scheduled";
  context.config.settings.sms.cancelledAt = null;
  await context.config.save();

  const next = normalizeWeddingChallengeSettings(context.config.settings);
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
  if (current.sms.status === "sending") {
    return { ok: false as const, error: "SENDING" };
  }

  context.config.settings.sms.status = "cancelled";
  context.config.settings.sms.scheduledAt = null;
  context.config.settings.sms.cancelledAt = new Date();
  await context.config.save();

  const next = normalizeWeddingChallengeSettings(context.config.settings);
  return { ok: true as const, sms: smsSchedulePublic(next) };
}

export async function sendWeddingChallengesOpeningSms(params: {
  eventId: string;
  force?: boolean;
}) {
  const context = await loadEventChallengeContext(params.eventId);
  if (!context?.invitation) {
    return { ok: false as const, error: "EVENT_NOT_FOUND" };
  }

  const current = normalizeWeddingChallengeSettings(context.config.settings);
  if (openingSmsAlreadySent(current, params.force)) {
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
      ...(params.force
        ? {}
        : {
            $or: [
              { "settings.sms.sentAt": null },
              { "settings.sms.sentAt": { $exists: false } },
            ],
            "settings.sms.status": { $nin: ["sent", "sending"] },
          }),
    },
    {
      $set: { "settings.sms.status": "sending" },
    },
    { new: true }
  );

  if (!claimed) {
    return { ok: false as const, error: "ALREADY_SENT" };
  }

  const owner = await User.findById(context.event.userId);
  if (!owner) {
    claimed.settings.sms.status = current.sms.status === "scheduled" ? "scheduled" : "idle";
    await claimed.save();
    return { ok: false as const, error: "OWNER_NOT_FOUND" };
  }

  const guests = await InvitationGuest.find({
    invitationId: context.invitation._id,
    phone: { $exists: true, $nin: ["", null] },
    token: { $exists: true, $nin: ["", null] },
    ...attendingGuestMongoFilter(context.sourceType),
  })
    .select("name phone token")
    .lean();

  const coupleNames = coupleNamesFromTitle(
    context.invitation?.title || context.event?.title
  );
  const remaining = Math.max(
    Number(owner.maxMessages || 0) - Number(owner.smsUsed || 0),
    0
  );

  let sent = 0;
  let failed = 0;
  let skipped = 0;
  let partsUsed = 0;

  for (const guest of guests) {
    const phone = String(guest.phone || "").trim();
    if (!phone) {
      skipped += 1;
      continue;
    }

    const personalLink = await shortenUrl(
      `${DEFAULT_PUBLIC_ORIGIN}${LIVE_PATH_PREFIX}/${guest.token}`
    );
    const message = buildWeddingChallengesSms({
      coupleNames,
      personalLink,
      template: claimed.settings.sms.template === "short" ? "short" : "full",
    });
    const parts = countBusinessSms(message);

    if (remaining - partsUsed < parts) {
      failed += 1;
      continue;
    }

    const allowed = assertExternalSendAllowed({ channel: "sms", to: phone });
    if (!allowed.allowed) {
      skipped += 1;
      continue;
    }

    try {
      await sendSMS({ to: phone, message });
      sent += 1;
      partsUsed += parts;
    } catch {
      failed += 1;
    }
  }

  if (partsUsed > 0) {
    await User.updateOne({ _id: owner._id }, { $inc: { smsUsed: partsUsed } });
  }

  claimed.settings.sms.sentAt = new Date();
  claimed.settings.sms.sentCount = sent;
  claimed.settings.sms.status = "sent";
  await claimed.save();

  return {
    ok: true as const,
    sent,
    failed,
    skipped,
    total: guests.length,
  };
}
