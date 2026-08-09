/**
 * Dry-run by default: report VenueEvents missing linkedEventId.
 * Pass --write to create linked Events (additive, never deletes).
 *
 * Usage:
 *   npx tsx scripts/venues/backfill-venue-event-links.ts
 *   npx tsx scripts/venues/backfill-venue-event-links.ts --write
 */
import mongoose from "mongoose";
import { connectDB } from "../../lib/db";
import VenueEvent from "../../models/VenueEvent";
import Event from "../../models/Event";
import { venueLifecycleToInvistimoStatus } from "../../lib/venues/statuses";

async function main() {
  const write = process.argv.includes("--write");
  await connectDB();

  const orphans = await VenueEvent.find({
    $or: [{ linkedEventId: null }, { linkedEventId: { $exists: false } }],
  }).lean();

  console.log(`Found ${orphans.length} VenueEvents without linkedEventId`);

  let created = 0;
  for (const ve of orphans as any[]) {
    console.log(
      `- ${ve._id} hall=${ve.hallId} title=${ve.title} date=${ve.date}`
    );
    if (!write) continue;

    const fallbackEmail =
      String(ve.clientEmail || "").trim() ||
      `venue-backfill-${ve._id}@invistimo.local`;

    const event = await Event.create({
      userId: ve.ownerId,
      venueOwnerId: ve.ownerId,
      venueHallId: ve.hallId,
      venueHallName: ve.hallName || "",
      venueLinkedAt: new Date(),
      venueAccessStatus: "linked",
      email: fallbackEmail,
      eventType: ve.eventType || "other",
      title: ve.clientName ? `${ve.title} - ${ve.clientName}` : ve.title,
      budgetTotal: ve.budget || 0,
      estimatedGuests: ve.guests || null,
      estimatedGuestCount: ve.guests || null,
      date: ve.date,
      time: ve.startTime || "19:30",
      location: { address: "" },
      zones: [],
      planning: {
        eventDefinition: { goal: "", vibe: "", size: "", notes: "" },
        concept: "",
      },
      maxGuests: ve.guests || 0,
      paymentStatus: "paid",
      status: venueLifecycleToInvistimoStatus(ve.status || "confirmed"),
      notes: ve.notes || "",
    });

    await VenueEvent.updateOne(
      { _id: ve._id },
      { $set: { linkedEventId: event._id } }
    );
    created += 1;
  }

  console.log(
    write
      ? `Created ${created} linked Events`
      : "Dry-run only. Re-run with --write to apply."
  );
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
