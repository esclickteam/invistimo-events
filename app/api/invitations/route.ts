import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import db from "@/lib/db";
import Invitation from "@/models/Invitation";
import Event from "@/models/Event";
import User from "@/models/User";
import { nanoid } from "nanoid";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/* ============================================================
   Helpers
============================================================ */

function cleanString(value: unknown) {
  return String(value || "").trim();
}

function toBool(value: unknown) {
  return value === true || value === "true" || value === 1 || value === "1";
}

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toObjectId(value: unknown) {
  const id = cleanString(value);

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return null;
  }

  return new mongoose.Types.ObjectId(id);
}

function normalizeEventType(value: unknown) {
  const raw = cleanString(value);

  const allowed = [
    "wedding",
    "bar-mitzvah",
    "bat-mitzvah",
    "brit",
    "brita",
    "henna",
    "other",
  ];

  if (allowed.includes(raw)) {
    return raw;
  }

  const lower = raw.toLowerCase();

  if (lower.includes("חתונה") || lower.includes("wedding")) return "wedding";
  if (lower.includes("בר מצווה")) return "bar-mitzvah";
  if (lower.includes("בת מצווה")) return "bat-mitzvah";
  if (lower.includes("ברית")) return "brit";
  if (lower.includes("בריתה")) return "brita";
  if (lower.includes("חינה")) return "henna";

  return "wedding";
}

function normalizeEventDate(value: unknown) {
  if (!value) return "";

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  const raw = cleanString(value);

  if (!raw) return "";

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }

  const date = new Date(raw);

  if (Number.isNaN(date.getTime())) {
    return raw;
  }

  return date.toISOString().slice(0, 10);
}

function normalizeLocation(input: any) {
  if (!input) {
    return {
      address: "",
      lat: undefined,
      lng: undefined,
    };
  }

  if (typeof input === "string") {
    return {
      address: input.trim(),
      lat: undefined,
      lng: undefined,
    };
  }

  return {
    address: cleanString(input.address || input.name),
    lat:
      input.lat === undefined || input.lat === null
        ? undefined
        : toNumber(input.lat, undefined as any),
    lng:
      input.lng === undefined || input.lng === null
        ? undefined
        : toNumber(input.lng, undefined as any),
  };
}

function serializeEvent(event: any) {
  if (!event) return null;

  return {
    id: String(event._id),
    _id: String(event._id),

    userId: event.userId ? String(event.userId) : "",
    producerId: event.producerId ? String(event.producerId) : "",

    venueOwnerId: event.venueOwnerId ? String(event.venueOwnerId) : "",
    venueHallId: event.venueHallId || "",
    venueHallName: event.venueHallName || "",
    venueLinkedAt: event.venueLinkedAt || null,
    venueAccessStatus: event.venueAccessStatus || "none",

    email: event.email || "",

    eventType: event.eventType || "wedding",
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
  };
}

async function createOrUpdateEventForInvitation({
  body,
  user,
  userId,
  producerId,
}: {
  body: any;
  user: any;
  userId: string;
  producerId: string | null;
}) {
  const bodyEventId = cleanString(body.eventId);
  const shouldCreateEvent = toBool(body.createEvent);

  /**
   * אם הגיע eventId קיים —
   * משתמשים באירוע הזה.
   */
  if (!shouldCreateEvent && bodyEventId) {
    const existingEvent = await Event.findOne({
      _id: bodyEventId,
      userId,
    }).lean();

    if (existingEvent) {
      return existingEvent;
    }

    throw new Error("EVENT_NOT_FOUND");
  }

  /**
   * אם לא הגיע eventId ולא ביקשו ליצור Event אמיתי —
   * יוצרים Event בסיסי חדש.
   * זה מחזיר את ההתנהגות הקודמת:
   * אפשר ליצור הזמנה בלי ליצור קודם פרטי אירוע.
   */
  if (!shouldCreateEvent) {
    const fallbackEvent = await Event.create({
      userId: new mongoose.Types.ObjectId(userId),
      producerId:
        producerId && mongoose.Types.ObjectId.isValid(producerId)
          ? new mongoose.Types.ObjectId(producerId)
          : undefined,

      email: user.email || "noemail@placeholder.com",

      title: cleanString(body.title) || "הזמנה חדשה",
      eventType: normalizeEventType(body.eventType),

      budgetTotal: 0,
      estimatedGuests: null,
      estimatedGuestCount: null,

      status: "active",
      date:
        normalizeEventDate(body.eventDate || body.date) ||
        new Date().toISOString().slice(0, 10),
      time: cleanString(body.eventTime || body.time) || "00:00",

      maxGuests: 100,

      location: normalizeLocation(body.location),

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

      paymentStatus: "paid",
    });

    return fallbackEvent.toObject();
  }

  /**
   * מכאן — יצירת/עדכון Event אמיתי עם שיוך לאולם.
   * זה נשאר למסכים שבהם כן יוצרים אירוע מלא מאולם/אדמין.
   */
  const venueOwnerObjectId = toObjectId(body.venueOwnerId);

  if (!venueOwnerObjectId) {
    throw new Error("MISSING_OR_INVALID_VENUE_OWNER_ID");
  }

  const venueHallId = cleanString(body.venueHallId);

  if (!venueHallId) {
    throw new Error("MISSING_VENUE_HALL_ID");
  }

  const eventTitle =
    cleanString(body.eventTitle) ||
    cleanString(body.title) ||
    "אירוע ללא שם";

  const eventType = normalizeEventType(body.eventType);
  const eventDate = normalizeEventDate(body.eventDate || body.date);
  const eventTime = cleanString(body.eventTime || body.time);

  if (!eventDate) {
    throw new Error("MISSING_EVENT_DATE");
  }

  if (!eventTime) {
    throw new Error("MISSING_EVENT_TIME");
  }

  const estimatedGuests = Math.max(
    0,
    toNumber(
      body.estimatedGuestCount ?? body.estimatedGuests ?? body.maxGuests,
      0
    )
  );

  const location = normalizeLocation(body.location);
  const venueHallName = cleanString(body.venueHallName);
  const budgetTotal = Math.max(0, toNumber(body.budgetTotal, 0));

  const eventPayload: any = {
    userId: new mongoose.Types.ObjectId(userId),

    producerId:
      producerId && mongoose.Types.ObjectId.isValid(producerId)
        ? new mongoose.Types.ObjectId(producerId)
        : undefined,

    venueOwnerId: venueOwnerObjectId,
    venueHallId,
    venueHallName,
    venueAccessStatus: "linked",

    email: user.email || cleanString(body.email) || "noemail@placeholder.com",

    eventType,
    title: eventTitle,

    budgetTotal,

    estimatedGuests: estimatedGuests || null,
    estimatedGuestCount: estimatedGuests || null,

    date: eventDate,
    time: eventTime,

    location,

    giftCreditUrl: cleanString(body.giftCreditUrl),

    maxGuests: estimatedGuests || 100,

    paymentStatus: body.paymentStatus === "refunded" ? "refunded" : "paid",
    status: "active",

    notes: cleanString(body.notes),
  };

  let eventDoc: any = null;

  if (bodyEventId && mongoose.Types.ObjectId.isValid(bodyEventId)) {
    eventDoc = await Event.findOneAndUpdate(
      {
        _id: bodyEventId,
        userId: new mongoose.Types.ObjectId(userId),
      },
      {
        $set: eventPayload,
        $setOnInsert: {
          venueLinkedAt: new Date(),
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
        },
      },
      {
        new: true,
        upsert: true,
      }
    );
  } else {
    eventDoc = await Event.create({
      ...eventPayload,
      venueLinkedAt: new Date(),
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
    });
  }

  return eventDoc.toObject ? eventDoc.toObject() : eventDoc;
}

