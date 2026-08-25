/**
 * Real integration E2E against mongodb-memory-server replica set + app TS modules.
 * Exercises membership isolation, conversion idempotency, authVersion,
 * calendar cancel, and permissions — without Production DB.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

import User from "../../models/User";
import VenueHall from "../../models/VenueHall";
import VenueMembership from "../../models/VenueMembership";
import VenueLead from "../../models/VenueLead";
import VenueEvent from "../../models/VenueEvent";
import Event from "../../models/Event";
import { convertLeadToVenueEvent } from "../../lib/venues/convertLeadToEvent";
import {
  createVenueCalendarEvent,
  updateVenueCalendarEvent,
  cancelVenueCalendarEvent,
} from "../../lib/venues/venueEventsService";
import { hasVenuePermission } from "../../lib/venues/permissions";
import {
  checkLoginRateLimit,
  resetLoginRateLimitForTests,
  buildLoginRateLimitKey,
} from "../../lib/auth/loginRateLimit";

test("venue memory e2e suite", async (t) => {
  let replset: MongoMemoryReplSet | null = null;

  try {
    replset = await MongoMemoryReplSet.create({
      replSet: { count: 1, storageEngine: "wiredTiger" },
    });
  } catch (err: any) {
    t.skip(`mongodb-memory-server unavailable: ${err?.message || err}`);
    return;
  }

  process.env.MONGO_URI = replset.getUri();
  process.env.JWT_SECRET = "test-jwt-secret-venues";

  await mongoose.connect(process.env.MONGO_URI);
  // Wait for replica primary and create empty collections before transactions
  await new Promise((r) => setTimeout(r, 800));
  await Promise.all(
    [User, VenueHall, VenueMembership, VenueLead, VenueEvent, Event].map(
      async (model) => {
        try {
          await model.createCollection();
        } catch {
          /* already exists */
        }
      }
    )
  );

  async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
    let lastErr: unknown;
    for (let i = 0; i < attempts; i += 1) {
      try {
        return await fn();
      } catch (err: any) {
        lastErr = err;
        const msg = String(err?.message || "");
        if (
          err?.code === 112 ||
          /catalog changes|TransientTransactionError|Please retry/i.test(msg)
        ) {
          await new Promise((r) => setTimeout(r, 200 * (i + 1)));
          continue;
        }
        throw err;
      }
    }
    throw lastErr;
  }

  try {
    const passwordHash = await bcrypt.hash("Password123!", 10);

    const ownerA = await User.create({
      name: "Owner A",
      email: "owner-a@test.local",
      password: passwordHash,
      role: "venue_owner",
      isActive: true,
      hasPaid: true,
      needsPasswordSetup: false,
      authVersion: 0,
      plan: "basic",
      guests: 0,
      maxGuests: 0,
      allowedMessageRounds: 2,
    });

    const ownerB = await User.create({
      name: "Owner B",
      email: "owner-b@test.local",
      password: passwordHash,
      role: "venue_owner",
      isActive: true,
      hasPaid: true,
      needsPasswordSetup: false,
      authVersion: 0,
      plan: "basic",
      guests: 0,
      maxGuests: 0,
      allowedMessageRounds: 2,
    });

    const shared = await User.create({
      name: "Shared Owner",
      email: "shared@test.local",
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

    await VenueHall.create({
      ownerId: ownerA._id,
      id: "hall-a",
      name: "Hall A",
      status: "active",
    });
    await VenueHall.create({
      ownerId: ownerB._id,
      id: "hall-b",
      name: "Hall B",
      status: "active",
    });

    await VenueMembership.create({
      userId: ownerA._id,
      venueId: "hall-a",
      ownerId: ownerA._id,
      role: "OWNER",
      permissions: [],
      status: "active",
    });
    await VenueMembership.create({
      userId: ownerB._id,
      venueId: "hall-b",
      ownerId: ownerB._id,
      role: "OWNER",
      permissions: [],
      status: "active",
    });
    await VenueMembership.create({
      userId: shared._id,
      venueId: "hall-a",
      ownerId: ownerA._id,
      role: "OWNER",
      permissions: [],
      status: "active",
    });
    await VenueMembership.create({
      userId: shared._id,
      venueId: "hall-b",
      ownerId: ownerB._id,
      role: "VIEWER",
      permissions: [],
      status: "active",
    });

    await t.test("shared owner has different roles per hall", async () => {
      const mA = await VenueMembership.findOne({
        userId: shared._id,
        venueId: "hall-a",
      });
      const mB = await VenueMembership.findOne({
        userId: shared._id,
        venueId: "hall-b",
      });
      assert.equal(mA!.role, "OWNER");
      assert.equal(mB!.role, "VIEWER");
      assert.equal(
        hasVenuePermission(mB!.role as any, mB!.permissions as any, "employees.manage"),
        false
      );
      assert.equal(
        hasVenuePermission(mA!.role as any, mA!.permissions as any, "employees.manage"),
        true
      );
    });

    await t.test("lead conversion idempotent + linkedEventId", async () => {
      const lead = await VenueLead.create({
        ownerId: ownerA._id,
        hallId: "hall-a",
        name: "Client A",
        phone: "0500000001",
        email: "client-a@test.local",
        eventType: "wedding",
        requestedDate: "2026-09-01",
        guests: 100,
        budget: 50000,
        status: "negotiation",
      });

      const first = await withRetry(() =>
        convertLeadToVenueEvent({
          leadId: String(lead._id),
          venueId: "hall-a",
          ownerId: String(ownerA._id),
          actorUserId: String(ownerA._id),
          hallName: "Hall A",
          date: "2026-09-01",
          startTime: "19:30",
        })
      );
      assert.equal(first.ok, true);
      if (!first.ok) throw new Error("first conversion failed");
      assert.equal(first.alreadyExisted, false);
      assert.ok(first.eventId);
      assert.ok(first.venueEventId);

      const second = await withRetry(() =>
        convertLeadToVenueEvent({
          leadId: String(lead._id),
          venueId: "hall-a",
          ownerId: String(ownerA._id),
          actorUserId: String(ownerA._id),
          hallName: "Hall A",
          date: "2026-09-01",
        })
      );
      assert.equal(second.ok, true);
      if (!second.ok) throw new Error("second conversion failed");
      assert.equal(second.alreadyExisted, true);
      assert.equal(second.eventId, first.eventId);
      assert.equal(second.venueEventId, first.venueEventId);

      const veCount = await VenueEvent.countDocuments({
        createdFromLeadId: lead._id,
      });
      assert.equal(veCount, 1);

      const ve = await VenueEvent.findById(first.venueEventId);
      assert.equal(String(ve!.linkedEventId), first.eventId);
    });

    await t.test("calendar update does not create new Event", async () => {
      const created = await withRetry(() =>
        createVenueCalendarEvent({
          ownerId: String(ownerA._id),
          venueId: "hall-a",
          hallName: "Hall A",
          actorUserId: String(ownerA._id),
          body: {
            title: "Test Party",
            eventType: "other",
            clientName: "Dana",
            date: "2026-10-10",
            startTime: "20:00",
            endTime: "01:00",
            guests: 50,
            status: "confirmed",
          },
        })
      );
      assert.equal(created.ok, true);
      if (!created.ok) throw new Error("create failed");
      const venueEventId = String(created.venueEvent._id);
      const beforeCount = await Event.countDocuments({});
      const updated = await withRetry(() =>
        updateVenueCalendarEvent({
          ownerId: String(ownerA._id),
          venueId: "hall-a",
          venueEventId,
          patch: { title: "Test Party Updated", startTime: "21:00" },
        })
      );
      assert.equal(updated.ok, true);
      const afterCount = await Event.countDocuments({});
      assert.equal(afterCount, beforeCount);
      const ve = await VenueEvent.findById(venueEventId);
      assert.ok(String(ve!.title).includes("Updated"));
    });

    await t.test("cancel archives linked Event", async () => {
      const created = await withRetry(() =>
        createVenueCalendarEvent({
          ownerId: String(ownerA._id),
          venueId: "hall-a",
          hallName: "Hall A",
          actorUserId: String(ownerA._id),
          body: {
            title: "Cancel Me",
            date: "2026-11-11",
            startTime: "19:00",
            status: "confirmed",
          },
        })
      );
      assert.equal(created.ok, true);
      if (!created.ok) throw new Error("create failed");
      const venueEventId = String(created.venueEvent._id);
      const eventId = String(created.linkedEvent._id);
      const cancelled = await withRetry(() =>
        cancelVenueCalendarEvent({
          ownerId: String(ownerA._id),
          venueId: "hall-a",
          venueEventId,
        })
      );
      assert.equal(cancelled.ok, true);
      const ve = await VenueEvent.findById(venueEventId);
      const ev = await Event.findById(eventId);
      assert.equal(ve!.status, "cancelled");
      assert.equal(ev!.status, "archived");
    });

    await t.test("tenant isolation for leads", async () => {
      await VenueLead.create({
        ownerId: ownerA._id,
        hallId: "hall-a",
        name: "Only A",
        status: "new",
      });
      await VenueLead.create({
        ownerId: ownerB._id,
        hallId: "hall-b",
        name: "Only B",
        status: "new",
      });
      const aLeads = await VenueLead.find({ hallId: "hall-a" });
      assert.equal(
        aLeads.some((l) => l.name === "Only B"),
        false
      );
    });

    await t.test("regular Event without venue fields still creatable", async () => {
      const regular = await Event.create({
        userId: ownerA._id,
        email: "regular@test.local",
        eventType: "wedding",
        title: "Regular Non-Venue Event",
        date: "2026-12-12",
        time: "18:00",
        status: "active",
        paymentStatus: "paid",
        location: { address: "" },
        zones: [],
        planning: {
          eventDefinition: { goal: "", vibe: "", size: "", notes: "" },
          concept: "",
        },
        maxGuests: 10,
      });
      assert.ok(regular._id);
      assert.equal((regular as any).venueAccessStatus || "none", "none");
      const venueLinked = await VenueEvent.findOne({
        linkedEventId: regular._id,
      });
      assert.equal(venueLinked, null);
    });

    await t.test("authVersion bump conceptually invalidates", async () => {
      shared.authVersion = ((shared as any).authVersion || 0) + 1;
      await shared.save();
      const fresh = await User.findById(shared._id);
      assert.equal(((fresh as any).authVersion || 0) >= 1, true);
    });

    await t.test("login rate limit blocks after max", async () => {
      resetLoginRateLimitForTests();
      const key = buildLoginRateLimitKey("1.2.3.4", "brute@test.local");
      let blocked = false;
      for (let i = 0; i < 12; i++) {
        const r = checkLoginRateLimit(key);
        if (!r.allowed) blocked = true;
      }
      assert.equal(blocked, true);
    });

    await t.test("Invistimo staff role not used for venue users", async () => {
      const fresh = await User.findById(shared._id);
      assert.equal(fresh!.role, "user");
      assert.equal((fresh as any).venueUser, true);
      assert.equal((fresh as any).staffType, null);
      assert.equal((fresh as any).employeeScope, "venue");
    });
  } finally {
    await mongoose.disconnect().catch(() => {});
    await replset?.stop().catch(() => {});
  }
});
