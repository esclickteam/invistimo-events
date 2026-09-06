import { NextResponse } from "next/server";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import db from "@/lib/db";
import User from "@/models/User";
import Event from "@/models/Event";
import InvitationGuest from "@/models/InvitationGuest";
import { userHasWeddingChallengesEntitlement } from "@/lib/weddingChallenges/entitlement";
import { getActiveEntitlement } from "@/lib/weddingChallenges/purchase";
import {
  WEDDING_CHALLENGES_GIVEAWAY_PRICE_ILS,
  WEDDING_CHALLENGES_MAX_GUESTS,
  WEDDING_CHALLENGES_PRICE_ILS,
} from "@/lib/weddingChallenges/constants";
import Invitation from "@/models/Invitation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const auth = await getUserIdFromRequest();
  if (!auth?.userId) {
    return NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 401 });
  }
  await db();
  const user = await User.findById(auth.userId).lean();
  const entitlement = await getActiveEntitlement(auth.userId);
  const entitled =
    userHasWeddingChallengesEntitlement(user as any) || entitlement?.status === "ACTIVE";
  const giveawayPurchased = Boolean(
    entitlement?.giveawayPurchased ||
      (user as any)?.salesUpsells?.weddingChallengesGiveaway?.enabled
  );

  let guestCount = 0;
  if (entitlement?.eventId) {
    const invitation = await Invitation.findOne({ eventId: entitlement.eventId }).select("_id").lean();
    if (invitation) {
      guestCount = await InvitationGuest.countDocuments({ invitationId: invitation._id });
    }
  }

  const events = await Event.countDocuments({
    status: { $ne: "archived" },
    $or: [{ userId: auth.userId }, { producerId: auth.userId }],
    productType: { $ne: "wedding_challenges" },
  });

  return NextResponse.json({
    success: true,
    entitled,
    giveawayPurchased,
    needsSetup: entitled && !entitlement?.eventId,
    entitlement,
    prices: {
      challenges: WEDDING_CHALLENGES_PRICE_ILS,
      giveaway: WEDDING_CHALLENGES_GIVEAWAY_PRICE_ILS,
    },
    maxGuests: WEDDING_CHALLENGES_MAX_GUESTS,
    guestCount,
    remainingGuests: Math.max(0, WEDDING_CHALLENGES_MAX_GUESTS - guestCount),
    hasExistingEvents: events > 0,
  });
}
