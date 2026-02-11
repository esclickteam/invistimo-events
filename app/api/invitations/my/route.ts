import { NextResponse } from "next/server";
import db from "@/lib/db";
import Invitation from "@/models/Invitation";
import User from "@/models/User";
import Event from "@/models/Event";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

export const dynamic = "force-dynamic";

/* ============================================================
   GET — מחזיר את ההזמנה של המשתמש (אם קיימת)
============================================================ */
export async function GET(req: Request) {
  try {
    await db();

    // 🔐 Auth (כולל התחזות)
    const auth = await getUserIdFromRequest(req);
    if (!auth?.userId) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const userId = auth.userId;
    const role = auth.role;

    const user = await User.findById(userId)
      .select("createdByProducer role")
      .lean();

    const isProducer = role === "producer";

    /**
     * 🔑 לוגיקה נכונה למציאת הזמנה:
     * - לקוח        → ownerId = userId
     * - מפיק        → producerId = userId
     * - עובד / לקוח → producerId = createdByProducer
     */
    const invitation = await Invitation.findOne({
      eventId: { $ne: null },
      $or: [
        { ownerId: userId },
        ...(isProducer ? [{ producerId: userId }] : []),
        ...(!isProducer && user?.createdByProducer
          ? [{ producerId: user.createdByProducer }]
          : []),
      ],
    })
      .sort({ updatedAt: -1 })
      .select(`
        _id
        eventId
        maxGuests
        maxMessages
        remainingMessages
        shareId
        producerId
        ownerId
      `)
      .lean();

    if (!invitation) {
      return NextResponse.json({
        success: true,
        invitation: null,
      });
    }

    const event = invitation.eventId
      ? await Event.findById(invitation.eventId)
          .select("location")
          .lean()
      : null;

    return NextResponse.json({
      success: true,
      invitation: {
        ...invitation,
        eventLocation: event?.location || null,
      },
    });
  } catch (err) {
    console.error("❌ Error loading my invitation:", err);
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}

/* ============================================================
   POST — יצירת הזמנה
============================================================ */
export async function POST(req: Request) {
  try {
    await db();

    const auth = await getUserIdFromRequest(req);
    if (!auth?.userId) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const userId = auth.userId;

    const user = await User.findById(userId)
      .select("email guests maxMessages createdByProducer role")
      .lean();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "USER_NOT_FOUND" },
        { status: 404 }
      );
    }

    const body = await req.json().catch(() => ({} as any));
    const { eventId } = body;

    if (!eventId) {
      return NextResponse.json(
        { success: false, error: "EVENT_ID_REQUIRED" },
        { status: 400 }
      );
    }

    const event = await Event.findOne({ _id: eventId, userId }).lean();
    if (!event) {
      return NextResponse.json(
        { success: false, error: "EVENT_NOT_FOUND" },
        { status: 404 }
      );
    }

    const producerId =
      auth.role === "producer" ? userId : user.createdByProducer || null;

    let invitation = await Invitation.findOne({
      eventId: event._id,
      $or: [
        { ownerId: userId },
        ...(producerId ? [{ producerId }] : []),
      ],
    }).lean();

    if (!invitation) {
      invitation = await Invitation.create({
        ownerId: userId,
        producerId,
        eventId: event._id,
        guests: [],
        maxGuests: Number(user.guests) || Number(event.maxGuests) || 100,
        maxMessages: Number(user.maxMessages) || 300,
        sentSmsCount: 0,
      });
    }

    return NextResponse.json(
      {
        success: true,
        invitation: {
          _id: invitation._id,
          eventId: invitation.eventId,
          maxGuests: invitation.maxGuests,
          maxMessages: invitation.maxMessages,
          remainingMessages: invitation.remainingMessages,
          shareId: invitation.shareId,
          producerId: (invitation as any).producerId ?? null,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("❌ Error creating invitation:", err);
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
