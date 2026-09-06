import { NextResponse } from "next/server";
import db from "@/lib/db";
import Event from "@/models/Event";
import Invitation from "@/models/Invitation";
import { requireWeddingChallenges } from "@/lib/guards/requireWeddingChallenges";
import {
  userHasWeddingChallengesGiveawayEntitlement,
} from "@/lib/weddingChallenges/entitlement";
import {
  getOrCreateChallengeConfig,
  loadEventChallengeContext,
} from "@/lib/weddingChallenges/service";
import {
  giveawayAdminStatus,
  normalizeWeddingChallengeSettings,
  smsSchedulePublic,
} from "@/lib/weddingChallenges/settings";
import {
  WEDDING_CHALLENGES_GIVEAWAY_PRICE_ILS,
  WEDDING_CHALLENGES_PRICE_ILS,
} from "@/lib/weddingChallenges/constants";
import { coupleNamesFromTitle } from "@/lib/weddingChallenges/sms";
import { linkEntitlementToEvent } from "@/lib/weddingChallenges/purchase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function eventIdFrom(req: Request) {
  const url = new URL(req.url);
  return String(url.searchParams.get("eventId") || "").trim();
}

export async function GET(req: Request) {
  const eventId = eventIdFrom(req);
  if (!eventId) {
    return NextResponse.json({ success: false, error: "EVENT_ID_REQUIRED" }, { status: 400 });
  }

  const gate = await requireWeddingChallenges({ eventId });
  if (!gate.ok) return gate.response;

  const context = await loadEventChallengeContext(eventId);
  if (!context) {
    return NextResponse.json({ success: false, error: "EVENT_NOT_FOUND" }, { status: 404 });
  }

  await linkEntitlementToEvent({
    userId: String(context.event.userId || gate.userId),
    eventId,
    sourceType: context.sourceType,
  });

  if (context.config && context.config.settings?.enabled !== true) {
    context.config.settings.enabled = true;
    await context.config.save();
    context.settings.enabled = true;
  }

  const settings = context.settings;
  const giveawayPurchased = userHasWeddingChallengesGiveawayEntitlement(context.owner);

  return NextResponse.json({
    success: true,
    eventId,
    sourceType: context.sourceType,
    coupleNames: coupleNamesFromTitle(context.invitation?.title || context.event?.title),
    eventDate: context.event?.date || "",
    entitled: context.entitled || gate.privileged,
    prices: {
      challenges: WEDDING_CHALLENGES_PRICE_ILS,
      giveaway: WEDDING_CHALLENGES_GIVEAWAY_PRICE_ILS,
    },
    giveawayPurchased,
    settings: {
      ...settings,
      giveaway: {
        ...settings.giveaway,
        enabled: settings.giveaway.enabled && giveawayPurchased,
      },
    },
    smsSchedule: smsSchedulePublic(settings),
    giveawayStatus: giveawayAdminStatus({
      ...settings,
      giveaway: {
        ...settings.giveaway,
        enabled: settings.giveaway.enabled && giveawayPurchased,
      },
    }),
  });
}

export async function PUT(req: Request) {
  const eventId = eventIdFrom(req);
  if (!eventId) {
    return NextResponse.json({ success: false, error: "EVENT_ID_REQUIRED" }, { status: 400 });
  }

  const gate = await requireWeddingChallenges({ eventId });
  if (!gate.ok) return gate.response;

  await db();

  const body = await req.json().catch(() => null);
  const context = await loadEventChallengeContext(eventId);
  if (!context) {
    return NextResponse.json({ success: false, error: "EVENT_NOT_FOUND" }, { status: 404 });
  }

  const invitation = context.invitation || (await Invitation.findOne({ eventId }).lean());
  const config = await getOrCreateChallengeConfig({
    eventId,
    invitationId: invitation?._id ? String(invitation._id) : null,
    ownerUserId: String(context.event.userId),
    sourceType: context.sourceType,
  });

  const incoming = body?.settings || body;
  const next = normalizeWeddingChallengeSettings({
    ...context.settings,
    ...incoming,
    giveaway: {
      ...context.settings.giveaway,
      ...(incoming?.giveaway || {}),
    },
    sms: {
      ...context.settings.sms,
      ...(incoming?.sms || {}),
    },
    enabledCategories: {
      ...context.settings.enabledCategories,
      ...(incoming?.enabledCategories || {}),
    },
  });

  const coupleNames = String(body?.coupleNames || "").trim();
  const eventDate = String(body?.eventDate || "").trim();
  if (coupleNames || eventDate) {
    const eventSet: Record<string, string> = {};
    const invitationSet: Record<string, string> = {};
    if (coupleNames) {
      eventSet.title = coupleNames;
      invitationSet.title = coupleNames;
    }
    if (eventDate) {
      eventSet.date = eventDate;
      invitationSet.eventDate = eventDate;
    }
    await Promise.all([
      Event.updateOne({ _id: eventId }, { $set: eventSet }),
      Invitation.updateOne({ eventId }, { $set: invitationSet }),
    ]);
  }

  const giveawayPurchased = userHasWeddingChallengesGiveawayEntitlement(context.owner);
  if (!giveawayPurchased) {
    next.giveaway.enabled = false;
  }

  next.sms = {
    ...next.sms,
    template: next.sms.template,
    timezone: next.sms.timezone || context.settings.sms.timezone,
    scheduledAt: context.settings.sms.scheduledAt,
    status: context.settings.sms.status,
    sentAt: context.settings.sms.sentAt,
    sentCount: context.settings.sms.sentCount,
    cancelledAt: context.settings.sms.cancelledAt,
    lastError: context.settings.sms.lastError,
    lastAttemptAt: context.settings.sms.lastAttemptAt,
  };

  if (context.settings.giveaway.locked || context.settings.giveaway.drawnAt) {
    next.giveaway.locked = true;
    next.giveaway.winnerGuestId = context.settings.giveaway.winnerGuestId;
    next.giveaway.winnerName = context.settings.giveaway.winnerName;
    next.giveaway.drawnAt = context.settings.giveaway.drawnAt;
  }

  config.settings = next;
  await config.save();

  return NextResponse.json({
    success: true,
    sourceType: context.sourceType,
    coupleNames:
      coupleNames || coupleNamesFromTitle(context.invitation?.title || context.event?.title),
    eventDate: eventDate || context.event?.date || "",
    settings: normalizeWeddingChallengeSettings(config.settings),
  });
}
