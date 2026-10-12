import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import { loadTodayEventBoard } from "@/lib/customerNotifications/adminCenterLive";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await getUserIdFromRequest(request);
  if (!auth || auth.role !== "admin" || auth.impersonated) {
    return NextResponse.json({ success: false }, { status: 401 });
  }
  await dbConnect();
  const board = await loadTodayEventBoard();
  const attention = board.events.filter((event) => event.needsAttention).length;
  return NextResponse.json({
    success: true,
    dateKey: board.dateKey,
    eventCount: board.events.length,
    attentionCount: attention,
    missingTeam: board.events.some((event) => event.missingTeam),
    missingCritical: board.events.some((event) => event.missingCritical),
    roundsNeedAttention: board.events.some((event) => event.roundsNeedAttention),
    events: board.events,
  });
}
