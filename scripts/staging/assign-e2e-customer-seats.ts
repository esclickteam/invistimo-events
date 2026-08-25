import mongoose from "mongoose";

async function main() {
  const uri = process.env.MONGO_URI || "";
  if (!uri.includes("invistimo_staging")) throw new Error("staging only");
  await mongoose.connect(uri);
  const db = mongoose.connection.db!;
  const event = await db
    .collection("events")
    .findOne({ title: "[E2E] Customer A Wedding" });
  if (!event) throw new Error("event missing");
  const guestList = await db
    .collection("guests")
    .find({ eventId: event._id, isStagingFixture: true })
    .limit(15)
    .toArray();
  const seating = await db
    .collection("seatingtables")
    .findOne({ eventId: event._id });
  if (!seating) throw new Error("seating missing");
  const tables = JSON.parse(JSON.stringify(seating.tables || []));
  let gi = 0;
  for (const table of tables) {
    if (table.reserved) continue;
    for (const seat of table.seats || []) {
      if (gi >= guestList.length) break;
      const g = guestList[gi++];
      seat.occupied = true;
      seat.guestId = String(g._id);
      seat.guestName = g.name;
      seat.guest = {
        id: String(g._id),
        name: g.name,
        status: g.status,
        guestsCount: g.guestsCount,
      };
      seat.rsvpStatus = g.status;
    }
    if (gi >= guestList.length) break;
  }
  await db.collection("seatingtables").updateOne(
    { _id: seating._id },
    { $set: { tables, updatedAt: new Date(), isStagingFixture: true } }
  );
  console.log(
    JSON.stringify({
      assigned: gi,
      tables: tables.length,
      eventId: String(event._id),
    })
  );
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
