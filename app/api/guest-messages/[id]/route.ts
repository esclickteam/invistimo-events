import { NextRequest, NextResponse } from "next/server";

import db from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import { canManageInvitation } from "@/lib/canManageInvitation";
import Invitation from "@/models/Invitation";
import GuestWeddingMessage from "@/models/GuestWeddingMessage";
import User from "@/models/User";
import { hasGuestMessagesFeature } from "@/lib/features/entitlements";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await db();

    const auth = await getUserIdFromRequest(req);
    if (!auth?.userId) {
      return NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 401 });
    }

    const { id } = await context.params;
    const message = await GuestWeddingMessage.findById(id);
    if (!message) {
      return NextResponse.json({ success: false, error: "NOT_FOUND" }, { status: 404 });
    }

    const invitation = await Invitation.findById(message.invitationId).lean();
    if (!invitation || !canManageInvitation(auth, invitation)) {
      return NextResponse.json({ success: false, error: "FORBIDDEN" }, { status: 403 });
    }

    const owner = invitation.ownerId
      ? await User.findById(invitation.ownerId)
          .select("features rsvpSiteMode guestExperienceType")
          .lean()
      : null;

    if (!hasGuestMessagesFeature(owner)) {
      return NextResponse.json({ success: false, error: "FORBIDDEN" }, { status: 403 });
    }

    const now = new Date();
    message.status = "read";
    message.readAt = message.readAt || now;
    await message.save();

    return NextResponse.json({
      success: true,
      id: String(message._id),
      status: message.status,
      readAt: message.readAt,
    });
  } catch (error) {
    console.error("GUEST MESSAGE PATCH FAILED:", error);
    return NextResponse.json({ success: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}
