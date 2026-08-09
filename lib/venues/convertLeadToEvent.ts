import mongoose from "mongoose";
import Event from "@/models/Event";
import VenueEvent from "@/models/VenueEvent";
import VenueLead from "@/models/VenueLead";
import {
  isVenueEventStatus,
  venueLifecycleToInvistimoStatus,
  type VenueEventLifecycleStatus,
} from "@/lib/venues/statuses";
import { writeVenueAudit } from "@/lib/venues/audit";

function cleanString(value: unknown) {
  return String(value || "").trim();
}

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeEventType(value: unknown) {
  const raw = cleanString(value);
  const lower = raw.toLowerCase();
  if (lower.includes("חתונה") || lower.includes("wedding")) return "wedding";
  if (lower.includes("בר מצווה")) return "bar-mitzvah";
  if (lower.includes("בת מצווה")) return "bat-mitzvah";
  if (lower.includes("בריתה")) return "brita";
  if (lower.includes("ברית")) return "brit";
  if (lower.includes("חינה")) return "henna";
  if (
    [
      "wedding",
      "bar-mitzvah",
      "bat-mitzvah",
      "brit",
      "brita",
      "henna",
      "other",
    ].includes(raw)
  ) {
    return raw;
  }
  return "other";
}

export type ConvertLeadInput = {
  leadId: string;
  venueId: string;
  ownerId: string;
  actorUserId: string;
  hallName?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  notes?: string;
  paidAmount?: number;
  lifecycleStatus?: VenueEventLifecycleStatus;
};

/**
 * Idempotent lead → Event + VenueEvent conversion.
 * - Does not mutate unrelated regular Events
 * - Does not require venueId on Event schema globally
 * - Reuses existing conversion if lead already closed with ids
 */
