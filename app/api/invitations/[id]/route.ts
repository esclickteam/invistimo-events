import { NextResponse } from "next/server";
import db from "@/lib/db";
import Invitation from "@/models/Invitation";
import Event from "@/models/Event"; // ✅ נוסיף כדי למצוא את האירוע של המשתמש
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest"; // ✅ לאמת משתמש

// ✅ חשוב: טוען את מודל האורחים לפני ההזמנה
import "@/models/InvitationGuest";

export const dynamic = "force-dynamic";

/* ============================================================
   📥 GET — שליפת הזמנה לפי מזהה
============================================================ */
export async function GET(req: Request, context: any) {
  try {
    await db();

    const params = await context.params;
    const id = params?.id;

    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { error: "Invalid invitation id" },
        { status: 400 }
      );
    }

    const invitation = await Invitation.findById(id).populate("guests");

    if (!invitation) {
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        invitation: JSON.parse(JSON.stringify(invitation)),
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("❌ Error in GET /api/invitations/[id]:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/* ============================================================
   💾 POST — יצירת הזמנה חדשה
   אם לא נשלח eventId — נזהה את האירוע לפי המשתמש המחובר
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

    const body = await req.json();
    let { eventId, title, eventType, eventDate, eventTime, location } = body;

    // 🔍 אם אין eventId, נזהה את האירוע של המשתמש
    if (!eventId) {
      const userEvent = await Event.findOne({ userId: auth.userId });
      if (!userEvent) {
        return NextResponse.json(
          { success: false, error: "EVENT_ID_REQUIRED" },
          { status: 400 }
        );
      }
      eventId = userEvent._id;
    }

    // ✨ יצירת ההזמנה החדשה
    const invitation = await Invitation.create({
      eventId,
      ownerId: auth.userId,
      title: title?.trim() || "",
      eventType: eventType?.trim() || "",
      eventDate: eventDate || null,
      eventTime: eventTime?.trim() || "",
      location: location || {},
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

    const body = await req.json();
    const {
      title,
      eventType,
      eventDate,
      eventTime,
      canvasData,
      location,
    } = body;

    const updatePayload: any = { updatedAt: new Date() };

    if (typeof title === "string" && title.trim()) {
      updatePayload.title = title.trim();
    }

    if (typeof eventType === "string" && eventType.trim()) {
      updatePayload.eventType = eventType.trim();
    }

    if (eventDate) {
      updatePayload.eventDate = eventDate;
    }

    if (typeof eventTime === "string" && eventTime.trim()) {
      updatePayload.eventTime = eventTime;
    }

    if (
      location &&
      ((typeof location.address === "string" && location.address.trim()) ||
        location.lat !== undefined ||
        location.lng !== undefined)
    ) {
      updatePayload.location = {
        name: typeof location.name === "string" ? location.name.trim() : "",
        address:
          typeof location.address === "string"
            ? location.address.trim()
            : "",
        lat: typeof location.lat === "number" ? location.lat : null,
        lng: typeof location.lng === "number" ? location.lng : null,
      };
    }

    if (canvasData !== undefined) {
      updatePayload.canvasData = canvasData;
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
