import test from "node:test";
import assert from "node:assert/strict";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";

import {
  PHONE_LENGTH_REVIEW_MESSAGE,
  PHONE_SKIP_EXISTING,
  PHONE_SKIP_IN_FILE,
  classifyPhoneImportRows,
  restoreIsraeliTrunkZero,
  isIsraeliMobileLengthInvalid,
  normalizePhoneKey,
  phoneNeedsReview,
} from "../../lib/guestPhone";
import {
  commitGuestPhoneImport,
  planGuestPhoneImport,
  planPhoneChange,
  releaseClaimForGuest,
  reserveNewGuestPhone,
  resetPhoneClaimCache,
} from "../../lib/guestPhonePolicy";
import InvitationGuest from "../../models/InvitationGuest";

test("phone keys collapse Israeli formats and leave other numbers alone", () => {
  assert.equal(normalizePhoneKey("0501234567"), "0501234567");
  assert.equal(normalizePhoneKey("050-1234567"), "0501234567");
  assert.equal(normalizePhoneKey("+972501234567"), "0501234567");
  assert.equal(normalizePhoneKey("972 50 123 4567"), "0501234567");
  assert.equal(normalizePhoneKey("00972-50-1234567"), "0501234567");
  assert.equal(normalizePhoneKey("+9720501234567"), "0501234567");
  assert.equal(normalizePhoneKey("+1 415-555-2671"), "14155552671");
  assert.equal(normalizePhoneKey("03-1234567"), "031234567");
  assert.equal(normalizePhoneKey(""), "");
});

test("only Israeli 05 numbers are reviewed for exact length 10", () => {
  assert.equal(isIsraeliMobileLengthInvalid("0501234567"), false);
  assert.equal(isIsraeliMobileLengthInvalid("050123456"), true);
  assert.equal(isIsraeliMobileLengthInvalid("05012345678"), true);
  assert.equal(isIsraeliMobileLengthInvalid("+97250123456"), true);
  assert.equal(isIsraeliMobileLengthInvalid("+972501234567"), false);
  assert.equal(isIsraeliMobileLengthInvalid("+14155552671"), false);
  assert.equal(isIsraeliMobileLengthInvalid("031234567"), false);
  assert.equal(isIsraeliMobileLengthInvalid("501234567"), false);
  assert.equal(restoreIsraeliTrunkZero("501234567"), "0501234567");
  assert.equal(restoreIsraeliTrunkZero("50123456"), "050123456");
  assert.equal(restoreIsraeliTrunkZero("5012345678"), "05012345678");
  assert.equal(restoreIsraeliTrunkZero("+14155552671"), "+14155552671");
  assert.equal(
    PHONE_LENGTH_REVIEW_MESSAGE,
    "מספר הטלפון אינו כולל 10 ספרות. יש לבדוק את תקינות המספר."
  );
});

test("manual approval hides the review flag until the number changes", () => {
  const invalid = { phone: "050123456", phoneNormalized: "050123456" };
  assert.equal(phoneNeedsReview(invalid), true);
  assert.equal(
    phoneNeedsReview({ ...invalid, phoneLengthApproved: true }),
    false
  );
  assert.equal(
    phoneNeedsReview({
      phone: "0501234567",
      phoneNormalized: "0501234567",
      phoneLengthApproved: false,
    }),
    false
  );
});

test("excel classification keeps the first row and separates file vs event duplicates", () => {
  const rows = [
    { name: "ראשונה", phone: "050-1234567" },
    { name: "קובץ", phone: "+972501234567" },
    { name: "קיימת", phone: "0509999999" },
    { name: "תקינה", phone: "0521111111" },
    { name: "קצרה", phone: "050123456" },
    { name: "בלי טלפון", phone: "" },
    { name: "חו״ל", phone: "+1 415-555-2671" },
  ];

  const result = classifyPhoneImportRows(rows, ["0509999999"]);
  assert.equal(result.fileCount, 7);
  assert.deepEqual(
    result.accepted.map((row) => row.name),
    ["ראשונה", "תקינה", "קצרה", "בלי טלפון", "חו״ל"]
  );
  assert.deepEqual(
    result.duplicates.map((row) => [row.name, row.reason]),
    [
      ["קובץ", PHONE_SKIP_IN_FILE],
      ["קיימת", PHONE_SKIP_EXISTING],
    ]
  );
  assert.equal(result.reviewCount, 1);
});

