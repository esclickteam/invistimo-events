import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import User from "@/models/User";
import Invitation from "@/models/Invitation";
import InvitationGuest from "@/models/InvitationGuest";
import IvrCallAttempt from "@/models/IvrCallAttempt";
import { isIvrCallsUser } from "@/lib/calls/callsType";
import { filterGuestsForIvrRound } from "@/lib/calls/ivrRoundEligibility";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
    }

    await connectDB();
    const user = await User.findById(userId).lean();
    if (!user) {
      return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
    }

    const url = new URL(req.url);
    const targetUserId =
      String(user.role) === "admin" && url.searchParams.get("userId")
        ? String(url.searchParams.get("userId"))
        : String(user._id);

    const target = await User.findById(targetUserId).lean();
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
    })
      .select("round status answered rsvpResult attendingCount")
      .lean();

    const rounds = [1, 2, 3].map((round) => {
      const roundAttempts = attempts.filter((a) => Number(a.round) === round);
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
      const failed = roundAttempts.filter((a) =>
        ["failed", "canceled"].includes(String(a.status))
      ).length;
      const hangup = roundAttempts.filter(
        (a) => a.status === "hangup_before_response"
      ).length;
      const completed = roundAttempts.filter((a) => a.status === "completed").length;
      const pending = roundAttempts.filter((a) =>
        ["queued", "initiated", "ringing", "answered"].includes(String(a.status))
      ).length;

      return {
        round,
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
