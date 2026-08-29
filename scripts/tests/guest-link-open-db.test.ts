/**
 * Real MongoDB validation of guest link-open tracking.
 * Uses mongodb-memory-server, not Production/Staging.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";

import InvitationGuest from "../../models/InvitationGuest";
import { LINK_OPEN_DEDUP_MS } from "../../lib/guestLinkTracking";
import { recordGuestLinkOpen } from "../../lib/guestLinkTracking.server";

function spyInvitationGuestWrites() {
  const collection = InvitationGuest.collection;
  const methods = [
    "updateOne",
    "updateMany",
    "replaceOne",
    "findOneAndUpdate",
    "bulkWrite",
    "findOneAndReplace",
  ] as const;
  const originals = new Map<string, (...args: unknown[]) => unknown>();
  let count = 0;

  for (const method of methods) {
    const original = (collection[method] as (...args: unknown[]) => unknown).bind(
      collection
    );
    originals.set(method, original);
    (collection as unknown as Record<string, unknown>)[method] = (
      ...args: unknown[]
    ) => {
      count += 1;
      return original(...args);
    };
  }

  return {
    get count() {
      return count;
    },
    restore() {
      for (const method of methods) {
        (collection as unknown as Record<string, unknown>)[method] =
          originals.get(method);
      }
    },
  };
}

test("guest link-open tracking against a real MongoDB", async (t) => {
  let mongod: MongoMemoryServer | null = null;

  try {
    mongod = await MongoMemoryServer.create();
  } catch (err: any) {
    t.skip(`mongodb-memory-server unavailable: ${err?.message || err}`);
    return;
  }

  process.env.MONGO_URI = mongod.getUri();
  await mongoose.connect(process.env.MONGO_URI);

  const invitationId = new mongoose.Types.ObjectId();
  const otherInvitationId = new mongoose.Types.ObjectId();

  const guest = await InvitationGuest.create({
    invitationId,
    name: "אורח בדיקה",
    phone: "0500000001",
    token: "token-real-guest",
    rsvp: "pending",
    status: "pending",
    guestsCount: 2,
    arrivedCount: 0,
  });

  const otherGuest = await InvitationGuest.create({
    invitationId: otherInvitationId,
    name: "אורח אחר",
    phone: "0500000002",
    token: "token-other-guest",
    rsvp: "pending",
    status: "pending",
    guestsCount: 1,
    arrivedCount: 0,
  });

  const createdUpdatedAt = new Date(guest.updatedAt).getTime();
  assert.equal(guest.openCount || 0, 0);
  assert.equal(guest.firstOpenedAt, null);
  assert.equal(guest.lastOpenedAt, null);

  await t.test("first valid /invite-style open records opened + openCount=1", async () => {
    const ok = await recordGuestLinkOpen({
      token: "token-real-guest",
      invitationId,
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
    });
    assert.equal(ok, true);

    const fresh = await InvitationGuest.findById(guest._id).lean();
    assert.equal(fresh?.openCount, 1);
    assert.ok(fresh?.firstOpenedAt);
    assert.ok(fresh?.lastOpenedAt);
    assert.equal(
      new Date(fresh!.firstOpenedAt).getTime(),
      new Date(fresh!.lastOpenedAt).getTime()
    );
    assert.equal(new Date(fresh!.updatedAt).getTime(), createdUpdatedAt);
    assert.equal(fresh?.rsvp, "pending");
  });

  await t.test("refresh inside 5 minutes does not write lastOpenedAt or openCount", async () => {
    const before = await InvitationGuest.findById(guest._id).lean();
    await new Promise((r) => setTimeout(r, 25));

    const ok = await recordGuestLinkOpen({
      token: "token-real-guest",
      invitationId,
      userAgent: "Mozilla/5.0",
    });
    assert.equal(ok, true);

    const fresh = await InvitationGuest.findById(guest._id).lean();
    assert.equal(fresh?.openCount, 1);
    assert.equal(
      new Date(fresh!.lastOpenedAt).getTime(),
      new Date(before!.lastOpenedAt).getTime()
    );
    assert.equal(
      new Date(fresh!.firstOpenedAt).getTime(),
      new Date(before!.firstOpenedAt).getTime()
    );
    assert.equal(new Date(fresh!.updatedAt).getTime(), createdUpdatedAt);
  });

  await t.test("20 refreshes inside 5 minutes stay at openCount=1 with no Guest writes", async () => {
    const before = await InvitationGuest.findById(guest._id).lean();
    const lastOpenedAtMs = new Date(before!.lastOpenedAt).getTime();
    const spy = spyInvitationGuestWrites();

    try {
      for (let i = 0; i < 20; i++) {
        const ok = await recordGuestLinkOpen({
          token: "token-real-guest",
          invitationId,
          userAgent: "Mozilla/5.0",
        });
        assert.equal(ok, true);
      }
    } finally {
      spy.restore();
    }

    const fresh = await InvitationGuest.findById(guest._id).lean();
    assert.equal(spy.count, 0);
    assert.equal(fresh?.openCount, 1);
    assert.equal(new Date(fresh!.lastOpenedAt).getTime(), lastOpenedAtMs);
    assert.equal(
      new Date(fresh!.firstOpenedAt).getTime(),
      new Date(before!.firstOpenedAt).getTime()
    );
    assert.equal(fresh?.rsvp, "pending");
    assert.equal(new Date(fresh!.updatedAt).getTime(), createdUpdatedAt);
  });

  await t.test("open after more than 5 minutes increments openCount", async () => {
    const agedLast = new Date(Date.now() - LINK_OPEN_DEDUP_MS - 1000);
    await InvitationGuest.updateOne(
      { _id: guest._id },
      { $set: { lastOpenedAt: agedLast } },
      { timestamps: false }
    );

    const ok = await recordGuestLinkOpen({
      token: "token-real-guest",
      invitationId,
      userAgent: "Mozilla/5.0",
    });
    assert.equal(ok, true);

    const fresh = await InvitationGuest.findById(guest._id).lean();
    assert.equal(fresh?.openCount, 2);
    assert.ok(new Date(fresh!.lastOpenedAt).getTime() > agedLast.getTime());
    assert.equal(new Date(fresh!.updatedAt).getTime(), createdUpdatedAt);
  });

  await t.test("parallel opens after the 5 minute window increment openCount only once", async () => {
    const agedLast = new Date(Date.now() - LINK_OPEN_DEDUP_MS - 1000);
    await InvitationGuest.updateOne(
      { _id: guest._id },
      { $set: { lastOpenedAt: agedLast } },
      { timestamps: false }
    );

    const before = await InvitationGuest.findById(guest._id).lean();
    await Promise.all(
      Array.from({ length: 8 }, () =>
        recordGuestLinkOpen({
          token: "token-real-guest",
          invitationId,
          userAgent: "Mozilla/5.0",
        })
      )
    );

    const fresh = await InvitationGuest.findById(guest._id).lean();
    assert.equal(fresh?.openCount, Number(before?.openCount || 0) + 1);
    assert.ok(new Date(fresh!.lastOpenedAt).getTime() > agedLast.getTime());
    assert.equal(
      new Date(fresh!.firstOpenedAt).getTime(),
      new Date(before!.firstOpenedAt).getTime()
    );
    assert.equal(new Date(fresh!.updatedAt).getTime(), createdUpdatedAt);
  });

  await t.test("wrong token or other guest token does not record an open", async () => {
    const before = await InvitationGuest.findById(guest._id).lean();
    const otherBefore = await InvitationGuest.findById(otherGuest._id).lean();

    const missing = await recordGuestLinkOpen({
      token: "token-does-not-exist",
      invitationId,
      userAgent: "Mozilla/5.0",
    });
    const otherInvite = await recordGuestLinkOpen({
      token: "token-other-guest",
      invitationId,
      userAgent: "Mozilla/5.0",
    });
    const noToken = await recordGuestLinkOpen({
      token: "",
      invitationId,
      userAgent: "Mozilla/5.0",
    });

    assert.equal(missing, false);
    assert.equal(otherInvite, false);
    assert.equal(noToken, false);

    const fresh = await InvitationGuest.findById(guest._id).lean();
    const otherFresh = await InvitationGuest.findById(otherGuest._id).lean();
    assert.equal(fresh?.openCount, before?.openCount);
    assert.equal(otherFresh?.openCount || 0, otherBefore?.openCount || 0);
    assert.equal(otherFresh?.firstOpenedAt, null);
  });

  await t.test("WhatsApp/Facebook/bot preview is not counted as a human open", async () => {
    const before = await InvitationGuest.findById(guest._id).lean();

    const whatsapp = await recordGuestLinkOpen({
      token: "token-real-guest",
      invitationId,
      userAgent: "WhatsApp/2.24.0",
    });
    const facebook = await recordGuestLinkOpen({
      token: "token-real-guest",
      invitationId,
      userAgent: "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
    });
    const preview = await recordGuestLinkOpen({
      token: "token-real-guest",
      invitationId,
      userAgent: "Mozilla/5.0",
      isPreview: true,
    });

    assert.equal(whatsapp, false);
    assert.equal(facebook, false);
    assert.equal(preview, false);

    const fresh = await InvitationGuest.findById(guest._id).lean();
    assert.equal(fresh?.openCount, before?.openCount);
    assert.equal(
      new Date(fresh!.lastOpenedAt).getTime(),
      new Date(before!.lastOpenedAt).getTime()
    );
  });

  await t.test("RSVP after opening still works and tracking fields stay intact", async () => {
    const before = await InvitationGuest.findById(guest._id).lean();

    const rsvped = await InvitationGuest.findOneAndUpdate(
      { token: "token-real-guest" },
      {
        $set: {
          rsvp: "yes",
          status: "yes",
          arrivedCount: 2,
          amount: 2,
          updatedAt: new Date(),
        },
      },
      { new: true, runValidators: false }
    ).lean();

    assert.equal(rsvped?.rsvp, "yes");
    assert.equal(rsvped?.arrivedCount, 2);
    assert.equal(rsvped?.openCount, before?.openCount);
    assert.equal(
      new Date(rsvped!.firstOpenedAt).getTime(),
      new Date(before!.firstOpenedAt).getTime()
    );

    const afterRsvpOpen = await recordGuestLinkOpen({
      token: "token-real-guest",
      invitationId,
      userAgent: "Mozilla/5.0",
    });
    assert.equal(afterRsvpOpen, true);

    const fresh = await InvitationGuest.findById(guest._id).lean();
    assert.equal(fresh?.rsvp, "yes");
    assert.equal(fresh?.arrivedCount, 2);
    assert.equal(fresh?.openCount, before?.openCount);
    assert.equal(new Date(fresh!.updatedAt).getTime(), new Date(rsvped!.updatedAt).getTime());
  });

  await mongoose.disconnect();
  await mongod.stop();
});
