/**
 * Exercises the same import and manual-add route handlers the product uses.
 */
import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { NextRequest } from "next/server";

import Invitation from "../../models/Invitation";
import InvitationGuest from "../../models/InvitationGuest";
import User from "../../models/User";
import { resetPhoneClaimCache } from "../../lib/guestPhonePolicy";

test("import and manual add routes persist review marks and reject duplicates", async (t) => {
  let mongod: MongoMemoryServer | null = null;
  try {
    mongod = await MongoMemoryServer.create();
  } catch (error: any) {
    t.skip(`mongodb-memory-server unavailable: ${error?.message || error}`);
    return;
  }

  process.env.APP_ENV = "test";
  process.env.JWT_SECRET = "phone-route-test-secret";
  process.env.MONGO_URI = mongod.getUri("phone_route_test");
  process.env.EXTERNAL_SENDS_MODE = "disabled";
  delete process.env.STRIPE_SECRET_KEY;

  await mongoose.connect(process.env.MONGO_URI);
  resetPhoneClaimCache();

  const { POST: importGuests } = await import("../../app/api/guests/import/route");
  const invitationGuests = await import("../../app/api/invitations/[id]/guests/route");
  const guestById = await import("../../app/api/guests/[id]/route");
  const guestsList = await import("../../app/api/guests/route");

  try {
    const user = await User.create({
      name: "בודק טלפון",
      email: "phone-routes@example.com",
      password: "not-used",
      guests: 100,
      role: "user",
      authVersion: 0,
      isActive: true,
    });
    const invitation = await Invitation.create({
      ownerId: user._id,
      eventId: new mongoose.Types.ObjectId(),
      title: "אירוע בדיקה",
      canvasData: {},
    });
    const token = jwt.sign(
      { userId: String(user._id), authVersion: 0, role: "user" },
      process.env.JWT_SECRET
    );

    async function call(
      handler: (req: NextRequest, ctx?: any) => Promise<Response>,
      url: string,
      body: unknown,
      ctx?: any
    ) {
      const req = new NextRequest(url, {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify(body),
      });
      const response = await handler(req, ctx);
      const json = await response.json();
      return { status: response.status, json };
    }

    const file = [
      { name: "אחת", phone: "0501000001" },
      { name: "שתיים", phone: "0501000002" },
      { name: "שלוש", phone: "0501000003" },
      { name: "ארבע", phone: "0501000004" },
      { name: "חמש", phone: "0501000005" },
      { name: "שש", phone: "0501000006" },
      { name: "קצר", phone: "050123456" },
      { name: "ארוך", phone: "05012345678" },
      { name: "כפול פלוס", phone: "+972501000001" },
      { name: "כפול מקף", phone: "050-1000002" },
    ];

    const imported = await call(
      importGuests,
      "http://localhost/api/guests/import",
      { invitationId: String(invitation._id), guests: file }
    );
    assert.equal(imported.status, 200, JSON.stringify(imported.json));
    assert.equal(imported.json.summary.fileCount, 10);
    assert.equal(imported.json.summary.importedCount, 8);
    assert.equal(imported.json.summary.duplicateCount, 2);
    assert.equal(imported.json.summary.reviewCount, 2);
    assert.deepEqual(
      imported.json.summary.duplicates.map((row: { reason: string }) => row.reason),
      ["מספר כפול בקובץ", "מספר כפול בקובץ"]
    );

    const stored = await InvitationGuest.find({ invitationId: invitation._id }).lean();
    assert.equal(stored.length, 8);
    const review = stored.filter((guest) => guest.requiresPhoneReview === true);
    assert.equal(review.length, 2);
    assert.deepEqual(
      review.map((guest) => guest.name).sort(),
      ["ארוך", "קצר"]
    );

    const existing = await call(
      importGuests,
      "http://localhost/api/guests/import",
      {
        invitationId: String(invitation._id),
        guests: [{ name: "כבר קיים", phone: "050-1000003" }],
      }
    );
    assert.equal(existing.json.summary.importedCount, 0);
    assert.equal(existing.json.summary.duplicates[0].reason, "מספר טלפון כבר קיים באירוע");
    assert.equal(await InvitationGuest.countDocuments({ invitationId: invitation._id }), 8);

    const short = await call(
      invitationGuests.POST,
      `http://localhost/api/invitations/${invitation._id}/guests`,
      { name: "ידני תשע", phone: "050222222" },
      { params: Promise.resolve({ id: String(invitation._id) }) }
    );
    assert.equal(short.status, 201, JSON.stringify(short.json));
    assert.equal(short.json.guest.requiresPhoneReview, true);

    const long = await call(
      invitationGuests.POST,
      `http://localhost/api/invitations/${invitation._id}/guests`,
      { name: "ידני אחת עשרה", phone: "05033333333" },
      { params: Promise.resolve({ id: String(invitation._id) }) }
    );
    assert.equal(long.status, 201, JSON.stringify(long.json));
    assert.equal(long.json.guest.requiresPhoneReview, true);

    const plus = await call(
      invitationGuests.POST,
      `http://localhost/api/invitations/${invitation._id}/guests`,
      { name: "כפול ידני", phone: "+972-50-1000004" },
      { params: Promise.resolve({ id: String(invitation._id) }) }
    );
    assert.equal(plus.status, 409);
    assert.equal(plus.json.error, "מספר הטלפון כבר קיים באירוע זה");

    const approved = await call(
      guestById.PUT,
      `http://localhost/api/guests/${short.json.guest._id}`,
      { approvePhoneLength: true },
      { params: Promise.resolve({ id: String(short.json.guest._id) }) }
    );
    assert.equal(approved.status, 200, JSON.stringify(approved.json));
    assert.equal(approved.json.guest.requiresPhoneReview, false);
    assert.equal(approved.json.guest.phoneLengthApproved, true);

    const listReq = new NextRequest(
      `http://localhost/api/guests?invitation=${invitation._id}`,
      { headers: { authorization: `Bearer ${token}` } }
    );
    const listed = await guestsList.GET(listReq);
    const listJson = await listed.json();
    const listedShort = listJson.guests.find(
      (guest: { name?: string }) => guest.name === "ידני תשע"
    );
    assert.equal(listedShort.requiresPhoneReview, false);

    const edited = await call(
      guestById.PUT,
      `http://localhost/api/guests/${short.json.guest._id}`,
      { phone: "05044444444" },
      { params: Promise.resolve({ id: String(short.json.guest._id) }) }
    );
    assert.equal(edited.status, 200, JSON.stringify(edited.json));
    assert.equal(edited.json.guest.requiresPhoneReview, true);
    assert.equal(edited.json.guest.phoneLengthApproved, false);

    const legacyInvitation = await Invitation.create({
      ownerId: user._id,
      eventId: new mongoose.Types.ObjectId(),
      title: "אירוע ישן",
      canvasData: {},
    });
    await InvitationGuest.create({
      invitationId: legacyInvitation._id,
      name: "ישן א",
      phone: "0507777777",
      token: "legacy-a",
    });
    await InvitationGuest.create({
      invitationId: legacyInvitation._id,
      name: "ישן ב",
      phone: "050-7777777",
      token: "legacy-b",
    });
    await InvitationGuest.create({
      invitationId: legacyInvitation._id,
      name: "ישן קצר",
      phone: "050888888",
      token: "legacy-short",
      phoneLengthApproved: true,
    });
    resetPhoneClaimCache();

    const legacyImport = await call(
      importGuests,
      "http://localhost/api/guests/import",
      {
        invitationId: String(legacyInvitation._id),
        guests: [{ name: "חדש על ישן", phone: "+972507777777" }],
      }
    );
    assert.equal(legacyImport.json.summary.importedCount, 0);
    assert.equal(legacyImport.json.summary.legacyDuplicateCount, 1);
    const legacyRows = await InvitationGuest.find({
      invitationId: legacyInvitation._id,
    }).lean();
    assert.equal(legacyRows.length, 3);
    const approvedLegacy = legacyRows.find((guest) => guest.name === "ישן קצר");
    assert.equal(approvedLegacy?.phoneLengthApproved, true);
    assert.equal(approvedLegacy?.requiresPhoneReview, false);
  } finally {
    await mongoose.disconnect();
    await mongod.stop();
  }
});
