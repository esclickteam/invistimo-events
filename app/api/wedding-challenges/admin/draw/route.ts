import { NextResponse } from "next/server";
import { requireWeddingChallenges } from "@/lib/guards/requireWeddingChallenges";
import { WEDDING_CHALLENGES_GIVEAWAY_AVAILABLE } from "@/lib/weddingChallenges/constants";
import { drawWeddingChallengesGiveaway } from "@/lib/weddingChallenges/draw";

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

  if (!WEDDING_CHALLENGES_GIVEAWAY_AVAILABLE) {
    return NextResponse.json(
      { success: false, error: "GIVEAWAY_UNAVAILABLE" },
      { status: 409 }
    );
  }

  const reset = body.reset === true && body.confirm === true;
  const result = await drawWeddingChallengesGiveaway({ eventId, reset });

  if (!result.ok) {
    const status =
      result.error === "DRAW_LOCKED" ? 409 : result.error === "EVENT_NOT_FOUND" ? 404 : 400;
    return NextResponse.json(
      {
        success: false,
        error: result.error,
        winner: "winner" in result ? result.winner : null,
      },
      { status }
    );
  }

  return NextResponse.json({
    success: true,
    reset: "reset" in result ? result.reset : false,
    winner: result.winner,
  });
}
