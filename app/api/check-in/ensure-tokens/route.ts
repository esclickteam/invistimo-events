import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import dbConnect from "@/lib/db";
import Event from "@/models/Event";
import InvitationGuest from "@/models/InvitationGuest";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import { isInvistimoAdmin } from "@/lib/checkIn/adminGate";
import { ensureGuestCheckInToken } from "@/lib/checkIn/applyCheckIn";
import { ensureCheckInTokensForInvitation } from "@/lib/checkIn/ensureEventTokens";
import { findCheckInInvitation } from "@/lib/checkIn/findCheckInInvitation";

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

    if (!isInvistimoAdmin(auth)) {
      return NextResponse.json(
        { success: false, error: "ADMIN_ONLY" },
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

    const created = await ensureCheckInTokensForInvitation(invitation._id);

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
