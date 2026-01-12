import { NextResponse } from "next/server";
import db from "@/lib/db";
import Invitation from "@/models/Invitation";
import Event from "@/models/Event";
import User from "@/models/User";
import { nanoid } from "nanoid";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    await db();

    /* ===============================
       🔐 זיהוי משתמש
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
       🧠 טעינת יוזר
    =============================== */
    const user = await User.findById(userId).lean();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "USER_NOT_FOUND" },
        { status: 404 }
      );
    }

    /* ===============================
       📦 גוף הבקשה
    =============================== */
    const body = await req.json();
    const { eventId, canvasData, previewImage } = body;

    if (!eventId) {
      return NextResponse.json(
        { success: false, error: "EVENT_ID_REQUIRED" },
        { status: 400 }
      );
    }

    /* ===============================
       🎯 טעינת Event
    =============================== */
    const event = await Event.findOne({
      _id: eventId,
      userId,
    });

    if (!event) {
      return NextResponse.json(
        { success: false, error: "EVENT_NOT_FOUND" },
        { status: 404 }
      );
    }

    /* ===============================
       🔒 בדיקה שאין כבר הזמנה לאירוע
    =============================== */
    const existing = await Invitation.findOne({ eventId });

    if (existing) {
      return NextResponse.json(
        { success: true, invitation: existing, created: false },
        { status: 200 }
      );
    }

    /* ===============================
       🧮 הגבלות
    =============================== */
    const maxGuests = Number(event.maxGuests) || 100;
    const maxMessages = maxGuests * 3;

    /* ===============================
       🔗 shareId
    =============================== */
    const shareId = nanoid(10);

    /* ===============================
       🧾 יצירת ההזמנה
    =============================== */
    const newInvite = await Invitation.create({
      ownerId: userId,
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
      sentSmsCount: 0,
      remainingMessages: maxMessages,
    });

    const cleanInvite = JSON.parse(JSON.stringify(newInvite));

    console.log("🔥 INVITATION CREATED FROM EVENT:", {
      inviteId: cleanInvite._id,
      eventId: event._id,
      ownerId: userId,
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
