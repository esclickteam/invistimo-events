/**
 * Staging Mongo E2E for route builder flows:
 * - outbound / return / round_trip routes
 * - stop create + reorder
 * - dual capacity on round_trip
 * - passenger registration per leg
 *
 * APP_ENV=staging MONGO_URI=... node scripts/staging/run-transportation-route-builder-e2e.mjs
 */
import mongoose from "mongoose";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function assertEqual(a, b, msg) {
  if (a !== b) throw new Error(msg || `${a} !== ${b}`);
}

function normalizeTimeInput(raw) {
  const value = String(raw || "").trim();
  if (!value) return "";
  const colon = value.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (colon) {
    const h = Number(colon[1]);
    const m = Number(colon[2]);
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    }
    return "";
  }
  const digits = value.replace(/\D/g, "");
  if (digits.length === 3 || digits.length === 4) {
    const padded = digits.padStart(4, "0");
    const h = Number(padded.slice(0, 2));
    const m = Number(padded.slice(2, 4));
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    }
  }
  return "";
}

async function atomicReserve(routes, routeId, eventId, seats, leg = "outbound") {
  const route = await routes.findOne({ _id: routeId, eventId });
  assert(route, "route missing for reserve");
  const useReturn = leg === "return" && route.direction === "round_trip";
  const reservedField = useReturn ? "returnReservedSeats" : "reservedSeats";
  const capacityField = useReturn ? "returnCapacity" : "capacity";
  return routes.findOneAndUpdate(
    {
      _id: routeId,
      eventId,
      active: true,
      $expr: {
        $lte: [{ $add: [`$${reservedField}`, seats] }, `$${capacityField}`],
      },
    },
    { $inc: { [reservedField]: seats } },
    { returnDocument: "after" }
  );
}

