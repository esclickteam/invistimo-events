import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Event from "@/models/Event";
import User from "@/models/User";
import Invitation from "@/models/Invitation";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import { prepareEventLocation } from "@/lib/eventLocation";
import { refreshUnsentRoundPayloads } from "@/lib/messages/refreshUnsentRoundPayloads";
import { resolveLiveEventMessageDetails } from "@/lib/messages/liveEventDetails";

export const dynamic = "force-dynamic";

/* =========================
   GET – שליפת אירוע
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

/* =========================
   POST – יצירה או עדכון כולל (UPSERT)
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

    const user = await User.findById(auth.userId).lean();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "USER_NOT_FOUND" },
        { status: 404 }
      );
    }

    const body = await req.json();

    const existingEvent = await Event.findOne({ userId: auth.userId });

    const preparedLocation = await prepareEventLocation({
      input: body.location,
      previous: existingEvent?.location,
    });

    const payload: any = {
      title: body.title?.trim() || "",
      eventType: body.eventType || "wedding",
      date: body.date || "",
      time: body.time || "",

      location: preparedLocation.location,

      /* 🎁 NEW – קישור מתנות באשראי */
      giftCreditUrl:
        typeof body.giftCreditUrl === "string"
          ? body.giftCreditUrl.trim()
          : "",
    };

    // אם יש budgetTotal במשלוח – נוסיף
    if (typeof body.budgetTotal === "number") {
      payload.budgetTotal = body.budgetTotal;
    }

    let event = existingEvent;

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

    const linkedInvitations = await Invitation.find({
      $or: [
        { eventId: event._id },
        { productionEventId: event._id },
        { linkedEventId: event._id },
      ],
    });

    for (const invitation of linkedInvitations) {
      const previous = resolveLiveEventMessageDetails(invitation, null);
      const set: Record<string, any> = {
        updatedAt: new Date(),
      };
      if (payload.title) set.title = payload.title;
      if (payload.date) set.eventDate = new Date(payload.date);
      if (payload.time) set.eventTime = payload.time;
      if (payload.location) set.location = payload.location;

      await Invitation.updateOne({ _id: invitation._id }, { $set: set });
      const updatedInvitation = { ...invitation.toObject?.() || invitation, ...set };
      try {
        await refreshUnsentRoundPayloads({
          invitationId: invitation._id,
          invitation: updatedInvitation,
          event,
          previous,
        });
      } catch (refreshError: any) {
        console.error(
          "⚠️ Failed to refresh unsent round payloads after event update:",
          refreshError?.message || refreshError
        );
      }
    }

    return NextResponse.json({
      success: true,
      event,
      locationWarning: preparedLocation.warning,
    });
  } catch (err) {
    console.error("❌ POST /api/events failed:", err);
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}

/* =========================
   PATCH – עדכון שדות ספציפיים
========================= */
export async function PATCH(req: NextRequest) {
  try {
    await connectDB();

    const auth = await getUserIdFromRequest(req);
    if (!auth?.userId) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const body = await req.json();

    const event = await Event.findOne({ userId: auth.userId });
    if (!event) {
      return NextResponse.json(
        { success: false, error: "NOT_FOUND" },
        { status: 404 }
      );
    }

    if (typeof body.budgetTotal === "number") {
      event.budgetTotal = body.budgetTotal;
    }

    if (typeof body.giftCreditUrl === "string") {
      event.giftCreditUrl = body.giftCreditUrl.trim();
    }

    await event.save();

    return NextResponse.json({ success: true, event });
  } catch (err) {
    console.error("❌ PATCH /api/events failed:", err);
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
