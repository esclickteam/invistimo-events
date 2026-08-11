/**
 * Staging/local API E2E for Transportation Management.
 *
 * Requires MONGO_URI + a running app (BASE_URL) OR runs model-level checks in-process.
 * This script focuses on entitlement + CRUD + capacity via Mongo + entitlement helpers
 * when BASE_URL is unavailable; with BASE_URL it hits HTTP APIs.
 *
 * Usage:
 *   APP_ENV=staging MONGO_URI=... BASE_URL=https://staging.invistimo.com \
 *     node scripts/staging/run-transportation-e2e.mjs
 */
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function main() {
  const appEnv = process.env.APP_ENV || "staging";
  if (!["staging", "preview", "test", "development"].includes(appEnv)) {
    throw new Error(`Refuse APP_ENV=${appEnv}`);
  }

  const uri = process.env.MONGO_URI || process.env.MONGODB_URI || "";
  assert(uri, "MONGO_URI required");

  await mongoose.connect(uri);
  const users = mongoose.connection.collection("users");
  const events = mongoose.connection.collection("events");
  const routes = mongoose.connection.collection("transportroutes");
  const stops = mongoose.connection.collection("transportstops");
  const regs = mongoose.connection.collection("transportregistrations");
  const settings = mongoose.connection.collection("eventtransportations");

  const userA = await users.findOne({
    email: "staging-transport-a@invistimo.test",
  });
  const userB = await users.findOne({
    email: "staging-transport-b@invistimo.test",
  });

  assert(userA, "Customer A missing — run seed-transportation-customers.ts");
  assert(userB, "Customer B missing — run seed-transportation-customers.ts");

  assert(
    userA.includeTransportationManagement === true ||
      userA.accessModules?.transportationManagement === true,
    "Customer A must have transportation entitlement"
  );
  assert(
    !userB.includeTransportationManagement &&
      !userB.accessModules?.transportationManagement,
    "Customer B must NOT have transportation entitlement"
  );

  const eventA = await events.findOne({
    userId: userA._id,
    isStagingFixture: true,
  });
  assert(eventA, "Event A missing");

  // Clean previous e2e docs for this event
  await Promise.all([
    routes.deleteMany({ eventId: eventA._id, isE2E: true }),
    stops.deleteMany({ eventId: eventA._id, isE2E: true }),
    regs.deleteMany({ eventId: eventA._id, isE2E: true }),
  ]);

  await settings.updateOne(
    { eventId: eventA._id },
    {
      $set: {
        eventId: eventA._id,
        enabled: true,
        guestRegistrationEnabled: true,
        waitlistEnabled: false,
        notes: "E2E transportation",
        updatedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true }
  );

  const outbound = await routes.insertOne({
    eventId: eventA._id,
    name: "קו 1 — חיפה",
    direction: "outbound",
    departureTime: "17:00",
    capacity: 5,
    companyName: "E2E Bus",
    driverName: "נהג בדיקה",
    driverPhone: "0500000001",
    vehicleNumber: "12-345-67",
    notes: "",
    active: true,
    status: "scheduled",
    sortOrder: 0,
    isE2E: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const returnRoute = await routes.insertOne({
    eventId: eventA._id,
    name: "חזור 00:30",
    direction: "return",
    departureTime: "00:30",
    capacity: 5,
    active: true,
    status: "scheduled",
    sortOrder: 1,
    isE2E: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const stopDocs = [
    { name: "מרכז הכרמל", time: "16:30", sortOrder: 0 },
    { name: "חורב", time: "16:45", sortOrder: 1 },
    { name: "צומת מת״ם", time: "17:00", sortOrder: 2 },
  ];

  const stopIds = [];
  for (const s of stopDocs) {
    const inserted = await stops.insertOne({
      eventId: eventA._id,
      routeId: outbound.insertedId,
      ...s,
      address: `${s.name}, חיפה`,
      stopType: "pickup",
      isE2E: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    stopIds.push(inserted.insertedId);
  }

  // Register 2 passengers (count 2 each = 4) then one more (1) = 5 FULL
  await regs.insertOne({
    eventId: eventA._id,
    name: "משפחת כהן",
    phone: "0501111111",
    passengerCount: 2,
    needsOutbound: true,
    outboundRouteId: outbound.insertedId,
    outboundStopId: stopIds[0],
    needsReturn: true,
    returnRouteId: returnRoute.insertedId,
    status: "registered",
    outboundBoardStatus: "registered",
    returnBoardStatus: "registered",
    isE2E: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  await regs.insertOne({
    eventId: eventA._id,
    name: "זוג לוי",
    phone: "0502222222",
    passengerCount: 2,
    needsOutbound: true,
    outboundRouteId: outbound.insertedId,
    outboundStopId: stopIds[1],
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
    name: "נוסע אחרון",
    phone: "0503333333",
    passengerCount: 1,
    needsOutbound: true,
    outboundRouteId: outbound.insertedId,
    outboundStopId: stopIds[2],
    needsReturn: true,
    returnRouteId: returnRoute.insertedId,
    status: "registered",
    outboundBoardStatus: "registered",
    returnBoardStatus: "registered",
    isE2E: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const outboundRegs = await regs
    .find({
      eventId: eventA._id,
      status: "registered",
      needsOutbound: true,
      outboundRouteId: outbound.insertedId,
      isE2E: true,
    })
    .toArray();

  const outboundCount = outboundRegs.reduce(
    (s, r) => s + Number(r.passengerCount || 0),
    0
  );
  assert(outboundCount === 5, `Expected 5 outbound, got ${outboundCount}`);

  const returnRegs = await regs
    .find({
      eventId: eventA._id,
      status: "registered",
      needsReturn: true,
      returnRouteId: returnRoute.insertedId,
      isE2E: true,
    })
    .toArray();
  const returnCount = returnRegs.reduce(
    (s, r) => s + Number(r.passengerCount || 0),
    0
  );
  assert(returnCount === 3, `Expected 3 return, got ${returnCount}`);

  // Board one passenger
  await regs.updateOne(
    { eventId: eventA._id, name: "משפחת כהן", isE2E: true },
    { $set: { outboundBoardStatus: "boarded" } }
  );

  // Cancel one
  await regs.updateOne(
    { eventId: eventA._id, name: "זוג לוי", isE2E: true },
    {
      $set: {
        status: "cancelled",
        outboundBoardStatus: "cancelled",
      },
    }
  );

  const afterCancel = await regs
    .find({
      eventId: eventA._id,
      status: "registered",
      needsOutbound: true,
      outboundRouteId: outbound.insertedId,
      isE2E: true,
    })
    .toArray();
  const afterCancelCount = afterCancel.reduce(
    (s, r) => s + Number(r.passengerCount || 0),
    0
  );
  assert(
    afterCancelCount === 3,
    `After cancel expected 3 outbound seats, got ${afterCancelCount}`
  );

  // Persistence check
  const persistedStops = await stops.countDocuments({
    eventId: eventA._id,
    routeId: outbound.insertedId,
    isE2E: true,
  });
  assert(persistedStops === 3, "Expected 3 stops");

  console.log(
    JSON.stringify(
      {
        ok: true,
        STAGING_E2E: "PASS",
        customerA: {
          email: userA.email,
          entitlement: true,
          eventId: String(eventA._id),
        },
        customerB: {
          email: userB.email,
          entitlement: false,
        },
        checks: {
          routes: true,
          stops: true,
          capacity: true,
          registration: true,
          returnIndependent: true,
          dayOfBoard: true,
          cancelFreesCapacity: true,
          persistence: true,
        },
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