export async function convertLeadToVenueEvent(input: ConvertLeadInput) {
  const lead = await VenueLead.findOne({
    _id: input.leadId,
    ownerId: input.ownerId,
    hallId: input.venueId,
  });

  if (!lead) {
    return { ok: false as const, status: 404, message: "ליד לא נמצא" };
  }

  // Idempotent: already converted
  if (lead.status === "closed" && (lead.venueEventId || lead.eventId)) {
    let venueEvent = lead.venueEventId
      ? await VenueEvent.findById(lead.venueEventId)
      : null;

    // Legacy: eventId pointed at VenueEvent
    if (!venueEvent && lead.eventId && mongoose.Types.ObjectId.isValid(lead.eventId)) {
      venueEvent = await VenueEvent.findById(lead.eventId);
    }

    let linkedEvent = null as any;
    if (venueEvent?.linkedEventId) {
      linkedEvent = await Event.findById(venueEvent.linkedEventId);
    } else if (lead.eventId && mongoose.Types.ObjectId.isValid(lead.eventId)) {
      linkedEvent = await Event.findById(lead.eventId);
    }

    // Repair missing link if needed
    if (venueEvent && !venueEvent.linkedEventId && linkedEvent) {
      venueEvent.linkedEventId = linkedEvent._id;
      await venueEvent.save();
    }

    if (venueEvent && linkedEvent) {
      return {
        ok: true as const,
        alreadyExisted: true,
        venueEventId: String(venueEvent._id),
        eventId: String(linkedEvent._id),
        lead,
        venueEvent,
        event: linkedEvent,
      };
    }
  }

  const date =
    cleanString(input.date) || cleanString(lead.requestedDate) || "";
  const startTime = cleanString(input.startTime) || "19:30";
  const endTime = cleanString(input.endTime) || "00:30";
  const notes = cleanString(input.notes);
  const lifecycleStatus: VenueEventLifecycleStatus = isVenueEventStatus(
    input.lifecycleStatus
  )
    ? (input.lifecycleStatus as VenueEventLifecycleStatus)
    : "confirmed";

  if (!date) {
    return {
      ok: false as const,
      status: 400,
      message: "חובה להזין תאריך אירוע לסגירת הליד",
    };
  }

  const eventType = normalizeEventType(lead.eventType);
  const title = lead.eventType || `אירוע של ${lead.name}`;
  const clientEmail =
    cleanString(lead.email) ||
    `venue-lead-${String(lead._id)}@invistimo.local`;
  const guests = Math.max(0, toNumber(lead.guests, 0));
  const budget = Math.max(0, toNumber(lead.budget, 0));
  const paidAmount = Math.max(0, toNumber(input.paidAmount, 0));

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Re-check inside transaction for race
    const fresh = await VenueLead.findById(lead._id).session(session);
    if (!fresh) {
      await session.abortTransaction();
      return { ok: false as const, status: 404, message: "ליד לא נמצא" };
    }

    if (fresh.status === "closed" && fresh.venueEventId) {
      const existingVe = await VenueEvent.findById(fresh.venueEventId).session(
        session
      );
      await session.abortTransaction();
      return {
        ok: true as const,
        alreadyExisted: true,
        venueEventId: String(fresh.venueEventId),
        eventId: String(fresh.eventId || existingVe?.linkedEventId || ""),
        lead: fresh,
        venueEvent: existingVe,
        event: null,
      };
    }

    const [createdEvent] = await Event.create(
      [
        {
          userId: new mongoose.Types.ObjectId(input.ownerId),
          venueOwnerId: new mongoose.Types.ObjectId(input.ownerId),
          venueHallId: input.venueId,
          venueHallName: input.hallName || "",
          venueLinkedAt: new Date(),
          venueAccessStatus: "linked",
          email: clientEmail,
          eventType,
          title: lead.name ? `${title} - ${lead.name}` : title,
          budgetTotal: budget,
          estimatedGuests: guests || null,
          estimatedGuestCount: guests || null,
          date,
          time: startTime,
          location: { address: "" },
          zones: [],
          planning: {
            eventDefinition: { goal: "", vibe: "", size: "", notes: "" },
            concept: "",
          },
          maxGuests: guests || 0,
          paymentStatus: paidAmount > 0 ? "paid" : "paid",
          status: venueLifecycleToInvistimoStatus(lifecycleStatus),
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
          eventType: lead.eventType || eventType,
          clientName: lead.name || "",
          clientPhone: lead.phone || "",
          clientEmail: lead.email || "",
          date,
          startTime,
          endTime,
          guests,
          status: lifecycleStatus,
          budget,
          paidAmount,
          notes,
          linkedEventId: createdEvent._id,
          createdFromLeadId: fresh._id,
          createdBy: new mongoose.Types.ObjectId(input.actorUserId),
        },
      ],
      { session }
    );

    fresh.status = "closed";
    fresh.eventId = String(createdEvent._id);
    fresh.venueEventId = String(createdVenueEvent._id);
    fresh.lastActivity = "נסגר אירוע ונוצר ביומן";
    fresh.activities = fresh.activities || [];
    fresh.activities.unshift({
      id: `activity-${Date.now()}`,
      type: "contract",
      title: "אירוע נסגר ונוצר ביומן",
      description: "הליד נסגר; נוצרו VenueEvent + Event מקושר.",
      date: new Date().toLocaleString("he-IL"),
    });
    await fresh.save({ session });

    await session.commitTransaction();

    await writeVenueAudit({
      venueId: input.venueId,
      ownerId: input.ownerId,
      actorUserId: input.actorUserId,
      action: "lead.convert",
      targetType: "VenueLead",
      targetId: String(fresh._id),
      meta: {
        venueEventId: String(createdVenueEvent._id),
        eventId: String(createdEvent._id),
      },
    });

    return {
      ok: true as const,
      alreadyExisted: false,
      venueEventId: String(createdVenueEvent._id),
      eventId: String(createdEvent._id),
      lead: fresh,
      venueEvent: createdVenueEvent,
      event: createdEvent,
    };
  } catch (error: any) {
    await session.abortTransaction();

    // Unique createdFromLeadId race → return existing
    if (error?.code === 11000) {
      const existing = await VenueEvent.findOne({
        createdFromLeadId: input.leadId,
      });
      if (existing) {
        return {
          ok: true as const,
          alreadyExisted: true,
          venueEventId: String(existing._id),
          eventId: String(existing.linkedEventId || ""),
          lead,
          venueEvent: existing,
          event: null,
        };
      }
    }

    throw error;
  } finally {
    session.endSession();
  }
}
