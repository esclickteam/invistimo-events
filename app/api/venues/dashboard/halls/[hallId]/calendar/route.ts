import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { requireVenueAccess } from "@/lib/venues/requireVenueAccess";
import Event from "@/models/Event";
import VenueEvent from "@/models/VenueEvent";
import {
  isVenueEventStatus,
  venueLifecycleToInvistimoStatus,
  type VenueEventLifecycleStatus,
} from "@/lib/venues/statuses";

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

const allowedPaymentStatuses = ["paid", "refunded"];

function cleanString(value: unknown) {
  return String(value || "").trim();
}

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
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

/**
 * VenueEvent = lifecycle + hall tenant source of truth.
 * Linked Event supplements title/guests when available.
 */
function serializeVenueEvent(
  venueEvent: any,
  hall?: any,
  linkedEvent?: any | null
) {
  const linkedEventId = venueEvent.linkedEventId
    ? String(venueEvent.linkedEventId)
    : "";

  const title =
    cleanString(venueEvent.title) ||
    cleanString(linkedEvent?.title) ||
    "אירוע ללא שם";

  const eventType =
    cleanString(venueEvent.eventType) ||
    cleanString(linkedEvent?.eventType) ||
    "other";

  const guests =
    toNumber(venueEvent.guests, 0) ||
    toNumber(linkedEvent?.estimatedGuests, 0) ||
    toNumber(linkedEvent?.estimatedGuestCount, 0) ||
    0;

  const budget =
    toNumber(venueEvent.budget, 0) ||
    toNumber(linkedEvent?.budgetTotal, 0) ||
    0;

  const paidAmount = toNumber(venueEvent.paidAmount, 0);

  return {
    id: linkedEventId || String(venueEvent._id),
    _id: String(venueEvent._id),
    venueEventId: String(venueEvent._id),
    linkedEventId,

    ownerId: venueEvent.ownerId ? String(venueEvent.ownerId) : "",
    hallId: cleanString(venueEvent.hallId),
    hallName:
      cleanString(venueEvent.hallName) || cleanString(hall?.name),

    title,
    eventType,
    clientName: cleanString(venueEvent.clientName),
    clientPhone: cleanString(venueEvent.clientPhone),
    clientEmail: cleanString(venueEvent.clientEmail),

    date: normalizeDateOnly(venueEvent.date),
    startTime: cleanString(venueEvent.startTime),
    endTime: cleanString(venueEvent.endTime),
    time: cleanString(venueEvent.startTime),

    guests,
    estimatedGuests: guests,
    estimatedGuestCount: guests,

    status: venueEvent.status || "confirmed",

    budget,
    paidAmount,
    notes: cleanString(venueEvent.notes),
    color: cleanString(venueEvent.color),

    createdAt: venueEvent.createdAt,
    updatedAt: venueEvent.updatedAt,
  };
}

async function loadLinkedEventsMap(venueEvents: any[]) {
  const linkedIds = venueEvents
    .map((ve) => ve.linkedEventId)
    .filter((id) => id && mongoose.Types.ObjectId.isValid(String(id)));

  if (!linkedIds.length) {
    return new Map<string, any>();
  }

  const events = await Event.find({ _id: { $in: linkedIds } }).lean();
  const map = new Map<string, any>();

  for (const event of events) {
    map.set(String(event._id), event);
  }

  return map;
}

/* ======================================================
   GET /api/venues/dashboard/halls/[hallId]/calendar
   VenueEvents for the hall (tenant-scoped).
====================================================== */

