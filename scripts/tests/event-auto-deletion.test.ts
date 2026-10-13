/**
 * Automatic event deletion stays in dry-run.
 * Isolated execution is allowed only with APP_ENV=test and the test token.
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  deletionEligibleAt,
  evaluateEventClock,
  parseEventCivilDate,
} from "../../lib/customers/eventDeletionClock";
import {
  assessAccount,
  liveDeletionPermitted,
  planDeletionBatch,
  sanitizeDeletionLog,
  type PolicyUserInput,
} from "../../lib/customers/eventDeletionPolicy";
import { buildQuoteTermsUpdate, quoteAdditionalTerms } from "../../lib/quoteCustomerTerms";
import { EVENT_DELETION_TERMS_PARAGRAPHS } from "../../lib/legal/eventDeletionTerms";

const ELIGIBLE_NOW = new Date("2026-10-17T21:00:00.000Z"); // 18.10.2026 00:00 Asia/Jerusalem
const JUST_BEFORE = new Date("2026-10-17T20:59:59.000Z"); // 17.10.2026 23:59:59

function account(date: unknown, patch: Partial<PolicyUserInput> = {}, eventPatch: Record<string, unknown> = {}) {
  return assessAccount(
    {
      id: "user-1",
      name: "דנה לוי",
      role: "user",
      policyAccepted: true,
      events: [
        {
          id: "event-1",
          title: "החתונה של דנה",
          storedDate: date,
          thankYouRoundComplete: true,
          reminderRoundComplete: false,
          openWork: [],
          ...eventPatch,
        },
      ],
      ...patch,
    },
    ELIGIBLE_NOW
  );
}

function only(date: unknown, eventPatch: Record<string, unknown> = {}, patch: Partial<PolicyUserInput> = {}) {
  const result = account(date, patch, eventPatch);
  assert.equal(result.events.length, 1);
  return result;
}

test("live deletion is hard-disabled", () => {
  assert.equal(liveDeletionPermitted(), false);
  const cron = fs.readFileSync("app/api/cron/event-auto-deletion/route.ts", "utf8");
  const admin = fs.readFileSync("app/api/admin/event-deletions/route.ts", "utf8");
  assert.equal(cron.includes("executeIsolatedDeletion"), false);
  assert.match(cron, /liveDeletionPermitted/);
  assert.match(cron, /executed: 0/);
  assert.match(admin, /LIVE_DELETION_DISABLED/);
  const clock = fs.readFileSync("lib/customers/eventDeletionClock.ts", "utf8");
  assert.equal(clock.includes("reminderSentAt"), false);
  assert.equal(clock.includes("createdAt"), false);
  assert.equal(clock.includes("thankYouSentAt"), false);
  const ivr = fs.readFileSync("lib/calls/ivrInboundResolve.ts", "utf8");
  assert.match(ivr, /14 days/);
});

test("an event date is eligible only after seven full Israel days", () => {
  const early = evaluateEventClock("2026-10-10", JUST_BEFORE);
  const onTime = evaluateEventClock("2026-10-10", ELIGIBLE_NOW);
  assert.equal(early.ok && early.sevenFullDaysElapsed, false);
  assert.equal(onTime.ok && onTime.sevenFullDaysElapsed, true);
  assert.equal(onTime.ok && onTime.eligibleAt.toISOString(), deletionEligibleAt(parseEventCivilDate("2026-10-10")!)!.toISOString());

  const postponed = evaluateEventClock("2026-12-12", ELIGIBLE_NOW);
  assert.equal(postponed.ok && postponed.relation, "future");
  const postponedEligible = evaluateEventClock("2026-12-12", deletionEligibleAt(parseEventCivilDate("2026-12-12")!)!);
  assert.equal(postponedEligible.ok && postponedEligible.isoDate, "2026-12-12");
  assert.equal(postponedEligible.ok && postponedEligible.sevenFullDaysElapsed, true);
  const dayBeforePostponed = new Date(postponedEligible.ok ? postponedEligible.eligibleAt.getTime() - 1 : 0);
  assert.equal(evaluateEventClock("2026-12-12", dayBeforePostponed).ok && evaluateEventClock("2026-12-12", dayBeforePostponed).sevenFullDaysElapsed, false);
});

test("Israel summer and winter clock changes use civil dates", () => {
  const springEvent = parseEventCivilDate("2026-03-20");
  assert.ok(springEvent);
  const springAt = deletionEligibleAt(springEvent);
  assert.ok(springAt);
  assert.equal(evaluateEventClock("2026-03-20", new Date(springAt.getTime() - 1)).ok && evaluateEventClock("2026-03-20", new Date(springAt.getTime() - 1)).sevenFullDaysElapsed, false);
  assert.equal(evaluateEventClock("2026-03-20", springAt).ok && evaluateEventClock("2026-03-20", springAt).sevenFullDaysElapsed, true);

  const autumnEvent = parseEventCivilDate("2026-10-18");
  assert.ok(autumnEvent);
  const autumnAt = deletionEligibleAt(autumnEvent);
  assert.ok(autumnAt);
  const beforeFallbackMidnight = new Date("2026-10-25T21:00:00.000Z");
  assert.equal(evaluateEventClock("2026-10-18", beforeFallbackMidnight).ok && evaluateEventClock("2026-10-18", beforeFallbackMidnight).sevenFullDaysElapsed, false);
  assert.equal(autumnAt.toISOString(), "2026-10-25T22:00:00.000Z");
  assert.equal(evaluateEventClock("2026-10-18", autumnAt).ok && evaluateEventClock("2026-10-18", autumnAt).sevenFullDaysElapsed, true);
  const dayBeforeSpring = deletionEligibleAt(parseEventCivilDate("2026-03-19")!);
  assert.ok(dayBeforeSpring);
  assert.equal(springAt.getTime() - dayBeforeSpring.getTime(), 23 * 60 * 60 * 1000);

  const dayBeforeAutumn = deletionEligibleAt(parseEventCivilDate("2026-10-17")!);
  assert.ok(dayBeforeAutumn);
  assert.equal(autumnAt.getTime() - dayBeforeAutumn.getTime(), 25 * 60 * 60 * 1000);
});

test("calendar scenarios never treat a future or current event as eligible", () => {
  const cases: Array<[string, unknown, boolean]> = [
    ["in a month", "2026-11-18", false],
    ["tomorrow", "2026-10-19", false],
    ["today", "2026-10-18", false],
    ["yesterday", "2026-10-17", false],
    ["six days ago", "2026-10-12", false],
    ["seven calendar days without seven full days", "2026-10-11", false],
    ["seven full days after the event day ended", "2026-10-10", true],
  ];
  for (const [label, date, eligible] of cases) {
    const result = only(date);
    assert.equal(result.events[0].eligible, eligible, label);
    assert.equal(result.accountDeletable, eligible, label);
    if (!eligible) assert.equal(result.events[0].bucket === "eligible", false, label);
  }
  assert.equal(only("2026-11-18").events[0].bucket, "future");
  assert.equal(only("2026-10-18").events[0].reasons.includes("EVENT_TODAY"), true);
});

test("a completed reminder round does not end the event", () => {
  for (const date of ["2026-10-19", "2026-10-18", "2026-11-18"]) {
    const pending = only(date, { reminderRoundComplete: false });
    const reminded = only(date, { reminderRoundComplete: true });
    assert.equal(reminded.events[0].eligible, false);
    assert.equal(reminded.events[0].bucket, pending.events[0].bucket);
    assert.deepEqual(reminded.events[0].reasons, pending.events[0].reasons);
    assert.equal(reminded.accountDeletable, false);
  }
  const remindedOld = only("2026-10-10", { reminderRoundComplete: true });
  assert.equal(remindedOld.events[0].eligible, true);
  assert.equal(remindedOld.events[0].reasons.includes("FUTURE_EVENT"), false);
});

test("open thank-you work and other protections block an otherwise old event", () => {
  for (const kind of ["thankyou_scheduled", "thankyou_sending", "thankyou_retry", "thankyou_failed"] as const) {
    const result = only("2026-10-10", { openWork: [kind], thankYouRoundComplete: false });
    assert.equal(result.accountDeletable, false, kind);
    assert.equal(result.events[0].bucket, "waiting", kind);
  }
  assert.equal(only("2026-10-10", { exempt: true }).accountDeletable, false);
  assert.equal(only("2026-10-10", {}, { exempt: true }).events[0].reasons.includes("AUTO_DELETE_EXEMPT"), true);
  assert.equal(only("2026-10-10", { disputeOpen: true }).events[0].bucket, "blocked");
  assert.equal(only("2026-10-10", { adminHold: true }).accountDeletable, false);
  assert.equal(only("", {}).events[0].reasons.includes("MISSING_EVENT_DATE"), true);
  assert.equal(only("not-a-date").events[0].reasons.includes("INVALID_EVENT_DATE"), true);
  assert.equal(only(null).events[0].eligible, false);
  assert.equal(parseEventCivilDate("10.10.2026")?.day, 10);
});

test("postponing the saved event date replaces the previous deletion time", () => {
  const original = only("2026-10-10");
  const postponed = only("2026-12-12");
  assert.equal(original.events[0].eligible, true);
  assert.equal(postponed.events[0].bucket, "future");
  assert.equal(postponed.events[0].eligible, false);
  assert.notEqual(original.events[0].plannedDeletionAt, postponed.events[0].plannedDeletionAt);
  assert.equal(postponed.events[0].eventDate, "2026-12-12");
});

test("one future event keeps the whole account, and non-customers are blocked", () => {
  const mixed = assessAccount(
    {
      id: "user-1",
      name: "דנה לוי",
      role: "user",
      policyAccepted: true,
      events: [
        { id: "old", title: "ישן", storedDate: "2026-01-01", thankYouRoundComplete: true, openWork: [] },
        { id: "new", title: "עתידי", storedDate: "2026-12-12", thankYouRoundComplete: true, openWork: [], reminderRoundComplete: true },
      ],
    },
    ELIGIBLE_NOW
  );
  assert.equal(mixed.accountDeletable, false);
  assert.equal(mixed.events.find((event) => event.eventId === "new")?.bucket, "future");
  assert.equal(mixed.events.find((event) => event.eventId === "new")?.eligible, false);
  assert.equal(mixed.reasons.includes("OTHER_FUTURE_EVENT"), true);

  for (const role of ["admin", "producer", "staff", "venue_owner"]) {
    const blocked = only("2026-01-01", {}, { role });
    assert.equal(blocked.accountDeletable, false, role);
    assert.equal(blocked.events[0].reasons.includes("NOT_CUSTOMER"), true, role);
  }
  const retroactive = only("2026-01-01", {}, { policyAccepted: false });
  assert.equal(retroactive.events[0].eligible, true);
  assert.equal(retroactive.accountDeletable, false);
  assert.equal(retroactive.reasons.includes("RETROACTIVE_HOLD"), true);
});

test("batch limits, emergency stop, and logs omit guest details", () => {
  const batch = planDeletionBatch(["a", "b", "c"], { maxPerRun: 2, anomalyThreshold: 10 });
  assert.deepEqual(batch.executeIds, ["a", "b"]);
  assert.equal(planDeletionBatch(["a", "b"], { anomalyThreshold: 1 }).executeIds.length, 0);
  assert.equal(planDeletionBatch(["a"], { emergencyStop: true }).executeIds.length, 0);
  const clean = sanitizeDeletionLog({
    userId: "u",
    customerName: "דנה",
    eventId: "e",
    eventTitle: "חתונה",
    phone: "0500000000",
    guestName: "אורח",
    messageContent: "שלום אורח",
    bucket: "eligible",
    reasons: [],
  });
  assert.equal("phone" in clean, false);
  assert.equal("guestName" in clean, false);
  assert.equal("messageContent" in clean, false);
});

test("terms name the seven-day rule and the latest saved event date", () => {
  const terms = fs.readFileSync("app/terms/page.tsx", "utf8");
  const privacy = fs.readFileSync("app/privacy/page.tsx", "utf8");
  const password = fs.readFileSync("app/set-password/page.tsx", "utf8");
  assert.equal(terms.includes("14 ימים לאחר תאריך האירוע"), false);
  assert.match(terms, /7 ימים מלאים מסיום יום האירוע/);
  assert.match(terms, /תאריך האירוע האחרון והמעודכן/);
  assert.match(terms, /אינה מעידה על סיום האירוע/);
  assert.match(terms, /id="event-deletion"/);
  assert.match(privacy, /7 ימים מלאים/);
  assert.match(privacy, /\/terms#event-deletion/);
  assert.match(password, /7 ימים מלאים/);
  const quote = JSON.stringify(quoteAdditionalTerms());
  assert.match(quote, /מחיקה אוטומטית לאחר סיום האירוע/);
  for (const paragraph of EVENT_DELETION_TERMS_PARAGRAPHS) {
    assert.equal(terms.includes(paragraph), true);
  }
  assert.equal(
    buildQuoteTermsUpdate({ type: "quote", status: "signed", quoteTermsVersion: "old" }),
    null
  );
  assert.equal(
    buildQuoteTermsUpdate({
      type: "agreement",
      status: "signed",
      immutableSignedCopy: { status: "signed" },
    }),
    null
  );
});

test("dry run reports candidates and isolated deletion keeps financial records", async (t) => {
  let mongod: { getUri: () => string; stop: () => Promise<unknown> } | null = null;
  process.env.APP_ENV = "test";
  const mongoose = (await import("mongoose")).default;
  let MongoMemoryServer: { create: () => Promise<{ getUri: () => string; stop: () => Promise<unknown> }> };
  try {
    ({ MongoMemoryServer } = await import("mongodb-memory-server"));
  } catch (err: any) {
    t.skip(`mongodb-memory-server unavailable: ${err?.message || err}`);
    return;
  }
  try {
    mongod = await MongoMemoryServer.create();
  } catch (err: any) {
    t.skip(`mongodb-memory-server unavailable: ${err?.message || err}`);
    return;
  }
  process.env.MONGO_URI = mongod.getUri();
  await mongoose.connect(process.env.MONGO_URI);

  const User = (await import("../../models/User")).default;
  const Event = (await import("../../models/Event")).default;
  const Invitation = (await import("../../models/Invitation")).default;
  const InvitationGuest = (await import("../../models/InvitationGuest")).default;
  const ScheduledMessage = (await import("../../models/ScheduledMessage")).default;
  const SalesDocument = (await import("../../models/SalesDocument")).default;
  const CustomerQuote = (await import("../../models/CustomerQuote")).default;
  const CustomerAgreement = (await import("../../models/CustomerAgreement")).default;
  const CustomerFile = (await import("../../models/CustomerFile")).default;
  const Payment = (await import("../../models/Payment")).default;
  const { runDryEventDeletion, executeIsolatedDeletion } = await import("../../lib/customers/eventDeletionRun");
  const { sumRevenueBetween } = await import("../../lib/admin/revenuePayments");

  const paidAt = new Date("2026-03-15T12:00:00.000Z");
  const now = new Date("2026-10-20T12:00:00.000Z");

  try {
    const customer = await User.create({
      name: "דנה לוי",
      email: "dana.deletion@example.com",
      phone: "0501234567",
      password: "secret-password",
      needsPasswordSetup: false,
      role: "user",
      hasPaid: true,
      totalDealAmount: 500,
      eventDeletionPolicyAcceptedAt: paidAt,
      termsAcceptedVersion: "2026-10-13-event-deletion-7d",
      payments: [{ amount: 200, type: "deposit", method: "bank_transfer", status: "paid", paidAt }],
    });
    const event = await Event.create({
      userId: customer._id,
      email: customer.email,
      title: "החתונה של דנה",
      date: "2026-01-01",
      time: "19:00",
      maxGuests: 100,
    });
    const invitation = await Invitation.create({
      ownerId: customer._id,
      eventId: event._id,
      title: "הזמנה של דנה",
      eventDate: new Date("2026-01-01T00:00:00.000Z"),
      canvasData: {},
    });
    await InvitationGuest.create({
      invitationId: invitation._id,
      name: "אורח שלא יופיע בלוג",
      phone: "0509999888",
      token: "guest-token-deletion",
    });
    await ScheduledMessage.create({
      invitationId: invitation._id,
      userId: customer._id,
      channel: "sms",
      type: "reminder",
      filter: "all",
      templateKey: "reminder",
      messageContent: "תזכורת",
      status: "sent",
      scheduledAt: new Date("2025-12-31T08:00:00.000Z"),
      sentAt: new Date("2025-12-31T08:00:00.000Z"),
    });
    const file = await CustomerFile.create({
      userId: customer._id,
      fullName: "דנה לוי",
      email: customer.email,
      phone: customer.phone,
      totalPrice: 500,
      paidAmount: 200,
    });
    const quote = await SalesDocument.create({
      type: "quote",
      token: "quote-token-deletion",
      status: "sent",
      url: "https://www.invistimo.com/sales-documents/quote-token-deletion",
      customerFileId: file._id,
      convertedUserId: customer._id,
      client: { fullName: "דנה לוי", email: customer.email },
      event: { name: "החתונה של דנה", date: "2025-10-10" },
      totals: { grossAmountAfterDiscount: 500 },
    });
    await CustomerQuote.create({
      customerFileId: file._id,
      userId: customer._id,
      salesDocumentId: quote._id,
      total: 500,
      status: "sent",
    });
    const agreement = await SalesDocument.create({
      type: "agreement",
      token: "agreement-token-deletion",
      status: "signed",
      url: "https://www.invistimo.com/sales-documents/agreement-token-deletion",
      pdfUrl: "https://files.invistimo.com/agreements/dana.pdf",
      customerFileId: file._id,
      convertedUserId: customer._id,
      client: { fullName: "דנה לוי", email: customer.email },
      totals: { grossAmountAfterDiscount: 500 },
      signature: {
        fullName: "דנה לוי",
        signedAt: paidAt,
        signatureDataUrl: "data:image/png;base64,abc",
      },
    });
    await CustomerAgreement.create({
      customerFileId: file._id,
      userId: customer._id,
      salesDocumentId: agreement._id,
      publicToken: agreement.token,
      status: "signed",
      amount: 500,
      signerName: "דנה לוי",
      pdfUrl: "https://files.invistimo.com/agreements/dana.pdf",
      signedAt: paidAt,
    });
    await Payment.create({
      email: customer.email,
      amount: 200,
      currency: "ils",
      status: "paid",
      type: "package",
      maxGuests: 100,
      stripePaymentIntentId: "pi_deletion_dana",
      createdAt: paidAt,
    });

    const held = await User.create({
      name: "לקוח קיים",
      email: "existing.deletion@example.com",
      password: "secret-password",
      needsPasswordSetup: false,
      role: "user",
    });
    await Event.create({
      userId: held._id,
      email: held.email,
      title: "אירוע ישן בלי אישור מדיניות",
      date: "2026-01-02",
      maxGuests: 100,
    });

    const future = await User.create({
      name: "אירוע עתידי",
      email: "future.deletion@example.com",
      password: "secret-password",
      needsPasswordSetup: false,
      role: "user",
      eventDeletionPolicyAcceptedAt: paidAt,
    });
    const futureEvent = await Event.create({
      userId: future._id,
      email: future.email,
      title: "חתונה עתידית",
      date: "2026-12-12",
      maxGuests: 100,
    });
    const futureInvitation = await Invitation.create({
      ownerId: future._id,
      eventId: futureEvent._id,
      title: "הזמנה עתידית",
      eventDate: new Date("2026-12-12T00:00:00.000Z"),
    });
    await ScheduledMessage.create({
      invitationId: futureInvitation._id,
      userId: future._id,
      channel: "sms",
      type: "reminder",
      filter: "all",
      templateKey: "reminder",
      messageContent: "תזכורת מוקדמת",
      status: "sent",
      scheduledAt: new Date("2026-12-11T08:00:00.000Z"),
      sentAt: new Date("2026-12-11T08:00:00.000Z"),
    });

    const waiting = await User.create({
      name: "ממתין לתודה",
      email: "thanks.deletion@example.com",
      password: "secret-password",
      needsPasswordSetup: false,
      role: "user",
      eventDeletionPolicyAcceptedAt: paidAt,
    });
    const waitingEvent = await Event.create({
      userId: waiting._id,
      email: waiting.email,
      title: "אירוע עם תודה",
      date: "2026-01-03",
      maxGuests: 100,
    });
    const waitingInvitation = await Invitation.create({
      ownerId: waiting._id,
      eventId: waitingEvent._id,
      title: "הזמנה עם תודה",
      eventDate: new Date("2026-01-03T00:00:00.000Z"),
    });
    await ScheduledMessage.create({
      invitationId: waitingInvitation._id,
      userId: waiting._id,
      channel: "sms",
      type: "thankyou",
      filter: "all",
      templateKey: "thankyou",
      messageContent: "תודה",
      status: "scheduled",
      scheduledAt: new Date("2026-01-04T08:00:00.000Z"),
    });

    const dry = await runDryEventDeletion(now);
    assert.equal(dry.executed, 0);
    assert.equal(dry.liveDeletionEnabled, false);
    assert.equal(await User.exists({ _id: customer._id }) != null, true);
    const futureRow = dry.entries.find((entry) => entry.eventId === String(futureEvent._id));
    assert.equal(futureRow?.bucket, "future");
    assert.equal(dry.entries.some((entry) => entry.bucket === "future" && entry.outcome === "deleted"), false);
    const waitingRow = dry.entries.find((entry) => entry.eventId === String(waitingEvent._id));
    assert.equal(waitingRow?.bucket, "waiting");
    assert.equal(JSON.stringify(dry.entries).includes("0509999888"), false);
    assert.equal(JSON.stringify(dry.entries).includes("אורח שלא יופיע בלוג"), false);

    const beforeRevenue = await sumRevenueBetween(new Date("2026-03-01T00:00:00.000Z"), new Date("2026-04-01T00:00:00.000Z"));
    const salesBefore = await SalesDocument.countDocuments();
    const paymentsBefore = await Payment.countDocuments();

    const deleted = await executeIsolatedDeletion(String(customer._id), {
      now,
      executionToken: "TEST_ONLY_ISOLATED",
    });
    assert.equal(deleted.deleted, true);
    assert.equal(await User.exists({ _id: customer._id }), null);
    assert.equal(await Event.exists({ _id: event._id }), null);
    assert.equal(await InvitationGuest.countDocuments({ invitationId: invitation._id }), 0);
    assert.equal(await SalesDocument.countDocuments(), salesBefore);
    assert.equal(await Payment.countDocuments(), paymentsBefore);
    const keptAgreement = await SalesDocument.findById(agreement._id).lean();
    assert.equal(keptAgreement?.customerDeleted, true);
    assert.equal(keptAgreement?.pdfUrl, "https://files.invistimo.com/agreements/dana.pdf");
    assert.equal(keptAgreement?.client?.fullName, "דנה לוי");
    assert.equal(await CustomerQuote.countDocuments({ customerFileId: file._id }), 1);
    assert.equal(await CustomerAgreement.countDocuments({ publicToken: "agreement-token-deletion" }), 1);
    const afterRevenue = await sumRevenueBetween(new Date("2026-03-01T00:00:00.000Z"), new Date("2026-04-01T00:00:00.000Z"));
    assert.equal(afterRevenue, beforeRevenue);

    const second = await executeIsolatedDeletion(String(customer._id), {
      now,
      executionToken: "TEST_ONLY_ISOLATED",
    });
    assert.equal(second.deleted, false);
    assert.equal(second.reason, "ALREADY_ABSENT");
    assert.equal(await SalesDocument.countDocuments(), salesBefore);
    assert.equal(await Payment.countDocuments(), paymentsBefore);

    const movable = await User.create({
      name: "תאריך שמשתנה",
      email: "movable.deletion@example.com",
      password: "secret-password",
      needsPasswordSetup: false,
      role: "user",
      eventDeletionPolicyAcceptedAt: paidAt,
    });
    const movableEvent = await Event.create({
      userId: movable._id,
      email: movable.email,
      title: "אירוע שנדחה באמצע המחיקה",
      date: "2026-01-05",
      maxGuests: 100,
    });
    const blockedMove = await executeIsolatedDeletion(String(movable._id), {
      now,
      executionToken: "TEST_ONLY_ISOLATED",
      beforeLock: async () => {
        await Event.updateOne({ _id: movableEvent._id }, { $set: { date: "2026-12-12" } });
      },
    });
    assert.equal(blockedMove.deleted, false);
    assert.equal(blockedMove.reason, "DATE_CHANGED_OR_LOCK_FAILED");
    assert.equal(await User.exists({ _id: movable._id }) != null, true);
    assert.equal((await Event.findById(movableEvent._id))?.date, "2026-12-12");
    const stillFuture = await executeIsolatedDeletion(String(future._id), {
      now,
      executionToken: "TEST_ONLY_ISOLATED",
    });
    assert.equal(stillFuture.deleted, false);
    assert.equal(stillFuture.reason, "OTHER_FUTURE_EVENT");

    await assert.rejects(
      () => executeIsolatedDeletion(String(held._id), { now, executionToken: "PRODUCTION" }),
      /LIVE_DELETION_DISABLED/
    );
    assert.equal(await User.exists({ _id: held._id }) != null, true);
    const retro = await executeIsolatedDeletion(String(held._id), {
      now,
      executionToken: "TEST_ONLY_ISOLATED",
    });
    assert.equal(retro.deleted, false);
    assert.equal(retro.reason, "RETROACTIVE_HOLD");
  } finally {
    await mongoose.disconnect();
    await mongod.stop();
  }
});
