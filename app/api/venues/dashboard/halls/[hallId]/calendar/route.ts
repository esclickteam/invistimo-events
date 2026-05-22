import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

import Event from "@/models/Event";
import Invitation from "@/models/Invitation";
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

function objectIdString(value: unknown) {
  if (!value) return "";
  return String(value);
}

function normalizeDateOnly(value: unknown) {
  if (!value) return "";

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  const raw = cleanString(value);

  if (!raw) return "";

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }

  const parsed = new Date(raw);

  if (Number.isNaN(parsed.getTime())) {
    return raw;
  }

  return parsed.toISOString().slice(0, 10);
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
  if (lower.includes("בריתה")) return "brita";
  if (lower.includes("ברית")) return "brit";
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

function getInvitationIdCandidates(eventId: string) {
  if (!eventId || !mongoose.Types.ObjectId.isValid(eventId)) {
    return [];
  }

  const objectId = new mongoose.Types.ObjectId(eventId);

  return [
    { eventId: objectId },
    { productionEventId: objectId },
    { linkedEventId: objectId },

    { eventId },
    { productionEventId: eventId },
    { linkedEventId: eventId },
  ];
}

async function getInvitationsForEvents(events: any[]) {
  const eventIds = events
    .map((event) => String(event._id))
    .filter((id) => mongoose.Types.ObjectId.isValid(id));

  if (!eventIds.length) {
    return new Map<string, any>();
  }

  const orQuery = eventIds.flatMap((eventId) =>
    getInvitationIdCandidates(eventId)
  );

  if (!orQuery.length) {
    return new Map<string, any>();
  }

  const invitations = await Invitation.find({
    $or: orQuery,
  })
    .populate("guests")
    .lean();

  const invitationByEventId = new Map<string, any>();

  for (const invitation of invitations) {
    const candidates = [
      invitation.eventId,
      invitation.productionEventId,
      invitation.linkedEventId,
    ];

    for (const candidate of candidates) {
      const key = objectIdString(candidate);

      if (key && !invitationByEventId.has(key)) {
        invitationByEventId.set(key, invitation);
      }
    }
  }

  return invitationByEventId;
}

/**
 * Event = מקור אמת רק לשיוך לאולם:
 * venueOwnerId / venueHallId / venueHallName / venueAccessStatus
 *
 * Invitation = מקור אמת לפרטי האירוע:
 * שם / תאריך / שעה / מיקום / מוזמנים / תמונה / shareId וכו׳
 */
