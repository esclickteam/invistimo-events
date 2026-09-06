import { NextResponse } from "next/server";
import db from "@/lib/db";
import InvitationGuest from "@/models/InvitationGuest";
import WeddingChallengeGuest from "@/models/WeddingChallengeGuest";
import { requireWeddingChallenges } from "@/lib/guards/requireWeddingChallenges";
import { pickWeightedWinner } from "@/lib/weddingChallenges/giveaway";
import { loadEventChallengeContext } from "@/lib/weddingChallenges/service";
import { userHasWeddingChallengesGiveawayEntitlement } from "@/lib/weddingChallenges/entitlement";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const eventId = String(body.eventId || "").trim();
  if (!eventId) {
    return NextResponse.json({ success: false, error: "EVENT_ID_REQUIRED" }, { status: 400 });
  }

  const gate = await requireWeddingChallenges({ eventId });
  if (!gate.ok) return gate.response;

  await db();
  const context = await loadEventChallengeContext(eventId);
  if (!context) {
    return NextResponse.json({ success: false, error: "EVENT_NOT_FOUND" }, { status: 404 });
  }

  if (!userHasWeddingChallengesGiveawayEntitlement(context.owner) || !context.settings.giveaway.enabled) {
    return NextResponse.json({ success: false, error: "GIVEAWAY_DISABLED" }, { status: 400 });
  }

  const rows = await WeddingChallengeGuest.find({ eventId }).lean();
  const guestIds = rows.map((row) => row.guestId);
  const guests = await InvitationGuest.find({ _id: { $in: guestIds } })
    .select("name phone")
    .lean();
  const names = new Map(guests.map((guest) => [String(guest._id), String(guest.name || "אורח")]));

  const winner = pickWeightedWinner(
    rows.map((row) => ({
      guestId: String(row.guestId),
      guestName: names.get(String(row.guestId)) || "אורח",
      entries: Number(row.giveawayEntries || 0),
    }))
  );

  if (!winner) {
    return NextResponse.json({ success: false, error: "NO_ENTRIES" }, { status: 400 });
  }

  context.config.settings.giveaway.winnerGuestId = winner.guestId;
  context.config.settings.giveaway.winnerName = winner.guestName;
  context.config.settings.giveaway.drawnAt = new Date();
  await context.config.save();

  return NextResponse.json({
    success: true,
    winner: {
      guestId: winner.guestId,
      name: winner.guestName,
      entries: winner.entries,
      prizeText: context.settings.giveaway.prizeText,
    },
  });
}
