import { NextResponse } from "next/server";
import db from "@/lib/db";
import Invitation from "@/models/Invitation";
import User from "@/models/User";
import Event from "@/models/Event";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

export const dynamic = "force-dynamic";

/* ============================================================
   GET — מחזיר את ההזמנה של המשתמש (אם קיימת)
   ❗️ לעולם לא מחזיר 404
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

    const invitation = await Invitation.findOne({
      ownerId: auth.userId,
    })
      .select(
        "_id eventId maxGuests maxMessages remainingMessages shareId"
      )
      .lean();

    // ✅ אין הזמנה — לא שגיאה
    if (!invitation) {
      return NextResponse.json({
        success: true,
        invitation: null,
      });
    }

    return NextResponse.json({
      success: true,
      invitation,
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
   ✅ יוצר Event אוטומטית אם חסר
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

    /* ===============================
       משתמש
    =============================== */
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
       Event — מציאה / יצירה
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
        });

        event = createdEvent.toObject();
        console.log("✅ Event נוצר אוטומטית:", event._id);
      }
    }

    /* ===============================
       Invitation קיימת?
    =============================== */
    const existing = await Invitation.findOne({
      ownerId: userId,
      eventId: event._id,
    }).lean();

    if (existing) {
      return NextResponse.json({
        success: true,
        invitation: existing,
      });
    }

    /* ===============================
       יצירת Invitation
    =============================== */
    const maxGuests = Number(user.guests) || Number(event.maxGuests) || 100;
    const maxMessages = Number(user.maxMessages) || 300;

    const created = await Invitation.create({
      ownerId: userId,
      eventId: event._id,
      guests: [],
      maxGuests,
      maxMessages,
      sentSmsCount: 0,
    });

    return NextResponse.json(
      {
        success: true,
        invitation: {
          _id: created._id,
          eventId: created.eventId,
          maxGuests: created.maxGuests,
          maxMessages: created.maxMessages,
          remainingMessages: created.remainingMessages,
          shareId: created.shareId,
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
