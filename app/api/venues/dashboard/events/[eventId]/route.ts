import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import VenueEvent from "@/models/VenueEvent";
import VenueHall from "@/models/VenueHall";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Props = {
  params: Promise<{
    eventId: string;
  }>;
};

const allowedStatuses = [
  "lead",
  "proposal",
  "closed",
  "confirmed",
  "preparing",
  "live",
  "done",
  "cancelled",
];

function cleanString(value: unknown) {
  return String(value || "").trim();
}

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function serializeEvent(event: any, hall?: any) {
  return {
    id: String(event._id),
    _id: String(event._id),

    ownerId: String(event.ownerId),
    hallId: event.hallId || "",
    hallName: event.hallName || hall?.name || "",

    title: event.title || "",
    eventType: event.eventType || "",
    clientName: event.clientName || "",
    clientPhone: event.clientPhone || "",
    clientEmail: event.clientEmail || "",

    date: event.date || "",
    startTime: event.startTime || "",
    endTime: event.endTime || "",

    guests: event.guests || 0,
    status: event.status || "confirmed",

    budget: event.budget || 0,
    paidAmount: event.paidAmount || 0,

    notes: event.notes || "",
    color: event.color || "",

    createdAt: event.createdAt,
    updatedAt: event.updatedAt,
  };
}

/* ======================================================
   GET /api/venues/dashboard/events/[eventId]
   שליפת אירוע בודד לפי מזהה אירוע
====================================================== */
export async function GET(req: NextRequest, { params }: Props) {
  try {
    await connectDB();

    const auth = await getUserIdFromRequest(req);

    if (!auth?.userId) {
      return NextResponse.json(
        {
          success: false,
          message: "לא מחובר",
        },
        { status: 401 }
      );
    }

    const { eventId } = await params;

    if (!eventId || !mongoose.Types.ObjectId.isValid(eventId)) {
      return NextResponse.json(
        {
          success: false,
          message: "מזהה אירוע לא תקין",
        },
        { status: 400 }
      );
    }

    const event = await VenueEvent.findOne({
      _id: eventId,
      ownerId: auth.userId,
    }).lean();

    if (!event) {
      return NextResponse.json(
        {
          success: false,
          message: "האירוע לא נמצא או שאין הרשאה",
        },
        { status: 404 }
      );
    }

    const hall = event.hallId
      ? await VenueHall.findOne({
          ownerId: auth.userId,
          id: event.hallId,
        }).lean()
      : null;

    return NextResponse.json({
      success: true,
      event: serializeEvent(event, hall),
      hall: hall
        ? {
            id: hall.id,
            name: hall.name,
            subtitle: hall.subtitle || "",
            capacity: hall.capacity || 0,
            status: hall.status || "active",
            image: hall.image || "",
          }
        : null,
    });
  } catch (error) {
    console.error("GET /api/venues/dashboard/events/[eventId] failed:", error);

    return NextResponse.json(
      {
        success: false,
        message: "טעינת פרטי האירוע נכשלה",
      },
      { status: 500 }
    );
  }
}

/* ======================================================
   PATCH /api/venues/dashboard/events/[eventId]
   עדכון אירוע קיים
====================================================== */
export async function PATCH(req: NextRequest, { params }: Props) {
  try {
    await connectDB();

    const auth = await getUserIdFromRequest(req);

    if (!auth?.userId) {
      return NextResponse.json(
        {
          success: false,
          message: "לא מחובר",
        },
        { status: 401 }
      );
    }

    const { eventId } = await params;

    if (!eventId || !mongoose.Types.ObjectId.isValid(eventId)) {
      return NextResponse.json(
        {
          success: false,
          message: "מזהה אירוע לא תקין",
        },
        { status: 400 }
      );
    }

    const existingEvent = await VenueEvent.findOne({
      _id: eventId,
      ownerId: auth.userId,
    });

    if (!existingEvent) {
      return NextResponse.json(
        {
          success: false,
          message: "האירוע לא נמצא או שאין הרשאה",
        },
        { status: 404 }
      );
    }

    const body = await req.json();

    const eventType = cleanString(body.eventType) || existingEvent.eventType || "אירוע";
    const clientName = cleanString(body.clientName);

    const title =
      cleanString(body.title) ||
      [eventType, clientName ? `- ${clientName}` : ""].join(" ").trim() ||
      "אירוע ללא שם";

    const date = cleanString(body.date);
    const startTime = cleanString(body.startTime);

    if (!date) {
      return NextResponse.json(
        {
          success: false,
          message: "חובה להזין תאריך אירוע",
        },
        { status: 400 }
      );
    }

    if (!startTime) {
      return NextResponse.json(
        {
          success: false,
          message: "חובה להזין שעת התחלה",
        },
        { status: 400 }
      );
    }

    const requestedStatus = cleanString(body.status);
    const status = allowedStatuses.includes(requestedStatus)
      ? requestedStatus
      : existingEvent.status || "confirmed";

    existingEvent.title = title;
    existingEvent.eventType = eventType;
    existingEvent.clientName = clientName;
    existingEvent.clientPhone = cleanString(body.clientPhone);
    existingEvent.clientEmail = cleanString(body.clientEmail);

    existingEvent.date = date;
    existingEvent.startTime = startTime;
    existingEvent.endTime = cleanString(body.endTime);

    existingEvent.guests = Math.max(0, toNumber(body.guests));
    existingEvent.status = status;

    existingEvent.budget = Math.max(0, toNumber(body.budget));
    existingEvent.paidAmount = Math.max(0, toNumber(body.paidAmount));

    existingEvent.notes = cleanString(body.notes);
    existingEvent.color = cleanString(body.color);

    await existingEvent.save();

    const hall = existingEvent.hallId
      ? await VenueHall.findOne({
          ownerId: auth.userId,
          id: existingEvent.hallId,
        }).lean()
      : null;

    return NextResponse.json({
      success: true,
      message: "האירוע עודכן בהצלחה",
      event: serializeEvent(existingEvent, hall),
    });
  } catch (error) {
    console.error("PATCH /api/venues/dashboard/events/[eventId] failed:", error);

    return NextResponse.json(
      {
        success: false,
        message: "עדכון האירוע נכשל",
      },
      { status: 500 }
    );
  }
}

/* ======================================================
   DELETE /api/venues/dashboard/events/[eventId]
   מחיקת אירוע קיים
====================================================== */
export async function DELETE(req: NextRequest, { params }: Props) {
  try {
    await connectDB();

    const auth = await getUserIdFromRequest(req);

    if (!auth?.userId) {
      return NextResponse.json(
        {
          success: false,
          message: "לא מחובר",
        },
        { status: 401 }
      );
    }

    const { eventId } = await params;

    if (!eventId || !mongoose.Types.ObjectId.isValid(eventId)) {
      return NextResponse.json(
        {
          success: false,
          message: "מזהה אירוע לא תקין",
        },
        { status: 400 }
      );
    }

    const deletedEvent = await VenueEvent.findOneAndDelete({
      _id: eventId,
      ownerId: auth.userId,
    });

    if (!deletedEvent) {
      return NextResponse.json(
        {
          success: false,
          message: "האירוע לא נמצא או שאין הרשאה",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "האירוע נמחק בהצלחה",
    });
  } catch (error) {
    console.error("DELETE /api/venues/dashboard/events/[eventId] failed:", error);

    return NextResponse.json(
      {
        success: false,
        message: "מחיקת האירוע נכשלה",
      },
      { status: 500 }
    );
  }
}