async function main() {
  const appEnv = process.env.APP_ENV || "staging";
  if (!["staging", "preview", "test", "development"].includes(appEnv)) {
    throw new Error(`Refuse APP_ENV=${appEnv}`);
  }
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI || "";
  assert(uri, "MONGO_URI required");

  await mongoose.connect(uri);
  const db = mongoose.connection;
  const users = db.collection("users");
  const events = db.collection("events");
  const routes = db.collection("transportroutes");
  const stops = db.collection("transportstops");
  const regs = db.collection("transportregistrations");
  const settings = db.collection("eventtransportations");

  const userA = await users.findOne({
    email: "staging-transport-a@invistimo.test",
  });
  assert(userA, "Seed Customer Transport A first");
  const eventA = await events.findOne({
    userId: userA._id,
    isStagingFixture: true,
  });
  assert(eventA, "Event A missing");

  await Promise.all([
    routes.deleteMany({ eventId: eventA._id, isE2E: true }),
    stops.deleteMany({ eventId: eventA._id, isE2E: true }),
    regs.deleteMany({ eventId: eventA._id, isE2E: true }),
  ]);

  await settings.updateOne(
    { eventId: eventA._id },
    {
      $set: {
        enabled: true,
        guestRegistrationEnabled: true,
        waitlistEnabled: true,
        updatedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true }
  );

  assertEqual(normalizeTimeInput("8:00"), "08:00");
  assertEqual(normalizeTimeInput("0030"), "00:30");

  const outbound = await routes.insertOne({
    eventId: eventA._id,
    name: "E2E הלוך חיפה",
    direction: "outbound",
    departureTime: normalizeTimeInput("17:00"),
    returnTime: "",
    capacity: 20,
    reservedSeats: 0,
    returnCapacity: 20,
    returnReservedSeats: 0,
    active: true,
    status: "scheduled",
    sortOrder: 0,
    isE2E: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const retOnly = await routes.insertOne({
    eventId: eventA._id,
    name: "E2E חזור תל אביב",
    direction: "return",
    departureTime: "",
    returnTime: normalizeTimeInput("00:30"),
    capacity: 15,
    reservedSeats: 0,
    returnCapacity: 15,
    returnReservedSeats: 0,
    active: true,
    status: "scheduled",
    sortOrder: 1,
    isE2E: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const roundTrip = await routes.insertOne({
    eventId: eventA._id,
    name: "E2E הלוך וחזור נתניה",
    direction: "round_trip",
    departureTime: normalizeTimeInput("16:30"),
    returnTime: normalizeTimeInput("01:15"),
    capacity: 10,
    reservedSeats: 0,
    returnCapacity: 8,
    returnReservedSeats: 0,
    active: true,
    status: "scheduled",
    sortOrder: 2,
    isE2E: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const stopA = await stops.insertOne({
    eventId: eventA._id,
    routeId: outbound.insertedId,
    name: "תחנה 1",
    address: "רחוב א 1",
    time: normalizeTimeInput("16:00"),
    sortOrder: 0,
    notes: "",
    landmark: "ליד הקניון",
    mapLink: "https://waze.com/ul",
    stopType: "pickup",
    isE2E: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  const stopB = await stops.insertOne({
    eventId: eventA._id,
    routeId: outbound.insertedId,
    name: "תחנה 2",
    address: "רחוב ב 2",
    time: normalizeTimeInput("16:20"),
    sortOrder: 1,
    notes: "",
    landmark: "",
    mapLink: "",
    stopType: "pickup",
    isE2E: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  const stopC = await stops.insertOne({
    eventId: eventA._id,
    routeId: outbound.insertedId,
    name: "תחנה 3",
    address: "רחוב ג 3",
    time: normalizeTimeInput("16:40"),
    sortOrder: 2,
    notes: "הערות",
    landmark: "",
    mapLink: "",
    stopType: "pickup",
    isE2E: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // Reorder: 3,1,2
  const ordered = [stopC.insertedId, stopA.insertedId, stopB.insertedId];
  await Promise.all(
    ordered.map((id, index) =>
      stops.updateOne(
        { _id: id, eventId: eventA._id, routeId: outbound.insertedId },
        { $set: { sortOrder: index } }
      )
    )
  );
  const reordered = await stops
    .find({ routeId: outbound.insertedId })
    .sort({ sortOrder: 1 })
    .toArray();
  assertEqual(String(reordered[0]._id), String(stopC.insertedId), "reorder 0");
  assertEqual(String(reordered[1]._id), String(stopA.insertedId), "reorder 1");
  assertEqual(String(reordered[2]._id), String(stopB.insertedId), "reorder 2");

  // Round-trip dual capacity
  let rt = await atomicReserve(routes, roundTrip.insertedId, eventA._id, 6, "outbound");
  assert(rt, "outbound reserve failed");
  assertEqual(rt.reservedSeats, 6);
  assertEqual(rt.returnReservedSeats || 0, 0);

  rt = await atomicReserve(routes, roundTrip.insertedId, eventA._id, 5, "return");
  assert(rt, "return reserve failed");
  assertEqual(rt.returnReservedSeats, 5);
  assertEqual(rt.reservedSeats, 6);

  // Fill return capacity (8) — 3 more ok, 1 extra fails
  rt = await atomicReserve(routes, roundTrip.insertedId, eventA._id, 3, "return");
  assert(rt, "return fill failed");
  assertEqual(rt.returnReservedSeats, 8);
  const fail = await atomicReserve(routes, roundTrip.insertedId, eventA._id, 1, "return");
  assert(!fail, "return overbook should fail");

  // Outbound still has room
  rt = await atomicReserve(routes, roundTrip.insertedId, eventA._id, 4, "outbound");
  assert(rt, "outbound remaining failed");
  assertEqual(rt.reservedSeats, 10);

  await regs.insertOne({
    eventId: eventA._id,
    name: "נוסע הלוך",
    phone: "0501111111",
    passengerCount: 2,
    needsOutbound: true,
    outboundRouteId: outbound.insertedId,
    outboundStopId: stopA.insertedId,
    needsReturn: false,
    status: "registered",
    outboundBoardStatus: "registered",
    returnBoardStatus: "not_needed",
    isE2E: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  await regs.insertOne({
    eventId: eventA._id,
    name: "נוסע חזור",
    phone: "0502222222",
    passengerCount: 1,
    needsOutbound: false,
    needsReturn: true,
    returnRouteId: retOnly.insertedId,
    status: "registered",
    outboundBoardStatus: "not_needed",
    returnBoardStatus: "registered",
    isE2E: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  await regs.insertOne({
    eventId: eventA._id,
    name: "נוסע הלוך+חזור",
    phone: "0503333333",
    passengerCount: 2,
    needsOutbound: true,
    outboundRouteId: roundTrip.insertedId,
    needsReturn: true,
    returnRouteId: roundTrip.insertedId,
    status: "registered",
    outboundBoardStatus: "registered",
    returnBoardStatus: "registered",
    isE2E: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const outboundPassengers = await regs
    .find({
      eventId: eventA._id,
      isE2E: true,
      $or: [
        { outboundRouteId: outbound.insertedId },
        { returnRouteId: outbound.insertedId },
      ],
    })
    .toArray();
  assertEqual(outboundPassengers.length, 1, "outbound passenger list");

  const roundPassengers = await regs
    .find({
      eventId: eventA._id,
      isE2E: true,
      $or: [
        { outboundRouteId: roundTrip.insertedId },
        { returnRouteId: roundTrip.insertedId },
      ],
    })
    .toArray();
  assertEqual(roundPassengers.length, 1, "round trip passenger list");

  console.log(
    JSON.stringify(
      {
        ok: true,
        CREATE_OUTBOUND: "PASS",
        CREATE_RETURN: "PASS",
        CREATE_ROUND_TRIP: "PASS",
        STOP_CREATE: "PASS",
        STOP_REORDER: "PASS",
        TIME_NORMALIZE: "PASS",
        ROUND_TRIP_DUAL_CAPACITY: "PASS",
        PASSENGERS_PER_ROUTE: "PASS",
        eventId: String(eventA._id),
      },
      null,
      2
    )
  );

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
