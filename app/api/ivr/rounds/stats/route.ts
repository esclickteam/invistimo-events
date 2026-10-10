import { NextRequest, NextResponse } from "next/server";
import Invitation from "@/models/Invitation";
import InvitationGuest from "@/models/InvitationGuest";
import IvrCallAttempt from "@/models/IvrCallAttempt";
import { isIvrCallsUser } from "@/lib/calls/callsType";
import { filterGuestsForIvrRound } from "@/lib/calls/ivrRoundEligibility";
import { formatCallRoundDateTimeDmy } from "@/lib/calls/callRoundScheduleTime";
import {
  requireIvrSession,
  resolveIvrTargetUser,
} from "@/lib/calls/ivrRequestAuth";
import { explainIvrCallFailure } from "@/lib/telnyx/ivrCallControl";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireIvrSession(req);
    if ("error" in session) {
      return NextResponse.json(
        { ok: false, error: session.error },
        { status: session.status }
      );
    }

    const url = new URL(req.url);
    const target = await resolveIvrTargetUser({
      sessionUser: session.user,
      isAdmin: session.isAdmin,
      requestedUserId: url.searchParams.get("userId"),
    });
    if (!target || !isIvrCallsUser(target)) {
      return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
    }

    const invitation = await Invitation.findOne({ ownerId: target._id })
      .select("_id")
      .sort({ eventDate: 1, createdAt: -1 })
      .lean();

    if (!invitation) {
      return NextResponse.json({ ok: true, rounds: [] });
    }

    const guests = await InvitationGuest.find({
      invitationId: invitation._id,
    }).lean();

    const attempts = await IvrCallAttempt.find({
      invitationId: invitation._id,
      channel: "outbound_ivr",
    })
      .select("round runId status answered rsvpResult attendingCount error")
      .lean();

    const scheduleRounds = Array.isArray(target.callRoundsSchedule?.rounds)
      ? target.callRoundsSchedule.rounds
      : [];

    const rounds = [1, 2, 3].map((round) => {
      const scheduleRound = scheduleRounds.find(
        (item: any) => Number(item?.roundNumber) === round
      );
      const rawStatus = String(scheduleRound?.status || "scheduled").toLowerCase();
      const executionStatus =
        rawStatus === "done" || rawStatus === "completed"
          ? "done"
          : rawStatus === "failed"
            ? "failed"
            : rawStatus === "in_progress" || rawStatus === "opened"
              ? "in_progress"
              : rawStatus === "cancelled" || rawStatus === "canceled"
                ? "cancelled"
                : "scheduled";
      const executionLabel =
        executionStatus === "done"
          ? "הושלם"
          : executionStatus === "failed"
            ? "נכשל"
            : executionStatus === "in_progress"
              ? "מתבצע"
              : executionStatus === "cancelled"
                ? "בוטל"
                : "מתוזמן";
      const runId = String(scheduleRound?.runId || "").trim();
      // Prefer current run only. Legacy attempts (no runId) count only when
      // the schedule itself has no runId — never mix another run's dials in.
      const roundAttempts = attempts.filter((a) => {
        if (Number(a.round) !== round) return false;
        const attemptRunId = String((a as { runId?: string }).runId || "");
        if (runId) return attemptRunId === runId;
        return !attemptRunId;
      });
      const eligibleNow = filterGuestsForIvrRound({
        guests,
        round: round as 1 | 2 | 3,
      });

      const confirmed = roundAttempts.filter((a) => a.rsvpResult === "yes").length;
      const declined = roundAttempts.filter((a) => a.rsvpResult === "no").length;
      const undecided = roundAttempts.filter((a) => a.rsvpResult === "maybe").length;
      const answered = roundAttempts.filter((a) => a.answered).length;
      const noAnswer = roundAttempts.filter((a) =>
        ["no_answer", "busy", "voicemail"].includes(String(a.status))
      ).length;
      const failedAttempts = roundAttempts.filter((a) =>
        ["failed", "canceled"].includes(String(a.status))
      );
      const failed = failedAttempts.length;
      const storedError = String(
        (failedAttempts.find((a) => String((a as { error?: string }).error || "").trim()) as
          | { error?: string }
          | undefined)?.error ||
          scheduleRound?.failureReason ||
          ""
      );
      const hangup = roundAttempts.filter(
        (a) => a.status === "hangup_before_response"
      ).length;
      const completed = roundAttempts.filter((a) => a.status === "completed").length;
      const pending = roundAttempts.filter((a) =>
        ["queued", "initiated", "ringing", "answered"].includes(String(a.status))
      ).length;

      return {
        round,
        executionStatus,
        executionLabel,
        failureReason:
          executionStatus === "failed" ? explainIvrCallFailure(storedError) : "",
        scheduledAtDisplay: formatCallRoundDateTimeDmy(scheduleRound?.scheduledAt),
        toDial: eligibleNow.length,
        attempted: roundAttempts.length,
        answered,
        confirmed,
        declined,
        undecided,
        noAnswer,
        failed,
        hangupBeforeResponse: hangup,
        completed,
        pending,
      };
    });

    return NextResponse.json({
      ok: true,
      invitationId: String(invitation._id),
      rounds,
    });
  } catch (error) {
    console.error("[ivr/rounds/stats]", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "FAILED" },
      { status: 500 }
    );
  }
}
