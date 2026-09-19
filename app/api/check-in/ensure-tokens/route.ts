import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import dbConnect from "@/lib/db";
import Event from "@/models/Event";
import InvitationGuest from "@/models/InvitationGuest";
import User from "@/models/User";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import { authHasCheckInPermission } from "@/lib/checkIn/permissions";
import { ensureGuestCheckInToken } from "@/lib/checkIn/applyCheckIn";
import { findCheckInInvitation } from "@/lib/checkIn/findCheckInInvitation";
import { generateCheckInToken } from "@/lib/checkIn/token";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Ensure every guest has a checkInToken when feature is on. */
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
    const invitationId = body.invitationId
      ? String(body.invitationId)
      : null;
    const invitation = await findCheckInInvitation(auth, invitationId);
    if (!invitation) {
      return NextResponse.json(
        { success: false, error: "NO_INVITATION" },
        { status: 404 }
      );
    }

    const eventId = invitation.eventId ? String(invitation.eventId) : "";
    if (!eventId || !mongoose.Types.ObjectId.isValid(eventId)) {
      return NextResponse.json(
        { success: false, error: "NO_EVENT" },
        { status: 400 }
      );
    }

    const event = await Event.findById(eventId).select("checkInEnabled");
    if (!event?.checkInEnabled) {
      return NextResponse.json(
        { success: false, error: "CHECKIN_DISABLED" },
        { status: 403 }
      );
    }

    const guests = await InvitationGuest.find({
      invitationId: invitation._id,
      $or: [{ checkInToken: null }, { checkInToken: { $exists: false } }, { checkInToken: "" }],
    }).select("_id");

    let created = 0;
    for (const g of guests) {
      await InvitationGuest.updateOne(
        { _id: g._id, $or: [{ checkInToken: null }, { checkInToken: { $exists: false } }, { checkInToken: "" }] },
        { $set: { checkInToken: generateCheckInToken() } }
      );
      created += 1;
    }

    // Also ensure any guest missing token via helper when specifically requested
    if (body.guestId && mongoose.Types.ObjectId.isValid(String(body.guestId))) {
      const guest = await InvitationGuest.findOne({
        _id: body.guestId,
        invitationId: invitation._id,
      });
      if (guest) {
        await ensureGuestCheckInToken(guest);
      }
    }

    return NextResponse.json({
      success: true,
      tokensCreated: created,
    });
  } catch (err) {
    console.error("❌ POST check-in/ensure-tokens:", err);
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
