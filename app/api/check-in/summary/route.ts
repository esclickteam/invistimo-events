import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import dbConnect from "@/lib/db";
import Event from "@/models/Event";
import InvitationGuest from "@/models/InvitationGuest";
import User from "@/models/User";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import { authHasCheckInPermission } from "@/lib/checkIn/permissions";
import { summarizeCheckIn } from "@/lib/checkIn/status";
import { findCheckInInvitation } from "@/lib/checkIn/findCheckInInvitation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
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

    if (!authHasCheckInPermission(auth, user as any, "checkin.view")) {
      return NextResponse.json(
        { success: false, error: "FORBIDDEN" },
        { status: 403 }
      );
    }

    const invitationId = req.nextUrl.searchParams.get("invitationId");
    const invitation = await findCheckInInvitation(auth, invitationId);
    if (!invitation) {
      return NextResponse.json(
        { success: false, error: "NO_INVITATION" },
        { status: 404 }
      );
    }

    const eventId = invitation.eventId ? String(invitation.eventId) : "";
    let checkInEnabled = false;
    if (eventId && mongoose.Types.ObjectId.isValid(eventId)) {
      const event = await Event.findById(eventId).select("checkInEnabled").lean();
      checkInEnabled = Boolean((event as any)?.checkInEnabled);
    }

    const guests = await InvitationGuest.find({ invitationId: invitation._id })
      .select("rsvp arrivedCount actualArrivedCount guestsCount")
      .lean();

    const summary = summarizeCheckIn(guests);

    return NextResponse.json({
      success: true,
      checkInEnabled,
      eventId,
      invitationId: String(invitation._id),
      summary,
    });
  } catch (err) {
    console.error("❌ GET check-in/summary:", err);
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
