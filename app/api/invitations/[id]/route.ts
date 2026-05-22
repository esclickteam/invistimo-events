import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import db from "@/lib/db";

import "@/models/InvitationGuest";
import Invitation from "@/models/Invitation";
import Event from "@/models/Event";

import { v2 as cloudinary } from "cloudinary";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ============================================================
   Cloudinary config
============================================================ */
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

/* ============================================================
   Helpers
============================================================ */

function isNonEmptyString(v: unknown) {
  return typeof v === "string" && v.trim().length > 0;
}

function toBool(v: unknown) {
  return v === true || v === "true" || v === 1 || v === "1";
}

function cleanString(v: unknown) {
  return String(v || "").trim();
}

function cleanUrl(v: unknown) {
  if (typeof v !== "string") return "";
  return v.trim();
}

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeImageMode(value: any): "portrait" | "square" {
  return value === "square" ? "square" : "portrait";
}

function normalizeGiftOptions(input: any) {
  const creditEnabled = toBool(input?.creditEnabled);
  const payboxEnabled = toBool(input?.payboxEnabled);

  const creditUrl = creditEnabled ? cleanUrl(input?.creditUrl) : "";
  const payboxUrl = payboxEnabled ? cleanUrl(input?.payboxUrl) : "";

  return {
    creditEnabled,
    creditUrl,
    payboxEnabled,
    payboxUrl,
  };
}

function pickBase64Image(body: any): string {
  const v = body?.previewBase64 ?? body?.base64Image ?? body?.previewImageBase64;
  return typeof v === "string" ? v : "";
}

function isValidBase64Image(v: string) {
  return typeof v === "string" && v.startsWith("data:image");
}

function toObjectId(value: unknown) {
  const id = cleanString(value);

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return null;
  }

  return new mongoose.Types.ObjectId(id);
}

