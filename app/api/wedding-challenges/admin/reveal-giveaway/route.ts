import { NextResponse } from "next/server";
import db from "@/lib/db";
import { requireWeddingChallenges } from "@/lib/guards/requireWeddingChallenges";
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

  if (!userHasWeddingChallengesGiveawayEntitlement(context.owner)) {
    return NextResponse.json({ success: false, error: "GIVEAWAY_DISABLED" }, { status: 400 });
  }

  context.config.settings.giveaway.revealedByAdmin = true;
  await context.config.save();

  return NextResponse.json({ success: true });
}
