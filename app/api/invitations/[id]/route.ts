import { NextResponse } from "next/server";
import db from "@/lib/db";
import Invitation from "@/models/Invitation";
import Event from "@/models/Event";
import User from "@/models/User";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import "@/models/InvitationGuest";

export const dynamic = "force-dynamic";

/* ============================================================
   💾 POST — יצירת הזמנה חדשה
   ✅ אם אין אירוע קיים למשתמש, ייווצר אירוע חדש אוטומטית
   ✅ עומד בולידציות של Event: email/date required, status enum
============================================================ */
export async function POST(req: Request) {
  try {
    await db();

    // 🔐 אימות משתמש
    const auth = await getUserIdFromRequest();
    if (!auth?.userId) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const userId = auth.userId;

    // 🧠 טעינת משתמש (כדי לקחת email לאירוע חדש)
    const user = await User.findById(userId).lean();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "USER_NOT_FOUND" },
        { status: 404 }
      );
    }

    const body = await req.json().catch(() => ({} as any));
    const {
      eventId,
      title,
      eventType,
      eventDate,
      eventTime,
      location,
      canvasData,
    } = body;

    /* ===============================
       🎯 מציאת Event שייך למשתמש
       - אם נשלח eventId: חייב להיות שייך ליוזר
       - אם לא נשלח: נחפש הראשון של היוזר
       - אם אין בכלל: ניצור חדש אוטומטית (חוקי לסכמה)
    =============================== */
    let userEvent: any = null;

    if (eventId) {
      userEvent = await Event.findOne({ _id: eventId, userId });
    } else {
      userEvent = await Event.findOne({ userId });
    }

    if (!userEvent) {
      userEvent = await Event.create({
        userId,
        email: user.email || "noemail@placeholder.com", // ✅ required
        title: typeof title === "string" && title.trim() ? title.trim() : "אירוע חדש",
        eventType:
          typeof eventType === "string" && eventType.trim()
            ? eventType.trim()
            : "wedding",

        // ✅ required לפי הסכמה שלך
        date: eventDate ? new Date(eventDate) : new Date(),

        time: typeof eventTime === "string" && eventTime.trim() ? eventTime.trim() : "00:00",

        // ✅ enum חוקי אצלך
        status: "active",

        // אם השדה קיים אצלך בסכמה זה ישמר, ואם strict והוא לא קיים — הוא פשוט ייזרק
        paymentStatus: "paid",

        maxGuests: 100,
        location: location || {},

        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    /* ===============================
       🧾 יצירת הזמנה חדשה
       (אם תרצי: אפשר להחזיר קיימת במקום ליצור כפילות)
    =============================== */
    const invitation = await Invitation.create({
      eventId: userEvent._id,
      ownerId: userId,

      title:
        typeof title === "string" && title.trim()
          ? title.trim()
          : "ההזמנה שלי 🎉",

      eventType:
        typeof eventType === "string" && eventType.trim()
          ? eventType.trim()
          : userEvent.eventType || "wedding",

      eventDate: eventDate ? new Date(eventDate) : userEvent.date || null,
      eventTime:
        typeof eventTime === "string" && eventTime.trim()
          ? eventTime.trim()
          : userEvent.time || "",

      location: location || userEvent.location || {},
      canvasData: canvasData || null,

      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      invitation: JSON.parse(JSON.stringify(invitation)),
    });
  } catch (err) {
    console.error("❌ Error in POST /api/invitations:", err);
    return NextResponse.json(
      { success: false, error: "Server error while creating invitation" },
      { status: 500 }
    );
  }
}

/* ============================================================
   ✏️ PUT — עדכון הזמנה קיימת
============================================================ */
export async function PUT(req: Request, context: any) {
  try {
    await db();

    const params = await context.params;
    const id = params?.id;

    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { success: false, error: "Invalid invitation id" },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => ({} as any));
    const { title, eventType, eventDate, eventTime, canvasData, location } = body;

    const updatePayload: any = { updatedAt: new Date() };

    if (typeof title === "string" && title.trim()) updatePayload.title = title.trim();
    if (typeof eventType === "string" && eventType.trim())
      updatePayload.eventType = eventType.trim();

    if (eventDate) updatePayload.eventDate = new Date(eventDate);

    if (typeof eventTime === "string" && eventTime.trim())
      updatePayload.eventTime = eventTime.trim();

    if (canvasData !== undefined) updatePayload.canvasData = canvasData;

    if (
      location &&
      ((typeof location.address === "string" && location.address.trim()) ||
        location.lat !== undefined ||
        location.lng !== undefined)
    ) {
      updatePayload.location = {
        name: typeof location.name === "string" ? location.name.trim() : "",
        address: typeof location.address === "string" ? location.address.trim() : "",
        lat: typeof location.lat === "number" ? location.lat : null,
        lng: typeof location.lng === "number" ? location.lng : null,
      };
    }

    const updated = await Invitation.findByIdAndUpdate(
      id,
      { $set: updatePayload },
      { new: true }
    ).populate("guests");

    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Invitation not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      invitation: JSON.parse(JSON.stringify(updated)),
    });
  } catch (err) {
    console.error("❌ Error in PUT /api/invitations/[id]:", err);
    return NextResponse.json(
      { success: false, error: "Server error while updating" },
      { status: 500 }
    );
  }
}
