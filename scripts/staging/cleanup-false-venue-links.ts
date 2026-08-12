/**
 * Staging-only dry-run / apply cleanup for deterministic FALSE venue links.
 *
 * FALSE link = Event.venueAccessStatus === "linked" WITHOUT verified
 * VenueHall + VenueEvent.linkedEventId relation.
 *
 * Usage:
 *   npx tsx scripts/staging/cleanup-false-venue-links.ts
 *   APPLY=1 npx tsx scripts/staging/cleanup-false-venue-links.ts
 *
 * Never runs against production `invite` unless ALLOW_PROD_WRITE=1 (forbidden by policy).
 */
import mongoose from "mongoose";
import { readFileSync, writeFileSync, mkdirSync } from "fs";

const uri =
  process.env.MONGO_URI ||
  readFileSync("/tmp/staging-mongo-uri.txt", "utf8").trim();
const apply = process.env.APPLY === "1";
const allowProdWrite = process.env.ALLOW_PROD_WRITE === "1";

function clean(v: unknown) {
  return String(v || "").trim();
}

async function main() {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 20000 });
  const db = mongoose.connection.db!;
  const name = db.databaseName;

  if (name === "invite") {
    throw new Error(
      "REFUSING production invite DB — Staging cleanup only (no ALLOW_PROD_WRITE path)"
    );
  }
  if (allowProdWrite) {
    throw new Error("ALLOW_PROD_WRITE is not permitted for this script");
  }

  console.log(JSON.stringify({ db: name, apply, mode: apply ? "APPLY" : "DRY_RUN" }));

  const halls = await db.collection("venuehalls").find({}).toArray();
  const hallKeys = new Set<string>();
  for (const h of halls) {
    hallKeys.add(clean(h.id));
    hallKeys.add(clean(h._id));
  }

  const venueEvents = await db.collection("venueevents").find({}).toArray();
  const veByLinked = new Map<string, any>();
  for (const ve of venueEvents) {
    if (ve.linkedEventId) veByLinked.set(clean(ve.linkedEventId), ve);
  }

  const linked = await db
    .collection("events")
    .find({ venueAccessStatus: "linked" })
    .toArray();

  const falseLinks: any[] = [];
  const trueLinks: any[] = [];

  for (const e of linked) {
    const id = clean(e._id);
    const ve = veByLinked.get(id);
    const eventHall = clean(e.venueHallId);
    const veHall = clean(ve?.hallId || ve?.venueId);
    const hallOk =
      (eventHall && hallKeys.has(eventHall)) ||
      (veHall && hallKeys.has(veHall));
    const veOk = Boolean(ve) && clean(ve.linkedEventId) === id;
    const ok = veOk && hallOk;

    const row = {
      eventId: id,
      title: e.title || null,
      email: e.email || null,
      venueHallId: eventHall || null,
      venueOwnerId: e.venueOwnerId ? clean(e.venueOwnerId) : null,
      venueEventId: ve ? clean(ve._id) : null,
      venueEventHallId: veHall || null,
      classification: ok ? "TRUE_VENUE_LINK" : "FALSE_VENUE_LINK",
      reason: ok
        ? "VenueHall + VenueEvent.linkedEventId verified"
        : !ve
          ? "no VenueEvent with linkedEventId"
          : !hallOk
            ? "hall missing/mismatch"
            : "linkedEventId mismatch",
    };

    if (ok) trueLinks.push(row);
    else falseLinks.push(row);
  }

  const cleared: string[] = [];
  if (apply && falseLinks.length) {
    for (const row of falseLinks) {
      // Deterministic false-link only: clear venue link stamp, keep Event/Invitation intact.
      const res = await db.collection("events").updateOne(
        {
          _id: new mongoose.Types.ObjectId(row.eventId),
          venueAccessStatus: "linked",
        },
        {
          $set: {
            venueAccessStatus: "none",
            updatedAt: new Date(),
          },
          $unset: {
            venueLinkedAt: "",
            // Do not wipe venueHallId/venueOwnerId if present — operator can re-link;
            // clearing status alone removes false "linked" classification.
          },
        }
      );
      if (res.modifiedCount) cleared.push(row.eventId);
    }
  }

  const out = {
    generatedAt: new Date().toISOString(),
    database: name,
    mode: apply ? "APPLY" : "DRY_RUN",
    totals: {
      linkedEvents: linked.length,
      trueLinks: trueLinks.length,
      falseLinks: falseLinks.length,
      cleared: cleared.length,
      venueEvents: venueEvents.length,
      venueHalls: halls.length,
    },
    falseLinks,
    trueLinksSample: trueLinks.slice(0, 20),
    clearedEventIds: cleared,
  };

  mkdirSync("/opt/cursor/artifacts", { recursive: true });
  mkdirSync("/tmp/incident/exports", { recursive: true });
  const path = `/opt/cursor/artifacts/false-venue-links-${name}-${apply ? "apply" : "dry-run"}.json`;
  writeFileSync(path, JSON.stringify(out, null, 2));
  writeFileSync(
    `/tmp/incident/exports/false-venue-links-${name}-${apply ? "apply" : "dry-run"}.json`,
    JSON.stringify(out, null, 2)
  );

  console.log(
    JSON.stringify(
      {
        path,
        totals: out.totals,
        falseSample: falseLinks.slice(0, 15),
      },
      null,
      2
    )
  );

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
