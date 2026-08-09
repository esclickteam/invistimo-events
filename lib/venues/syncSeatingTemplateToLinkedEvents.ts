import mongoose from "mongoose";
import Event from "@/models/Event";
import VenueEvent from "@/models/VenueEvent";

type SyncResult = {
  seatingDocsUpdated: number;
  eventsTagged: number;
  venueEventsTagged: number;
};

function clean(value: unknown) {
  return String(value || "").trim();
}

function asObjectId(value: unknown) {
  const raw = clean(value);
  if (!raw || !mongoose.Types.ObjectId.isValid(raw)) return null;
  return new mongoose.Types.ObjectId(raw);
}

/**
 * Propagate a venue seating template into every linked client seating layout
 * and mark linked Events / VenueEvents so UIs can refresh live.
 *
 * Rules:
 * - Never invents Events
 * - Preserves seated guests on existing tables when seat ids match by merging
 *   guest assignments onto the new table geometry when possible
 * - Idempotent upsert by sourceTemplateId / event selection
 */
export async function syncSeatingTemplateToLinkedEvents(input: {
  template: any;
  hallId: string;
  ownerId: string;
}): Promise<SyncResult> {
  const templateId = asObjectId(input.template?._id || input.template?.id);
  const hallId = clean(input.hallId);
  const ownerId = asObjectId(input.ownerId);

  if (!templateId || !hallId || !ownerId) {
    return { seatingDocsUpdated: 0, eventsTagged: 0, venueEventsTagged: 0 };
  }

  const db = mongoose.connection?.db;
  if (!db) {
    return { seatingDocsUpdated: 0, eventsTagged: 0, venueEventsTagged: 0 };
  }

  const seatingTables = db.collection("seatingtables");
  const canvas = input.template?.canvas || {};
  const tables = Array.isArray(input.template?.tables)
    ? input.template.tables
    : [];
  const now = new Date();
  const templateUpdatedAt =
    input.template?.updatedAt instanceof Date
      ? input.template.updatedAt
      : now;

  // 1) Update seating docs already materialised from this template
  const existingByTemplate = await seatingTables
    .find({
      source: "venue_seating_template",
      sourceTemplateId: { $in: [templateId, String(templateId)] },
    })
    .toArray();

  let seatingDocsUpdated = 0;

  for (const doc of existingByTemplate) {
    const mergedTables = mergeGuestAssignments(
      Array.isArray(doc.tables) ? doc.tables : [],
      tables
    );

    await seatingTables.updateOne(
      { _id: doc._id },
      {
        $set: {
          tables: mergedTables,
          background: canvas.background || null,
          canvasView: canvas.canvasView || null,
          zones: Array.isArray(canvas.zones) ? canvas.zones : [],
          sourceTemplateUpdatedAt: templateUpdatedAt,
          venueHallId: hallId,
          updatedAt: now,
        },
      }
    );
    seatingDocsUpdated += 1;
  }

  // 2) Events that selected this template (invite flow) — ensure seating exists
  const selectedEvents = await Event.find({
    venueOwnerId: ownerId,
    venueHallId: hallId,
    venueAccessStatus: "linked",
    $or: [
      { venueClientSelectedSeatingTemplateId: templateId },
      { venueClientSelectedSeatingTemplateId: String(templateId) },
    ],
  })
    .select("_id userId venueOwnerId venueHallId venueHallName")
    .lean();

  for (const event of selectedEvents as any[]) {
    const eventId = event._id;
    const filter: Record<string, unknown> = { eventId };

    const existing = await seatingTables.findOne(filter);
    if (existing) {
      const mergedTables = mergeGuestAssignments(
        Array.isArray(existing.tables) ? existing.tables : [],
        tables
      );
      await seatingTables.updateOne(
        { _id: existing._id },
        {
          $set: {
            tables: mergedTables,
            background: canvas.background || null,
            canvasView: canvas.canvasView || null,
            zones: Array.isArray(canvas.zones) ? canvas.zones : [],
            source: "venue_seating_template",
            sourceTemplateId: templateId,
            sourceTemplateUpdatedAt: templateUpdatedAt,
            venueOwnerId: ownerId,
            venueHallId: hallId,
            venueHallName: clean(event.venueHallName),
            updatedAt: now,
          },
        }
      );
      seatingDocsUpdated += 1;
    } else {
      await seatingTables.insertOne({
        eventId,
        userId: event.userId || null,
        venueOwnerId: ownerId,
        venueHallId: hallId,
        venueHallName: clean(event.venueHallName),
        source: "venue_seating_template",
        sourceTemplateId: templateId,
        sourceTemplateUpdatedAt: templateUpdatedAt,
        tables,
        background: canvas.background || null,
        canvasView: canvas.canvasView || null,
        zones: Array.isArray(canvas.zones) ? canvas.zones : [],
        createdAt: now,
        updatedAt: now,
      });
      seatingDocsUpdated += 1;
    }
  }

  // 3) Tag Event + VenueEvent for live clients (version bump)
  const eventsTagged = await Event.updateMany(
    {
      venueOwnerId: ownerId,
      venueHallId: hallId,
      $or: [
        { venueClientSelectedSeatingTemplateId: templateId },
        { venueClientSelectedSeatingTemplateId: String(templateId) },
      ],
    },
    {
      $set: {
        venueSeatingTemplateSyncedAt: now,
        venueClientSelectedSeatingTemplateName: clean(input.template?.name),
        updatedAt: now,
      },
    }
  );

  const venueEventsTagged = await VenueEvent.updateMany(
    {
      ownerId,
      hallId,
      $or: [
        { selectedSeatingTemplateId: templateId },
        { selectedSeatingTemplateId: String(templateId) },
        { linkedEventId: { $in: selectedEvents.map((e: any) => e._id) } },
      ],
    },
    {
      $set: {
        selectedSeatingTemplateId: templateId,
        seatingTemplateSyncedAt: now,
        updatedAt: now,
      },
    }
  );

  return {
    seatingDocsUpdated,
    eventsTagged: Number((eventsTagged as any)?.modifiedCount || 0),
    venueEventsTagged: Number((venueEventsTagged as any)?.modifiedCount || 0),
  };
}

/**
 * Keep guest seat assignments when table/seat ids still exist on the new layout.
 */
function mergeGuestAssignments(existingTables: any[], nextTables: any[]) {
  const guestBySeat = new Map<string, any>();

  for (const table of existingTables) {
    const tableId = clean(table?.id || table?._id);
    const seats = Array.isArray(table?.seats) ? table.seats : [];
    for (const seat of seats) {
      const seatId = clean(seat?.id || seat?._id);
      if (!seatId) continue;
      if (seat?.guest || seat?.guestId || seat?.occupied) {
        guestBySeat.set(`${tableId}::${seatId}`, seat);
      }
    }
  }

  return nextTables.map((table) => {
    const tableId = clean(table?.id || table?._id);
    const seats = Array.isArray(table?.seats) ? table.seats : [];
    return {
      ...table,
      seats: seats.map((seat: any) => {
        const seatId = clean(seat?.id || seat?._id);
        const prev = guestBySeat.get(`${tableId}::${seatId}`);
        if (!prev) return seat;
        return {
          ...seat,
          guest: prev.guest ?? seat.guest,
          guestId: prev.guestId ?? seat.guestId,
          occupied: prev.occupied ?? seat.occupied,
          guestName: prev.guestName ?? seat.guestName,
          rsvpStatus: prev.rsvpStatus ?? seat.rsvpStatus,
        };
      }),
    };
  });
}
