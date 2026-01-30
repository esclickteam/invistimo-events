import { NextResponse } from "next/server";
import db from "@/lib/db";
import Invitation from "@/models/Invitation";
import Event from "@/models/Event";
import User from "@/models/User";
import { nanoid } from "nanoid";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

export const dynamic = "force-dynamic";

/* ============================================================
   POST — יצירת הזמנה
   ✅ אם אין eventId, נזהה אירוע קיים או ניצור חדש אוטומטית
============================================================ */
export async function POST(req: Request) {
  try {
    await db();

    /* ===============================
       🔐 אימות משתמש
    =============================== */
    const auth = await getUserIdFromRequest();
    if (!auth?.userId) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }
    const userId = auth.userId;

    /* ===============================
       🧠 טעינת משתמש
    =============================== */
    const user = await User.findById(userId)
      .select("email createdByProducer")
      .lean();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "USER_NOT_FOUND" },
        { status: 404 }
      );
    }

    // ✅ כאן התיקון: producerId נקבע לפי המצב העסקי
    // - אם היוצר הוא מפיק → הוא ה-producerId
    // - אם זה לקוח שנוצר ע"י מפיק → producerId = user.createdByProducer
    // - אחרת → null
    const producerId =
      auth.role === "producer" ? userId : user.createdByProducer || null;

    /* ===============================
       📦 גוף הבקשה
    =============================== */
    const body = await req.json().catch(() => ({} as any));
    const { eventId, canvasData, previewImage } = body;

    /* ===============================
       🎯 נזהה או ניצור Event
    =============================== */
    let event: any = null;

    if (eventId) {
      event = await Event.findOne({ _id: eventId, userId }).lean();
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

        event = createdEvent.toObject();
        console.log("✅ נוצר אירוע חדש אוטומטית:", createdEvent._id);
      }
    }

    if (!event) {
      return NextResponse.json(
        { success: false, error: "EVENT_NOT_FOUND" },
        { status: 404 }
      );
    }

    /* ===============================
       🔒 בדיקה אם כבר קיימת הזמנה לאירוע הזה
       ✅ גם אם ההזמנה משויכת למפיק (producerId)
    =============================== */
    const existing = await Invitation.findOne({
      eventId: event._id,
      ownerId: userId,
      ...(producerId ? { producerId } : {}),
    }).lean();

    if (existing) {
      return NextResponse.json(
        { success: true, invitation: existing, created: false },
        { status: 200 }
      );
    }

    /* ===============================
       🧮 חישוב מגבלות
    =============================== */
    const maxGuests = Number(event.maxGuests) || 100;
    const maxMessages = maxGuests * 3;
    const shareId = nanoid(10);

    /* ===============================
       🧾 יצירת הזמנה חדשה
    =============================== */
    const newInvite = await Invitation.create({
      ownerId: userId,
      producerId, // ✅ כאן התיקון

      eventId: event._id,

      // 📸 snapshot מה־Event
      title: event.title || "הזמנה חדשה",
      eventType: event.eventType || "",
      eventDate: event.date || null,
      eventTime: event.time || "",
      location: event.location || {},

      canvasData: canvasData || {},
      previewImage: previewImage || "",

      shareId,
      guests: [],

      maxGuests,
      maxMessages,
    });

    const cleanInvite = JSON.parse(JSON.stringify(newInvite));

    console.log("🔥 INVITATION CREATED:", {
      inviteId: cleanInvite._id,
      eventId: event._id,
      ownerId: userId,
      producerId: cleanInvite.producerId ?? null,
      role: auth.role,
      userCreatedByProducer: user.createdByProducer ?? null,
    });

    return NextResponse.json(
      { success: true, invitation: cleanInvite, created: true },
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

/* ============================================================
   GET — קבלת הזמנה לפי eventId
============================================================ */
export async function GET(req: Request) {
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

    // ✅ מביאים createdByProducer כדי לאפשר ללקוח שנוצר ע"י מפיק לראות/לגשת
    const user = await User.findById(userId)
      .select("createdByProducer")
      .lean();

    const createdByProducerId = user?.createdByProducer || null;

    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get("eventId");

    if (!eventId) {
      return NextResponse.json(
        { success: false, error: "EVENT_ID_REQUIRED" },
        { status: 400 }
      );
    }

    // ✅ מחזירים אם המשתמש הוא owner
    // או אם הוא המפיק עצמו
    // או אם הוא לקוח שנוצר ע"י מפיק וההזמנה משויכת לאותו מפיק
    const invitation = await Invitation.findOne({
      eventId,
      $or: [
        { ownerId: userId },
        { producerId: userId },
        ...(createdByProducerId ? [{ producerId: createdByProducerId }] : []),
      ],
    }).lean();

    if (!invitation) {
      return NextResponse.json(
        { success: false, error: "INVITATION_NOT_FOUND" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, invitation }, { status: 200 });
  } catch (err) {
    console.error("❌ Error fetching invitation:", err);
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
