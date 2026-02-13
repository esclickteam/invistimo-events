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
   ❗️ לא שומר previewImage
============================================================ */
export async function POST(req: Request) {
  try {
    await db();

    /* ================= AUTH ================= */
    const auth = await getUserIdFromRequest();
    if (!auth?.userId) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const userId = String(auth.userId);

    /* ================= USER ================= */
    const user = await User.findById(userId)
      .select("email createdByProducer")
      .lean();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "USER_NOT_FOUND" },
        { status: 404 }
      );
    }

    const producerId =
      auth.role === "producer" ? userId : user.createdByProducer || null;

    /* ================= BODY ================= */
    const body = await req.json().catch(() => ({}));
    const { eventId, canvasData } = body;

    /* ================= EVENT ================= */
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
        });

        event = createdEvent.toObject();
      }
    }

    if (!event?._id) {
      return NextResponse.json(
        { success: false, error: "EVENT_NOT_FOUND" },
        { status: 404 }
      );
    }

    /* ================= EXISTING INVITATION ================= */
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

    /* ================= CREATE INVITATION ================= */
    const maxGuests = Number(event.maxGuests) || 100;
    const maxMessages = maxGuests * 3;

    const invitation = await Invitation.create({
      ownerId: userId,
      producerId,
      eventId: event._id,

      title: event.title || "הזמנה חדשה",
      eventType: event.eventType || "",
      eventDate: event.date || null,
      eventTime: event.time || "",
      location: event.location || {},

      canvasData: canvasData || {},
      previewImage: "", // ✅ תמיד ריק כאן

      shareId: nanoid(10),
      guests: [],
      maxGuests,
      maxMessages,
    });

    return NextResponse.json(
      { success: true, invitation, created: true },
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

    const userId = String(auth.userId);

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

    return NextResponse.json({ success: true, invitation });
  } catch (err) {
    console.error("❌ Error fetching invitation:", err);
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
