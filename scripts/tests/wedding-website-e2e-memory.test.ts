/**
 * In-memory E2E for Wedding Website product flow.
 * Does NOT touch Regular Invitation rendering.
 *
 * Run: npx tsx --test --test-force-exit scripts/tests/wedding-website-e2e-memory.test.ts
 */

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { nanoid } from "nanoid";

describe("Wedding Website memory E2E", () => {
  let mongod: MongoMemoryServer;
  let User: any;
  let Event: any;
  let Invitation: any;
  let InvitationGuest: any;
  let WeddingWebsite: any;
  let resolveWeddingSiteContent: any;
  let loadPublicWeddingSite: any;

  let shareIdRegular = "";
  let shareIdWW = "";
  let guestTokenWW = "";
  let invitationIdWW = "";

  before(async () => {
    mongod = await MongoMemoryServer.create();
    process.env.MONGO_URI = mongod.getUri("invistimo_test");
    process.env.APP_ENV = "test";
    await mongoose.connect(process.env.MONGO_URI);

    // Dynamic imports after env is set
    User = (await import("../../models/User")).default;
    Event = (await import("../../models/Event")).default;
    Invitation = (await import("../../models/Invitation")).default;
    InvitationGuest = (await import("../../models/InvitationGuest")).default;
    WeddingWebsite = (await import("../../models/WeddingWebsite")).default;
    ({ resolveWeddingSiteContent } = await import(
      "../../lib/weddingWebsite/resolveWeddingSiteContent"
    ));
    ({ loadPublicWeddingSite } = await import(
      "../../lib/weddingWebsite/loadPublicWeddingSite"
    ));

    // Customer A — regular only
    const userA = await User.create({
      name: "Regular A",
      email: `regular-a-${Date.now()}@test.local`,
      password: "hash",
      role: "user",
      hasPaid: true,
      isActive: true,
    });
    const eventA = await Event.create({
      userId: userA._id,
      title: "דנה ויוסי",
      eventType: "wedding",
      date: new Date("2026-10-10"),
      time: "19:00",
      email: userA.email,
      maxGuests: 100,
      location: { address: "תל אביב" },
    });
    shareIdRegular = nanoid(10);
    await Invitation.create({
      ownerId: userA._id,
      eventId: eventA._id,
      title: "דנה ויוסי",
      eventDate: new Date("2026-10-10"),
      eventTime: "19:00",
      location: { name: "אולם", address: "תל אביב" },
      shareId: shareIdRegular,
      invitationSettings: { rsvpSiteMode: "standard" },
    });

    // Customer B — wedding website
    const userB = await User.create({
      name: "WW B",
      email: `ww-b-${Date.now()}@test.local`,
      password: "hash",
      role: "user",
      hasPaid: true,
      isActive: true,
    });
    const eventB = await Event.create({
      userId: userB._id,
      title: "נועה ואיתי",
      eventType: "wedding",
      date: new Date("2026-11-20"),
      time: "20:00",
      email: userB.email,
      maxGuests: 150,
      location: { address: "הרצליה", lat: 32.16, lng: 34.84 },
    });
    shareIdWW = nanoid(10);
    const inviteB = await Invitation.create({
      ownerId: userB._id,
      eventId: eventB._id,
      title: "נועה ואיתי",
      eventDate: new Date("2026-11-20"),
      eventTime: "20:00",
      location: { name: "גן הפנינה", address: "הרצליה", lat: 32.16, lng: 34.84 },
      shareId: shareIdWW,
      publicEventPage: {
        enabled: true,
        schedule: {
          enabled: true,
          items: [{ time: "19:00", title: "קבלת פנים", description: "" }],
        },
        parking: {
          enabled: true,
          name: "חניון",
          instructions: "בשער",
        },
      },
      invitationSettings: { rsvpSiteMode: "personal" },
    });
    invitationIdWW = String(inviteB._id);

    await WeddingWebsite.create({
      ownerId: userB._id,
      eventId: eventB._id,
      invitationId: inviteB._id,
      shareId: shareIdWW,
      templateId: "garden-bloom",
      status: "published",
      publishedAt: new Date(),
      content: {
        heroSubtitle: "מחכים לכם",
        storyParagraphs: ["סיפור אמיתי מהאירוע"],
        faq: [{ question: "חניה?", answer: "כן" }],
      },
    });

    guestTokenWW = nanoid(16);
    await InvitationGuest.create({
      invitationId: inviteB._id,
      name: "אורח WW",
      phone: "0501234567",
      token: guestTokenWW,
      rsvp: "pending",
      guestsCount: 2,
    });
  });

  after(async () => {
    await mongoose.disconnect();
    await mongod.stop();
  });

  it("Customer A has no wedding website payload", async () => {
    const payload = await loadPublicWeddingSite({ shareId: shareIdRegular });
    assert.equal(payload, null);
  });

  it("Customer B published /w loads real event data", async () => {
    const payload = await loadPublicWeddingSite({
      shareId: shareIdWW,
      token: guestTokenWW,
    });
    assert.ok(payload);
    assert.equal(payload!.status, "published");
    assert.equal(payload!.templateId, "garden-bloom");
    assert.equal(payload!.content.coupleNames, "נועה ואיתי");
    assert.equal(payload!.content.weddingTime, "20:00");
    assert.equal(payload!.content.venueName, "גן הפנינה");
    assert.ok(payload!.content.schedule.length >= 1);
    assert.equal(payload!.content.heroSubtitle, "מחכים לכם");
    assert.ok(payload!.guest);
    assert.equal(payload!.guest!.name, "אורח WW");
    assert.equal(payload!.guest!.canSubmitRsvp, true);
  });

  it("content edit persists and refresh resolves new text", async () => {
    await WeddingWebsite.updateOne(
      { shareId: shareIdWW },
      { $set: { "content.heroSubtitle": "עודכן מהדשבורד" } }
    );
    const payload = await loadPublicWeddingSite({ shareId: shareIdWW });
    assert.equal(payload!.content.heroSubtitle, "עודכן מהדשבורד");
  });

  it("template switch does not change invitation shareId or guests", async () => {
    const beforeInvite = await Invitation.findOne({ shareId: shareIdWW }).lean();
    const beforeGuests = await InvitationGuest.countDocuments({
      invitationId: beforeInvite!._id,
    });

    await WeddingWebsite.updateOne(
      { shareId: shareIdWW },
      { $set: { templateId: "midnight-velvet" } }
    );

    const afterInvite = await Invitation.findOne({ shareId: shareIdWW }).lean();
    const afterGuests = await InvitationGuest.countDocuments({
      invitationId: afterInvite!._id,
    });

    assert.equal(String(beforeInvite!.shareId), String(afterInvite!.shareId));
    assert.equal(beforeGuests, afterGuests);
    assert.equal(afterInvite!.invitationSettings?.rsvpSiteMode, "personal");

    const payload = await loadPublicWeddingSite({ shareId: shareIdWW });
    assert.equal(payload!.templateId, "midnight-velvet");
    assert.equal(payload!.content.coupleNames, "נועה ואיתי");
  });

  it("RSVP via existing guest token updates same InvitationGuest", async () => {
    const guestBefore = await InvitationGuest.findOne({ token: guestTokenWW });
    assert.ok(guestBefore);

    await InvitationGuest.updateOne(
      { token: guestTokenWW },
      { $set: { rsvp: "yes", arrivedCount: 2 } }
    );

    const guestAfter = await InvitationGuest.findOne({ token: guestTokenWW });
    assert.equal(guestAfter!.rsvp, "yes");
    assert.equal(guestAfter!.arrivedCount, 2);

    // Still one guest record — no duplication
    const count = await InvitationGuest.countDocuments({
      invitationId: guestBefore!.invitationId,
    });
    assert.equal(count, 1);
  });

  it("Regular invitation shareId remains untouched", async () => {
    const invite = await Invitation.findOne({ shareId: shareIdRegular }).lean();
    assert.ok(invite);
    assert.equal(invite!.shareId, shareIdRegular);
    assert.equal(invite!.invitationSettings?.rsvpSiteMode, "standard");
    const ww = await WeddingWebsite.findOne({ shareId: shareIdRegular });
    assert.equal(ww, null);
  });

  it("resolveWeddingSiteContent prefers invitation fields", () => {
    const content = resolveWeddingSiteContent({
      invitation: {
        title: "נועה ואיתי",
        eventDate: "2026-11-20",
        eventTime: "20:00",
        location: { name: "גן", address: "הרצליה" },
      },
      overrides: { heroSubtitle: "hi" },
      templateId: "eternal-gold",
    });
    assert.equal(content.coupleNames, "נועה ואיתי");
    assert.equal(content.heroSubtitle, "hi");
  });
});
