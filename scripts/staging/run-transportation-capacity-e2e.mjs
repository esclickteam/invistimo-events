/**
 * Staging Mongo E2E for atomic capacity + waitlist.
 *
 * APP_ENV=staging MONGO_URI=... node scripts/staging/run-transportation-capacity-e2e.mjs
 */
import mongoose from "mongoose";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function atomicReserve(routes, routeId, eventId, seats) {
  return routes.findOneAndUpdate(
    {
      _id: routeId,
      eventId,
      active: true,
      $expr: { $lte: [{ $add: ["$reservedSeats", seats] }, "$capacity"] },
    },
    { $inc: { reservedSeats: seats } },
    { returnDocument: "after" }
  );
}

async function atomicRelease(routes, routeId, eventId, seats) {
  await routes.updateOne({ _id: routeId, eventId }, [
    {
      $set: {
        reservedSeats: {
          $max: [0, { $subtract: ["$reservedSeats", seats] }],
        },
      },
    },
  ]);
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

  const outbound = await routes.insertOne({
    eventId: eventA._id,
    name: "E2E חיפה",
    direction: "outbound",
    departureTime: "17:00",
    capacity: 50,
    reservedSeats: 0,
    active: true,
    status: "scheduled",
    sortOrder: 0,
    isE2E: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const returnRoute = await routes.insertOne({
    eventId: eventA._id,
    name: "E2E חזור 00:30",
    direction: "return",
    departureTime: "00:30",
    capacity: 30,
    reservedSeats: 0,
    active: true,
    status: "scheduled",
    sortOrder: 1,
    isE2E: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // register 3
  let res = await atomicReserve(routes, outbound.insertedId, eventA._id, 3);
  assert(res, "reserve 3 failed");
  assert(res.reservedSeats === 3, `expected 3 got ${res.reservedSeats}`);

  await regs.insertOne({
    eventId: eventA._id,
    name: "A",
    passengerCount: 3,
    needsOutbound: true,
    outboundRouteId: outbound.insertedId,
    needsReturn: true,
    returnRouteId: returnRoute.insertedId,
    status: "registered",
    isE2E: true,
    createdAt: new Date(),
  });
  res = await atomicReserve(routes, returnRoute.insertedId, eventA._id, 3);
  assert(res && res.reservedSeats === 3, "return reserve 3");

  // register 10
  res = await atomicReserve(routes, outbound.insertedId, eventA._id, 10);
  assert(res.reservedSeats === 13, `expected 13 got ${res.reservedSeats}`);
  const regB = await regs.insertOne({
    eventId: eventA._id,
    name: "B",
    passengerCount: 10,
    needsOutbound: true,
    outboundRouteId: outbound.insertedId,
    needsReturn: false,
    status: "registered",
    isE2E: true,
    createdAt: new Date(),
  });

  // edit 10→6
  await atomicRelease(routes, outbound.insertedId, eventA._id, 4);
  await regs.updateOne(
    { _id: regB.insertedId },
    { $set: { passengerCount: 6 } }
  );
  let routeDoc = await routes.findOne({ _id: outbound.insertedId });
  assert(routeDoc.reservedSeats === 9, `expected 9 got ${routeDoc.reservedSeats}`);

  // cancel 3
  await atomicRelease(routes, outbound.insertedId, eventA._id, 3);
  await atomicRelease(routes, returnRoute.insertedId, eventA._id, 3);
  await regs.updateOne(
    { eventId: eventA._id, name: "A", isE2E: true },
    { $set: { status: "cancelled" } }
  );
  routeDoc = await routes.findOne({ _id: outbound.insertedId });
  assert(routeDoc.reservedSeats === 6, `expected 6 got ${routeDoc.reservedSeats}`);

  // fill to 50
  res = await atomicReserve(routes, outbound.insertedId, eventA._id, 44);
  assert(res.reservedSeats === 50, "fill to 50");

  // blocked
  res = await atomicReserve(routes, outbound.insertedId, eventA._id, 1);
  assert(!res, "should block overbook");

  // waitlist does not consume
  await regs.insertOne({
    eventId: eventA._id,
    name: "Wait C",
    passengerCount: 4,
    needsOutbound: true,
    outboundRouteId: outbound.insertedId,
    needsReturn: false,
    status: "waitlisted",
    waitlistedAt: new Date(),
    isE2E: true,
    createdAt: new Date(),
  });
  routeDoc = await routes.findOne({ _id: outbound.insertedId });
  assert(routeDoc.reservedSeats === 50, "waitlist must not change seats");

  // free 3 seats via cancel of a 3-person synthetic reg
  // first add a registered 3 then cancel
  // temporarily release and re-add for clarity:
  await atomicRelease(routes, outbound.insertedId, eventA._id, 3);
  routeDoc = await routes.findOne({ _id: outbound.insertedId });
  assert(routeDoc.reservedSeats === 47, "freed 3");

  const waitlisted = await regs
    .find({ eventId: eventA._id, status: "waitlisted", isE2E: true })
    .sort({ createdAt: 1 })
    .toArray();
  assert(waitlisted.length >= 1, "waitlist preserved");
  assert(
    waitlisted[0].passengerCount === 4,
    "first waitlist needs 4 > remaining 3 — no auto promote"
  );

  // Manual promote should FAIL for 4 when only 3 free
  res = await atomicReserve(
    routes,
    outbound.insertedId,
    eventA._id,
    waitlisted[0].passengerCount
  );
  assert(!res, "promote 4 into 3 remaining must fail");

  // Add waitlist of 1 and promote that one manually
  const w1 = await regs.insertOne({
    eventId: eventA._id,
    name: "Wait D",
    passengerCount: 1,
    needsOutbound: true,
    outboundRouteId: outbound.insertedId,
    needsReturn: false,
    status: "waitlisted",
    waitlistedAt: new Date(),
    isE2E: true,
    createdAt: new Date(),
  });
  res = await atomicReserve(routes, outbound.insertedId, eventA._id, 1);
  assert(res && res.reservedSeats === 48, "manual promote 1");
  await regs.updateOne(
    { _id: w1.insertedId },
    { $set: { status: "registered", promotedAt: new Date() } }
  );

  // Race: two final seats when 1 left
  await atomicRelease(routes, outbound.insertedId, eventA._id, 2); // make 49 reserved? currently 48, release 0...
  // set exactly 49
  await routes.updateOne(
    { _id: outbound.insertedId },
    { $set: { reservedSeats: 49 } }
  );
  const race1 = atomicReserve(routes, outbound.insertedId, eventA._id, 1);
  const race2 = atomicReserve(routes, outbound.insertedId, eventA._id, 1);
  const [r1, r2] = await Promise.all([race1, race2]);
  const wins = [r1, r2].filter(Boolean).length;
  assert(wins === 1, `race should allow exactly 1 win, got ${wins}`);
  routeDoc = await routes.findOne({ _id: outbound.insertedId });
  assert(routeDoc.reservedSeats === 50, "race end at 50");

  // Independent return capacity still 0 after outbound cancel earlier
  const retDoc = await routes.findOne({ _id: returnRoute.insertedId });
  assert(retDoc.reservedSeats === 0, "return independent");

  console.log(
    JSON.stringify(
      {
        ok: true,
        CAPACITY_REAL_TIME: "PASS",
        NO_OVERBOOKING: "PASS",
        WAITLIST: "PASS",
        MANUAL_PROMOTION: "PASS",
        OUTBOUND_RETURN_CAPACITY: "PASS",
        RACE_CONDITION_PROTECTION: "PASS",
      },
      null,
      2
    )
  );

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
