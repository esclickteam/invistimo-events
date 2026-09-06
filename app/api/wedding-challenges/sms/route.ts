import { NextResponse } from "next/server";
import InvitationGuest from "@/models/InvitationGuest";
import { requireWeddingChallenges } from "@/lib/guards/requireWeddingChallenges";
import { DEFAULT_PUBLIC_ORIGIN } from "@/lib/guestInviteUrl";
import { LIVE_PATH_PREFIX } from "@/lib/weddingChallenges/constants";
import { attendingGuestMongoFilter, loadEventChallengeContext } from "@/lib/weddingChallenges/service";
import { buildWeddingChallengesSms, coupleNamesFromTitle } from "@/lib/weddingChallenges/sms";
import {
  cancelWeddingChallengesOpeningSms,
  scheduleWeddingChallengesOpeningSms,
  sendWeddingChallengesOpeningSms,
} from "@/lib/weddingChallenges/sendOpeningSms";
import { smsSchedulePublic } from "@/lib/weddingChallenges/settings";
import { DEFAULT_EVENT_TIMEZONE, parseEventDateTime } from "@/lib/weddingChallenges/timezone";
import { weddingChallengesSmsErrorBody } from "@/lib/weddingChallenges/openingSms";
import { userHasWeddingChallengesEntitlement } from "@/lib/weddingChallenges/entitlement";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function errorJson(
  code: string,
  status: number,
  details?: unknown,
  errorOverride?: string
) {
  return NextResponse.json(weddingChallengesSmsErrorBody(code, details, errorOverride), {
    status,
  });
}

export async function GET(req: Request) {
  const eventId = String(new URL(req.url).searchParams.get("eventId") || "").trim();
  if (!eventId) {
    return errorJson("EVENT_ID_REQUIRED", 400);
  }

  const gate = await requireWeddingChallenges({ eventId });
  if (!gate.ok) return gate.response;

  const context = await loadEventChallengeContext(eventId);
  if (!context?.invitation) {
    return errorJson("EVENT_NOT_FOUND", 404);
  }

  const coupleNames = coupleNamesFromTitle(context.invitation?.title || context.event?.title);
  const sample = buildWeddingChallengesSms({
    coupleNames,
    personalLink: `${DEFAULT_PUBLIC_ORIGIN}${LIVE_PATH_PREFIX}/[personal_link]`,
    template: context.settings.sms.template,
  });

  const eligibleFilter = {
    invitationId: context.invitation._id,
    phone: { $exists: true, $nin: ["", null] },
    token: { $exists: true, $nin: ["", null] },
    ...attendingGuestMongoFilter(context.sourceType),
  };
  const guests = await InvitationGuest.countDocuments(eligibleFilter);

  return NextResponse.json({
    success: true,
    sourceType: context.sourceType,
    enabled: context.settings.enabled,
    entitled: userHasWeddingChallengesEntitlement(context.owner),
    coupleNames,
    template: context.settings.sms.template,
    preview: sample,
    guests,
    sms: smsSchedulePublic(context.settings),
    sentAt: context.settings.sms.sentAt,
    sentCount: context.settings.sms.sentCount,
  });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const eventId = String(body.eventId || "").trim();
  const action = String(body.action || "").trim();
  if (!eventId) {
    return errorJson("EVENT_ID_REQUIRED", 400);
  }
  if (!action) {
    return errorJson("ACTION_REQUIRED", 400);
  }

  const gate = await requireWeddingChallenges({ eventId });
  if (!gate.ok) return gate.response;

  if (action === "schedule" || action === "update") {
    const context = await loadEventChallengeContext(eventId);
    if (!context) {
      return errorJson("EVENT_NOT_FOUND", 404);
    }
    const timezone = String(
      body.timezone || context.settings.sms.timezone || DEFAULT_EVENT_TIMEZONE
    ).trim();
    const scheduledAt = parseEventDateTime(body.scheduledAt || body.scheduledAtLocal, timezone);
    if (!scheduledAt) {
      return errorJson("SCHEDULED_AT_REQUIRED", 400, {
        timezone,
        scheduledAt: body.scheduledAt || body.scheduledAtLocal || null,
      });
    }
    const result = await scheduleWeddingChallengesOpeningSms({
      eventId,
      scheduledAt,
      timezone,
    });
    if (!result.ok) {
      const status = result.error === "ALREADY_SENT" ? 409 : 400;
      return errorJson(result.error, status, {
        sentAt: "sentAt" in result ? result.sentAt : null,
        scheduledAtUtc: scheduledAt.toISOString(),
        timezone,
        ...("details" in result && result.details ? result.details : {}),
      });
    }
    return NextResponse.json({ success: true, action, sms: result.sms });
  }

  if (action === "cancel") {
    const result = await cancelWeddingChallengesOpeningSms(eventId);
    if (!result.ok) {
      return errorJson(result.error, result.error === "ALREADY_SENT" ? 409 : 400, {
        sentAt: "sentAt" in result ? result.sentAt : null,
      });
    }
    return NextResponse.json({ success: true, action: "cancel", sms: result.sms });
  }

  if (action === "send_now") {
    const result = await sendWeddingChallengesOpeningSms({
      eventId,
      force: body.force === true,
      source: "send_now",
    });
    if (!result.ok) {
      return errorJson(
        result.error,
        result.error === "ALREADY_SENT" ? 409 : 400,
        {
          sentAt: "sentAt" in result ? result.sentAt : null,
          sentCount: "sentCount" in result ? result.sentCount : 0,
          sent: "sent" in result ? result.sent : 0,
          failed: "failed" in result ? result.failed : 0,
          skipped: "skipped" in result ? result.skipped : 0,
          total: "total" in result ? result.total : 0,
          lastError: "lastError" in result ? result.lastError : null,
          ...("details" in result && result.details ? { extra: result.details } : {}),
        },
        "lastError" in result && result.lastError ? String(result.lastError) : undefined
      );
    }
    return NextResponse.json({
      success: true,
      action: "send_now",
      sent: result.sent,
      failed: result.failed,
      skipped: result.skipped,
      total: result.total,
    });
  }

  return errorJson("UNKNOWN_ACTION", 400, { action });
}
