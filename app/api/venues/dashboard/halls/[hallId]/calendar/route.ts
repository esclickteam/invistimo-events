import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import VenueEvent from "@/models/VenueEvent";
import VenueHall from "@/models/VenueHall";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Props = {
  params: Promise<{
    hallId: string;
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

function serializeEvent(event: any) {
  return {
    id: String(event._id),
    _id: String(event._id),

    ownerId: String(event.ownerId),
    hallId: event.hallId,

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
   GET /api/venues/dashboard/halls/[hallId]/calendar
   שליפת אירועי יומן לאולם מסוים
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

    const { hallId } = await params;

    if (!hallId) {
      return NextResponse.json(
        {
          success: false,
          message: "חסר מזהה אולם",
        },
        { status: 400 }
      );
    }

    const hall = await VenueHall.findOne({
      ownerId: auth.userId,
      id: hallId,
    }).lean();

    if (!hall) {
      return NextResponse.json(
        {
          success: false,
          message: "האולם לא נמצא או שאין הרשאה",
        },
        { status: 404 }
      );
    }

    const url = new URL(req.url);
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");

    const query: Record<string, any> = {
      ownerId: auth.userId,
      hallId,
    };

    if (from || to) {
      query.date = {};

      if (from) {
        query.date.$gte = from;
      }

      if (to) {
        query.date.$lte = to;
      }
    }

    const events = await VenueEvent.find(query)
      .sort({ date: 1, startTime: 1, createdAt: 1 })
      .lean();

    return NextResponse.json({
      success: true,
      hall: {
        id: hall.id,
        name: hall.name,
        subtitle: hall.subtitle,
        capacity: hall.capacity || 0,
        status: hall.status || "active",
        image: hall.image || "",
      },
      events: events.map(serializeEvent),
    });
  } catch (error) {
    console.error(
      "GET /api/venues/dashboard/halls/[hallId]/calendar failed:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "טעינת יומן האולם נכשלה",
      },
      { status: 500 }
    );
  }
}

/* ======================================================
   POST /api/venues/dashboard/halls/[hallId]/calendar
   יצירת אירוע חדש ביומן אולם
====================================================== */
export async function POST(req: NextRequest, { params }: Props) {
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

    const { hallId } = await params;

    if (!hallId) {
      return NextResponse.json(
        {
          success: false,
          message: "חסר מזהה אולם",
        },
        { status: 400 }
      );
    }

    const hall = await VenueHall.findOne({
      ownerId: auth.userId,
      id: hallId,
    }).lean();

    if (!hall) {
      return NextResponse.json(
        {
          success: false,
          message: "האולם לא נמצא או שאין הרשאה",
        },
        { status: 404 }
      );
    }

    const body = await req.json();

    const title = cleanString(body.title);
    const eventType = cleanString(body.eventType);
    const clientName = cleanString(body.clientName);
    const clientPhone = cleanString(body.clientPhone);
    const clientEmail = cleanString(body.clientEmail);

    const date = cleanString(body.date);
    const startTime = cleanString(body.startTime);
    const endTime = cleanString(body.endTime);

    const notes = cleanString(body.notes);
    const color = cleanString(body.color);

    if (!title) {
      return NextResponse.json(
        {
          success: false,
          message: "חובה להזין שם אירוע",
        },
        { status: 400 }
      );
    }

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
      : "confirmed";

    const event = await VenueEvent.create({
      ownerId: auth.userId,
      hallId,

      title,
      eventType,
      clientName,
      clientPhone,
      clientEmail,

      date,
      startTime,
      endTime,

      guests: Math.max(0, toNumber(body.guests)),
      status,

      budget: Math.max(0, toNumber(body.budget)),
      paidAmount: Math.max(0, toNumber(body.paidAmount)),

      notes,
      color,
    });

    return NextResponse.json({
      success: true,
      message: "האירוע נוסף ליומן בהצלחה",
      event: serializeEvent(event),
    });
  } catch (error) {
    console.error(
      "POST /api/venues/dashboard/halls/[hallId]/calendar failed:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "יצירת אירוע ביומן נכשלה",
      },
      { status: 500 }
    );
  }
}