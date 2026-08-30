import mongoose from "mongoose";
import Event from "@/models/Event";
import VenueEvent from "@/models/VenueEvent";
import {
  isVenueEventStatus,
  venueLifecycleToInvistimoStatus,
  type VenueEventLifecycleStatus,
} from "@/lib/venues/statuses";
import { prepareEventLocation } from "@/lib/eventLocation";

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

export function cleanString(value: unknown) {
  return String(value || "").trim();
}

export function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function normalizeDateOnly(value: unknown) {
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

export function normalizeEventType(value: unknown) {
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

/**
 * VenueEvent = lifecycle + hall tenant source of truth.
 * Linked Event supplements title/guests when available.
 */
export function serializeVenueEvent(
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
    hallName: cleanString(venueEvent.hallName) || cleanString(hall?.name),

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

function tenantQuery(ownerId: string, venueId: string) {
  return {
    ownerId: new mongoose.Types.ObjectId(ownerId),
    hallId: venueId,
  };
}

export type ListVenueEventsInput = {
  ownerId: string;
  venueId: string;
  hall?: any;
  from?: string;
  to?: string;
};

export async function listVenueEventsForHall(input: ListVenueEventsInput) {
  const query = tenantQuery(input.ownerId, input.venueId);

  const venueEvents = await VenueEvent.find(query)
    .sort({ date: 1, startTime: 1 })
    .lean();

  const linkedEventById = await loadLinkedEventsMap(venueEvents);

  let serializedEvents = venueEvents.map((venueEvent: any) => {
    const linkedEvent = venueEvent.linkedEventId
      ? linkedEventById.get(String(venueEvent.linkedEventId)) || null
      : null;

    return serializeVenueEvent(venueEvent, input.hall, linkedEvent);
  });

  const from = cleanString(input.from);
  const to = cleanString(input.to);

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

  return serializedEvents;
}

export type GetVenueEventCanonicalInput = {
  ownerId: string;
  /** Hall/venue id — preferred for tenant scoping; optional when looking up by linkedEventId */
  venueId?: string;
  venueEventId?: string;
  linkedEventId?: string;
  hall?: any;
};

export async function getVenueEventCanonical(input: GetVenueEventCanonicalInput) {
  const venueEventId = cleanString(input.venueEventId);
  const linkedEventId = cleanString(input.linkedEventId);
  const venueId = cleanString(input.venueId);

  const ownerObjectId = new mongoose.Types.ObjectId(input.ownerId);
  const baseQuery: Record<string, unknown> = {
    ownerId: ownerObjectId,
  };

  if (venueId) {
    baseQuery.hallId = venueId;
  }

  let venueEvent: any = null;

  if (venueEventId && mongoose.Types.ObjectId.isValid(venueEventId)) {
    venueEvent = await VenueEvent.findOne({
      ...baseQuery,
      _id: venueEventId,
    }).lean();
  }

  if (!venueEvent && linkedEventId && mongoose.Types.ObjectId.isValid(linkedEventId)) {
    venueEvent = await VenueEvent.findOne({
      ...baseQuery,
      linkedEventId: new mongoose.Types.ObjectId(linkedEventId),
    }).lean();
  }

  if (!venueEvent) {
    return null;
  }

  const linkedEvent = venueEvent.linkedEventId
    ? await Event.findById(venueEvent.linkedEventId).lean()
    : null;

  return {
    venueEvent,
    linkedEvent,
    serialized: serializeVenueEvent(venueEvent, input.hall, linkedEvent),
  };
}

export type CreateVenueCalendarEventInput = {
  ownerId: string;
  venueId: string;
  hallName: string;
  hallCapacity?: number;
  actorUserId: string;
  body: Record<string, unknown>;
};

export async function createVenueCalendarEvent(input: CreateVenueCalendarEventInput) {
  const body = input.body;

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

  const budgetTotal = Math.max(0, toNumber(body.budgetTotal ?? body.budget, 0));

  const paidAmount = Math.max(0, toNumber(body.paidAmount, 0));

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
    return { ok: false as const, status: 400, message: "חובה להזין שם אירוע" };
  }

  if (!date) {
    return { ok: false as const, status: 400, message: "חובה להזין תאריך אירוע" };
  }

  if (!startTime) {
    return { ok: false as const, status: 400, message: "חובה להזין שעה" };
  }

  const fallbackEmail = `venue-${input.ownerId}@invistimo.local`;
  const invistimoStatus = venueLifecycleToInvistimoStatus(lifecycleStatus);

  const locationBody = body.location as Record<string, unknown> | string | undefined;
  const { location } = await prepareEventLocation({ input: locationBody });

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const [createdEvent] = await Event.create(
      [
        {
          userId: new mongoose.Types.ObjectId(input.ownerId),
          venueOwnerId: new mongoose.Types.ObjectId(input.ownerId),
          venueHallId: input.venueId,
          venueHallName: input.hallName || "",
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
          location,
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
          maxGuests: guests || toNumber(input.hallCapacity, 0) || 0,
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
          ownerId: new mongoose.Types.ObjectId(input.ownerId),
          hallId: input.venueId,
          hallName: input.hallName || "",
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
          createdBy: new mongoose.Types.ObjectId(input.actorUserId),
        },
      ],
      { session }
    );

    await session.commitTransaction();

    return {
      ok: true as const,
      venueEvent: createdVenueEvent,
      linkedEvent: createdEvent,
      serialized: serializeVenueEvent(createdVenueEvent, null, createdEvent),
    };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}

export type VenueEventPatch = {
  title?: string;
  eventType?: string;
  clientName?: string;
  clientPhone?: string;
  clientEmail?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  time?: string;
  guests?: number;
  estimatedGuests?: number;
  estimatedGuestCount?: number;
  budget?: number;
  paidAmount?: number;
  status?: VenueEventLifecycleStatus;
  notes?: string;
  color?: string;
};

export type UpdateVenueCalendarEventInput = {
  ownerId: string;
  venueId: string;
  venueEventId: string;
  patch: VenueEventPatch;
  hall?: any;
};

/**
 * Updates VenueEvent and linked Event in sync.
 * NEVER creates a new Event when linkedEventId already exists.
 */
export async function updateVenueCalendarEvent(input: UpdateVenueCalendarEventInput) {
  const venueEventId = cleanString(input.venueEventId);

  if (!venueEventId || !mongoose.Types.ObjectId.isValid(venueEventId)) {
    return { ok: false as const, status: 400, message: "מזהה אירוע לא תקין" };
  }

  const canonical = await getVenueEventCanonical({
    ownerId: input.ownerId,
    venueId: input.venueId,
    venueEventId,
    hall: input.hall,
  });

  if (!canonical) {
    return { ok: false as const, status: 404, message: "האירוע לא נמצא" };
  }

  const { venueEvent, linkedEvent } = canonical;
  const patch = input.patch;

  const venuePatch: Record<string, unknown> = {};
  const eventPatch: Record<string, unknown> = {};

  if ("title" in patch) {
    venuePatch.title = cleanString(patch.title);
    if (linkedEvent) {
      const clientName = cleanString(
        "clientName" in patch ? patch.clientName : venueEvent.clientName
      );
      eventPatch.title = clientName
        ? `${venuePatch.title} - ${clientName}`
        : venuePatch.title;
    }
  }

  if ("eventType" in patch) {
    const raw = cleanString(patch.eventType);
    venuePatch.eventType = raw;
    if (linkedEvent) {
      eventPatch.eventType = normalizeEventType(raw);
    }
  }

  if ("clientName" in patch) {
    venuePatch.clientName = cleanString(patch.clientName);
    if (linkedEvent) {
      const title = cleanString(
        "title" in patch ? patch.title : venueEvent.title
      );
      eventPatch.title = venuePatch.clientName
        ? `${title} - ${venuePatch.clientName}`
        : title;
    }
  }

  if ("clientPhone" in patch) {
    venuePatch.clientPhone = cleanString(patch.clientPhone);
  }

  if ("clientEmail" in patch) {
    venuePatch.clientEmail = cleanString(patch.clientEmail);
    if (linkedEvent) {
      eventPatch.email = cleanString(patch.clientEmail) || linkedEvent.email;
    }
  }

  if ("date" in patch) {
    const date = normalizeDateOnly(patch.date);
    if (date) {
      venuePatch.date = date;
      if (linkedEvent) {
        eventPatch.date = date;
      }
    }
  }

  const startTimeRaw =
    patch.startTime !== undefined
      ? patch.startTime
      : patch.time !== undefined
        ? patch.time
        : undefined;

  if (startTimeRaw !== undefined) {
    const startTime = cleanString(startTimeRaw);
    venuePatch.startTime = startTime;
    if (linkedEvent) {
      eventPatch.time = startTime;
    }
  }

  if ("endTime" in patch) {
    venuePatch.endTime = cleanString(patch.endTime);
  }

  const guestsRaw =
    patch.guests ?? patch.estimatedGuests ?? patch.estimatedGuestCount;

  if (guestsRaw !== undefined) {
    const guests = Math.max(0, toNumber(guestsRaw, 0));
    venuePatch.guests = guests;
    if (linkedEvent) {
      eventPatch.estimatedGuests = guests || null;
      eventPatch.estimatedGuestCount = guests || null;
      eventPatch.maxGuests = guests;
    }
  }

  if ("budget" in patch) {
    const budget = Math.max(0, toNumber(patch.budget, 0));
    venuePatch.budget = budget;
    if (linkedEvent) {
      eventPatch.budgetTotal = budget;
    }
  }

  if ("paidAmount" in patch) {
    venuePatch.paidAmount = Math.max(0, toNumber(patch.paidAmount, 0));
  }

  if ("notes" in patch) {
    venuePatch.notes = cleanString(patch.notes);
    if (linkedEvent) {
      eventPatch.notes = cleanString(patch.notes);
    }
  }

  if ("color" in patch) {
    venuePatch.color = cleanString(patch.color);
  }

  let lifecycleStatus: VenueEventLifecycleStatus | undefined;

  if ("status" in patch && isVenueEventStatus(patch.status)) {
    lifecycleStatus = patch.status;
    venuePatch.status = lifecycleStatus;
    if (linkedEvent) {
      eventPatch.status = venueLifecycleToInvistimoStatus(lifecycleStatus);
    }
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const updatedVenueEvent = await VenueEvent.findOneAndUpdate(
      {
        _id: venueEventId,
        ...tenantQuery(input.ownerId, input.venueId),
      },
      { $set: venuePatch },
      { new: true, runValidators: true, session }
    );

    if (!updatedVenueEvent) {
      await session.abortTransaction();
      return { ok: false as const, status: 404, message: "האירוע לא נמצא" };
    }

    let updatedLinkedEvent = linkedEvent;

    // Only update existing linked Event — never create a new one here
    if (linkedEvent && venueEvent.linkedEventId && Object.keys(eventPatch).length) {
      updatedLinkedEvent = await Event.findOneAndUpdate(
        {
          _id: venueEvent.linkedEventId,
          venueOwnerId: new mongoose.Types.ObjectId(input.ownerId),
          venueHallId: input.venueId,
        },
        { $set: eventPatch },
        { new: true, runValidators: true, session }
      );

      if (!updatedLinkedEvent) {
        await session.abortTransaction();
        return {
          ok: false as const,
          status: 404,
          message: "האירוע המקושר לא נמצא",
        };
      }
    }

    await session.commitTransaction();

    return {
      ok: true as const,
      venueEvent: updatedVenueEvent,
      linkedEvent: updatedLinkedEvent,
      serialized: serializeVenueEvent(
        updatedVenueEvent,
        input.hall,
        updatedLinkedEvent
      ),
      alreadyCancelled: false,
    };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}

export type CancelVenueCalendarEventInput = {
  ownerId: string;
  venueId: string;
  venueEventId: string;
  hall?: any;
};

/**
 * Soft-cancel: VenueEvent.status=cancelled, linked Event.status=archived.
 * Idempotent when already cancelled.
 */
export async function cancelVenueCalendarEvent(input: CancelVenueCalendarEventInput) {
  const venueEventId = cleanString(input.venueEventId);

  if (!venueEventId || !mongoose.Types.ObjectId.isValid(venueEventId)) {
    return { ok: false as const, status: 400, message: "מזהה אירוע לא תקין" };
  }

  const canonical = await getVenueEventCanonical({
    ownerId: input.ownerId,
    venueId: input.venueId,
    venueEventId,
    hall: input.hall,
  });

  if (!canonical) {
    return { ok: false as const, status: 404, message: "האירוע לא נמצא" };
  }

  const { venueEvent, linkedEvent } = canonical;

  if (venueEvent.status === "cancelled") {
    return {
      ok: true as const,
      venueEvent,
      linkedEvent,
      serialized: canonical.serialized,
      alreadyCancelled: true,
    };
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const updatedVenueEvent = await VenueEvent.findOneAndUpdate(
      {
        _id: venueEventId,
        ...tenantQuery(input.ownerId, input.venueId),
      },
      { $set: { status: "cancelled" } },
      { new: true, runValidators: true, session }
    );

    if (!updatedVenueEvent) {
      await session.abortTransaction();
      return { ok: false as const, status: 404, message: "האירוע לא נמצא" };
    }

    let updatedLinkedEvent = linkedEvent;

    if (linkedEvent && venueEvent.linkedEventId) {
      updatedLinkedEvent = await Event.findOneAndUpdate(
        {
          _id: venueEvent.linkedEventId,
          venueOwnerId: new mongoose.Types.ObjectId(input.ownerId),
          venueHallId: input.venueId,
        },
        {
          $set: {
            status: venueLifecycleToInvistimoStatus("cancelled"),
          },
        },
        { new: true, runValidators: true, session }
      );
    }

    await session.commitTransaction();

    return {
      ok: true as const,
      venueEvent: updatedVenueEvent,
      linkedEvent: updatedLinkedEvent,
      serialized: serializeVenueEvent(
        updatedVenueEvent,
        input.hall,
        updatedLinkedEvent
      ),
      alreadyCancelled: false,
    };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}
