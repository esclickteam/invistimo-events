import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Event from "@/models/Event";
import User from "@/models/User";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

export const dynamic = "force-dynamic";

/* =========================
   Helper – מפיק או עובד מפיק
========================= */
function getProducerId(auth: any) {
  if (auth.role === "producer") return auth.userId;
  if (auth.role === "user" && auth.staffType === "producer_staff") {
    return auth.assignedProducerId;
  }
  return null;
}

/* =========================
   GET – שליפת אירוע
========================= */
export async function GET() {
  try {
    await connectDB();

    const auth = await getUserIdFromRequest();
    if (!auth?.userId) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const producerId = getProducerId(auth);

    // 👤 לקוח – רואה רק את שלו
    if (!producerId) {
      const event = await Event.findOne({ userId: auth.userId }).lean();
      return NextResponse.json({ success: true, event: event || null });
    }

    // 🎩 מפיק / עובד מפיק – רואים לפי המפיק
    const event = await Event.findOne({ producerId }).lean();
    return NextResponse.json({ success: true, event: event || null });

  } catch (err) {
    console.error("❌ GET /api/events failed:", err);
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}

/* =========================
   POST – יצירה / עדכון
========================= */
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const auth = await getUserIdFromRequest();
    if (!auth?.userId) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const user = await User.findById(auth.userId).lean();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "USER_NOT_FOUND" },
        { status: 404 }
      );
    }

    const producerId = getProducerId(auth) ?? auth.userId;

    const body = await req.json();

    const payload: any = {
      title: body.title?.trim() || "",
      eventType: body.eventType || "wedding",
      date: body.date || "",
      time: body.time || "",
      producerId,
      location: body.location
        ? {
            address: body.location.address || "",
            lat: typeof body.location.lat === "number" ? body.location.lat : null,
            lng: typeof body.location.lng === "number" ? body.location.lng : null,
          }
        : { address: "", lat: null, lng: null },
    };

    if (typeof body.budgetTotal === "number") {
      payload.budgetTotal = body.budgetTotal;
    }

    let event = await Event.findOne({ producerId });

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
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
