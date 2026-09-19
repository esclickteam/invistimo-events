import { NextRequest, NextResponse } from "next/server";

import dbConnect from "@/lib/db";
import Event from "@/models/Event";
import User from "@/models/User";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import { authHasCheckInPermission } from "@/lib/checkIn/permissions";
import { findCheckInInvitation } from "@/lib/checkIn/findCheckInInvitation";
import { loadEventCheckInGate } from "@/lib/checkIn/eventGate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    await dbConnect();

    const auth = await getUserIdFromRequest(req);
    if (!auth?.userId) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const user = await User.findById(auth.userId)
      .select("role staffType accessModules permissions features planLimits")
      .lean();

    if (!authHasCheckInPermission(auth, user as any, "checkin.manage")) {
      return NextResponse.json(
        { success: false, error: "FORBIDDEN" },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const invitationId = body.invitationId ? String(body.invitationId) : null;
    const requestedEventId = body.eventId ? String(body.eventId) : null;
    const live = body.live === true;

    const invitation = await findCheckInInvitation(
      auth,
      invitationId,
      requestedEventId
    );
    if (!invitation?.eventId) {
      return NextResponse.json(
        { success: false, error: "NO_INVITATION" },
        { status: 404 }
      );
    }

    const eventId = String(invitation.eventId);
    const gate = await loadEventCheckInGate(eventId);
    if (!gate.checkInEnabled) {
      return NextResponse.json(
        { success: false, error: "CHECKIN_DISABLED" },
        { status: 403 }
      );
    }

    await Event.updateOne(
      { _id: invitation.eventId },
      { $set: { liveStatus: live ? "LIVE" : "REGULAR" } }
    );

    return NextResponse.json({
      success: true,
      eventId,
      live,
      liveStatus: live ? "LIVE" : "REGULAR",
    });
  } catch (err) {
    console.error("❌ POST check-in/live:", err);
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
