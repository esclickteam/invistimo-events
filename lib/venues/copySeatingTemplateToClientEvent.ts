import mongoose from "mongoose";

function cleanString(value: unknown) {
  return String(value || "").trim();
}

function getCollection(name: string) {
  return mongoose.connection.db?.collection(name);
}

/**
 * Materialize / attach a venue seating template onto the linked client event.
 *
 * Critical: seatingtables has a unique index on eventId alone. Client-invite
 * may already have inserted a doc for this event (without invitationId).
 * Upserting by {eventId, invitationId} therefore collides — always key by
 * eventId and attach invitation/user ownership fields.
 */
export async function copySeatingTemplateToClientEvent({
  event,
  invitation,
  userId,
  template,
}: {
  event: any;
  invitation: any;
  userId: mongoose.Types.ObjectId | string;
  template: any;
}) {
  const seatingTables = getCollection("seatingtables");

  if (!seatingTables) {
    throw new Error("לא נמצאה קולקשן seatingtables");
  }

  const eventId = event?._id;
  if (!eventId) {
    throw new Error("חסר eventId להעתקת תבנית הושבה");
  }

  const canvas = template?.canvas || {};
  const now = new Date();
  const templateTables = Array.isArray(template?.tables) ? template.tables : [];

  const existing = await seatingTables.findOne({ eventId });
  // Preserve any already-synced tables (and guest assignments) from venue sync.
  const tables =
    existing && Array.isArray(existing.tables) && existing.tables.length > 0
      ? existing.tables
      : templateTables;

  await seatingTables.updateOne(
    { eventId },
    {
      $set: {
        userId,
        eventId,
        invitationId: invitation?._id,
        shareId: cleanString(invitation?.shareId),

        venueOwnerId: event.venueOwnerId,
        venueHallId: cleanString(event.venueHallId),
        venueHallName: cleanString(event.venueHallName),

        source: "venue_seating_template",
        sourceTemplateId: template?._id || template?.id,

        tables,
        background: canvas.background || existing?.background || null,
        canvasView: canvas.canvasView || existing?.canvasView || null,
        zones: Array.isArray(canvas.zones)
          ? canvas.zones
          : Array.isArray(existing?.zones)
            ? existing.zones
            : [],

        updatedAt: now,
      },
      $setOnInsert: {
        createdAt: now,
      },
    },
    { upsert: true }
  );
}