export async function GET(req: NextRequest, { params }: Props) {
  try {
    await connectDB();

    const { hallId } = await params;

    const { ctx, error } = await requireVenueAccess(
      req,
      hallId,
      "dashboard.view"
    );

    if (error || !ctx) {
      return error!;
    }

    const hall = ctx.hall;
    const url = new URL(req.url);
    const from = cleanString(url.searchParams.get("from"));
    const to = cleanString(url.searchParams.get("to"));

    const query: Record<string, any> = {
      ownerId: ctx.ownerId,
      hallId: ctx.venueId,
    };

    const venueEvents = await VenueEvent.find(query)
      .sort({ date: 1, startTime: 1 })
      .lean();

    const linkedEventById = await loadLinkedEventsMap(venueEvents);

    let serializedEvents = venueEvents.map((venueEvent: any) => {
      const linkedEvent = venueEvent.linkedEventId
        ? linkedEventById.get(String(venueEvent.linkedEventId)) || null
        : null;

      return serializeVenueEvent(venueEvent, hall, linkedEvent);
    });

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
      const aKey = `${a.date || ""} ${a.startTime || ""}`;
      const bKey = `${b.date || ""} ${b.startTime || ""}`;
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
   Creates VenueEvent + linked Event (dual-write).
====================================================== */

export async function POST(req: NextRequest, { params }: Props) {
  try {
    await connectDB();

    const { hallId } = await params;

    const { ctx, error } = await requireVenueAccess(
      req,
      hallId,
      "dashboard.view"
    );

    if (error || !ctx) {
      return error!;
    }

    const hall = ctx.hall;
    const body = await req.json();

    const title = cleanString(body.title);
    const rawEventType = cleanString(body.eventType);
    const eventType = normalizeEventType(rawEventType);

    const clientName = cleanString(body.clientName);
    const clientPhone = cleanString(body.clientPhone);
    const clientEmail = cleanString(body.clientEmail || body.email);
    const date = normalizeDateOnly(body.date);
    const startTime = cleanString(body.time || body.startTime);
    const endTime = cleanString(body.endTime);

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

    const paidAmount = Math.max(
      0,
      toNumber(body.paidAmount, 0)
    );

    const requestedStatus = cleanString(body.status);
    const lifecycleStatus: VenueEventLifecycleStatus = isVenueEventStatus(
      requestedStatus
    )
      ? (requestedStatus as VenueEventLifecycleStatus)
      : "confirmed";

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

    if (!startTime) {
      return NextResponse.json(
        {
          success: false,
          message: "חובה להזין שעה",
        },
        { status: 400 }
      );
    }

    const fallbackEmail = `venue-${String(ctx.auth.userId)}@invistimo.local`;
    const invistimoStatus = venueLifecycleToInvistimoStatus(lifecycleStatus);

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const [createdEvent] = await Event.create(
        [
          {
            userId: new mongoose.Types.ObjectId(ctx.ownerId),
            venueOwnerId: new mongoose.Types.ObjectId(ctx.ownerId),
            venueHallId: ctx.venueId,
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
            time: startTime,
            location: {
              address: cleanString(
                body.location?.address || body.location || ""
              ),
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
            status: invistimoStatus,
            notes,
          },
        ],
        { session }
      );

      const [createdVenueEvent] = await VenueEvent.create(
        [
          {
            ownerId: new mongoose.Types.ObjectId(ctx.ownerId),
            hallId: ctx.venueId,
            hallName: hall.name || "",
            title,
            eventType: rawEventType || eventType,
            clientName,
            clientPhone,
            clientEmail,
            date,
            startTime,
            endTime,
            guests,
            status: lifecycleStatus,
            budget: budgetTotal,
            paidAmount,
            notes,
            linkedEventId: createdEvent._id,
            createdBy: new mongoose.Types.ObjectId(ctx.auth.userId),
          },
        ],
        { session }
      );

      await session.commitTransaction();

      return NextResponse.json({
        success: true,
        message: "האירוע נוסף ליומן בהצלחה",
        event: serializeVenueEvent(
          createdVenueEvent,
          hall,
          createdEvent
        ),
      });
    } catch (txError) {
      await session.abortTransaction();
      throw txError;
    } finally {
      session.endSession();
    }
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
