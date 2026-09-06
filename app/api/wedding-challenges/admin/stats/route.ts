import { NextResponse } from "next/server";
import db from "@/lib/db";
import InvitationGuest from "@/models/InvitationGuest";
import WeddingChallengeAssignment from "@/models/WeddingChallengeAssignment";
import WeddingChallengeGuest from "@/models/WeddingChallengeGuest";
import { requireWeddingChallenges } from "@/lib/guards/requireWeddingChallenges";
import { loadEventChallengeContext } from "@/lib/weddingChallenges/service";
import { CATEGORY_SHORT_LABELS } from "@/lib/weddingChallenges/constants";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const eventId = String(new URL(req.url).searchParams.get("eventId") || "").trim();
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

  const [guests, assignments, progress] = await Promise.all([
    InvitationGuest.countDocuments({ invitationId: context.invitation?._id }),
    WeddingChallengeAssignment.find({ eventId }).select("status category guestId").lean(),
    WeddingChallengeGuest.find({ eventId }).select("completedCount giveawayEntries").lean(),
  ]);

  const completed = assignments.filter((row) => row.status === "completed").length;
  const active = assignments.filter((row) =>
    row.status === "assigned" || row.status === "revealed"
  ).length;
  const byCategory: Record<string, number> = {};
  for (const row of assignments) {
    if (row.status !== "completed") continue;
    byCategory[row.category] = (byCategory[row.category] || 0) + 1;
  }

  const players = progress.filter((row) => Number(row.completedCount || 0) > 0).length;
  const entries = progress.reduce((sum, row) => sum + Number(row.giveawayEntries || 0), 0);

  return NextResponse.json({
    success: true,
    stats: {
      guests,
      players,
      completed,
      active,
      entries,
      byCategory: Object.entries(CATEGORY_SHORT_LABELS).map(([key, label]) => ({
        key,
        label,
        count: byCategory[key] || 0,
      })),
    },
    giveaway: {
      enabled: context.settings.giveaway.enabled,
      prizeText: context.settings.giveaway.prizeText,
      winnerName: context.settings.giveaway.winnerName,
      drawnAt: context.settings.giveaway.drawnAt,
    },
  });
}