/* ============================================================
   POST — יצירת הזמנה + אופציונלית יצירת Event מחובר לאולם
============================================================ */
export async function POST(req: NextRequest) {
  try {
    await db();

    /* ================= AUTH ================= */
    const auth = await getUserIdFromRequest(req as any);

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

    const {
      canvasData,
      previewImage,
      headerImageUrl,
      orientation,
      imageMode,
    } = body;

    /* ================= EVENT ================= */
    let event: any = null;

    try {
      event = await createOrUpdateEventForInvitation({
        body,
        user,
        userId,
        producerId,
      });
    } catch (eventError: any) {
      console.error(
        "❌ Event creation failed:",
        eventError?.message || eventError
      );

      return NextResponse.json(
        {
          success: false,
          error: eventError?.message || "EVENT_CREATION_FAILED",
        },
        { status: 400 }
      );
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
        {
          success: true,
          invitation: existing,
          event: serializeEvent(event),
          created: false,
        },
        { status: 200 }
      );
    }

    /* ================= CREATE INVITATION ================= */
    const maxGuests =
      Number(event.maxGuests) ||
      Number(event.estimatedGuestCount) ||
      Number(event.estimatedGuests) ||
      100;

    const maxMessages = maxGuests * 3;

    const finalOrientation =
      orientation === "square" || imageMode === "square"
        ? "square"
        : "portrait";

    const invitation = await Invitation.create({
      ownerId: userId,
      producerId,

      eventId: event._id,
      productionEventId: event._id,
      linkedEventId: event._id,

      title: event.title || cleanString(body.title) || "הזמנה חדשה",
      eventType: event.eventType || "",
      eventDate: event.date || null,
      eventTime: event.time || "",
      location: event.location || {},

      estimatedGuests: maxGuests,
      estimatedGuestCount: maxGuests,

      venueOwnerId: event.venueOwnerId || undefined,
      venueHallId: event.venueHallId || "",
      venueHallName: event.venueHallName || "",

      canvasData: canvasData || {},
      orientation: finalOrientation,

      previewImage: previewImage || "",
      headerImageUrl: headerImageUrl || "",
      imageUrl: cleanString(body.imageUrl),
      previewImageUrl: cleanString(body.previewImageUrl),

      shareId: nanoid(10),
      guests: [],
      maxGuests,
      maxMessages,
    });

    return NextResponse.json(
      {
        success: true,
        invitation,
        event: serializeEvent(event),
        created: true,
      },
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
export async function GET(req: NextRequest) {
  try {
    await db();

    const auth = await getUserIdFromRequest(req as any);

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
      $or: [
        { eventId },
        { productionEventId: eventId },
        { linkedEventId: eventId },
      ],
      $and: [
        {
          $or: [
            { ownerId: userId },
            { producerId: userId },
            ...(createdByProducerId
              ? [{ producerId: createdByProducerId }]
              : []),
          ],
        },
      ],
    }).lean();

    if (!invitation) {
      return NextResponse.json(
        { success: false, error: "INVITATION_NOT_FOUND" },
        { status: 404 }
      );
    }

    const event = await Event.findById(eventId).lean();

    return NextResponse.json({
      success: true,
      invitation,
      event: serializeEvent(event),
    });
  } catch (err) {
    console.error("❌ Error fetching invitation:", err);

    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}