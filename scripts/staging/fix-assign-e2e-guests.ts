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

  const fixtureGuests = await db
    .collection("guests")
    .find({ isStagingFixture: true, name: /^\[E2E\]/ })
    .toArray();

  for (const g of fixtureGuests) {
    await db.collection("guests").updateOne(
      { _id: g._id },
      {
        $set: {
          eventId: event._id,
          userId: event.userId,
          updatedAt: new Date(),
        },
      }
    );
  }

  const invitation = await db.collection("invitations").findOne({
    eventId: event._id,
    isStagingFixture: true,
  });
  if (invitation) {
    await db.collection("guests").updateMany(
      { isStagingFixture: true, name: /^\[E2E\]/ },
      { $set: { invitationId: invitation._id } }
    );
  }

  const guestList = await db
    .collection("guests")
    .find({ eventId: event._id })
    .limit(28)
    .toArray();

  const seating = await db
    .collection("seatingtables")
    .findOne({ eventId: event._id });
  if (!seating) throw new Error("seating missing");

  type ClientTable = {
    id: string;
    name: string;
    type: string;
    group: unknown;
    seats: number;
    capacity: number;
    x: number;
    y: number;
    rotation: number;
    width: number;
    height: number;
    radius: number;
    color: string;
    locked: boolean;
    reserved: boolean;
    reserveLabel: string;
    seatedGuests: Array<{
      guestId: unknown;
      seatIndex: number;
      arrived: boolean;
      guestName?: string;
    }>;
  };

  // Repair tables to client seating format if corrupted (seats as array / seats:0)
  const tables: ClientTable[] = (
    Array.isArray(seating.tables) ? seating.tables : []
  ).map((t: any, ti: number) => {
    let seats = 0;
    if (Array.isArray(t.seats)) seats = t.seats.length;
    else if (Number(t.seats) > 0) seats = Math.floor(Number(t.seats));
    else if (Number(t.capacity) > 0) seats = Math.floor(Number(t.capacity));
    else seats = ti % 3 === 0 ? 10 : ti % 2 === 0 ? 8 : 6;

    return {
      id: t.id || `a1-table-${ti + 1}`,
      name: t.name || `שולחן A1 ${ti + 1}`,
      type: t.type || t.shape || "round",
      group: t.group ?? null,
      seats,
      capacity: seats,
      x: Number(t.x) || 80 + (ti % 5) * 160,
      y: Number(t.y) || 80 + Math.floor(ti / 5) * 160,
      rotation: Number(t.rotation) || 0,
      width: Number(t.width) || 120,
      height: Number(t.height) || 120,
      radius: Number(t.radius) || 60,
      color: t.color || "#ffffff",
      locked: Boolean(t.locked),
      reserved: Boolean(t.reserved) || ti === (seating.tables?.length || 1) - 1,
      reserveLabel:
        t.reserveLabel ||
        (ti === (seating.tables?.length || 1) - 1 ? "רזרבה" : ""),
      seatedGuests: [] as ClientTable["seatedGuests"],
    };
  });

  let gi = 0;
  for (const table of tables) {
    if (table.reserved) continue;
    const seatedGuests: ClientTable["seatedGuests"] = [];
    // Fill ~half the table, leave some partial
    const fill = Math.max(1, Math.floor(table.seats * 0.6));
    for (let s = 0; s < fill && gi < guestList.length; s += 1) {
      const g = guestList[gi++];
      seatedGuests.push({
        guestId: g._id,
        seatIndex: s,
        arrived: false,
        guestName: g.name,
      });
    }
    table.seatedGuests = seatedGuests;
  }

  await db.collection("seatingtables").updateOne(
    { _id: seating._id },
    {
      $set: {
        tables,
        source: "venue_seating_template",
        updatedAt: new Date(),
      },
    }
  );

  // RSVP mix + day-of arrivals
  if (guestList[0]) {
    await db.collection("guests").updateOne(
      { _id: guestList[0]._id },
      { $set: { status: "confirmed", arrivedCount: 1, actualArrivedCount: 1 } }
    );
  }
  if (guestList[1]) {
    await db
      .collection("guests")
      .updateOne({ _id: guestList[1]._id }, { $set: { status: "declined" } });
  }
  if (guestList[2]) {
    await db
      .collection("guests")
      .updateOne({ _id: guestList[2]._id }, { $set: { status: "pending" } });
  }
  if (guestList[3]) {
    await db.collection("guests").updateOne(
      { _id: guestList[3]._id },
      {
        $set: {
          status: "confirmed",
          arrivedCount: 2,
          actualArrivedCount: 2,
        },
      }
    );
  }

  const occupied = tables.reduce(
    (n: number, t: any) => n + (t.seatedGuests?.length || 0),
    0
  );

  console.log(
    JSON.stringify({
      fixtureGuests: fixtureGuests.length,
      assigned: occupied,
      guestsLinked: guestList.length,
      tables: tables.map((t: any) => ({
        name: t.name,
        seats: t.seats,
        reserved: t.reserved,
        seated: t.seatedGuests.length,
      })),
      invitationId: invitation ? String(invitation._id) : null,
    })
  );
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
