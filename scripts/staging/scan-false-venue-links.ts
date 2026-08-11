/**
 * READ-ONLY against Staging (or whatever MONGO_URI points to).
 * Refuses production `invite` unless ALLOW_PROD_READ=1.
 *
 * TRUE link = venueAccessStatus=linked AND VenueEvent.linkedEventId AND VenueHall.id|_id match.
 */
import mongoose from "mongoose";
import { readFileSync, writeFileSync, mkdirSync } from "fs";

const uri =
  process.env.MONGO_URI ||
  readFileSync("/tmp/staging-mongo-uri.txt", "utf8").trim();
const allowProd = process.env.ALLOW_PROD_READ === "1";

function clean(v: unknown) {
  return String(v || "").trim();
}

async function main() {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 20000 });
  const db = mongoose.connection.db!;
  const name = db.databaseName;
  if (name === "invite" && !allowProd) {
    throw new Error("REFUSING production invite DB — staging only");
  }
  console.log("db", name);

  const linked = await db
    .collection("events")
    .find({ venueAccessStatus: "linked" })
    .project({
      _id: 1,
      title: 1,
      email: 1,
      userId: 1,
      venueHallId: 1,
      venueOwnerId: 1,
      venueAccessStatus: 1,
      venueLinkedAt: 1,
      venueClientInvitationId: 1,
      createdAt: 1,
      updatedAt: 1,
    })
    .toArray();

  const venueEvents = await db.collection("venueevents").find({}).toArray();
  const veByLinked = new Map(
    venueEvents
      .filter((v) => v.linkedEventId)
      .map((v) => [clean(v.linkedEventId), v])
  );
  const halls = await db.collection("venuehalls").find({}).toArray();
  const hallIds = new Set<string>();
  for (const h of halls) {
    if (h.id) hallIds.add(clean(h.id));
    hallIds.add(clean(h._id));
  }

  const falseLinks = [];
  const trueLinks = [];
  for (const e of linked) {
    const id = clean(e._id);
    const ve = veByLinked.get(id);
    const hallRaw = e.venueHallId ? clean(e.venueHallId) : "";
    const veHall = ve ? clean(ve.hallId || ve.venueId) : "";
    const hallOk =
      (Boolean(hallRaw) && hallIds.has(hallRaw)) ||
      (Boolean(veHall) && hallIds.has(veHall));
    const hasVe = Boolean(ve) && clean(ve.linkedEventId) === id;

    const ok = hasVe && hallOk;
    const row = {
      eventId: id,
      title: e.title,
      email: e.email,
      venueHallId: hallRaw || null,
      venueOwnerId: e.venueOwnerId ? clean(e.venueOwnerId) : null,
      hallExists: hallOk,
      venueEventExists: hasVe,
      venueEventId: ve ? clean(ve._id) : null,
      venueEventHallId: veHall || null,
      venueClientInvitationId: e.venueClientInvitationId
        ? clean(e.venueClientInvitationId)
        : null,
      classification: ok ? "TRUE_LINK" : "FALSE_LINK",
      reason: ok
        ? "has VenueEvent + hall relation"
        : !hasVe && !hallOk
          ? "no VenueEvent and no VenueHall"
          : !hasVe
            ? "has hall id but no VenueEvent"
            : "has VenueEvent but hall mismatch/missing",
    };
    if (ok) trueLinks.push(row);
    else falseLinks.push(row);
  }

  const out = {
    generatedAt: new Date().toISOString(),
    database: name,
    totals: {
      linkedEvents: linked.length,
      trueLinks: trueLinks.length,
      falseLinks: falseLinks.length,
      venueEvents: venueEvents.length,
      venueHalls: halls.length,
    },
    falseLinks,
    trueLinks,
  };
  mkdirSync("/tmp/incident/exports", { recursive: true });
  mkdirSync("/opt/cursor/artifacts", { recursive: true });
  const path = `/tmp/incident/exports/false-venue-links-${name}.json`;
  writeFileSync(path, JSON.stringify(out, null, 2));
  writeFileSync(
    `/opt/cursor/artifacts/false-venue-links-${name}-scan.json`,
    JSON.stringify(out, null, 2)
  );
  console.log(
    JSON.stringify(
      { path, totals: out.totals, falseSample: falseLinks.slice(0, 15) },
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
