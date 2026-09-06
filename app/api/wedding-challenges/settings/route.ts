import { NextResponse } from "next/server";
import db from "@/lib/db";
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
  normalizeWeddingChallengeSettings,
} from "@/lib/weddingChallenges/settings";
import {
  WEDDING_CHALLENGES_GIVEAWAY_PRICE_ILS,
  WEDDING_CHALLENGES_PRICE_ILS,
} from "@/lib/weddingChallenges/constants";
import { coupleNamesFromTitle } from "@/lib/weddingChallenges/sms";

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

  const settings = context.settings;
  const giveawayPurchased = userHasWeddingChallengesGiveawayEntitlement(context.owner);

  return NextResponse.json({
    success: true,
    eventId,
    coupleNames: coupleNamesFromTitle(context.invitation?.title || context.event?.title),
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

  const giveawayPurchased = userHasWeddingChallengesGiveawayEntitlement(context.owner);
  if (!giveawayPurchased) {
    next.giveaway.enabled = false;
  }

  config.settings = next;
  await config.save();

  return NextResponse.json({
    success: true,
    settings: normalizeWeddingChallengeSettings(config.settings),
  });
}
