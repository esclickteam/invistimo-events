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

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const eventId = String(new URL(req.url).searchParams.get("eventId") || "").trim();
  if (!eventId) {
    return NextResponse.json({ success: false, error: "EVENT_ID_REQUIRED" }, { status: 400 });
  }

  const gate = await requireWeddingChallenges({ eventId });
  if (!gate.ok) return gate.response;

  const context = await loadEventChallengeContext(eventId);
  if (!context?.invitation) {
    return NextResponse.json({ success: false, error: "EVENT_NOT_FOUND" }, { status: 404 });
  }

  const coupleNames = coupleNamesFromTitle(context.invitation?.title || context.event?.title);
  const sample = buildWeddingChallengesSms({
    coupleNames,
    personalLink: `${DEFAULT_PUBLIC_ORIGIN}${LIVE_PATH_PREFIX}/[personal_link]`,
    template: context.settings.sms.template,
  });

  const guests = await InvitationGuest.countDocuments({
    invitationId: context.invitation._id,
    phone: { $exists: true, $nin: ["", null] },
    ...attendingGuestMongoFilter(context.sourceType),
  });

  return NextResponse.json({
    success: true,
    sourceType: context.sourceType,
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
    return NextResponse.json({ success: false, error: "EVENT_ID_REQUIRED" }, { status: 400 });
  }
  if (!action) {
    return NextResponse.json({ success: false, error: "ACTION_REQUIRED" }, { status: 400 });
  }

  const gate = await requireWeddingChallenges({ eventId });
  if (!gate.ok) return gate.response;

  if (action === "schedule" || action === "update") {
    const context = await loadEventChallengeContext(eventId);
    if (!context) {
      return NextResponse.json({ success: false, error: "EVENT_NOT_FOUND" }, { status: 404 });
    }
    const timezone = String(body.timezone || context.settings.sms.timezone || DEFAULT_EVENT_TIMEZONE).trim();
    const scheduledAt = parseEventDateTime(body.scheduledAt || body.scheduledAtLocal, timezone);
    if (!scheduledAt) {
      return NextResponse.json({ success: false, error: "SCHEDULED_AT_REQUIRED" }, { status: 400 });
    }
    const result = await scheduleWeddingChallengesOpeningSms({
      eventId,
      scheduledAt,
      timezone,
    });
    if (!result.ok) {
      const status = result.error === "ALREADY_SENT" ? 409 : result.error === "SCHEDULE_IN_PAST" ? 400 : 400;
      return NextResponse.json({ success: false, error: result.error, sentAt: result.sentAt }, { status });
    }
    return NextResponse.json({ success: true, action, sms: result.sms });
  }

  if (action === "cancel") {
    const result = await cancelWeddingChallengesOpeningSms(eventId);
    if (!result.ok) {
      return NextResponse.json(
        { success: false, error: result.error, sentAt: result.sentAt },
        { status: result.error === "ALREADY_SENT" ? 409 : 400 }
      );
    }
    return NextResponse.json({ success: true, action: "cancel", sms: result.sms });
  }

  if (action === "send_now") {
    const result = await sendWeddingChallengesOpeningSms({ eventId });
    if (!result.ok) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          sentAt: "sentAt" in result ? result.sentAt : null,
          sentCount: "sentCount" in result ? result.sentCount : 0,
        },
        { status: result.error === "ALREADY_SENT" ? 409 : 400 }
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

  return NextResponse.json({ success: false, error: "UNKNOWN_ACTION" }, { status: 400 });
}
