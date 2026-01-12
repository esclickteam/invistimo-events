import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Event from "@/models/Event";
import User from "@/models/User";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

export const dynamic = "force-dynamic";

/* ============================================================
   🔁 מיפוי סוגי אירוע – עברית → enum באנגלית
============================================================ */
const EVENT_TYPE_MAP: Record<string, string> = {
  "חתונה": "wedding",
  "בר מצווה": "bar-mitzvah",
  "בת מצווה": "bat-mitzvah",
  "ברית": "brit",
  "בריתה": "brita",
  "חינה": "henna",
};

/* ============================================================
   GET – שליפת Event (אם קיים)
============================================================ */
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

    const event = await Event.findOne({ userId: auth.userId }).lean();

    return NextResponse.json({
      success: true,
      event: event || null,
    });
  } catch (err) {
    console.error("❌ GET /api/events failed:", err);
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}

/* ============================================================
   POST – יצירה או עדכון Event (UPSERT בטוח)
============================================================ */
export async function POST(req: Request) {
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

    const body = await req.json();

    /* ======================================================
       🧠 נרמול סוג אירוע
       - אם קיים במיפוי → enum תקין
       - אם לא → other + שומרים label חופשי
    ====================================================== */
    const mappedType = EVENT_TYPE_MAP[body.eventType];

    const payload = {
      title: body.title || "",
      eventType: mappedType ? mappedType : "other",
      eventTypeLabel: mappedType ? "" : (body.eventType || ""),
      date: body.date || "",
      location: body.location || "",
    };

    let event = await Event.findOne({ userId: auth.userId });

    // 🔹 יצירה ראשונה
    if (!event) {
      event = await Event.create({
        userId: auth.userId,
        email: user.email,
        maxGuests: user.guests || 100,
        ...payload,
      });
    }
    // 🔹 עדכון
    else {
      event.set(payload);
      await event.save();
    }

    return NextResponse.json({
      success: true,
      event,
    });
  } catch (err) {
    console.error("❌ POST /api/events failed:", err);
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