test("phone claims, import, approval and event isolation against MongoDB", async (t) => {
  let mongod: MongoMemoryServer | null = null;
  try {
    mongod = await MongoMemoryServer.create();
  } catch (error: any) {
    t.skip(`mongodb-memory-server unavailable: ${error?.message || error}`);
    return;
  }

  process.env.MONGO_URI = mongod.getUri();
  await mongoose.connect(process.env.MONGO_URI);
  resetPhoneClaimCache();

  try {
    const eventA = new mongoose.Types.ObjectId();
    const eventB = new mongoose.Types.ObjectId();

    const legacyA = await InvitationGuest.create({
      invitationId: eventA,
      name: "קיימת א",
      phone: "050-1111111",
      token: "legacy-a",
    });
    const legacyB = await InvitationGuest.create({
      invitationId: eventA,
      name: "כפולה ישנה",
      phone: "+972501111111",
      token: "legacy-b",
    });

    await assert.rejects(
      () => reserveNewGuestPhone(eventA, "0501111111"),
      (error: any) => error?.code === "PHONE_DUPLICATE"
    );

    const stillThere = await InvitationGuest.countDocuments({
      _id: { $in: [legacyA._id, legacyB._id] },
    });
    assert.equal(stillThere, 2);

    const manual = await reserveNewGuestPhone(eventB, "050-1111111");
    const otherEventGuest = await InvitationGuest.create({
      _id: manual.guestId,
      invitationId: eventB,
      name: "אירוע אחר",
      phone: manual.fields.phone,
      phoneNormalized: manual.fields.phoneNormalized,
      phoneLengthApproved: false,
      token: "event-b",
    });
    assert.equal(String(otherEventGuest.invitationId), String(eventB));

    const settled = await Promise.allSettled([
      reserveNewGuestPhone(eventA, "0520000000"),
      reserveNewGuestPhone(eventA, "052-0000000"),
    ]);
    const winners = settled.filter(
      (item): item is PromiseFulfilledResult<Awaited<ReturnType<typeof reserveNewGuestPhone>>> =>
        item.status === "fulfilled"
    );
    const losers = settled.filter(
      (item): item is PromiseRejectedResult => item.status === "rejected"
    );
    assert.equal(winners.length, 1);
    assert.equal(losers.length, 1);
    assert.equal((losers[0].reason as { code?: string })?.code, "PHONE_DUPLICATE");
    await winners[0].value.rollback();

    const importPlan = await planGuestPhoneImport(eventA, [
      {
        name: "חדשה",
        phone: "0531234567",
        payload: { token: "import-new", rsvp: "pending", guestsCount: 1 },
      },
      {
        name: "כפול בקובץ",
        phone: "053-1234567",
        payload: { token: "import-dup-file", rsvp: "pending", guestsCount: 1 },
      },
      {
        name: "כבר באירוע",
        phone: "+972501111111",
        payload: { token: "import-dup-event", rsvp: "pending", guestsCount: 1 },
      },
      {
        name: "קצר",
        phone: "050123456",
        payload: { token: "import-short", rsvp: "pending", guestsCount: 1 },
      },
      {
        name: "ארוך",
        phone: "05012345678",
        payload: { token: "import-long", rsvp: "pending", guestsCount: 1 },
      },
    ]);

    assert.equal(importPlan.fileCount, 5);
    assert.equal(importPlan.accepted.length, 3);
    assert.equal(importPlan.duplicates.length, 2);
    assert.deepEqual(
      importPlan.duplicates.map((row) => row.reason).sort(),
      [PHONE_SKIP_EXISTING, PHONE_SKIP_IN_FILE].sort()
    );

    const committed = await commitGuestPhoneImport(eventA, importPlan.accepted);
    assert.equal(committed.inserted.length, 3);
    assert.equal(
      committed.inserted.filter((guest) => phoneNeedsReview(guest)).length,
      2
    );
    assert.equal(
      await InvitationGuest.countDocuments({ invitationId: eventA }),
      5
    );

    const short = await InvitationGuest.findOne({ token: "import-short" });
    assert.ok(short);
    assert.equal(phoneNeedsReview(short), true);
    short.phoneLengthApproved = true;
    short.requiresPhoneReview = false;
    await short.save();
    const reloaded = await InvitationGuest.findById(short._id);
    assert.equal(phoneNeedsReview(reloaded), false);

    const changed = await planPhoneChange({
      invitationId: eventA,
      guestId: short._id,
      currentPhone: short.phone,
      currentPhoneNormalized: short.phoneNormalized,
      currentApproved: true,
      nextPhone: "0501234567",
    });
    short.phone = changed.fields.phone;
    short.phoneNormalized = changed.fields.phoneNormalized;
    short.phoneLengthApproved = changed.fields.phoneLengthApproved;
    short.requiresPhoneReview = changed.fields.requiresPhoneReview;
    await short.save();
    await changed.finalize();
    assert.equal(short.phoneLengthApproved, false);
    assert.equal(phoneNeedsReview(short), false);

    const backToInvalid = await planPhoneChange({
      invitationId: eventA,
      guestId: short._id,
      currentPhone: short.phone,
      currentPhoneNormalized: short.phoneNormalized,
      currentApproved: false,
      nextPhone: "050765432",
    });
    assert.equal(backToInvalid.fields.phoneNormalized, "050765432");
    assert.equal(backToInvalid.fields.phoneLengthApproved, false);
    await backToInvalid.rollback();

    await releaseClaimForGuest(otherEventGuest);
    await otherEventGuest.deleteOne();
    const released = await reserveNewGuestPhone(eventB, "0501111111");
    assert.equal(released.fields.phoneNormalized, "0501111111");
    await released.rollback();
  } finally {
    await mongoose.disconnect();
    await mongod.stop();
  }
});
