/**
 * Remove repeated hall-name copies from stored invitation/event location text.
 *
 * Coordinates, placeId and Waze links are not written.
 * Unique address words are kept, including a single "ישראל".
 *
 *   npx tsx scripts/dedupe-stored-event-locations.ts
 *   npx tsx scripts/dedupe-stored-event-locations.ts --write
 */
import mongoose from "mongoose";
import { connectDB } from "../lib/db";
import Invitation from "../models/Invitation";
import Event from "../models/Event";
import { sanitizeStoredLocationText } from "../lib/messages/locationText";

const TEXT_FIELDS = ["name", "address", "placeName", "formattedAddress"] as const;

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function locationText(location: any) {
  return {
    name: clean(location?.name),
    address: clean(location?.address),
    placeName: clean(location?.placeName),
    formattedAddress: clean(location?.formattedAddress),
  };
}

async function dedupeCollection(collection: mongoose.Collection, label: string, write: boolean) {
  const cursor = collection.find(
    { location: { $exists: true } },
    {
      projection: {
        location: 1,
      },
    }
  );

  let scanned = 0;
  let changed = 0;

  for await (const doc of cursor) {
    scanned += 1;
    const current = locationText((doc as any).location);
    if (!TEXT_FIELDS.some((field) => current[field])) continue;

    const next = sanitizeStoredLocationText(current);
    const updates: Record<string, string> = {};
    for (const field of TEXT_FIELDS) {
      if (current[field] !== next[field]) {
        updates[`location.${field}`] = next[field];
      }
    }
    if (!Object.keys(updates).length) continue;

    changed += 1;
    console.log(
      JSON.stringify({
        collection: label,
        id: String((doc as any)._id),
        from: current,
        to: next,
      })
    );

    if (write) {
      await collection.updateOne({ _id: (doc as any)._id }, { $set: updates });
    }
  }

  return { scanned, changed };
}

async function main() {
  const write = process.argv.includes("--write");
  await connectDB();

  const invitations = await dedupeCollection(
    Invitation.collection,
    "invitations",
    write
  );
  const events = await dedupeCollection(Event.collection, "events", write);

  console.log(
    JSON.stringify({
      mode: write ? "write" : "dry-run",
      invitations,
      events,
    })
  );
  await mongoose.disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
