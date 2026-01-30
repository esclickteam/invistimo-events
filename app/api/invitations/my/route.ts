import { NextResponse } from "next/server";
import db from "@/lib/db";
import Invitation from "@/models/Invitation";
import User from "@/models/User";
import Event from "@/models/Event";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

export const dynamic = "force-dynamic";

/* ============================================================
   GET — מחזיר את ההזמנה של המשתמש (אם קיימת)
   ✅ תומך גם בלקוח שנוצר ע״י מפיק (impersonation)
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

    // ✅ אם המשתמש בתוך דשבורד לקוח דרך מפיק → נחפש גם לפי producerId
    const invitation = await Invitation.findOne({
      $or: [
        { ownerId: auth.userId },
        ...(auth.impersonatedBy ? [{ producerId: auth.impersonatedBy }] : []),
      ],
    })
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
   ✅ תומך גם בלקוח שנוצר ע״י מפיק (impersonation) וממלא producerId
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

    // ✅ אם זה לקוח שנכנס דרך מפיק (impersonation) — זה המפיק בפועל
    const producerId =
      auth.role === "producer" ? userId : auth.impersonatedBy || null;

    const user = await User.findById(userId).lean();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "USER_NOT_FOUND" },
        { status: 404 }
      );
    }

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
        producerId, // ✅ NEW

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
