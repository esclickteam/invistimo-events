/**
 * Seed Staging transportation test customers (A enabled / B disabled).
 *
 * Usage (Staging only):
 *   APP_ENV=staging MONGO_URI='mongodb.../invistimo_staging' \
 *     npx tsx scripts/staging/seed-transportation-customers.ts
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
        mode: "seed-transportation-customers",
        appEnv,
        mongoDbName: dbName,
      },
      null,
      2
    )
  );

  await mongoose.connect(uri);

  const users = mongoose.connection.collection("users");
  const events = mongoose.connection.collection("events");
  const invitations = mongoose.connection.collection("invitations");

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

  // Customer Transport A — transportation ENABLED
  const customerA = await upsertUser({
    name: "Customer Transport A",
    email: "staging-transport-a@invistimo.test",
    password: passwordHash,
    role: "user",
    isActive: true,
    hasPaid: true,
    needsPasswordSetup: false,
    authVersion: 0,
    plan: "plan2",
    guests: 200,
    maxGuests: 200,
    allowedMessageRounds: 2,
    includeCalls: false,
    includeCreditGifts: false,
    includeDigitalSeating: true,
    includeEventManagement: false,
    includeCustomDesign: false,
    includeTransportationManagement: true,
    accessModules: {
      rsvpSeating: true,
      eventProduction: false,
      transportationManagement: true,
    },
    planLimits: {
      maxGuests: 200,
      allowedMessageRounds: 2,
      smsEnabled: true,
      smsLimit: 600,
      seatingEnabled: true,
      remindersEnabled: true,
      transportationEnabled: true,
    },
    salesUpsells: {
      transportationManagement: {
        enabled: true,
        price: 0,
        givenFree: true,
        notes: "Staging fixture – Transportation Management",
      },
    },
    selfManageEnabled: false,
    smsBalance: 100,
    smsUsed: 0,
    isDemoUser: true,
  });

  // Customer Normal B — transportation DISABLED
  const customerB = await upsertUser({
    name: "Customer Normal B",
    email: "staging-transport-b@invistimo.test",
    password: passwordHash,
    role: "user",
    isActive: true,
    hasPaid: true,
    needsPasswordSetup: false,
    authVersion: 0,
    plan: "plan2",
    guests: 200,
    maxGuests: 200,
    allowedMessageRounds: 2,
    includeCalls: false,
    includeCreditGifts: false,
    includeDigitalSeating: true,
    includeEventManagement: false,
    includeCustomDesign: false,
    includeTransportationManagement: false,
    accessModules: {
      rsvpSeating: true,
      eventProduction: false,
      transportationManagement: false,
    },
    planLimits: {
      maxGuests: 200,
      allowedMessageRounds: 2,
      smsEnabled: true,
      smsLimit: 600,
      seatingEnabled: true,
      remindersEnabled: true,
      transportationEnabled: false,
    },
    salesUpsells: {
      transportationManagement: {
        enabled: false,
        price: 0,
        givenFree: false,
        notes: "",
      },
    },
    selfManageEnabled: false,
    smsBalance: 100,
    smsUsed: 0,
    isDemoUser: true,
  });

  const ensureEvent = async (user: any, title: string, shareSuffix: string) => {
    const existing = await events.findOne({
      userId: user._id,
      title,
      isStagingFixture: true,
    });
    if (existing) return existing;

    const eventDate = new Date();
    eventDate.setDate(eventDate.getDate() + 30);

    const insert = await events.insertOne({
      userId: user._id,
      title,
      eventType: "wedding",
      date: eventDate,
      time: "19:00",
      location: { address: "אולם בדיקות, תל אביב" },
      estimatedGuests: 150,
      estimatedGuestCount: 150,
      status: "active",
      paymentStatus: "paid",
      isStagingFixture: true,
      createdAt: now,
      updatedAt: now,
    });

    const eventId = insert.insertedId;
    const shareId = `stg-transport-${shareSuffix}`;

    await invitations.updateOne(
      { shareId },
      {
        $set: {
          ownerId: user._id,
          eventId,
          title,
          eventType: "wedding",
          eventDate,
          eventTime: "19:00",
          location: { address: "אולם בדיקות, תל אביב" },
          shareId,
          guests: [],
          invitationSettings: {
            rsvpSiteMode: "standard",
          },
          isStagingFixture: true,
          updatedAt: now,
        },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true }
    );

    return events.findOne({ _id: eventId });
  };

  const eventA = await ensureEvent(
    customerA,
    "[STAGING] Transport A Event",
    "a"
  );
  const eventB = await ensureEvent(
    customerB,
    "[STAGING] Transport B Event",
    "b"
  );

  console.log(
    JSON.stringify(
      {
        ok: true,
        customers: {
          A: {
            email: customerA?.email,
            transportation: true,
            eventId: String(eventA?._id),
          },
          B: {
            email: customerB?.email,
            transportation: false,
            eventId: String(eventB?._id),
          },
        },
        password: "StagingTest123!",
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
