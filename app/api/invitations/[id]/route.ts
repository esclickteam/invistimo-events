import { NextResponse } from "next/server";
import db from "@/lib/db";
import Invitation from "@/models/Invitation";
import Event from "@/models/Event";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import "@/models/InvitationGuest";

export const dynamic = "force-dynamic";

/* ============================================================
   💾 POST — יצירת הזמנה חדשה
   אם אין אירוע קיים למשתמש, ייווצר אירוע חדש אוטומטית
============================================================ */
export async function POST(req: Request) {
  try {
    await db();

    // 🧩 אימות משתמש
    const auth = await getUserIdFromRequest();
    if (!auth?.userId) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const body = await req.json();
    let { eventId, title, eventType, eventDate, eventTime, location, canvasData } = body;

    // 🔍 נסה למצוא אירוע קיים למשתמש
    let userEvent = eventId
      ? await Event.findById(eventId)
      : await Event.findOne({ userId: auth.userId });

    // 🆕 אם אין אירוע קיים — צור אחד אוטומטית
    if (!userEvent) {
      userEvent = await Event.create({
        userId: auth.userId,
        title: title || "אירוע חדש",
        eventType: eventType || "wedding",
        date: eventDate || null,
        time: eventTime || null,
        status: "draft",
        paymentStatus: "paid",
        maxGuests: 100,
        location: location || {},
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    // ✨ צור הזמנה חדשה
    const invitation = await Invitation.create({
      eventId: userEvent._id,
      ownerId: auth.userId,
      title: title?.trim() || "ההזמנה שלי 🎉",
      eventType: eventType?.trim() || userEvent.eventType || "wedding",
      eventDate: eventDate || userEvent.date || null,
      eventTime: eventTime || userEvent.time || "",
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

    const body = await req.json();
    const { title, eventType, eventDate, eventTime, canvasData, location } = body;

    const updatePayload: any = { updatedAt: new Date() };

    if (title?.trim()) updatePayload.title = title.trim();
    if (eventType?.trim()) updatePayload.eventType = eventType.trim();
    if (eventDate) updatePayload.eventDate = eventDate;
    if (eventTime?.trim()) updatePayload.eventTime = eventTime.trim();
    if (canvasData !== undefined) updatePayload.canvasData = canvasData;

    if (
      location &&
      ((typeof location.address === "string" && location.address.trim()) ||
        location.lat !== undefined ||
        location.lng !== undefined)
    ) {
      updatePayload.location = {
        name: typeof location.name === "string" ? location.name.trim() : "",
        address:
          typeof location.address === "string" ? location.address.trim() : "",
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
