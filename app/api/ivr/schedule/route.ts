import { NextRequest, NextResponse } from "next/server";
import { isIvrCallsUser } from "@/lib/calls/callsType";
import {
  requireIvrSession,
  resolveIvrTargetUser,
} from "@/lib/calls/ivrRequestAuth";
import {
  formatCallRoundDateTimeDmy,
  formatCallRoundDateTimeInput,
  normalizeCallRoundScheduledAtForSave,
  parseCallRoundScheduledAt,
} from "@/lib/calls/callRoundScheduleTime";
import { ivrPersistErrorPayload } from "@/lib/calls/ivrConfigPersist";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Save IVR round schedule dates only.
 * Never locks audience. Does not mutate existing human schedules for other users.
 * Preserves openedAt/status/tasksCreated when scheduledAt unchanged.
 */
export async function PUT(req: NextRequest) {
  try {
    const session = await requireIvrSession(req);
    if ("error" in session) {
      return NextResponse.json(
        { ok: false, error: session.error },
        { status: session.status }
      );
    }

    const body = await req.json().catch(() => ({}));
    const user = await resolveIvrTargetUser({
      sessionUser: session.user,
      isAdmin: session.isAdmin,
      requestedUserId: body.userId,
    });
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
        failureReason: scheduleChanged ? "" : existing?.failureReason || "",
        dialClaimedAt: scheduleChanged ? null : existing?.dialClaimedAt || null,
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

    const schedule = user.callRoundsSchedule?.toObject?.()
      ? user.callRoundsSchedule.toObject()
      : user.callRoundsSchedule;
    const rounds = (schedule?.rounds || []).map((round: any) => ({
      ...round,
      scheduledAtInput: formatCallRoundDateTimeInput(round.scheduledAt),
      scheduledAtDisplay: formatCallRoundDateTimeDmy(round.scheduledAt),
    }));

    return NextResponse.json({
      ok: true,
      callRoundsSchedule: { ...schedule, rounds },
    });
  } catch (error) {
    console.error("[ivr/schedule]", error);
    const payload = ivrPersistErrorPayload(error);
    return NextResponse.json(
      { ok: false, error: payload.error, message: payload.message },
      { status: payload.status }
    );
  }
}
