import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Event from "@/models/Event";
import User from "@/models/User";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import type { HydratedDocument } from "mongoose";

export const dynamic = "force-dynamic";

/* =========================
   GET – שליפת אירועים
========================= */
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const auth = await getUserIdFromRequest(req);
    if (!auth?.userId) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    let events: any[] = [];

    /* =========================
       👤 לקוח
    ========================= */
    if (auth.role === "client") {
      events = await Event.find({ userId: auth.userId }).lean();
    }

    /* =========================
       🎬 מפיק
    ========================= */
    if (auth.role === "producer") {
      const clients = await User.find({
        assignedProducerId: auth.userId,
        role: { $in: ["client", "user"] },
      })
        .select("_id")
        .lean();

      const clientIds = clients.map((c) => c._id);

      events = await Event.find({
        userId: { $in: clientIds },
      }).lean();
    }

    /* =========================
       🧑‍💼 עובד מפיק
       (role = user + staffType = producer_staff)
    ========================= */
    if (auth.role === "user" && auth.staffType === "producer_staff") {
      const staff = await User.findById(auth.userId)
        .select("assignedClientIds")
        .lean();

      const clientIds = staff?.assignedClientIds || [];

      if (clientIds.length === 0) {
        return NextResponse.json({ success: true, events: [] });
      }

      events = await Event.find({
        userId: { $in: clientIds },
      }).lean();
    }

    return NextResponse.json({ success: true, events });
  } catch (err) {
    console.error("❌ GET /api/events failed:", err);
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}

/* =========================
   POST – יצירה / עדכון אירוע
========================= */
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const auth = await getUserIdFromRequest(req);
    if (!auth?.userId) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    // ❌ עובד מפיק לא יוצר אירוע
    if (auth.role === "user" && auth.staffType === "producer_staff") {
      return NextResponse.json(
        { success: false, error: "FORBIDDEN" },
        { status: 403 }
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
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}

/* =========================
   PATCH – עדכון תקציב
========================= */
export async function PATCH(req: NextRequest, context: any) {
  try {
    await connectDB();

    const auth = await getUserIdFromRequest(req);
    if (!auth?.userId) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const { budgetTotal } = await req.json();
    const eventId = context.params.id as string;

    const event = await Event.findById(eventId);
    if (!event) {
      return NextResponse.json(
        { success: false, error: "NOT_FOUND" },
        { status: 404 }
      );
    }

    if (typeof budgetTotal === "number") {
      event.budgetTotal = budgetTotal;
      await event.save();
    }

    return NextResponse.json({ success: true, event });
  } catch (err) {
    console.error("❌ PATCH /api/events failed:", err);
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
