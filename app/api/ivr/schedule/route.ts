import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import User from "@/models/User";
import { isIvrCallsUser } from "@/lib/calls/callsType";
import {
  normalizeCallRoundScheduledAtForSave,
  parseCallRoundScheduledAt,
} from "@/lib/calls/callRoundScheduleTime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Save IVR round schedule dates only.
 * Never locks audience. Does not mutate existing human schedules for other users.
 * Preserves openedAt/status/tasksCreated when scheduledAt unchanged.
 */
export async function PUT(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
    }

    await connectDB();
    const body = await req.json().catch(() => ({}));
    const authUser = await User.findById(userId);
    if (!authUser) {
      return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
    }

    const targetId =
      String(authUser.role) === "admin" && body.userId
        ? String(body.userId)
        : String(authUser._id);

    const user = await User.findById(targetId);
    if (!user || !isIvrCallsUser(user)) {
      return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
    }

    const incomingRounds = Array.isArray(body?.rounds)
      ? body.rounds
      : Array.isArray(body?.callRoundsSchedule?.rounds)
        ? body.callRoundsSchedule.rounds
        : [];

    const existingRounds = Array.isArray(user.callRoundsSchedule?.rounds)
      ? user.callRoundsSchedule.rounds
      : [];

    const nextRounds = [1, 2, 3].map((roundNumber) => {
      const incoming = incomingRounds.find(
        (r: any) => Number(r?.roundNumber || r?.round) === roundNumber
      );
      const existing = existingRounds.find(
        (r: any) => Number(r?.roundNumber || r?.round) === roundNumber
      );

      const scheduledAtIso = normalizeCallRoundScheduledAtForSave(
        incoming?.scheduledAt ?? existing?.scheduledAt ?? null
      );
      const scheduledAt = scheduledAtIso
        ? parseCallRoundScheduledAt(scheduledAtIso)
        : null;

      const previousScheduled = existing?.scheduledAt
        ? new Date(existing.scheduledAt).getTime()
        : null;
      const nextScheduled = scheduledAt ? scheduledAt.getTime() : null;
      const scheduleChanged = previousScheduled !== nextScheduled;

      return {
        roundNumber,
        title:
          String(incoming?.title || existing?.title || "").trim() ||
          `סבב מוקלט ${roundNumber}`,
        scheduledAt,
        // Phase 1 marker for future mixed model — always ivr for this package.
        callType: "ivr" as const,
        status: scheduleChanged
          ? scheduledAt
            ? "scheduled"
            : "draft"
          : existing?.status || (scheduledAt ? "scheduled" : "draft"),
        notes: String(incoming?.notes || existing?.notes || ""),
        openedAt: scheduleChanged ? null : existing?.openedAt || null,
        tasksCreated: scheduleChanged ? null : existing?.tasksCreated ?? null,
        updatedAt: new Date(),
        createdAt: existing?.createdAt || new Date(),
      };
    });

    user.callRoundsSchedule = {
      enabled: true,
      rounds: nextRounds as any,
    };

    await user.save();

    return NextResponse.json({
      ok: true,
      callRoundsSchedule: user.callRoundsSchedule,
    });
  } catch (error) {
    console.error("[ivr/schedule]", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "FAILED" },
      { status: 500 }
    );
  }
}
