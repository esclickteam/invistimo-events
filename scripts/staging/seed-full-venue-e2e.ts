/**
 * Full Venue ↔ Event Customer E2E seed (Staging DB only).
 * Creates real users, halls, memberships, seating templates, lead,
 * linked event + customer, and a guest list for RSVP/seating tests.
 *
 *   APP_ENV=staging MONGO_URI='.../invistimo_staging' \
 *     npx tsx scripts/staging/seed-full-venue-e2e.ts
 */
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import {
  getMongoDatabaseNameFromUri,
  resolveAppEnv,
} from "../../lib/env/appEnv";
import { assertEnvironmentSafety } from "../../lib/env/safetyGuards";

const PASSWORD = "StagingTest123!";

function oid() {
  return new mongoose.Types.ObjectId();
}

function makeTables(prefix: string, count: number) {
  // Client seating format (seats:number + seatedGuests[]) — matches /dashboard/seating
  const tables = [];
  for (let i = 1; i <= count; i += 1) {
    const capacity = i % 3 === 0 ? 10 : i % 2 === 0 ? 8 : 6;
    tables.push({
      id: `${prefix}-table-${i}`,
      name: `שולחן ${prefix.toUpperCase()} ${i}`,
      type: "round",
      x: 80 + ((i - 1) % 5) * 160,
      y: 80 + Math.floor((i - 1) / 5) * 160,
      seats: capacity,
      capacity,
      width: 120,
      height: 120,
      radius: 60,
      color: "#ffffff",
      locked: false,
      rotation: 0,
      group: null,
      seatedGuests: [],
      reserved: i === count,
      reserveLabel: i === count ? "רזרבה" : "",
    });
  }
  return tables;
}

