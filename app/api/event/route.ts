import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Event from "@/models/Event";
import { getUserIdFromRequest } from "@/lib/auth";

/* ============================================================
   GET – 가져오기 / שליפת אירוע של המשתמש
============================================================ */
export async function GET(req: Request) {
  try {
    await connectDB();

    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "לא מחובר" },
        { status: 401 }
      );
    }

    const event = await Event.findOne({ ownerId: userId });

    return NextResponse.json({
      success: true,
      event: event || null,
    });
  } catch (err) {
    console.error("GET /api/events/my error:", err);
    return NextResponse.json(
      { success: false, error: "שגיאת שרת" },
      { status: 500 }
    );
  }
}

/* ============================================================
   POST – יצירה / עדכון אירוע (upsert)
============================================================ */
export async function POST(req: Request) {
  try {
    await connectDB();

    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "לא מחובר" },
        { status: 401 }
      );
    }

    const body = await req.json();

    let event = await Event.findOne({ ownerId: userId });

    if (!event) {
      event = await Event.create({
        ownerId: userId,
        title: body.title || "",
        eventType: body.eventType || "",
        eventDate: body.eventDate || null,
        eventTime: body.eventTime || "",
        location: body.location || {},
        status: "draft",
      });
    } else {
      event.title = body.title ?? event.title;
      event.eventType = body.eventType ?? event.eventType;
      event.eventDate = body.eventDate ?? event.eventDate;
      event.eventTime = body.eventTime ?? event.eventTime;
      event.location = body.location ?? event.location;

      await event.save();
    }

    return NextResponse.json({
      success: true,
      event,
    });
  } catch (err) {
    console.error("POST /api/events/my error:", err);
    return NextResponse.json(
      { success: false, error: "שגיאת שרת" },
      { status: 500 }
    );
  }
}
