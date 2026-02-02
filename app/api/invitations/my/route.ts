import { NextResponse } from "next/server";
import db from "@/lib/db";
import Invitation from "@/models/Invitation";
import User from "@/models/User";
import Event from "@/models/Event";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

export const dynamic = "force-dynamic";

/* ============================================================
   GET — מחזיר את ההזמנה של המשתמש (אם קיימת)
   ✅ תומך גם בלקוח שנוצר ע״י מפיק (createdByProducer)
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

    // ✅ מביאים את המפיק שיצר את הלקוח (אם קיים)
    const user = await User.findById(userId)
      .select("createdByProducer")
      .lean();

    const createdByProducerId = user?.createdByProducer || null;

    const invitation = await Invitation.findOne({
  eventId: { $ne: null }, // ✅ קריטי
  $or: [
    { ownerId: userId },
    ...(createdByProducerId ? [{ producerId: createdByProducerId }] : []),
  ],
})
  .sort({ updatedAt: -1 }) // ✅ קריטי
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
      ? await Event.findById(invitation.eventId).select("location").lean()
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
   POST — יצירת הזמנה חדשה
   ✅ אם אין eventId בבקשה:
      1) מחפש אירוע קיים למשתמש
      2) אם אין — יוצר אירוע חדש אוטומטית
   ✅ לקוח שנוצר ע״י מפיק → producerId נלקח מ-User.createdByProducer
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

    // ✅ שליפת המשתמש + מי יצר אותו (אם רלוונטי)
    const user = await User.findById(userId)
      .select("email guests maxMessages createdByProducer role")
      .lean();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "USER_NOT_FOUND" },
        { status: 404 }
      );
    }

    // ✅ producerId נקבע כך:
    // - אם מחובר כמפיק אמיתי → הוא המפיק
    // - אחרת (לקוח) → אם נוצר ע"י מפיק → המפיק נמצא ב-createdByProducer
    const producerId =
      auth.role === "producer" ? userId : user.createdByProducer || null;

    const body = await req.json().catch(() => ({} as any));
    let { eventId } = body;

    /* ===============================
       🎯 מציאת/יצירת Event
    =============================== */
    let event: any = null;

    if (eventId) {
      event = await Event.findOne({ _id: eventId, userId }).lean();
      if (!event) {
        return NextResponse.json(
          { success: false, error: "EVENT_NOT_FOUND" },
          { status: 404 }
        );
      }
    } else {
      event = await Event.findOne({ userId }).lean();

      if (!event) {
        const createdEvent = await Event.create({
          userId,
          email: user.email || "noemail@placeholder.com",
          title: "אירוע חדש",
          eventType: "wedding",
          status: "active",
          date: new Date(),
          time: "00:00",
          maxGuests: 100,
          location: {},
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        event = createdEvent;
        console.log("✅ נוצר אירוע חדש אוטומטית:", createdEvent._id);
      }
    }

    /* ===============================
       אם כבר קיימת הזמנה → נחזיר אותה
       ✅ גם לפי producerId אם יש
    =============================== */
    let invitation = await Invitation.findOne({
      eventId: event._id,
      $or: [
        { ownerId: userId },
        ...(producerId ? [{ producerId }] : []),
      ],
    }).lean();

    /* ===============================
       אם אין הזמנה קיימת, ניצור חדשה
    =============================== */
    if (!invitation) {
      invitation = await Invitation.create({
        ownerId: userId,
        producerId, // ✅ כאן התיקון

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
