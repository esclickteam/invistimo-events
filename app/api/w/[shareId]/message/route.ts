import { NextRequest, NextResponse } from "next/server";

import db from "@/lib/db";
import Invitation from "@/models/Invitation";
import InvitationGuest from "@/models/InvitationGuest";
import User from "@/models/User";
import GuestWeddingMessage from "@/models/GuestWeddingMessage";
import { hasGuestMessagesFeature } from "@/lib/features/entitlements";
import { emitWeddingInternalEvent } from "@/lib/weddingWebsite/events";
import {
  buildGuestMessageRateLimitKey,
  checkGuestMessageRateLimit,
  GUEST_MESSAGE_MAX_LENGTH,
  sanitizeGuestMessage,
} from "@/lib/weddingWebsite/guestMessage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function serializeItem(item: any) {
  return {
    id: String(item._id),
    sender: item.sender === "couple" ? "couple" : "guest",
    message: item.message,
    createdAt: item.createdAt,
    status: item.status || "unread",
    readAt: item.readAt || null,
  };
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ shareId: string }> }
) {
  try {
    await db();
    const { shareId } = await context.params;
    const token = String(req.nextUrl.searchParams.get("token") || "").trim();
    if (!token) {
      return NextResponse.json({ success: false, error: "TOKEN_REQUIRED" }, { status: 401 });
    }

    const invitation = await Invitation.findOne({ shareId })
      .select("_id ownerId")
      .lean();
    if (!invitation) {
      return NextResponse.json({ success: false, error: "NOT_FOUND" }, { status: 404 });
    }

    const owner = invitation.ownerId
      ? await User.findById(invitation.ownerId)
          .select("features rsvpSiteMode guestExperienceType")
          .lean()
      : null;
    if (!hasGuestMessagesFeature(owner)) {
      return NextResponse.json({ success: false, error: "GUEST_MESSAGES_DISABLED" }, { status: 403 });
    }

    const guest = await InvitationGuest.findOne({
      invitationId: invitation._id,
      token,
    })
      .select("_id name")
      .lean();
    if (!guest) {
      return NextResponse.json({ success: false, error: "INVALID_TOKEN" }, { status: 401 });
    }

    const messages = await GuestWeddingMessage.find({
      invitationId: invitation._id,
      guestId: guest._id,
    })
      .sort({ createdAt: 1 })
      .limit(200)
      .lean();

    return NextResponse.json({
      success: true,
      guest: { id: String(guest._id), name: guest.name || "אורח" },
      items: messages.map(serializeItem),
    });
  } catch (error) {
    console.error("WEDDING GUEST THREAD GET FAILED:", error);
    return NextResponse.json({ success: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ shareId: string }> }
) {
  try {
    await db();

    const { shareId } = await context.params;
    const body = await req.json().catch(() => ({}));
    const token = String(body?.token || req.nextUrl.searchParams.get("token") || "").trim();
    const message = sanitizeGuestMessage(body?.message);

    if (!token) {
      return NextResponse.json(
        { success: false, error: "TOKEN_REQUIRED" },
        { status: 401 }
      );
    }

    if (!message) {
      return NextResponse.json(
        { success: false, error: "MESSAGE_REQUIRED" },
        { status: 400 }
      );
    }

    if (message.length > GUEST_MESSAGE_MAX_LENGTH) {
      return NextResponse.json(
        { success: false, error: "MESSAGE_TOO_LONG" },
        { status: 400 }
      );
    }

    const rate = checkGuestMessageRateLimit(
      buildGuestMessageRateLimitKey(req, token)
    );
    if (!rate.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: "RATE_LIMITED",
          retryAfterMs: rate.retryAfterMs,
        },
        { status: 429 }
      );
    }

    const invitation = await Invitation.findOne({ shareId })
      .select("_id ownerId eventId shareId")
      .lean();

    if (!invitation) {
      return NextResponse.json({ success: false, error: "NOT_FOUND" }, { status: 404 });
    }

    const owner = invitation.ownerId
      ? await User.findById(invitation.ownerId)
          .select("features rsvpSiteMode guestExperienceType")
          .lean()
      : null;

    if (!hasGuestMessagesFeature(owner)) {
      return NextResponse.json(
        { success: false, error: "GUEST_MESSAGES_DISABLED" },
        { status: 403 }
      );
    }

    const guest = await InvitationGuest.findOne({
      invitationId: invitation._id,
      token,
    })
      .select("_id")
      .lean();

    if (!guest) {
      return NextResponse.json(
        { success: false, error: "INVALID_TOKEN" },
        { status: 401 }
      );
    }

    const created = await GuestWeddingMessage.create({
      eventId: invitation.eventId || null,
      invitationId: invitation._id,
      guestId: guest._id,
      weddingWebsiteId: shareId,
      sender: "guest",
      message,
      status: "unread",
      readAt: null,
    });

    emitWeddingInternalEvent({
      name: "wedding_guest_message_received",
      invitationId: String(invitation._id),
      eventId: invitation.eventId ? String(invitation.eventId) : undefined,
      guestId: String(guest._id),
      shareId,
      messageId: String(created._id),
    });

    return NextResponse.json({
      success: true,
      messageId: String(created._id),
      item: {
        id: String(created._id),
        sender: "guest",
        message: created.message,
        createdAt: created.createdAt,
        status: created.status,
      },
    });
  } catch (error) {
    console.error("WEDDING GUEST MESSAGE FAILED:", error);
    return NextResponse.json({ success: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}