function objectIdToString(value: unknown) {
  if (!value) return "";
  return String(value);
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

    userId: objectIdToString(event.userId),
    producerId: objectIdToString(event.producerId),

    venueOwnerId: objectIdToString(event.venueOwnerId),
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

async function findEventForInvitation(invitation: any) {
  const possibleIds = [
    invitation?.eventId,
    invitation?.productionEventId,
    invitation?.linkedEventId,
  ]
    .map((value) => cleanString(value))
    .filter((value) => mongoose.Types.ObjectId.isValid(value));

  if (!possibleIds.length) return null;

  return Event.findOne({
    _id: {
      $in: possibleIds.map((id) => new mongoose.Types.ObjectId(id)),
    },
  }).lean();
}

async function createOrUpdateEventForInvitation({
  invitation,
  body,
}: {
  invitation: any;
  body: any;
}) {
  if (!toBool(body?.createEvent)) {
    return null;
  }

  const invitationId = String(invitation._id);

  const eventIdFromBody = cleanString(body.eventId);
  const eventIdFromInvitation =
    cleanString(invitation.eventId) ||
    cleanString(invitation.productionEventId) ||
    cleanString(invitation.linkedEventId);

  const existingEventId = mongoose.Types.ObjectId.isValid(eventIdFromBody)
    ? eventIdFromBody
    : mongoose.Types.ObjectId.isValid(eventIdFromInvitation)
      ? eventIdFromInvitation
      : "";

  const venueOwnerObjectId = toObjectId(body.venueOwnerId);
  const customerUserObjectId = toObjectId(invitation.userId || body.userId);

  if (!customerUserObjectId) {
    throw new Error("MISSING_CUSTOMER_USER_ID");
  }

  if (!venueOwnerObjectId) {
    throw new Error("MISSING_OR_INVALID_VENUE_OWNER_ID");
  }

  const eventTitle =
    cleanString(body.eventTitle) ||
    cleanString(body.title) ||
    cleanString(invitation.title) ||
    "אירוע ללא שם";

  const eventType = normalizeEventType(body.eventType || invitation.eventType);
  const eventDate = normalizeEventDate(
    body.eventDate || body.date || invitation.eventDate || invitation.date
  );
  const eventTime =
    cleanString(body.eventTime) ||
    cleanString(body.time) ||
    cleanString(invitation.eventTime) ||
    cleanString(invitation.time);

  if (!eventDate) {
    throw new Error("MISSING_EVENT_DATE");
  }

  if (!eventTime) {
    throw new Error("MISSING_EVENT_TIME");
  }

  const estimatedGuests = Math.max(
    0,
    toNumber(
      body.estimatedGuestCount ??
        body.estimatedGuests ??
        body.maxGuests ??
        invitation.estimatedGuestCount ??
        invitation.estimatedGuests ??
        invitation.maxGuests,
      0
    )
  );

  const location = normalizeLocation(body.location || invitation.location);

  const venueHallId = cleanString(body.venueHallId || invitation.venueHallId);
  const venueHallName = cleanString(body.venueHallName || invitation.venueHallName);

  if (!venueHallId) {
    throw new Error("MISSING_VENUE_HALL_ID");
  }

  const budgetTotal = Math.max(0, toNumber(body.budgetTotal, 0));

  const eventPayload: any = {
    userId: customerUserObjectId,

    venueOwnerId: venueOwnerObjectId,
    venueHallId,
    venueHallName,
    venueAccessStatus: "linked",

    email:
      cleanString(invitation.email) ||
      cleanString(body.email) ||
      `user-${String(customerUserObjectId)}@invistimo.local`,

    eventType,
    title: eventTitle,

    budgetTotal,

    estimatedGuests: estimatedGuests || null,
    estimatedGuestCount: estimatedGuests || null,

    date: eventDate,
    time: eventTime,

    location,

    giftCreditUrl: cleanString(body.giftCreditUrl || invitation.giftCreditUrl),

    maxGuests: estimatedGuests || toNumber(invitation.maxGuests, 0) || 0,

    paymentStatus: body.paymentStatus === "refunded" ? "refunded" : "paid",
    status: "active",

    notes: cleanString(body.notes || invitation.notes),
  };

  if (body.producerId && mongoose.Types.ObjectId.isValid(body.producerId)) {
    eventPayload.producerId = new mongoose.Types.ObjectId(body.producerId);
  }

  let eventDoc: any = null;

  if (existingEventId) {
    eventDoc = await Event.findOneAndUpdate(
      {
        _id: existingEventId,
        userId: customerUserObjectId,
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

  const savedEventId = eventDoc?._id;

  if (!savedEventId) {
    throw new Error("EVENT_SAVE_FAILED");
  }

  await Invitation.collection.updateOne(
    {
      _id: new mongoose.Types.ObjectId(invitationId),
    },
    {
      $set: {
        eventId: savedEventId,
        productionEventId: savedEventId,
        linkedEventId: savedEventId,

        eventTitle,
        eventType,
        eventDate,
        eventTime,

        estimatedGuests,
        estimatedGuestCount: estimatedGuests,
        maxGuests: estimatedGuests || invitation.maxGuests || 0,

        location,

        venueOwnerId: venueOwnerObjectId,
        venueHallId,
        venueHallName,

        updatedAt: new Date(),
      },
    }
  );

  return eventDoc.toObject ? eventDoc.toObject() : eventDoc;
}

/* ============================================================
   GET — שליפת הזמנה לפי invitationId או eventId
============================================================ */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await db();

    const { id } = await context.params;

    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { success: false, error: "Invalid invitation id" },
        { status: 400 }
      );
    }

    const invitation =
      (await Invitation.findById(id).populate("guests").lean()) ||
      (await Invitation.findOne({ eventId: id }).populate("guests").lean()) ||
      (await Invitation.findOne({ productionEventId: id }).populate("guests").lean()) ||
      (await Invitation.findOne({ linkedEventId: id }).populate("guests").lean());

    if (!invitation) {
      return NextResponse.json(
        { success: false, error: "Invitation not found" },
        { status: 404 }
      );
    }

    const event = await findEventForInvitation(invitation);

    return NextResponse.json({
      success: true,
      invitation,
      event: serializeEvent(event),
    });
  } catch (err) {
    console.error("❌ Error in GET /api/invitations/[id]:", err);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}

/* ============================================================
   PUT — עדכון הזמנה קיימת + יצירה/עדכון Event
============================================================ */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await db();

    const { id } = await context.params;

    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { success: false, error: "Invalid invitation id" },
        { status: 400 }
      );
    }

    const body = await request.json();

    const {
      title,
      eventType,
      eventDate,
      eventTime,
      canvasData,
      location,
      orientation,
      imageMode,
    } = body;

    const invitationBeforeUpdate =
      (await Invitation.findById(id).lean()) ||
      (await Invitation.findOne({ eventId: id }).lean()) ||
      (await Invitation.findOne({ productionEventId: id }).lean()) ||
      (await Invitation.findOne({ linkedEventId: id }).lean());

    if (!invitationBeforeUpdate) {
      return NextResponse.json(
        { success: false, error: "Invitation not found" },
        { status: 404 }
      );
    }

    const updatePayload: any = {
      updatedAt: new Date(),
    };

    const finalImageMode = normalizeImageMode(imageMode || orientation);

    if (typeof title === "string" && title.trim()) {
      updatePayload.title = title.trim();
    }

    if (typeof eventType === "string" && eventType.trim()) {
      updatePayload.eventType = eventType.trim();
    }

    if (eventDate) {
      updatePayload.eventDate = normalizeEventDate(eventDate);
    }

    if (typeof eventTime === "string" && eventTime.trim()) {
      updatePayload.eventTime = eventTime;
    }

    if (orientation === "portrait" || orientation === "square") {
      updatePayload.orientation = orientation;
    }

    if (
      location &&
      ((typeof location.address === "string" && location.address.trim()) ||
        location.lat !== undefined ||
        location.lng !== undefined)
    ) {
      updatePayload.location = {
        name: typeof location.name === "string" ? location.name.trim() : "",
        address:
          typeof location.address === "string" ? location.address.trim() : "",
        lat: typeof location.lat === "number" ? location.lat : null,
        lng: typeof location.lng === "number" ? location.lng : null,
      };
    }

    if (body.estimatedGuests !== undefined) {
      updatePayload.estimatedGuests = Math.max(0, toNumber(body.estimatedGuests, 0));
      updatePayload.estimatedGuestCount = updatePayload.estimatedGuests;
      updatePayload.maxGuests = updatePayload.estimatedGuests;
    }

    if (body.venueOwnerId !== undefined) {
      const venueOwnerObjectId = toObjectId(body.venueOwnerId);

      if (venueOwnerObjectId) {
        updatePayload.venueOwnerId = venueOwnerObjectId;
      }
    }

    if (body.venueHallId !== undefined) {
      updatePayload.venueHallId = cleanString(body.venueHallId);
    }

    if (body.venueHallName !== undefined) {
      updatePayload.venueHallName = cleanString(body.venueHallName);
    }

    if (canvasData !== undefined) {
      updatePayload.canvasData = canvasData;
    }

    const previewBase64 = pickBase64Image(body);

    if (isNonEmptyString(previewBase64)) {
      if (!isValidBase64Image(previewBase64)) {
        return NextResponse.json(
          { success: false, error: "INVALID_IMAGE_FORMAT" },
          { status: 400 }
        );
      }

      const publicId = `invistimo/invitations/${String(
        invitationBeforeUpdate._id
      )}_${Date.now()}`;

      const targetWidth = 1080;
      const targetHeight = finalImageMode === "square" ? 1080 : 1920;

      const upload = await cloudinary.uploader.upload(previewBase64, {
        public_id: publicId,
        resource_type: "image",
        overwrite: false,
        invalidate: true,
        format: "jpg",
        transformation: [
          {
            width: targetWidth,
            height: targetHeight,
            crop: "pad",
            background: "#ffffff",
            quality: "100",
          },
        ],
      });

      const imageUrl = upload.secure_url;

      updatePayload.orientation = finalImageMode;
      updatePayload.previewImageUrl = imageUrl;
      updatePayload.headerImageUrl = imageUrl;
      updatePayload.imageUrl = imageUrl;
      updatePayload.previewImage = imageUrl;
    }

    await Invitation.collection.updateOne(
      {
        _id: invitationBeforeUpdate._id,
      },
      {
        $set: updatePayload,
      }
    );

    const invitationAfterBasicUpdate = await Invitation.findById(
      invitationBeforeUpdate._id
    ).lean();

    if (!invitationAfterBasicUpdate) {
      return NextResponse.json(
        { success: false, error: "Invitation not found after update" },
        { status: 404 }
      );
    }

    let event: any = null;

    try {
      event = await createOrUpdateEventForInvitation({
        invitation: invitationAfterBasicUpdate,
        body,
      });
    } catch (eventError: any) {
      console.error("❌ Event sync failed:", eventError?.message || eventError);

      return NextResponse.json(
        {
          success: false,
          error: eventError?.message || "EVENT_SYNC_FAILED",
        },
        { status: 400 }
      );
    }

    const updated = await Invitation.findById(invitationBeforeUpdate._id)
      .populate("guests")
      .lean();

    return NextResponse.json({
      success: true,
      invitation: updated,
      event: serializeEvent(event || (await findEventForInvitation(updated))),
      previewImageUrl: (updated as any)?.previewImageUrl ?? null,
      headerImageUrl: (updated as any)?.headerImageUrl ?? null,
      imageUrl: (updated as any)?.imageUrl ?? null,
      previewImage: (updated as any)?.previewImage ?? null,
    });
  } catch (err: any) {
    console.error("❌ Error in PUT /api/invitations/[id]:", err?.message || err);
    return NextResponse.json(
      { success: false, error: "Server error while updating" },
      { status: 500 }
    );
  }
}