function serializeEvent(event: any, hall?: any, invitation?: any) {
  const venueHallId = cleanString(event.venueHallId);
  const venueHallName =
    cleanString(event.venueHallName) || cleanString(hall?.name);

  const title =
    cleanString(invitation?.title) ||
    cleanString(invitation?.eventTitle) ||
    cleanString(event.title) ||
    "אירוע ללא שם";

  const eventType =
    cleanString(invitation?.eventType) ||
    cleanString(event.eventType) ||
    "other";

  const date =
    normalizeDateOnly(invitation?.eventDate || invitation?.date) ||
    normalizeDateOnly(event.date);

  const time =
    cleanString(invitation?.eventTime) ||
    cleanString(invitation?.time) ||
    cleanString(event.time);

  const location = invitation?.location || event.location || {};

  const estimatedGuests =
    toNumber(invitation?.estimatedGuestCount, 0) ||
    toNumber(invitation?.estimatedGuests, 0) ||
    toNumber(invitation?.maxGuests, 0) ||
    toNumber(event.estimatedGuestCount, 0) ||
    toNumber(event.estimatedGuests, 0) ||
    toNumber(event.maxGuests, 0) ||
    0;

  const budgetTotal =
    toNumber(invitation?.budgetTotal, 0) || toNumber(event.budgetTotal, 0) || 0;

  const paymentStatus =
    cleanString(invitation?.paymentStatus) ||
    cleanString(event.paymentStatus) ||
    "paid";

  const email =
    cleanString(invitation?.email) ||
    cleanString(event.email) ||
    "";

  const notes =
    cleanString(invitation?.notes) ||
    cleanString(event.notes) ||
    "";

  return {
    id: String(event._id),
    _id: String(event._id),

    /**
     * מזהי הזמנה ציבוריים
     */
    invitationId: invitation?._id ? String(invitation._id) : "",
    shareId: invitation?.shareId || "",

    /**
     * שדות Event אמיתיים / שיוך
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

    /**
     * פרטי האירוע — קודם מההזמנה
     */
    email,

    eventType,
    title,

    budgetTotal,
    estimatedGuests,
    estimatedGuestCount: estimatedGuests,

    date,
    time,

    location: {
      address: cleanString(location?.address || location?.name),
      lat: location?.lat,
      lng: location?.lng,
    },

    giftCreditUrl:
      cleanString(invitation?.giftCreditUrl) ||
      cleanString(event.giftCreditUrl),

    maxGuests: estimatedGuests,

    paymentStatus,
    status: event.status || "active",

    notes,

    createdAt: event.createdAt,
    updatedAt: event.updatedAt,

    /**
     * תאימות לאחור ליומן/קומפוננטות קיימות
     */
    ownerId: event.venueOwnerId ? String(event.venueOwnerId) : "",
    hallId: venueHallId,
    hallName: venueHallName,

    clientName: title,
    clientPhone: cleanString(invitation?.phone || invitation?.clientPhone),
    clientEmail: email,

    startTime: time,
    endTime: "",

    guests: estimatedGuests,

    budget: budgetTotal,
    paidAmount: paymentStatus === "paid" ? budgetTotal : 0,

    color: "",

    /**
     * מידע מלא למקרה שהקומפוננטה צריכה
     */
    source: invitation ? "invitation" : "event",
  };
}

/* ======================================================
   GET /api/venues/dashboard/halls/[hallId]/calendar
   שליפת אירועי יומן לאולם מסוים
   Event = שיוך לאולם
   Invitation = פרטי אירוע
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

    /**
     * מסנן לפי Event רק כדי למצוא את האירועים ששויכו לאולם.
     * לא מסתמכים על date/time של Event כי מקור האמת הוא Invitation.
     */
    const query: Record<string, any> = {
      venueOwnerId: auth.userId,
      venueHallId: hallId,
      venueAccessStatus: "linked",
      status: "active",
    };

    const events = await Event.find(query)
      .sort({ createdAt: 1 })
      .lean();

    const invitationByEventId = await getInvitationsForEvents(events);

    let serializedEvents = events.map((event: any) => {
      const invitation = invitationByEventId.get(String(event._id)) || null;
      return serializeEvent(event, hall, invitation);
    });

    /**
     * סינון תאריכים מתבצע אחרי המיזוג,
     * כי התאריך האמיתי מגיע מה-Invitation.
     */
    if (from || to) {
      serializedEvents = serializedEvents.filter((event: any) => {
        const date = cleanString(event.date);

        if (!date) return false;

        if (from && date < from) {
          return false;
        }

        if (to && date > to) {
          return false;
        }

        return true;
      });
    }

    serializedEvents.sort((a: any, b: any) => {
      const aKey = `${a.date || ""} ${a.time || ""}`;
      const bKey = `${b.date || ""} ${b.time || ""}`;
      return aKey.localeCompare(bKey);
    });

    return NextResponse.json({
      success: true,
      hall: serializeHall(hall),
      events: serializedEvents,
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
   יצירת Event עצמאי חדש ביומן של אולם
   זה מיועד לאירוע שנוצר מתוך צד בעל האולם,
   לא להזמנה קיימת של לקוח.
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
    const date = normalizeDateOnly(body.date);
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
      event: serializeEvent(event, hall, null),
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