async function main() {
  process.env.APP_ENV = process.env.APP_ENV || "staging";
  const appEnv = resolveAppEnv();
  if (appEnv !== "staging" && appEnv !== "preview" && appEnv !== "test") {
    throw new Error(`Refusing seed when APP_ENV=${appEnv}`);
  }
  assertEnvironmentSafety({ throwOnError: true });

  const uri = String(process.env.MONGO_URI || process.env.MONGODB_URI || "");
  const dbName = getMongoDatabaseNameFromUri(uri);
  if (dbName !== "invistimo_staging") {
    throw new Error(`Refusing seed against db=${dbName}`);
  }

  await mongoose.connect(uri);
  const db = mongoose.connection.db!;
  const users = db.collection("users");
  const halls = db.collection("venuehalls");
  const memberships = db.collection("venuememberships");
  const leads = db.collection("venueleads");
  const venueEvents = db.collection("venueevents");
  const events = db.collection("events");
  const templates = db.collection("venueseatingtemplates");
  const invitations = db.collection("invitations");
  const guests = db.collection("guests");
  const seatingtables = db.collection("seatingtables");
  const audits = db.collection("venueauditlogs");

  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const now = new Date();

  const upsertUser = async (doc: Record<string, unknown>) => {
    const email = String(doc.email).toLowerCase();
    await users.updateOne(
      { email },
      {
        $set: {
          ...doc,
          email,
          password: passwordHash,
          updatedAt: now,
          isStagingFixture: true,
          isActive: true,
          hasPaid: true,
          needsPasswordSetup: false,
          authVersion: Number(doc.authVersion ?? 0),
        },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true }
    );
    return users.findOne({ email });
  };

  const venueUserBase = {
    role: "user",
    venueUser: true,
    employeeScope: "venue",
    staffType: null,
    plan: "basic",
    guests: 0,
    maxGuests: 0,
    allowedMessageRounds: 2,
  };

  const ownerA = await upsertUser({
    name: "[E2E] Venue Owner A",
    email: "e2e-owner-a@invistimo.test",
    ...venueUserBase,
  });
  const ownerB = await upsertUser({
    name: "[E2E] Venue Owner B",
    email: "e2e-owner-b@invistimo.test",
    ...venueUserBase,
  });
  const shared = await upsertUser({
    name: "[E2E] Shared Owner",
    email: "e2e-shared-owner@invistimo.test",
    ...venueUserBase,
  });

  const manager = await upsertUser({
    name: "[E2E] Employee Manager",
    email: "e2e-emp-manager@invistimo.test",
    ...venueUserBase,
  });
  const reception = await upsertUser({
    name: "[E2E] Employee Reception",
    email: "e2e-emp-reception@invistimo.test",
    ...venueUserBase,
  });
  const sales = await upsertUser({
    name: "[E2E] Employee Sales",
    email: "e2e-emp-sales@invistimo.test",
    ...venueUserBase,
  });
  const viewer = await upsertUser({
    name: "[E2E] Employee Viewer",
    email: "e2e-emp-viewer@invistimo.test",
    ...venueUserBase,
  });
  const staff = await upsertUser({
    name: "[E2E] Employee Staff",
    email: "e2e-emp-staff@invistimo.test",
    ...venueUserBase,
  });

  const customerA = await upsertUser({
    name: "[E2E] Event Customer A",
    email: "e2e-customer-a@invistimo.test",
    role: "user",
    plan: "rsvp_seating",
    guests: 80,
    maxGuests: 120,
    allowedMessageRounds: 2,
    venueClientSource: true,
    venueClientPackageType: "rsvp_seating",
    includeSeating: true,
    includeDigitalSeating: true,
    includeSystem: true,
    billingSource: "venue",
    hasDashboardAccess: true,
    venueHallId: "e2e-venue-a",
    venueClientHallId: "e2e-venue-a",
    venueHallName: "[E2E] Venue A",
    planLimits: { seatingEnabled: true },
    accessModules: { rsvpSeating: true, digitalSeating: true },
  });
  const customerB = await upsertUser({
    name: "[E2E] Event Customer B",
    email: "e2e-customer-b@invistimo.test",
    role: "user",
    plan: "basic",
    guests: 40,
    maxGuests: 80,
    allowedMessageRounds: 2,
  });
  const regularHost = await upsertUser({
    name: "[E2E] Regular Host",
    email: "e2e-regular-host@invistimo.test",
    role: "user",
    plan: "basic",
    guests: 50,
    maxGuests: 100,
    allowedMessageRounds: 2,
  });

  await halls.updateOne(
    { id: "e2e-venue-a" },
    {
      $set: {
        id: "e2e-venue-a",
        ownerId: ownerA!._id,
        name: "[E2E] Venue A",
        subtitle: "אולם בדיקות A",
        status: "active",
        capacity: 400,
        isStagingFixture: true,
        updatedAt: now,
      },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true }
  );
  await halls.updateOne(
    { id: "e2e-venue-b" },
    {
      $set: {
        id: "e2e-venue-b",
        ownerId: ownerB!._id,
        name: "[E2E] Venue B",
        subtitle: "אולם בדיקות B",
        status: "active",
        capacity: 250,
        isStagingFixture: true,
        updatedAt: now,
      },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true }
  );

  const membershipSpecs: Array<{
    user: any;
    venueId: string;
    ownerId: any;
    role: string;
    permissions?: string[];
  }> = [
    { user: ownerA, venueId: "e2e-venue-a", ownerId: ownerA!._id, role: "OWNER" },
    { user: ownerB, venueId: "e2e-venue-b", ownerId: ownerB!._id, role: "OWNER" },
    { user: shared, venueId: "e2e-venue-a", ownerId: ownerA!._id, role: "OWNER" },
    { user: shared, venueId: "e2e-venue-b", ownerId: ownerB!._id, role: "VIEWER" },
    { user: manager, venueId: "e2e-venue-a", ownerId: ownerA!._id, role: "MANAGER" },
    { user: reception, venueId: "e2e-venue-a", ownerId: ownerA!._id, role: "RECEPTION" },
    { user: sales, venueId: "e2e-venue-a", ownerId: ownerA!._id, role: "SALES" },
    { user: viewer, venueId: "e2e-venue-a", ownerId: ownerA!._id, role: "VIEWER" },
    {
      user: staff,
      venueId: "e2e-venue-a",
      ownerId: ownerA!._id,
      role: "STAFF",
      permissions: ["guests.edit"], // custom grant beyond STAFF defaults
    },
  ];

  for (const m of membershipSpecs) {
    await memberships.updateOne(
      { userId: m.user!._id, venueId: m.venueId },
      {
        $set: {
          userId: m.user!._id,
          venueId: m.venueId,
          ownerId: m.ownerId,
          role: m.role,
          permissions: m.permissions || [],
          status: "active",
          mustChangePassword: false,
          isStagingFixture: true,
          updatedAt: now,
        },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true }
    );
  }

  // 3 seating templates for Venue A + 1 for Venue B (isolation)
  const tplDefs = [
    { key: "e2e-tpl-a1", name: "[E2E] Template A1 - גן", prefix: "a1", count: 8 },
    { key: "e2e-tpl-a2", name: "[E2E] Template A2 - אולם", prefix: "a2", count: 10 },
    { key: "e2e-tpl-a3", name: "[E2E] Template A3 - VIP", prefix: "a3", count: 6 },
    { key: "e2e-tpl-b1", name: "[E2E] Template B1", prefix: "b1", count: 5, hall: "e2e-venue-b", owner: ownerB },
  ];

  const templateIds: Record<string, mongoose.Types.ObjectId> = {};
  for (const t of tplDefs) {
    const hallId = t.hall || "e2e-venue-a";
    const ownerId = (t.owner || ownerA)!._id;
    const existing = await templates.findOne({
      hallId,
      name: t.name,
      isStagingFixture: true,
    });
    const tables = makeTables(t.prefix, t.count);
    if (existing) {
      await templates.updateOne(
        { _id: existing._id },
        {
          $set: {
            tables,
            canvas: { background: null, canvasView: { x: 0, y: 0, zoom: 1 }, zones: [] },
            isActive: true,
            updatedAt: now,
          },
        }
      );
      templateIds[t.key] = existing._id as mongoose.Types.ObjectId;
    } else {
      const id = oid();
      await templates.insertOne({
        _id: id,
        ownerId,
        hallId,
        hallName: hallId === "e2e-venue-a" ? "[E2E] Venue A" : "[E2E] Venue B",
        name: t.name,
        description: "Staging E2E seating template",
        tables,
        canvas: { background: null, canvasView: { x: 0, y: 0, zoom: 1 }, zones: [] },
        settings: {},
        isActive: true,
        isStagingFixture: true,
        createdAt: now,
        updatedAt: now,
      });
      templateIds[t.key] = id;
    }
  }

  // Lead for Venue A
  await leads.updateOne(
    { hallId: "e2e-venue-a", email: "e2e-lead-a@invistimo.test" },
    {
      $set: {
        ownerId: ownerA!._id,
        hallId: "e2e-venue-a",
        name: "[E2E] Lead Customer A",
        phone: "0501111001",
        email: "e2e-lead-a@invistimo.test",
        eventType: "wedding",
        requestedDate: "2026-11-20",
        guests: 180,
        status: "negotiation",
        isStagingFixture: true,
        updatedAt: now,
      },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true }
  );

  // Linked Invistimo Event for Customer A (venue-linked)
  const eventAKey = { email: "e2e-customer-a@invistimo.test", title: "[E2E] Customer A Wedding" };
  let eventA = await events.findOne(eventAKey);
  if (!eventA) {
    const id = oid();
    await events.insertOne({
      _id: id,
      userId: customerA!._id,
      email: "e2e-customer-a@invistimo.test",
      title: "[E2E] Customer A Wedding",
      eventType: "wedding",
      date: "2026-11-20",
      time: "19:00",
      status: "active",
      paymentStatus: "paid",
      location: { address: "Venue A Hall" },
      zones: [],
      planning: { eventDefinition: { goal: "", vibe: "", size: "", notes: "" }, concept: "" },
      maxGuests: 180,
      venueOwnerId: ownerA!._id,
      venueHallId: "e2e-venue-a",
      venueHallName: "[E2E] Venue A",
      venueAccessStatus: "linked",
      venueLinkedAt: now,
      venueClientSelectedSeatingTemplateId: templateIds["e2e-tpl-a1"],
      venueClientSelectedSeatingTemplateName: "[E2E] Template A1 - גן",
      isStagingFixture: true,
      createdAt: now,
      updatedAt: now,
    });
    eventA = await events.findOne({ _id: id });
  } else {
    await events.updateOne(
      { _id: eventA._id },
      {
        $set: {
          userId: customerA!._id,
          venueOwnerId: ownerA!._id,
          venueHallId: "e2e-venue-a",
          venueHallName: "[E2E] Venue A",
          venueAccessStatus: "linked",
          venueClientSelectedSeatingTemplateId: templateIds["e2e-tpl-a1"],
          venueClientSelectedSeatingTemplateName: "[E2E] Template A1 - גן",
          updatedAt: now,
        },
      }
    );
  }

  await venueEvents.updateOne(
    { hallId: "e2e-venue-a", title: "[E2E] Customer A Wedding" },
    {
      $set: {
        ownerId: ownerA!._id,
        hallId: "e2e-venue-a",
        hallName: "[E2E] Venue A",
        title: "[E2E] Customer A Wedding",
        clientName: "[E2E] Event Customer A",
        clientEmail: "e2e-customer-a@invistimo.test",
        clientPhone: "0501111001",
        date: "2026-11-20",
        startTime: "19:00",
        status: "confirmed",
        linkedEventId: eventA!._id,
        selectedSeatingTemplateId: templateIds["e2e-tpl-a1"],
        seatingTemplateSyncedAt: now,
        isStagingFixture: true,
        updatedAt: now,
      },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true }
  );

  // Invitation + guests for Customer A
  // App reads RSVP guests from invitationguests (InvitationGuest model), not guests.
  const invitationGuests = db.collection("invitationguests");
  let invitation = await invitations.findOne({
    eventId: eventA!._id,
    isStagingFixture: true,
  });
  if (!invitation) {
    const invId = oid();
    await invitations.insertOne({
      _id: invId,
      eventId: eventA!._id,
      userId: customerA!._id,
      ownerId: customerA!._id,
      shareId: `e2e-share-${String(eventA!._id).slice(-6)}`,
      title: "[E2E] Customer A Wedding",
      isStagingFixture: true,
      createdAt: now,
      updatedAt: now,
    });
    invitation = await invitations.findOne({ _id: invId });
  } else {
    await invitations.updateOne(
      { _id: invitation._id },
      {
        $set: {
          userId: customerA!._id,
          ownerId: customerA!._id,
          updatedAt: now,
        },
      }
    );
    invitation = await invitations.findOne({ _id: invitation._id });
  }

  // 40 guests with mixed RSVP (yes/no/pending — InvitationGuest enums)
  const guestDocs = [];
  for (let i = 1; i <= 40; i += 1) {
    const rsvp = i % 5 === 0 ? "no" : i % 3 === 0 ? "pending" : "yes";
    const guestsCount = i % 4 === 0 ? 4 : i % 2 === 0 ? 2 : 1;
    guestDocs.push({
      eventId: eventA!._id,
      invitationId: invitation!._id,
      userId: customerA!._id,
      name: `[E2E] אורח ${i}`,
      phone: `0502${String(100000 + i).slice(-6)}`,
      relation: i % 2 === 0 ? "bride" : "groom",
      rsvp,
      status: rsvp,
      guestsCount,
      arrivedCount: rsvp === "yes" ? guestsCount : 0,
      amount: rsvp === "yes" ? guestsCount : 0,
      actualArrivedCount: 0,
      token: `e2e-guest-token-${i}-${String(eventA!._id).slice(-6)}`,
      isStagingFixture: true,
      updatedAt: now,
      createdAt: now,
    });
  }
  await invitationGuests.deleteMany({
    invitationId: invitation!._id,
    isStagingFixture: true,
  });
  // Also clear legacy wrong-collection seeds
  await guests.deleteMany({
    eventId: eventA!._id,
    isStagingFixture: true,
  });
  await invitationGuests.insertMany(guestDocs);

  // Materialize seating from Template A1 for customer event
  const tplA1 = await templates.findOne({ _id: templateIds["e2e-tpl-a1"] });
  await seatingtables.updateOne(
    { eventId: eventA!._id, source: "venue_seating_template" },
    {
      $set: {
        eventId: eventA!._id,
        invitationId: invitation!._id,
        userId: customerA!._id,
        venueOwnerId: ownerA!._id,
        venueHallId: "e2e-venue-a",
        venueHallName: "[E2E] Venue A",
        source: "venue_seating_template",
        sourceTemplateId: templateIds["e2e-tpl-a1"],
        sourceTemplateUpdatedAt: now,
        tables: tplA1?.tables || [],
        background: null,
        canvasView: { x: 0, y: 0, zoom: 1 },
        zones: [],
        updatedAt: now,
        isStagingFixture: true,
      },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true }
  );

  // Regular event (no venue) for regression
  await events.updateOne(
    { email: "e2e-regular-host@invistimo.test", title: "[E2E] Regular Non-Venue Event" },
    {
      $set: {
        userId: regularHost!._id,
        email: "e2e-regular-host@invistimo.test",
        title: "[E2E] Regular Non-Venue Event",
        eventType: "wedding",
        date: "2026-12-01",
        time: "18:00",
        status: "active",
        paymentStatus: "paid",
        location: { address: "Private Hall" },
        zones: [],
        planning: { eventDefinition: { goal: "", vibe: "", size: "", notes: "" }, concept: "" },
        maxGuests: 60,
        isStagingFixture: true,
        updatedAt: now,
      },
      $unset: {
        venueOwnerId: "",
        venueHallId: "",
        venueHallName: "",
        venueAccessStatus: "",
        venueClientSelectedSeatingTemplateId: "",
      },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true }
  );

  await audits.insertOne({
    venueId: "e2e-venue-a",
    ownerId: ownerA!._id,
    actorUserId: ownerA!._id,
    action: "e2e.seed",
    targetType: "System",
    targetId: "seed-full-venue-e2e",
    meta: { at: now.toISOString() },
    isStagingFixture: true,
    createdAt: now,
  });

  const report = {
    ok: true,
    db: dbName,
    passwordHint: `${PASSWORD} (staging test only — not printed in user reports)`,
    users: {
      ownerA: "e2e-owner-a@invistimo.test",
      ownerB: "e2e-owner-b@invistimo.test",
      sharedOwner: "e2e-shared-owner@invistimo.test",
      manager: "e2e-emp-manager@invistimo.test",
      reception: "e2e-emp-reception@invistimo.test",
      sales: "e2e-emp-sales@invistimo.test",
      viewer: "e2e-emp-viewer@invistimo.test",
      staff: "e2e-emp-staff@invistimo.test",
      customerA: "e2e-customer-a@invistimo.test",
      customerB: "e2e-customer-b@invistimo.test",
      regularHost: "e2e-regular-host@invistimo.test",
    },
    venues: { venueA: "e2e-venue-a", venueB: "e2e-venue-b" },
    templates: Object.fromEntries(
      Object.entries(templateIds).map(([k, v]) => [k, String(v)])
    ),
    eventAId: String(eventA!._id),
    invitationId: String(invitation!._id),
    guestCount: guestDocs.length,
  };

  console.log(JSON.stringify(report, null, 2));
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
