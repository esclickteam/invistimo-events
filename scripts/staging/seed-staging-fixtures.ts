/**
 * Seed Staging-only fixtures. Refuses to run against Production DB.
 *
 * Usage (Staging only):
 *   APP_ENV=staging MONGO_URI='mongodb.../invistimo_staging' \
 *     npx tsx scripts/staging/seed-staging-fixtures.ts
 */
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import {
  getMongoDatabaseNameFromUri,
  resolveAppEnv,
} from "../../lib/env/appEnv";
import { assertEnvironmentSafety } from "../../lib/env/safetyGuards";

async function main() {
  process.env.APP_ENV = process.env.APP_ENV || "staging";
  const appEnv = resolveAppEnv();
  if (appEnv !== "staging" && appEnv !== "preview" && appEnv !== "test") {
    throw new Error(
      `Refusing to seed fixtures when APP_ENV=${appEnv}. Staging only.`
    );
  }

  assertEnvironmentSafety({ throwOnError: true });

  const uri = String(process.env.MONGO_URI || process.env.MONGODB_URI || "");
  const dbName = getMongoDatabaseNameFromUri(uri);
  console.log(
    JSON.stringify(
      {
        mode: "seed-staging-fixtures",
        appEnv,
        mongoDbName: dbName,
      },
      null,
      2
    )
  );

  await mongoose.connect(uri);

  const users = mongoose.connection.collection("users");
  const halls = mongoose.connection.collection("venuehalls");
  const memberships = mongoose.connection.collection("venuememberships");
  const leads = mongoose.connection.collection("venueleads");
  const venueEvents = mongoose.connection.collection("venueevents");
  const events = mongoose.connection.collection("events");

  const passwordHash = await bcrypt.hash("StagingTest123!", 10);
  const now = new Date();

  const upsertUser = async (doc: Record<string, unknown>) => {
    const email = String(doc.email);
    await users.updateOne(
      { email },
      {
        $set: {
          ...doc,
          updatedAt: now,
          isStagingFixture: true,
        },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true }
    );
    return users.findOne({ email });
  };

  const ownerA = await upsertUser({
    name: "[STAGING] Owner A",
    email: "staging-owner-a@invistimo.test",
    password: passwordHash,
    role: "user",
    venueUser: true,
    employeeScope: "venue",
    staffType: null,
    isActive: true,
    hasPaid: true,
    needsPasswordSetup: false,
    authVersion: 0,
    plan: "basic",
    guests: 0,
    maxGuests: 0,
    allowedMessageRounds: 2,
  });

  const ownerB = await upsertUser({
    name: "[STAGING] Owner B",
    email: "staging-owner-b@invistimo.test",
    password: passwordHash,
    role: "user",
    venueUser: true,
    employeeScope: "venue",
    staffType: null,
    isActive: true,
    hasPaid: true,
    needsPasswordSetup: false,
    authVersion: 0,
    plan: "basic",
    guests: 0,
    maxGuests: 0,
    allowedMessageRounds: 2,
  });

  const ownerC = await upsertUser({
    name: "[STAGING] Owner C",
    email: "staging-owner-c@invistimo.test",
    password: passwordHash,
    role: "user",
    venueUser: true,
    employeeScope: "venue",
    staffType: null,
    isActive: true,
    hasPaid: true,
    needsPasswordSetup: false,
    authVersion: 0,
    plan: "basic",
    guests: 0,
    maxGuests: 0,
    allowedMessageRounds: 2,
  });

  const ownerD = await upsertUser({
    name: "[STAGING] Owner D",
    email: "staging-owner-d@invistimo.test",
    password: passwordHash,
    role: "user",
    venueUser: true,
    employeeScope: "venue",
    staffType: null,
    isActive: true,
    hasPaid: true,
    needsPasswordSetup: false,
    authVersion: 0,
    plan: "basic",
    guests: 0,
    maxGuests: 0,
    allowedMessageRounds: 2,
  });

  const shared = await upsertUser({
    name: "[STAGING] Shared Owner",
    email: "staging-shared-owner@invistimo.test",
    password: passwordHash,
    role: "user",
    venueUser: true,
    employeeScope: "venue",
    staffType: null,
    isActive: true,
    hasPaid: true,
    needsPasswordSetup: false,
    authVersion: 0,
    plan: "basic",
    guests: 0,
    maxGuests: 0,
    allowedMessageRounds: 2,
  });

  const employee = await upsertUser({
    name: "[STAGING] Venue Employee",
    email: "staging-venue-employee@invistimo.test",
    password: passwordHash,
    role: "user",
    venueUser: true,
    employeeScope: "venue",
    staffType: null,
    isActive: true,
    hasPaid: true,
    needsPasswordSetup: false,
    authVersion: 0,
    plan: "basic",
    guests: 0,
    maxGuests: 0,
    allowedMessageRounds: 2,
  });

  const regularUser = await upsertUser({
    name: "[STAGING] Regular Event Host",
    email: "staging-regular-host@invistimo.test",
    password: passwordHash,
    role: "user",
    isActive: true,
    hasPaid: true,
    needsPasswordSetup: false,
    authVersion: 0,
    plan: "basic",
    guests: 50,
    maxGuests: 100,
    allowedMessageRounds: 2,
  });

  await halls.updateOne(
    { id: "staging-hall-a" },
    {
      $set: {
        ownerId: ownerA!._id,
        id: "staging-hall-a",
        name: "[STAGING] Hall A",
        status: "active",
        isStagingFixture: true,
        updatedAt: now,
      },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true }
  );

  await halls.updateOne(
    { id: "staging-hall-b" },
    {
      $set: {
        ownerId: ownerB!._id,
        id: "staging-hall-b",
        name: "[STAGING] Hall B",
        status: "active",
        isStagingFixture: true,
        updatedAt: now,
      },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true }
  );

  await halls.updateOne(
    { id: "staging-hall-c" },
    {
      $set: {
        ownerId: ownerC!._id,
        id: "staging-hall-c",
        name: "[STAGING] Hall C",
        status: "active",
        isStagingFixture: true,
        updatedAt: now,
      },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true }
  );

  await halls.updateOne(
    { id: "staging-hall-d" },
    {
      $set: {
        ownerId: ownerD!._id,
        id: "staging-hall-d",
        name: "[STAGING] Hall D",
        status: "active",
        isStagingFixture: true,
        updatedAt: now,
      },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true }
  );

  const membershipDocs = [
    {
      userId: ownerA!._id,
      venueId: "staging-hall-a",
      ownerId: ownerA!._id,
      role: "OWNER",
    },
    {
      userId: ownerB!._id,
      venueId: "staging-hall-b",
      ownerId: ownerB!._id,
      role: "OWNER",
    },
    {
      userId: shared!._id,
      venueId: "staging-hall-a",
      ownerId: ownerA!._id,
      role: "OWNER",
    },
    {
      userId: shared!._id,
      venueId: "staging-hall-b",
      ownerId: ownerB!._id,
      role: "VIEWER",
    },
    {
      userId: employee!._id,
      venueId: "staging-hall-a",
      ownerId: ownerA!._id,
      role: "EVENT_MANAGER",
    },
    {
      userId: ownerC!._id,
      venueId: "staging-hall-c",
      ownerId: ownerC!._id,
      role: "OWNER",
    },
    {
      userId: ownerD!._id,
      venueId: "staging-hall-d",
      ownerId: ownerD!._id,
      role: "OWNER",
    },
    {
      userId: shared!._id,
      venueId: "staging-hall-c",
      ownerId: ownerC!._id,
      role: "VIEWER",
    },
  ];

  for (const m of membershipDocs) {
    await memberships.updateOne(
      { userId: m.userId, venueId: m.venueId },
      {
        $set: {
          ...m,
          permissions: [],
          status: "active",
          isStagingFixture: true,
          updatedAt: now,
        },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true }
    );
  }

  await leads.updateOne(
    { hallId: "staging-hall-a", email: "staging-lead-a@invistimo.test" },
    {
      $set: {
        ownerId: ownerA!._id,
        hallId: "staging-hall-a",
        name: "[STAGING] Lead A",
        phone: "0500000001",
        email: "staging-lead-a@invistimo.test",
        eventType: "wedding",
        requestedDate: "2026-10-10",
        guests: 120,
        status: "negotiation",
        isStagingFixture: true,
        updatedAt: now,
      },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true }
  );

  await events.updateOne(
    { email: "staging-regular-event@invistimo.test", title: "[STAGING] Regular Event" },
    {
      $set: {
        userId: regularUser!._id,
        email: "staging-regular-event@invistimo.test",
        eventType: "wedding",
        title: "[STAGING] Regular Event",
        date: "2026-12-12",
        time: "18:00",
        status: "active",
        paymentStatus: "paid",
        location: { address: "Staging Venue" },
        zones: [],
        planning: {
          eventDefinition: { goal: "", vibe: "", size: "", notes: "" },
          concept: "",
        },
        maxGuests: 80,
        isStagingFixture: true,
        updatedAt: now,
      },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true }
  );

  // Placeholder VenueEvent without inventing linked Event if conversion path preferred
  await venueEvents.updateOne(
    { hallId: "staging-hall-a", title: "[STAGING] Venue Event Placeholder" },
    {
      $set: {
        ownerId: ownerA!._id,
        hallId: "staging-hall-a",
        hallName: "[STAGING] Hall A",
        title: "[STAGING] Venue Event Placeholder",
        clientName: "Staging Client",
        date: "2026-11-11",
        startTime: "19:00",
        status: "confirmed",
        isStagingFixture: true,
        updatedAt: now,
      },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true }
  );

  console.log(
    JSON.stringify(
      {
        ok: true,
        passwordHint: "StagingTest123! (test accounts only)",
        fixtures: {
          ownerA: "staging-owner-a@invistimo.test",
          ownerB: "staging-owner-b@invistimo.test",
          ownerC: "staging-owner-c@invistimo.test",
          ownerD: "staging-owner-d@invistimo.test",
          sharedOwner: "staging-shared-owner@invistimo.test",
          employee: "staging-venue-employee@invistimo.test",
          regularHost: "staging-regular-host@invistimo.test",
          hallA: "staging-hall-a",
          hallB: "staging-hall-b",
          hallC: "staging-hall-c",
          hallD: "staging-hall-d",
          leadA: "staging-lead-a@invistimo.test",
          regularEvent: "[STAGING] Regular Event",
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
