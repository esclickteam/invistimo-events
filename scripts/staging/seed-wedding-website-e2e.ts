/**
 * Staging-only: seed Customer B with Wedding Website published.
 * Refuses Production DB.
 *
 * Usage:
 *   APP_ENV=staging MONGO_URI='.../invistimo_staging' \
 *     npx tsx scripts/staging/seed-wedding-website-e2e.ts
 *
 * Also keeps / creates Golden Regular Customer A WITHOUT wedding website.
 */
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import {
  getMongoDatabaseNameFromUri,
  resolveAppEnv,
} from "../../lib/env/appEnv";
import { assertEnvironmentSafety } from "../../lib/env/safetyGuards";

async function main() {
  process.env.APP_ENV = process.env.APP_ENV || "staging";
  const appEnv = resolveAppEnv();
  if (appEnv !== "staging" && appEnv !== "preview" && appEnv !== "test") {
    throw new Error(`Refusing seed when APP_ENV=${appEnv}`);
  }
  assertEnvironmentSafety({ throwOnError: true });

  const uri = String(process.env.MONGO_URI || process.env.MONGODB_URI || "");
  if (!uri) throw new Error("MONGO_URI required");
  const dbName = getMongoDatabaseNameFromUri(uri);
  if (!String(dbName || "").includes("staging") && appEnv === "staging") {
    console.warn("Warning: DB name does not look like staging:", dbName);
  }

  await mongoose.connect(uri);
  const db = mongoose.connection;
  const users = db.collection("users");
  const events = db.collection("events");
  const invitations = db.collection("invitations");
  const guests = db.collection("invitationguests");
  const websites = db.collection("weddingwebsites");

  const passwordHash = await bcrypt.hash("StagingTest123!", 10);
  const now = new Date();

  // ---------- CUSTOMER A: Regular invitation only (GOLDEN) ----------
  const emailA = "staging-ww-regular-a@invistimo.test";
  await users.updateOne(
    { email: emailA },
    {
      $set: {
        name: "[STAGING] WW Regular A",
        email: emailA,
        password: passwordHash,
        role: "user",
        isActive: true,
        hasPaid: true,
        isStagingFixture: true,
        updatedAt: now,
      },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true }
  );
  const userA = await users.findOne({ email: emailA });
  if (!userA) throw new Error("userA missing");

  const shareIdA = "GOLDENREG01";
  await events.updateOne(
    { stagingKey: "ww-regular-a-event" },
    {
      $set: {
        userId: userA._id,
        title: "דנה ויוסי",
        eventType: "wedding",
        date: new Date("2026-10-10"),
        time: "19:00",
        location: { address: "תל אביב", lat: 32.08, lng: 34.78 },
        status: "active",
        stagingKey: "ww-regular-a-event",
        isStagingFixture: true,
        updatedAt: now,
      },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true }
  );
  const eventA = await events.findOne({ stagingKey: "ww-regular-a-event" });
  if (!eventA) throw new Error("eventA missing");

  await invitations.updateOne(
    { stagingKey: "ww-regular-a-invite" },
    {
      $set: {
        ownerId: userA._id,
        eventId: eventA._id,
        title: "דנה ויוסי",
        eventType: "wedding",
        eventDate: new Date("2026-10-10"),
        eventTime: "19:00",
        location: { name: "אולם הזהב", address: "תל אביב", lat: 32.08, lng: 34.78 },
        shareId: shareIdA,
        invitationSettings: { rsvpSiteMode: "standard" },
        stagingKey: "ww-regular-a-invite",
        isStagingFixture: true,
        updatedAt: now,
      },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true }
  );
  const inviteA = await invitations.findOne({ stagingKey: "ww-regular-a-invite" });
  if (!inviteA) throw new Error("inviteA missing");

  // Ensure NO wedding website for A
  await websites.deleteMany({ invitationId: inviteA._id });

  const tokenA = "golden-regular-guest-token";
  await guests.updateOne(
    { token: tokenA },
    {
      $set: {
        invitationId: inviteA._id,
        name: "אורח זהב",
        phone: "0500000001",
        token: tokenA,
        rsvp: "pending",
        guestsCount: 2,
        isStagingFixture: true,
        updatedAt: now,
      },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true }
  );

  // ---------- CUSTOMER B: Wedding Website ----------
  const emailB = "staging-ww-customer-b@invistimo.test";
  await users.updateOne(
    { email: emailB },
    {
      $set: {
        name: "[STAGING] WW Customer B",
        email: emailB,
        password: passwordHash,
        role: "user",
        isActive: true,
        hasPaid: true,
        isStagingFixture: true,
        updatedAt: now,
      },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true }
  );
  const userB = await users.findOne({ email: emailB });
  if (!userB) throw new Error("userB missing");

  const shareIdB = nanoid(10);
  await events.updateOne(
    { stagingKey: "ww-customer-b-event" },
    {
      $set: {
        userId: userB._id,
        title: "נועה ואיתי",
        eventType: "wedding",
        date: new Date("2026-11-20"),
        time: "20:00",
        location: { address: "הרצליה פיתוח", lat: 32.16, lng: 34.84 },
        status: "active",
        stagingKey: "ww-customer-b-event",
        isStagingFixture: true,
        updatedAt: now,
      },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true }
  );
  const eventB = await events.findOne({ stagingKey: "ww-customer-b-event" });
  if (!eventB) throw new Error("eventB missing");

  await invitations.updateOne(
    { stagingKey: "ww-customer-b-invite" },
    {
      $set: {
        ownerId: userB._id,
        eventId: eventB._id,
        title: "נועה ואיתי",
        eventType: "wedding",
        eventDate: new Date("2026-11-20"),
        eventTime: "20:00",
        location: {
          name: "גן הפנינה",
          address: "הרצליה פיתוח",
          lat: 32.16,
          lng: 34.84,
        },
        shareId: shareIdB,
        publicEventPage: {
          enabled: true,
          schedule: {
            enabled: true,
            items: [
              { time: "19:00", title: "קבלת פנים", description: "" },
              { time: "20:00", title: "חופה", description: "" },
            ],
          },
          parking: {
            enabled: true,
            name: "חניון צפוני",
            address: "",
            instructions: "הצגה בשער",
          },
          gifts: { creditUrl: "", payboxUrl: "", bitPhone: "", bitUrl: "" },
          note: { enabled: true, text: "שמחים להזמין אתכם" },
        },
        invitationSettings: { rsvpSiteMode: "personal" },
        stagingKey: "ww-customer-b-invite",
        isStagingFixture: true,
        updatedAt: now,
      },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true }
  );
  const inviteB = await invitations.findOne({ stagingKey: "ww-customer-b-invite" });
  if (!inviteB) throw new Error("inviteB missing");

  // Keep shareId stable if invite already existed
  const finalShareB = String(inviteB.shareId || shareIdB);

  await websites.updateOne(
    { invitationId: inviteB._id },
    {
      $set: {
        ownerId: userB._id,
        eventId: eventB._id,
        invitationId: inviteB._id,
        shareId: finalShareB,
        templateId: "eternal-gold",
        status: "published",
        publishedAt: now,
        content: {
          heroSubtitle: "שמחים ונרגשים לחגוג איתכם",
          storyParagraphs: ["הסיפור שלנו מתחיל במבט אחד."],
          faq: [{ question: "יש חניה?", answer: "כן, חניון צפוני." }],
          transportation: [
            { title: "הסעות", description: "שאטל ממרכז העיר" },
          ],
          giftsNote: "הנוכחות היא המתנה",
        },
        sections: {},
        isStagingFixture: true,
        updatedAt: now,
      },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true }
  );

  const tokenB = "ww-customer-b-guest-token";
  await guests.updateOne(
    { token: tokenB },
    {
      $set: {
        invitationId: inviteB._id,
        name: "אורח אתר חתונה",
        phone: "0500000002",
        token: tokenB,
        rsvp: "pending",
        guestsCount: 2,
        isStagingFixture: true,
        updatedAt: now,
      },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true }
  );

  const summary = {
    customerA: {
      email: emailA,
      password: "StagingTest123!",
      shareId: shareIdA,
      inviteUrl: `/invite/${shareIdA}?token=${tokenA}`,
      weddingWebsiteExpected: null,
    },
    customerB: {
      email: emailB,
      password: "StagingTest123!",
      shareId: finalShareB,
      inviteUrl: `/invite/${finalShareB}?token=${tokenB}`,
      weddingWebsiteUrl: `/w/${finalShareB}?token=${tokenB}`,
      templateId: "eternal-gold",
      dashboardUrl: `/dashboard/wedding-website?invitationId=${String(inviteB._id)}`,
    },
  };

  console.log(JSON.stringify(summary, null, 2));
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
