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
      .select(`
        _id
        eventId
        maxGuests
        maxMessages
        remainingMessages
        shareId
      `)
      .lean();

    if (!invitation) {
      return NextResponse.json(
        { success: false, error: "NO_INVITATION" },
        { status: 404 }
      );
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
   ✅ אם אין eventId בבקשה — נוצרת הזמנה על בסיס האירוע הקיים,
      ואם אין אירוע — נוצר אירוע חדש אוטומטית
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

    // 🧠 שליפת המשתמש
    const user = await User.findById(auth.userId).lean();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "USER_NOT_FOUND" },
        { status: 404 }
      );
    }

    // 📦 פרטי הבקשה
    const body = await req.json().catch(() => ({} as any));
    let { eventId } = body;

    // 🔍 אם לא נשלח eventId — נמצא או ניצור אירוע למשתמש
    let event = null;
    if (eventId) {
      event = await Event.findOne({ _id: eventId, userId: auth.userId });
    } else {
      event = await Event.findOne({ userId: auth.userId });
      if (!event) {
        event = await Event.create({
          userId: auth.userId,
          title: "אירוע חדש",
          eventType: "wedding",
          status: "draft",
          date: null,
          time: null,
          paymentStatus: "paid",
          maxGuests: 100,
          location: {},
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        console.log("✅ נוצר אירוע חדש אוטומטית:", event._id);
      }
    }

    if (!event) {
      return NextResponse.json(
        { success: false, error: "EVENT_NOT_FOUND" },
        { status: 404 }
      );
    }

    // אם כבר קיימת הזמנה לאירוע הזה — נחזיר אותה
    const existing = await Invitation.findOne({
      ownerId: auth.userId,
      eventId: event._id,
    }).lean();

    if (existing) {
      return NextResponse.json({
        success: true,
        invitation: existing,
      });
    }

    // 🧮 הגדרות ברירת מחדל
    const maxGuests = Number(user.guests) || 100;
    const maxMessages = Number(user.maxMessages) || 300;

    // 🧾 יצירת הזמנה חדשה
    const created = await Invitation.create({
      ownerId: auth.userId,
      eventId: event._id,
      guests: [],
      maxGuests,
      maxMessages,
      remainingMessages: maxMessages,
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
