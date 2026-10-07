import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import User from "@/models/User";
import Invitation from "@/models/Invitation";
import IvrCallAttempt from "@/models/IvrCallAttempt";
import { isIvrCallsUser } from "@/lib/calls/callsType";

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
    const guestId = String(url.searchParams.get("guestId") || "").trim();
    const round = Number(url.searchParams.get("round") || 0);

    const targetUserId =
      String(user.role) === "admin" && url.searchParams.get("userId")
        ? String(url.searchParams.get("userId"))
        : String(user._id);

    const target = await User.findById(targetUserId).lean();
    if (!target || (!isIvrCallsUser(target) && String(user.role) !== "admin")) {
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
