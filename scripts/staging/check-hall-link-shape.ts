import mongoose from "mongoose";
import { readFileSync } from "fs";

async function main() {
  const uri = readFileSync("/tmp/staging-mongo-uri.txt", "utf8").trim();
  await mongoose.connect(uri);
  const db = mongoose.connection.db!;
  console.log("db", db.databaseName);
  const halls = await db.collection("venuehalls").find({}).limit(8).toArray();
  console.log(
    JSON.stringify(
      halls.map((h) => ({
        _id: String(h._id),
        id: h.id,
        name: h.name,
        ownerId: h.ownerId ? String(h.ownerId) : null,
      })),
      null,
      2
    )
  );
  const linkedNoVe = await db
    .collection("events")
    .aggregate([
      { $match: { venueAccessStatus: "linked" } },
      {
        $lookup: {
          from: "venueevents",
          localField: "_id",
          foreignField: "linkedEventId",
          as: "ve",
        },
      },
      {
        $project: {
          title: 1,
          email: 1,
          venueHallId: 1,
          venueOwnerId: 1,
          veCount: { $size: "$ve" },
          veVenueId: { $arrayElemAt: ["$ve.venueId", 0] },
        },
      },
    ])
    .toArray();
  const no = linkedNoVe.filter((e) => e.veCount === 0);
  const yes = linkedNoVe.filter((e) => e.veCount > 0);
  const hallIds = new Set(halls.map((h) => String(h.id || h._id)));
  const trueLinks = yes.filter(
    (e) =>
      hallIds.has(String(e.venueHallId || "")) ||
      hallIds.has(String(e.veVenueId || ""))
  );
  const falseLinks = [
    ...no.map((e) => ({ ...e, reason: "no_VenueEvent" })),
    ...yes
      .filter(
        (e) =>
          !hallIds.has(String(e.venueHallId || "")) &&
          !hallIds.has(String(e.veVenueId || ""))
      )
      .map((e) => ({ ...e, reason: "ve_without_known_hall" })),
  ];
  console.log(
    JSON.stringify(
      {
        linked: linkedNoVe.length,
        withVE: yes.length,
        withoutVE: no.length,
        trueLinks: trueLinks.length,
        falseLinks: falseLinks.length,
        falseSample: falseLinks.slice(0, 12).map((e) => ({
          id: String(e._id),
          title: e.title,
          email: e.email,
          venueHallId: e.venueHallId,
          reason: e.reason,
        })),
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
