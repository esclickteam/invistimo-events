import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Event from "@/models/Event";
import User from "@/models/User";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

export const dynamic = "force-dynamic";

/* =========================
   GET – שליפת אירוע
========================= */
export async function GET() {
  try {
    await connectDB();

    const auth = await getUserIdFromRequest();
    if (!auth?.userId) {
      return NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 401 });
    }

    const event = await Event.findOne({ userId: auth.userId }).lean();
    return NextResponse.json({ success: true, event: event || null });
  } catch (err) {
    console.error("❌ GET /api/events failed:", err);
    return NextResponse.json({ success: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}

/* =========================
   POST – יצירה או עדכון כולל (UPSERT)
========================= */
export async function POST(req: Request) {
  try {
    await connectDB();

    const auth = await getUserIdFromRequest();
    if (!auth?.userId) {
      return NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 401 });
    }

    const user = await User.findById(auth.userId).lean();
    if (!user) {
      return NextResponse.json({ success: false, error: "USER_NOT_FOUND" }, { status: 404 });
    }

    const body = await req.json();

    const payload: any = {
      title: body.title?.trim() || "",
      eventType: body.eventType || "wedding",
      date: body.date || "",
      time: body.time || "",
      location: body.location
        ? {
            address: body.location.address || "",
            lat: typeof body.location.lat === "number" ? body.location.lat : null,
            lng: typeof body.location.lng === "number" ? body.location.lng : null,
          }
        : { address: "", lat: null, lng: null },
    };

    // אם יש budgetTotal במשלוח – נוסיף ל payload
    if (typeof body.budgetTotal === "number") {
      payload.budgetTotal = body.budgetTotal;
    }

    let event = await Event.findOne({ userId: auth.userId });

    if (!event) {
      event = await Event.create({
        userId: auth.userId,
        email: user.email,
        maxGuests: user.guests || 100,
        status: "active",
        ...payload,
      });
    } else {
      event.set(payload);
      await event.save();
    }

    return NextResponse.json({ success: true, event });
  } catch (err) {
    console.error("❌ POST /api/events failed:", err);
    return NextResponse.json({ success: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}

/* =========================
   PATCH – עדכון שדות ספציפיים (תקציב)
========================= */
export async function PATCH(req: Request) {
  try {
    await connectDB();

    const auth = await getUserIdFromRequest();
    if (!auth?.userId) {
      return NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 401 });
    }

    const body = await req.json();
    const { budgetTotal } = body;

    const event = await Event.findOne({ userId: auth.userId });
    if (!event) {
      return NextResponse.json({ success: false, error: "NOT_FOUND" }, { status: 404 });
    }

    if (typeof budgetTotal === "number") {
      event.budgetTotal = budgetTotal;
      await event.save();
    }

    return NextResponse.json({ success: true, event });
  } catch (err) {
    console.error("❌ PATCH /api/events failed:", err);
    return NextResponse.json({ success: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}
