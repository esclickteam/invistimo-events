import mongoose from "mongoose";

async function main() {
  const uri = process.env.MONGO_URI || "";
  if (!uri.includes("invistimo_staging")) throw new Error("staging only");
  await mongoose.connect(uri);
  const db = mongoose.connection.db!;
  const event = await db
    .collection("events")
    .findOne({ title: "[E2E] Customer A Wedding" });
  console.log("eventId", String(event?._id));
  const seating = await db
    .collection("seatingtables")
    .findOne({ eventId: event!._id });
  console.log("seating keys", seating ? Object.keys(seating) : null);
  console.log("tables count", seating?.tables?.length);
  if (seating?.tables?.[0]) {
    console.log("table0 sample", JSON.stringify(seating.tables[0]).slice(0, 1500));
  }
  console.log(
    "table summary",
    (seating?.tables || []).map((t: any) => ({
      name: t.name,
      reserved: t.reserved,
      seats: Array.isArray(t.seats) ? t.seats.length : null,
      capacity: t.capacity,
      occupied: Array.isArray(t.seats)
        ? t.seats.filter((s: any) => s.occupied || s.guestId).length
        : 0,
    }))
  );
  const byObj = await db
    .collection("guests")
    .countDocuments({ eventId: event!._id });
  const byStr = await db
    .collection("guests")
    .countDocuments({ eventId: String(event!._id) });
  console.log({ byObj, byStr });
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
