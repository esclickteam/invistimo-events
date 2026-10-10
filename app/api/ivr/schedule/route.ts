import { NextRequest, NextResponse } from "next/server";
import { isIvrCallsUser } from "@/lib/calls/callsType";
import {
  requireIvrSession,
  resolveIvrTargetUser,
} from "@/lib/calls/ivrRequestAuth";
import {
  formatCallRoundDateTimeDmy,
  formatCallRoundDateTimeInput,
} from "@/lib/calls/callRoundScheduleTime";
import { buildNextIvrRoundSchedule } from "@/lib/calls/ivrRoundSchedule";
import { resolveIvrRoundAudio } from "@/lib/calls/ivrDialer";
import { ivrPersistErrorPayload } from "@/lib/calls/ivrConfigPersist";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Save IVR round schedule dates only.
 * Shared shape with admin schedule action — new runId on each schedule change.
 * Never locks audience. Does not mutate existing human schedules for other users.
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

    const { rounds: nextRounds, changedRounds } = buildNextIvrRoundSchedule({
      incomingRounds,
      existingRounds,
    });

    user.callRoundsSchedule = {
      enabled: true,
      rounds: nextRounds as any,
    };

    await user.save();

    const audio = resolveIvrRoundAudio(user);
    const scheduledCount = nextRounds.filter((r) => r.status === "scheduled")
      .length;
    const executable = scheduledCount === 0 || audio.audioReady === true;
    const executeBlockReason = executable
      ? ""
      : audio.audioBlockReason ||
        "אין קריינות מאושרת — התזמון נשמר אבל Cron לא יחייג עד לאישור";

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
      changedRounds,
      executable,
      executeBlockReason,
      message: executable
        ? changedRounds.length
          ? "תזמון הסבבים נשמר. הקהל יחושב רק במועד הביצוע."
          : "תזמון הסבבים נשמר."
        : `התזמון נשמר, אך לא יתבצע חיוג: ${executeBlockReason}`,
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