/* ============================================================
   PATCH — עדכון חלקי
============================================================ */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await db();

    const { id } = await context.params;

    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { success: false, error: "Invalid invitation id" },
        { status: 400 }
      );
    }

    const body = await request.json();

    const updatePayload: any = {
      updatedAt: new Date(),
    };

    if (body?.giftOptions !== undefined) {
      updatePayload.giftOptions = normalizeGiftOptions(body.giftOptions);
    }

    if (body?.invitationSettings !== undefined) {
      updatePayload.invitationSettings = body.invitationSettings;
    }

    if (body?.eventId !== undefined && mongoose.Types.ObjectId.isValid(body.eventId)) {
      const eventObjectId = new mongoose.Types.ObjectId(body.eventId);

      updatePayload.eventId = eventObjectId;
      updatePayload.productionEventId = eventObjectId;
      updatePayload.linkedEventId = eventObjectId;
    }

    if (body?.venueOwnerId !== undefined) {
      const venueOwnerObjectId = toObjectId(body.venueOwnerId);

      if (venueOwnerObjectId) {
        updatePayload.venueOwnerId = venueOwnerObjectId;
      }
    }

    if (body?.venueHallId !== undefined) {
      updatePayload.venueHallId = cleanString(body.venueHallId);
    }

    if (body?.venueHallName !== undefined) {
      updatePayload.venueHallName = cleanString(body.venueHallName);
    }

    if (Object.keys(updatePayload).length === 1) {
      return NextResponse.json(
        { success: false, error: "NO_FIELDS_TO_UPDATE" },
        { status: 400 }
      );
    }

    const updatedRaw = await Invitation.findByIdAndUpdate(
      id,
      { $set: updatePayload },
      { new: true, strict: false }
    )
      .populate("guests")
      .lean();

    if (!updatedRaw) {
      return NextResponse.json(
        { success: false, error: "Invitation not found" },
        { status: 404 }
      );
    }

    const event = await findEventForInvitation(updatedRaw);

    return NextResponse.json({
      success: true,
      invitation: updatedRaw,
      event: serializeEvent(event),
    });
  } catch (err) {
    console.error("❌ Error in PATCH /api/invitations/[id]:", err);
    return NextResponse.json(
      { success: false, error: "Server error while patching" },
      { status: 500 }
    );
  }
}