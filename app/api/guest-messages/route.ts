import { NextRequest, NextResponse } from "next/server";

import db from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import { canManageInvitation } from "@/lib/canManageInvitation";
import Invitation from "@/models/Invitation";
import InvitationGuest from "@/models/InvitationGuest";
import User from "@/models/User";
import GuestWeddingMessage from "@/models/GuestWeddingMessage";
import { hasGuestMessagesFeature } from "@/lib/features/entitlements";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function findManagedInvitation(auth: any, invitationId?: string | null) {
  if (invitationId) {
    const invitation = await Invitation.findById(invitationId).lean();
    if (invitation && canManageInvitation(auth, invitation)) return invitation;
  }

  const invitation = await Invitation.findOne({ ownerId: auth.userId })
    .sort({ updatedAt: -1, createdAt: -1 })
    .lean();

  if (invitation && canManageInvitation(auth, invitation)) return invitation;
  return null;
}

export async function GET(req: NextRequest) {
  try {
    await db();

    const auth = await getUserIdFromRequest(req);
    if (!auth?.userId) {
      return NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 401 });
    }

    const invitationId = req.nextUrl.searchParams.get("invitationId");
    const invitation = await findManagedInvitation(auth, invitationId);
    const owner = invitation?.ownerId
      ? await User.findById(invitation.ownerId)
          .select("features rsvpSiteMode guestExperienceType")
          .lean()
      : await User.findById(auth.userId)
          .select("features rsvpSiteMode guestExperienceType")
          .lean();

    if (!hasGuestMessagesFeature(owner)) {
      return NextResponse.json({
        success: true,
        enabled: false,
        unreadCount: 0,
        items: [],
      });
    }

    if (!invitation) {
      return NextResponse.json({
        success: true,
        enabled: true,
        unreadCount: 0,
        items: [],
      });
    }

    const messages = await GuestWeddingMessage.find({
      invitationId: invitation._id,
    })
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    const guestIds = messages.map((item) => item.guestId).filter(Boolean);
    const guests = guestIds.length
      ? await InvitationGuest.find({ _id: { $in: guestIds } })
          .select("name phone")
          .lean()
      : [];
    const guestsById = new Map(guests.map((guest) => [String(guest._id), guest]));

    const items = messages.map((item) => {
      const guest = guestsById.get(String(item.guestId));
      return {
        id: String(item._id),
        message: item.message,
        createdAt: item.createdAt,
        readAt: item.readAt,
        status: item.status,
        guest: {
          id: String(item.guestId),
          name: guest?.name || "אורח",
        },
      };
    });

    return NextResponse.json({
      success: true,
      enabled: true,
      unreadCount: items.filter((item) => item.status !== "read").length,
      invitationId: String(invitation._id),
      items,
    });
  } catch (error) {
    console.error("GUEST MESSAGES GET FAILED:", error);
    return NextResponse.json({ success: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}
