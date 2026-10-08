import { NextRequest, NextResponse } from "next/server";
import Invitation from "@/models/Invitation";
import IvrCallAttempt from "@/models/IvrCallAttempt";
import { isIvrCallsUser } from "@/lib/calls/callsType";
import {
  requireIvrSession,
  resolveIvrTargetUser,
} from "@/lib/calls/ivrRequestAuth";

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
    const guestId = String(url.searchParams.get("guestId") || "").trim();
    const round = Number(url.searchParams.get("round") || 0);

    const target = await resolveIvrTargetUser({
      sessionUser: session.user,
      isAdmin: session.isAdmin,
      requestedUserId: url.searchParams.get("userId"),
    });
    if (!target || (!isIvrCallsUser(target) && !session.isAdmin)) {
      return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
    }

    const invitation = await Invitation.findOne({ ownerId: target._id })
      .select("_id")
      .sort({ eventDate: 1, createdAt: -1 })
      .lean();

    if (!invitation) {
      return NextResponse.json({ ok: true, attempts: [] });
    }

    const query: Record<string, unknown> = {
      invitationId: invitation._id,
    };
    if (guestId) query.guestId = guestId;
    if (round === 1 || round === 2 || round === 3) query.round = round;

    const attempts = await IvrCallAttempt.find(query)
      .sort({ createdAt: -1 })
      .limit(500)
      .lean();

    return NextResponse.json({
      ok: true,
      attempts: attempts.map((a) => ({
        id: String(a._id),
        guestId: String(a.guestId),
        round: a.round,
        phone: a.phone,
        status: a.status,
        answered: Boolean(a.answered),
        dtmfDigits: a.dtmfDigits || [],
        choiceDigit: a.choiceDigit || "",
        guestCountDigits: a.guestCountDigits || "",
        rsvpResult: a.rsvpResult || null,
        attendingCount:
          typeof a.attendingCount === "number" ? a.attendingCount : null,
        durationSeconds: a.durationSeconds || 0,
        startedAt: a.startedAt || null,
        answeredAt: a.answeredAt || null,
        endedAt: a.endedAt || null,
        error: a.error || "",
        hangupCause: a.hangupCause || "",
      })),
    });
  } catch (error) {
    console.error("[ivr/history]", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "FAILED" },
      { status: 500 }
    );
  }
}
