import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import Event from "@/models/Event";
import VenueHall from "@/models/VenueHall";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Props = {
  params: Promise<{
    hallId: string;
  }>;
};

const allowedEventTypes = [
  "wedding",
  "bar-mitzvah",
  "bat-mitzvah",
  "brit",
  "brita",
  "henna",
  "other",
];

const allowedEventStatuses = ["active", "archived"];
const allowedPaymentStatuses = ["paid", "refunded"];

function cleanString(value: unknown) {
  return String(value || "").trim();
}

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeEventType(value: unknown) {
  const raw = cleanString(value);

  if (allowedEventTypes.includes(raw)) {
    return raw;
  }

  const lower = raw.toLowerCase();

  if (lower.includes("חתונה") || lower.includes("wedding")) return "wedding";
  if (lower.includes("בר מצווה")) return "bar-mitzvah";
  if (lower.includes("בת מצווה")) return "bat-mitzvah";
  if (lower.includes("ברית")) return "brit";
  if (lower.includes("בריתה")) return "brita";
  if (lower.includes("חינה")) return "henna";

  return "other";
}

function serializeHall(hall: any) {
  if (!hall) return null;

  return {
    id: String(hall.id || hall._id || ""),
    name: hall.name || "",
    subtitle: hall.subtitle || "",
    capacity: hall.capacity || 0,
    status: hall.status || "active",
    image: hall.image || "",
  };
}

function serializeEvent(event: any, hall?: any) {
  const estimatedGuests =
    event.estimatedGuestCount ??
    event.estimatedGuests ??
    event.maxGuests ??
    0;

  const venueHallId = event.venueHallId || "";
  const venueHallName = event.venueHallName || hall?.name || "";

  return {
    id: String(event._id),
    _id: String(event._id),

    /**
     * שדות Event אמיתיים
     */
    userId: event.userId ? String(event.userId) : "",
    producerId: event.producerId ? String(event.producerId) : "",
    assignedStaffIds: Array.isArray(event.assignedStaffIds)
      ? event.assignedStaffIds.map((id: any) => String(id))
      : [],

    venueOwnerId: event.venueOwnerId ? String(event.venueOwnerId) : "",
    venueHallId,
    venueHallName,
    venueLinkedAt: event.venueLinkedAt || null,
    venueAccessStatus: event.venueAccessStatus || "none",

    email: event.email || "",

    eventType: event.eventType || "other",
    title: event.title || "",

    budgetTotal: event.budgetTotal || 0,
    estimatedGuests: event.estimatedGuests ?? null,
    estimatedGuestCount: event.estimatedGuestCount ?? null,

    date: event.date || "",
    time: event.time || "",

    location: {
      address: event.location?.address || "",
      lat: event.location?.lat,
      lng: event.location?.lng,
    },

    giftCreditUrl: event.giftCreditUrl || "",
    maxGuests: event.maxGuests || 0,

    paymentStatus: event.paymentStatus || "paid",
    status: event.status || "active",

    notes: event.notes || "",

    createdAt: event.createdAt,
    updatedAt: event.updatedAt,

    /**
     * תאימות לאחור ליומן/קומפוננטות קיימות
     * כדי שלא יישברו אם עדיין משתמשות בשמות הישנים
     */
    ownerId: event.venueOwnerId ? String(event.venueOwnerId) : "",
    hallId: venueHallId,
    hallName: venueHallName,

    clientName: event.title || "",
    clientPhone: "",
    clientEmail: event.email || "",

    startTime: event.time || "",
    endTime: "",

    guests: estimatedGuests,

    budget: event.budgetTotal || 0,
    paidAmount: event.paymentStatus === "paid" ? event.budgetTotal || 0 : 0,

    color: "",
  };
}

/* ======================================================
   GET /api/venues/dashboard/halls/[hallId]/calendar
   שליפת אירועי יומן לאולם מסוים מתוך Event
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
    const from = cleanString(url.searchParams.get("from"));
    const to = cleanString(url.searchParams.get("to"));

    const query: Record<string, any> = {
      venueOwnerId: auth.userId,
      venueHallId: hallId,
      venueAccessStatus: "linked",
      status: "active",
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

    const events = await Event.find(query)
      .sort({ date: 1, time: 1, createdAt: 1 })
      .lean();

    return NextResponse.json({
      success: true,
      hall: serializeHall(hall),
      events: events.map((event) => serializeEvent(event, hall)),
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
   יצירת Event חדש שמחובר לאולם
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
    const rawEventType = cleanString(body.eventType);
    const eventType = normalizeEventType(rawEventType);

    const clientName = cleanString(body.clientName);
    const clientEmail = cleanString(body.clientEmail || body.email);
    const date = cleanString(body.date);
    const time = cleanString(body.time || body.startTime);

    const notes = cleanString(body.notes);

    const guests = Math.max(
      0,
      toNumber(
        body.estimatedGuestCount ??
          body.estimatedGuests ??
          body.guests ??
          body.maxGuests,
        0
      )
    );

    const budgetTotal = Math.max(
      0,
      toNumber(body.budgetTotal ?? body.budget, 0)
    );

    const requestedStatus = cleanString(body.status);
    const status = allowedEventStatuses.includes(requestedStatus)
      ? requestedStatus
      : "active";

    const requestedPaymentStatus = cleanString(body.paymentStatus);
    const paymentStatus = allowedPaymentStatuses.includes(requestedPaymentStatus)
      ? requestedPaymentStatus
      : "paid";

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

    if (!time) {
      return NextResponse.json(
        {
          success: false,
          message: "חובה להזין שעה",
        },
        { status: 400 }
      );
    }

    const fallbackEmail = `venue-${String(auth.userId)}@invistimo.local`;

    const event = await Event.create({
      /**
       * בעל האירוע כרגע הוא בעל האולם,
       * כדי לאפשר אירועי יומן עצמאיים של האולם.
       * אם בעתיד מחברים ללקוח אמיתי — אפשר לעדכן userId ללקוח.
       */
      userId: new mongoose.Types.ObjectId(auth.userId),

      /**
       * חיבור לאולם
       */
      venueOwnerId: new mongoose.Types.ObjectId(auth.userId),
      venueHallId: hallId,
      venueHallName: hall.name || "",
      venueLinkedAt: new Date(),
      venueAccessStatus: "linked",

      email: clientEmail || fallbackEmail,

      eventType,
      title: clientName ? `${title} - ${clientName}` : title,

      budgetTotal,

      estimatedGuests: guests || null,
      estimatedGuestCount: guests || null,

      date,
      time,

      location: {
        address: cleanString(body.location?.address || body.location || ""),
        lat:
          body.location?.lat === undefined || body.location?.lat === null
            ? undefined
            : toNumber(body.location.lat, undefined),
        lng:
          body.location?.lng === undefined || body.location?.lng === null
            ? undefined
            : toNumber(body.location.lng, undefined),
      },

      giftCreditUrl: cleanString(body.giftCreditUrl),

      zones: [],
      planning: {
        eventDefinition: {
          goal: "",
          vibe: "",
          size: "",
          notes: "",
        },
        concept: "",
      },

      maxGuests: guests || toNumber(hall.capacity, 0) || 0,

      paymentStatus,
      status,

      notes,
    });

    return NextResponse.json({
      success: true,
      message: "האירוע נוסף ליומן בהצלחה",
      event: serializeEvent(event, hall),
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