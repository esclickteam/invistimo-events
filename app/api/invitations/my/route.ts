import { NextResponse } from "next/server";
import db from "@/lib/db";
import Invitation from "@/models/Invitation";
import User from "@/models/User";
import Event from "@/models/Event";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

export const dynamic = "force-dynamic";

/* ============================================================
   GET — מחזיר את ההזמנה של המשתמש (אם קיימת)
   ❌ לא יוצר אירוע
   ❌ לא יוצר הזמנה
   ❌ לא מבצע redirect
============================================================ */
export async function GET() {
  try {
    await db();

    const auth = await getUserIdFromRequest();
    if (!auth?.userId) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const userId = auth.userId;

    const user = await User.findById(userId)
      .select("createdByProducer")
      .lean();

    const createdByProducerId = user?.createdByProducer || null;

    const invitation = await Invitation.findOne({
      eventId: { $ne: null },
      $or: [
        { ownerId: userId },
        ...(createdByProducerId ? [{ producerId: createdByProducerId }] : []),
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
   ✅ דורש eventId מפורש
   ❌ לא יוצר Event אוטומטית
============================================================ */
export async function POST(req: Request) {
  try {
    await db();

    const auth = await getUserIdFromRequest();
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

    // ⛔ חובה eventId מפורש
    if (!eventId) {
      return NextResponse.json(
        { success: false, error: "EVENT_ID_REQUIRED" },
        { status: 400 }
      );
    }

    // ✅ בדיקת אירוע קיים בלבד
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

    // ✅ יצירת הזמנה רק אם יש eventId ואין הזמנה קיימת
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
