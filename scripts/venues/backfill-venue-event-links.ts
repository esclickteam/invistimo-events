/**
 * Safe VenueEvent ↔ Event linkage backfill.
 *
 * Rules:
 * - Dry-run by default
 * - NEVER invent / create new Events
 * - Only link when match is unambiguous
 * - Idempotent
 *
 * Usage:
 *   npx tsx scripts/venues/backfill-venue-event-links.ts
 *   npx tsx scripts/venues/backfill-venue-event-links.ts --write
 */
import mongoose from "mongoose";
import { connectDB } from "../../lib/db";
import VenueEvent from "../../models/VenueEvent";
import Event from "../../models/Event";

type Bucket =
  | "linked_already"
  | "safe_to_link"
  | "ambiguous"
  | "no_matching_event"
  | "conflict_linked_elsewhere";

function clean(v: unknown) {
  return String(v || "").trim();
}

function datesClose(a: string, b: string) {
  if (!a || !b) return false;
  if (a === b) return true;
  // allow ISO vs date-only
  return a.slice(0, 10) === b.slice(0, 10);
}

async function main() {
  const write = process.argv.includes("--write");
  await connectDB();

  const all = await VenueEvent.find({}).lean();
  const report: Record<Bucket, any[]> = {
    linked_already: [],
    safe_to_link: [],
    ambiguous: [],
    no_matching_event: [],
    conflict_linked_elsewhere: [],
  };

  for (const ve of all as any[]) {
    if (ve.linkedEventId) {
      report.linked_already.push({
        venueEventId: String(ve._id),
        linkedEventId: String(ve.linkedEventId),
      });
      continue;
    }

    const hallId = clean(ve.hallId);
    const ownerId = String(ve.ownerId);
    const date = clean(ve.date);

    const candidates = await Event.find({
      venueOwnerId: ownerId,
      venueHallId: hallId,
      venueAccessStatus: "linked",
    }).lean();

    const scored = (candidates as any[]).filter((ev) => {
      const sameDate = datesClose(clean(ev.date), date);
      const titleOverlap =
        clean(ev.title).includes(clean(ve.title)) ||
        clean(ve.title).includes(clean(ev.title).slice(0, 12)) ||
        (ve.clientName && clean(ev.title).includes(clean(ve.clientName)));
      return sameDate && (titleOverlap || candidates.length === 1);
    });

    // Prefer exact date matches among linked events not already pointed by other VenueEvents
    const exactDate = (candidates as any[]).filter((ev) =>
      datesClose(clean(ev.date), date)
    );

    let pool = scored.length ? scored : exactDate;

    // Exclude Events already linked from another VenueEvent
    const alreadyLinkedIds = new Set(
      (
        await VenueEvent.find({
          linkedEventId: { $in: pool.map((p) => p._id) },
          _id: { $ne: ve._id },
        })
          .select("linkedEventId")
          .lean()
      ).map((x: any) => String(x.linkedEventId))
    );

    const free = pool.filter((p) => !alreadyLinkedIds.has(String(p._id)));

    if (free.length === 1) {
      report.safe_to_link.push({
        venueEventId: String(ve._id),
        eventId: String(free[0]._id),
        hallId,
        date,
        title: ve.title,
      });
    } else if (free.length === 0 && pool.length > 0) {
      report.conflict_linked_elsewhere.push({
        venueEventId: String(ve._id),
        hallId,
        date,
        candidateCount: pool.length,
      });
    } else if (free.length > 1) {
      report.ambiguous.push({
        venueEventId: String(ve._id),
        hallId,
        date,
        candidateIds: free.map((f) => String(f._id)),
      });
    } else {
      report.no_matching_event.push({
        venueEventId: String(ve._id),
        hallId,
        date,
        title: ve.title,
      });
    }
  }

  console.log(
    JSON.stringify(
      {
        mode: write ? "WRITE" : "DRY_RUN",
        totalVenueEvents: all.length,
        linked_already: report.linked_already.length,
        safe_to_link: report.safe_to_link.length,
        ambiguous: report.ambiguous.length,
        no_matching_event: report.no_matching_event.length,
        conflict_linked_elsewhere: report.conflict_linked_elsewhere.length,
        details: {
          safe_to_link: report.safe_to_link,
          ambiguous: report.ambiguous.slice(0, 50),
          no_matching_event: report.no_matching_event.slice(0, 50),
          conflict_linked_elsewhere: report.conflict_linked_elsewhere.slice(
            0,
            50
          ),
        },
      },
      null,
      2
    )
  );

  if (write) {
    let updated = 0;
    for (const row of report.safe_to_link) {
      const res = await VenueEvent.updateOne(
        {
          _id: row.venueEventId,
          $or: [{ linkedEventId: null }, { linkedEventId: { $exists: false } }],
        },
        { $set: { linkedEventId: row.eventId } }
      );
      if (res.modifiedCount) updated += 1;
    }
    console.log(JSON.stringify({ writeUpdated: updated }, null, 2));
  } else {
    console.log("Dry-run only. Re-run with --write to apply safe links.");
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
