import { NextRequest, NextResponse } from "next/server";

import db from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import { canManageInvitation } from "@/lib/canManageInvitation";
import Invitation from "@/models/Invitation";
import InvitationGuest from "@/models/InvitationGuest";
import User from "@/models/User";
import GuestWeddingMessage from "@/models/GuestWeddingMessage";
import { hasGuestMessagesFeature } from "@/lib/features/entitlements";
import { emitWeddingInternalEvent } from "@/lib/weddingWebsite/events";
import { GUEST_MESSAGE_MAX_LENGTH, sanitizeGuestMessage } from "@/lib/weddingWebsite/guestMessage";

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
        sender: item.sender === "couple" ? "couple" : "guest",
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

    const threadsMap = new Map<
      string,
      {
        guestId: string;
        guestName: string;
        unreadCount: number;
        lastMessage: string;
        lastAt?: string | Date;
        messages: typeof items;
      }
    >();

    const chronological = [...items].sort(
      (a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
    );
    for (const item of chronological) {
      const existing = threadsMap.get(item.guest.id) || {
        guestId: item.guest.id,
        guestName: item.guest.name,
        unreadCount: 0,
        lastMessage: "",
        lastAt: item.createdAt,
        messages: [] as typeof items,
      };
      existing.messages.push(item);
      existing.lastMessage = item.message;
      existing.lastAt = item.createdAt;
      if (item.sender !== "couple" && item.status !== "read") existing.unreadCount += 1;
      existing.guestName = item.guest.name;
      threadsMap.set(item.guest.id, existing);
    }

    const threads = Array.from(threadsMap.values()).sort(
      (a, b) => new Date(b.lastAt || 0).getTime() - new Date(a.lastAt || 0).getTime()
    );

    return NextResponse.json({
      success: true,
      enabled: true,
      unreadCount: items.filter((item) => item.sender !== "couple" && item.status !== "read").length,
      invitationId: String(invitation._id),
      items,
      threads,
    });
  } catch (error) {
    console.error("GUEST MESSAGES GET FAILED:", error);
    return NextResponse.json({ success: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await db();
    const auth = await getUserIdFromRequest(req);
    if (!auth?.userId) {
      return NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const guestId = String(body?.guestId || "").trim();
    const message = sanitizeGuestMessage(body?.message);
    const invitationId = String(body?.invitationId || "").trim();

    if (!guestId) {
      return NextResponse.json({ success: false, error: "GUEST_REQUIRED" }, { status: 400 });
    }
    if (!message) {
      return NextResponse.json({ success: false, error: "MESSAGE_REQUIRED" }, { status: 400 });
    }
    if (message.length > GUEST_MESSAGE_MAX_LENGTH) {
      return NextResponse.json({ success: false, error: "MESSAGE_TOO_LONG" }, { status: 400 });
    }

    const invitation = await findManagedInvitation(auth, invitationId || null);
    if (!invitation) {
      return NextResponse.json({ success: false, error: "NOT_FOUND" }, { status: 404 });
    }

    const owner = invitation.ownerId
      ? await User.findById(invitation.ownerId)
          .select("features rsvpSiteMode guestExperienceType")
          .lean()
      : null;
    if (!hasGuestMessagesFeature(owner)) {
      return NextResponse.json({ success: false, error: "FORBIDDEN" }, { status: 403 });
    }

    const guest = await InvitationGuest.findOne({
      _id: guestId,
      invitationId: invitation._id,
    })
      .select("_id name")
      .lean();
    if (!guest) {
      return NextResponse.json({ success: false, error: "GUEST_NOT_FOUND" }, { status: 404 });
    }

    const created = await GuestWeddingMessage.create({
      eventId: invitation.eventId || null,
      invitationId: invitation._id,
      guestId: guest._id,
      weddingWebsiteId: invitation.shareId || "",
      sender: "couple",
      message,
      status: "read",
      readAt: new Date(),
    });

    await GuestWeddingMessage.updateMany(
      { invitationId: invitation._id, guestId: guest._id, sender: { $ne: "couple" }, status: "unread" },
      { $set: { status: "read", readAt: new Date() } }
    );

    emitWeddingInternalEvent({
      name: "wedding_guest_message_replied",
      invitationId: String(invitation._id),
      eventId: invitation.eventId ? String(invitation.eventId) : undefined,
      guestId: String(guest._id),
      shareId: invitation.shareId,
      messageId: String(created._id),
    });

    return NextResponse.json({
      success: true,
      item: {
        id: String(created._id),
        sender: "couple",
        message: created.message,
        createdAt: created.createdAt,
        status: created.status,
        guest: { id: String(guest._id), name: guest.name || "אורח" },
      },
    });
  } catch (error) {
    console.error("GUEST MESSAGE REPLY FAILED:", error);
    return NextResponse.json({ success: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}
