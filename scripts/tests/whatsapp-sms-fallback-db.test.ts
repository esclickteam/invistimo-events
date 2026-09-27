/**
 * WhatsApp round tracking + automatic SMS fallback against a real MongoDB.
 * Uses mongodb-memory-server and injected SMS/shortener/gate deps — never sends.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";

import RoundGuestDelivery from "../../models/RoundGuestDelivery";
import WhatsappQueue from "../../models/WhatsappQueue";
import InvitationGuest from "../../models/InvitationGuest";
import Invitation from "../../models/Invitation";
import User from "../../models/User";
import {
  applyWhatsappWebhookStatus,
  recordRoundDecisions,
  recordWhatsappSendFailure,
  recordWhatsappSendSuccess,
} from "../../lib/whatsapp/roundDeliveryTracking";
import {
  processWhatsappSmsFallbacks,
  type SmsFallbackDeps,
} from "../../lib/sms/whatsappSmsFallback";
import type { SmsSendResult } from "../../lib/sendSMS";
import {
  countChannelFilters,
  getGuestChannelView,
  matchesChannelFilter,
} from "../../lib/whatsapp/guestChannelView";
import { buildWhatsappRoundReportWorkbook } from "../../lib/whatsapp/exportRoundReportExcel";
import { sendRsvpTemplateMedia } from "../../lib/whatsapp/sendRsvpTemplateMedia";

process.env.WHATSAPP_SMS_FALLBACK_GRACE_MS = String(2 * 60 * 1000);
delete process.env.WHATSAPP_SMS_FALLBACK_DISABLED;

const AFTER_GRACE_MS = 3 * 60 * 1000;

type SentSms = { to: string; message: string };

function okResult(): SmsSendResult {
  return {
    ok: true,
    provider: "sms4free",
    providerStatus: "1",
    providerMessage: "accepted",
    providerMessageId: null,
    recipient: "",
    httpStatus: 200,
    rawResponse: '{"status":1,"message":"accepted"}',
  };
}

function failResult(retryable = false): SmsSendResult {
  return {
    ok: false,
    provider: "sms4free",
    errorCode: retryable ? "PROVIDER_HTTP_ERROR" : "PROVIDER_REJECTED",
    errorMessage: retryable ? "HTTP 503: unavailable" : "invalid destination",
    providerStatus: retryable ? null : "-2",
    retryable,
    outcomeUnknown: false,
    recipient: "",
    httpStatus: retryable ? 503 : 200,
    rawResponse: retryable ? "unavailable" : '{"status":-2,"message":"invalid destination"}',
  };
}

function unknownResult(): SmsSendResult {
  return {
    ok: false,
    provider: "sms4free",
    errorCode: "PROVIDER_OUTCOME_UNKNOWN",
    errorMessage: "timeout after 20000ms",
    providerStatus: null,
    retryable: false,
    outcomeUnknown: true,
    recipient: "",
    httpStatus: null,
    rawResponse: null,
  };
}

function makeDeps(
  sent: SentSms[],
  {
    result = () => okResult(),
    offsetMs = AFTER_GRACE_MS,
    delayMs = 0,
  }: {
    result?: (call: number) => SmsSendResult;
    offsetMs?: number;
    delayMs?: number;
  } = {}
): Partial<SmsFallbackDeps> {
  let calls = 0;
  return {
    sendSms: async (input) => {
      calls += 1;
      sent.push(input);
      if (delayMs) await new Promise((resolve) => setTimeout(resolve, delayMs));
      return result(calls);
    },
    shorten: async (url) => url,
    gate: () => ({ allowed: true, reason: "test" }),
    now: () => new Date(Date.now() + offsetMs),
  };
}

async function seedGuest({
  phone = "0521234567",
  rsvp = "pending",
  token = `tok_${new mongoose.Types.ObjectId().toString()}`,
}: { phone?: string; rsvp?: string; token?: string | null } = {}) {
  const ownerId = new mongoose.Types.ObjectId();
  const invitationId = new mongoose.Types.ObjectId();
  const guestId = new mongoose.Types.ObjectId();

  await User.collection.insertOne({
    _id: ownerId,
    email: `${ownerId}@test.local`,
    maxMessages: 100,
    smsUsed: 0,
  });
  await Invitation.collection.insertOne({
    _id: invitationId,
    ownerId,
    title: "החתונה של דנה ויוסי",
    shareId: `share_${invitationId}`,
    eventDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
  });
  await InvitationGuest.collection.insertOne({
    _id: guestId,
    invitationId,
    name: "דנה",
    phone,
    rsvp,
    guestsCount: 2,
    token,
  });

  return { ownerId, invitationId, guestId, phone, token };
}

async function queueRound(
  seed: Awaited<ReturnType<typeof seedGuest>>,
  { type = "rsvp", round = 1, status = "sending", execution = "" } = {}
) {
  const idempotencyKey = `${seed.invitationId}:${seed.guestId}:${type}:${round}${execution ? `:${execution}` : ""}`;
  const inserted = await WhatsappQueue.collection.insertOne({
    invitationId: seed.invitationId,
    guestId: seed.guestId,
    channel: "whatsapp",
    type,
    round,
    phone: `972${seed.phone.slice(1)}`,
    templateName: "rsvp_round_1",
    idempotencyKey,
    status,
    attempts: 0,
    maxAttempts: 1,
    createdAt: new Date(),
  });

  await recordRoundDecisions([
    {
      invitationId: seed.invitationId,
      guest: { _id: seed.guestId, name: "דנה", phone: seed.phone, guestsCount: 2 },
      type,
      round,
      source: "immediate",
      templateName: "rsvp_round_1",
      outcome: {
        kind: "queued",
        queueId: inserted.insertedId,
        idempotencyKey,
        phone: seed.phone,
      },
    },
  ]);

  return inserted.insertedId;
}

async function markQueue(queueId: any, set: Record<string, any>) {
  await WhatsappQueue.collection.updateOne({ _id: queueId }, { $set: set });
}

async function getRecord(seed: { invitationId: any; guestId: any }, roundKey = "rsvp:1") {
  return RoundGuestDelivery.findOne({
    invitationId: seed.invitationId,
    guestId: seed.guestId,
    roundKey,
  }).lean<any>();
}

function metaError(code: number, message: string) {
  const err: any = new Error(`360dialog error (400): ${message}`);
  err.httpStatus = 400;
  err.providerResponse = { error: { code, message } };
  return err;
}

test("WhatsApp round tracking + SMS fallback (real MongoDB)", async (t) => {
  let mongod: MongoMemoryServer | null = null;

  try {
    mongod = await MongoMemoryServer.create();
  } catch (err: any) {
    t.skip(`mongodb-memory-server unavailable: ${err?.message || err}`);
    return;
  }

  process.env.MONGO_URI = mongod.getUri();
  process.env.MONGODB_URI = mongod.getUri();
  await mongoose.connect(mongod.getUri());
  await RoundGuestDelivery.syncIndexes();

  const clearPending = async () => {
    // Isolate scenarios: settle anything left eligible by an earlier case.
    await RoundGuestDelivery.updateMany(
      { "sms.status": null },
      { $set: { "sms.status": "SKIPPED", "sms.reasonCode": "TEST_ISOLATION" } }
    );
  };

  try {
    await t.test("WA success → no SMS, even after grace", async () => {
      await clearPending();
      const seed = await seedGuest();
      const queueId = await queueRound(seed);

      await markQueue(queueId, { status: "sent", providerStatus: "sent", wamid: "wamid.OK1" });
      await recordWhatsappSendSuccess({ queueId, wamid: "wamid.OK1" });
      await applyWhatsappWebhookStatus({ wamids: ["wamid.OK1"], state: "delivered", at: new Date() });

      const sent: SentSms[] = [];
      const stats = await processWhatsappSmsFallbacks({ deps: makeDeps(sent) });

      const record = await getRecord(seed);
      assert.equal(record.whatsapp.status, "DELIVERED");
      assert.equal(record.sms.status, null);
      assert.equal(sent.length, 0);
      assert.equal(stats.claimed, 0);
    });

    await t.test("WA failed (Meta webhook) → SMS sent with personal RSVP link", async () => {
      await clearPending();
      const seed = await seedGuest();
      const queueId = await queueRound(seed);

      await markQueue(queueId, { status: "sent", providerStatus: "sent", wamid: "wamid.F1" });
      await recordWhatsappSendSuccess({ queueId, wamid: "wamid.F1" });

      await markQueue(queueId, { status: "failed", providerStatus: "failed", errorCode: "131026" });
      await applyWhatsappWebhookStatus({
        wamids: ["wamid.F1", "F1"],
        state: "failed",
        at: new Date(),
        errorCode: 131026,
        errorMessage: "Message undeliverable",
      });

      let record = await getRecord(seed);
      assert.equal(record.whatsapp.status, "FAILED");
      assert.equal(record.whatsapp.errorCode, "131026");
      assert.equal(record.whatsapp.reasonCode, "RECIPIENT_UNDELIVERABLE");
      assert.ok(record.whatsapp.failedAt);

      // Inside grace window: nothing is sent yet.
      const early: SentSms[] = [];
      await processWhatsappSmsFallbacks({ deps: makeDeps(early, { offsetMs: 0 }) });
      assert.equal(early.length, 0);

      const sent: SentSms[] = [];
      const stats = await processWhatsappSmsFallbacks({ deps: makeDeps(sent) });
      assert.equal(stats.sent, 1);
      assert.equal(sent.length, 1);
      assert.equal(sent[0].to, "972521234567");
      assert.ok(
        sent[0].message.includes(`/invite/share_${seed.invitationId}?token=${seed.token}`),
        "SMS must carry the guest's personal link"
      );

      record = await getRecord(seed);
      assert.equal(record.sms.status, "SENT");
      assert.ok(record.sms.sentAt);
      assert.equal(
        record.sms.idempotencyKey,
        `sms_fallback:${seed.invitationId}:rsvp:1:${seed.guestId}:sms`
      );
      assert.equal(record.whatsapp.status, "FAILED", "SMS must not touch WhatsApp status");

      const owner: any = await User.collection.findOne({ _id: seed.ownerId });
      assert.equal(owner.smsUsed, 1);
    });

    await t.test("WA failed (sync provider error) → SMS provider rejects → SMS FAILED", async () => {
      await clearPending();
      const seed = await seedGuest();
      const queueId = await queueRound(seed);

      await markQueue(queueId, { status: "failed", providerStatus: "failed" });
      await recordWhatsappSendFailure({
        queueId,
        error: metaError(132000, "Number of parameters does not match"),
      });

      let record = await getRecord(seed);
      assert.equal(record.whatsapp.status, "FAILED");
      assert.equal(record.whatsapp.errorCode, "132000");
      assert.equal(record.whatsapp.reasonCode, "TEMPLATE_ERROR");

      const sent: SentSms[] = [];
      const stats = await processWhatsappSmsFallbacks({
        deps: makeDeps(sent, { result: () => failResult(false) }),
      });
      assert.equal(stats.failed, 1);

      record = await getRecord(seed);
      assert.equal(record.sms.status, "FAILED");
      assert.equal(record.sms.errorCode, "PROVIDER_REJECTED");
      assert.equal(record.sms.errorMessage, "invalid destination");
      assert.ok(record.sms.failedAt);

      const again: SentSms[] = [];
      await processWhatsappSmsFallbacks({ deps: makeDeps(again) });
      assert.equal(again.length, 0, "FAILED SMS is final — no resend");
    });

    await t.test("WA not sent (missing token) → recorded with reason → SMS skipped (no personal link)", async () => {
      await clearPending();
      const seed = await seedGuest({ token: null });

      await recordRoundDecisions([
        {
          invitationId: seed.invitationId,
          guest: { _id: seed.guestId, name: "דנה", phone: seed.phone, guestsCount: 2 },
          type: "rsvp",
          round: 1,
          source: "immediate",
          outcome: { kind: "not_sent", reasonCode: "MISSING_GUEST_TOKEN" },
        },
      ]);

      let record = await getRecord(seed);
      assert.equal(record.whatsapp.status, "NOT_SENT");
      assert.equal(record.whatsapp.reasonCode, "MISSING_GUEST_TOKEN");
      assert.ok(record.whatsapp.notSentAt);

      const sent: SentSms[] = [];
      await processWhatsappSmsFallbacks({ deps: makeDeps(sent, { offsetMs: 0 }) });
      assert.equal(sent.length, 0);

      record = await getRecord(seed);
      assert.equal(record.sms.status, "SKIPPED");
      assert.equal(record.sms.reasonCode, "MISSING_PERSONAL_LINK");
    });

    await t.test("WA not sent (queue error) → SMS sent immediately (no grace)", async () => {
      await clearPending();
      const seed = await seedGuest();

      await recordRoundDecisions([
        {
          invitationId: seed.invitationId,
          guest: { _id: seed.guestId, name: "דנה", phone: seed.phone, guestsCount: 2 },
          type: "rsvp",
          round: 2,
          source: "scheduled",
          outcome: { kind: "not_sent", reasonCode: "QUEUE_ERROR", errorMessage: "insert failed" },
        },
      ]);

      const sent: SentSms[] = [];
      const stats = await processWhatsappSmsFallbacks({ deps: makeDeps(sent, { offsetMs: 0 }) });
      assert.equal(stats.sent, 1);
      assert.equal(sent.length, 1);

      const record = await getRecord(seed, "rsvp:2");
      assert.equal(record.whatsapp.status, "NOT_SENT");
      assert.equal(record.whatsapp.reasonCode, "QUEUE_ERROR");
      assert.equal(record.sms.status, "SENT");
    });

    await t.test("WA not sent + invalid phone → SMS SKIPPED/INVALID_PHONE, no phone → NO_PHONE", async () => {
      await clearPending();
      const invalid = await seedGuest({ phone: "12345" });
      const missing = await seedGuest({ phone: "" });

      for (const [seed, reasonCode] of [
        [invalid, "INVALID_PHONE"],
        [missing, "MISSING_PHONE"],
      ] as const) {
        await recordRoundDecisions([
          {
            invitationId: seed.invitationId,
            guest: { _id: seed.guestId, name: "דנה", phone: seed.phone, guestsCount: 2 },
            type: "rsvp",
            round: 1,
            source: "immediate",
            outcome: { kind: "not_sent", reasonCode },
          },
        ]);
      }

      const sent: SentSms[] = [];
      await processWhatsappSmsFallbacks({ deps: makeDeps(sent, { offsetMs: 0 }) });
      assert.equal(sent.length, 0);

      const invalidRecord = await getRecord(invalid);
      assert.equal(invalidRecord.whatsapp.reasonCode, "INVALID_PHONE");
      assert.equal(invalidRecord.sms.status, "SKIPPED");
      assert.equal(invalidRecord.sms.reasonCode, "INVALID_PHONE");
      assert.ok(invalidRecord.sms.skippedAt);

      const missingRecord = await getRecord(missing);
      assert.equal(missingRecord.whatsapp.reasonCode, "MISSING_PHONE");
      assert.equal(missingRecord.sms.reasonCode, "NO_PHONE");
    });

    await t.test("opt-out (Meta 131050) → SMS SKIPPED/OPTED_OUT", async () => {
      await clearPending();
      const seed = await seedGuest();
      const queueId = await queueRound(seed);
      await markQueue(queueId, { status: "failed", providerStatus: "failed" });
      await recordWhatsappSendFailure({
        queueId,
        error: metaError(131050, "User stopped marketing messages"),
      });

      const sent: SentSms[] = [];
      await processWhatsappSmsFallbacks({ deps: makeDeps(sent) });
      assert.equal(sent.length, 0);
      const record = await getRecord(seed);
      assert.equal(record.sms.reasonCode, "OPTED_OUT");
    });

    await t.test("duplicate workers running concurrently → exactly one SMS", async () => {
      await clearPending();
      const seed = await seedGuest();
      const queueId = await queueRound(seed);
      await markQueue(queueId, { status: "failed", providerStatus: "failed" });
      await recordWhatsappSendFailure({ queueId, error: metaError(131026, "undeliverable") });

      const sent: SentSms[] = [];
      const runs = await Promise.all(
        Array.from({ length: 5 }, () =>
          processWhatsappSmsFallbacks({ deps: makeDeps(sent, { delayMs: 50 }) })
        )
      );

      assert.equal(sent.length, 1);
      assert.equal(runs.reduce((sum, r) => sum + r.sent, 0), 1);
      const record = await getRecord(seed);
      assert.equal(record.sms.status, "SENT");
      assert.equal(record.sms.attempts, 1);
    });

    await t.test("retry: provider 5xx is retried with backoff and sends once", async () => {
      await clearPending();
      const seed = await seedGuest();
      const queueId = await queueRound(seed);
      await markQueue(queueId, { status: "failed", providerStatus: "failed" });
      await recordWhatsappSendFailure({ queueId, error: metaError(131026, "undeliverable") });

      const sent: SentSms[] = [];
      const first = await processWhatsappSmsFallbacks({
        deps: makeDeps(sent, { result: () => failResult(true) }),
      });
      assert.equal(first.retried, 1);

      let record = await getRecord(seed);
      assert.equal(record.sms.status, null);
      assert.ok(new Date(record.sms.notBefore).getTime() > Date.now() + AFTER_GRACE_MS);

      // Before backoff elapses nothing happens.
      const tooSoon = await processWhatsappSmsFallbacks({ deps: makeDeps(sent) });
      assert.equal(tooSoon.claimed, 0);

      const later = await processWhatsappSmsFallbacks({
        deps: makeDeps(sent, { offsetMs: AFTER_GRACE_MS + 10 * 60 * 1000 }),
      });
      assert.equal(later.sent, 1);
      assert.equal(sent.length, 2, "one failed 5xx attempt + one successful send");

      record = await getRecord(seed);
      assert.equal(record.sms.status, "SENT");
      assert.equal(record.sms.attempts, 2);
    });

    await t.test("WhatsApp still retrying in queue → SMS deferred, never parallel", async () => {
      await clearPending();
      const seed = await seedGuest();
      const queueId = await queueRound(seed);
      await recordWhatsappSendFailure({ queueId, error: metaError(131026, "undeliverable") });
      // Queue row went back to pending (another attempt coming).
      await markQueue(queueId, { status: "pending" });

      const sent: SentSms[] = [];
      const stats = await processWhatsappSmsFallbacks({ deps: makeDeps(sent) });
      assert.equal(stats.deferred, 1);
      assert.equal(sent.length, 0);

      // Retry succeeded later → fallback skipped.
      await markQueue(queueId, { status: "sent", providerStatus: "sent" });
      await processWhatsappSmsFallbacks({
        deps: makeDeps(sent, { offsetMs: AFTER_GRACE_MS + 5 * 60 * 1000 }),
      });
      assert.equal(sent.length, 0);
      const record = await getRecord(seed);
      assert.equal(record.sms.status, "SKIPPED");
      assert.equal(record.sms.reasonCode, "WHATSAPP_SUCCEEDED");
    });

    await t.test("server restart: stale claim before dispatch is released and sent once", async () => {
      await clearPending();
      const seed = await seedGuest();
      const queueId = await queueRound(seed);
      await markQueue(queueId, { status: "failed", providerStatus: "failed" });
      await recordWhatsappSendFailure({ queueId, error: metaError(131026, "undeliverable") });

      // Simulate a worker that claimed the record then crashed before calling the provider.
      await RoundGuestDelivery.updateOne(
        { invitationId: seed.invitationId, guestId: seed.guestId },
        {
          $set: {
            "sms.status": "PENDING",
            "sms.lockId": "crashed-worker",
            "sms.lockedAt": new Date(Date.now() - 10 * 60 * 1000),
            "sms.dispatchStartedAt": null,
          },
        }
      );

      const sent: SentSms[] = [];
      const stats = await processWhatsappSmsFallbacks({ deps: makeDeps(sent) });
      assert.equal(stats.released, 1);
      assert.equal(stats.sent, 1);
      assert.equal(sent.length, 1);
    });

    await t.test("server restart: crash after dispatch → DISPATCH_OUTCOME_UNKNOWN, never resent", async () => {
      await clearPending();
      const seed = await seedGuest();
      const queueId = await queueRound(seed);
      await markQueue(queueId, { status: "failed", providerStatus: "failed" });
      await recordWhatsappSendFailure({ queueId, error: metaError(131026, "undeliverable") });

      await RoundGuestDelivery.updateOne(
        { invitationId: seed.invitationId, guestId: seed.guestId },
        {
          $set: {
            "sms.status": "PENDING",
            "sms.lockId": "crashed-worker",
            "sms.lockedAt": new Date(Date.now() - 10 * 60 * 1000),
            "sms.dispatchStartedAt": new Date(Date.now() - 10 * 60 * 1000),
          },
        }
      );

      const sent: SentSms[] = [];
      const stats = await processWhatsappSmsFallbacks({ deps: makeDeps(sent) });
      assert.equal(stats.unknown, 1);
      assert.equal(sent.length, 0);

      const record = await getRecord(seed);
      assert.equal(record.sms.status, "OUTCOME_UNKNOWN");
      assert.equal(record.sms.reasonCode, "DISPATCH_OUTCOME_UNKNOWN");
    });

    await t.test("late webhooks: 'sent' after 'failed' does not revert; delivered in grace → skip", async () => {
      await clearPending();
      const seed = await seedGuest();
      const queueId = await queueRound(seed);
      await markQueue(queueId, { status: "sent", providerStatus: "sent", wamid: "wamid.L1" });
      await recordWhatsappSendSuccess({ queueId, wamid: "wamid.L1" });

      await applyWhatsappWebhookStatus({
        wamids: ["wamid.L1"],
        state: "failed",
        at: new Date(),
        errorCode: 131049,
        errorMessage: "healthy ecosystem",
      });
      await applyWhatsappWebhookStatus({ wamids: ["wamid.L1"], state: "sent", at: new Date() });

      let record = await getRecord(seed);
      assert.equal(record.whatsapp.status, "FAILED", "late 'sent' must not override FAILED");
      assert.equal(record.whatsapp.reasonCode, "META_MARKETING_LIMIT");

      // Delivered arrives within the grace window → fallback must be skipped.
      await markQueue(queueId, { status: "sent", providerStatus: "delivered", deliveredAt: new Date() });
      await applyWhatsappWebhookStatus({ wamids: ["wamid.L1"], state: "delivered", at: new Date() });

      const sent: SentSms[] = [];
      await processWhatsappSmsFallbacks({ deps: makeDeps(sent) });
      assert.equal(sent.length, 0);

      record = await getRecord(seed);
      assert.equal(record.whatsapp.status, "DELIVERED");
      assert.ok(record.whatsapp.deliveredAt);
      assert.equal(record.sms.status, null, "no longer a fallback candidate");
    });

    await t.test("late 'failed' webhook after SMS was already sent → no second SMS", async () => {
      await clearPending();
      const seed = await seedGuest();
      const queueId = await queueRound(seed);
      await markQueue(queueId, { status: "sent", providerStatus: "sent", wamid: "wamid.L2" });
      await recordWhatsappSendSuccess({ queueId, wamid: "wamid.L2" });

      await markQueue(queueId, { status: "failed", providerStatus: "failed" });
      await applyWhatsappWebhookStatus({ wamids: ["wamid.L2"], state: "failed", at: new Date(), errorCode: 131026 });

      const sent: SentSms[] = [];
      await processWhatsappSmsFallbacks({ deps: makeDeps(sent) });
      assert.equal(sent.length, 1);

      // Duplicate webhook delivery of the same failure.
      await applyWhatsappWebhookStatus({ wamids: ["wamid.L2"], state: "failed", at: new Date(), errorCode: 131026 });
      await processWhatsappSmsFallbacks({ deps: makeDeps(sent, { offsetMs: AFTER_GRACE_MS * 3 }) });
      assert.equal(sent.length, 1);
    });

    await t.test("round re-run: decisions are idempotent; guest who already answered is skipped", async () => {
      await clearPending();
      const seed = await seedGuest({ rsvp: "yes" });

      const decision = {
        invitationId: seed.invitationId,
        guest: { _id: seed.guestId, name: "דנה", phone: seed.phone, guestsCount: 2 },
        type: "rsvp",
        round: 1,
        source: "immediate" as const,
        outcome: { kind: "not_sent" as const, reasonCode: "QUEUE_ERROR" },
      };
      await recordRoundDecisions([decision]);
      await recordRoundDecisions([{ ...decision, outcome: { kind: "not_sent", reasonCode: "DUPLICATE" } }]);

      const count = await RoundGuestDelivery.countDocuments({
        invitationId: seed.invitationId,
        guestId: seed.guestId,
      });
      assert.equal(count, 1);

      let record = await getRecord(seed);
      assert.equal(record.whatsapp.reasonCode, "QUEUE_ERROR", "first real decision is kept");

      const sent: SentSms[] = [];
      await processWhatsappSmsFallbacks({ deps: makeDeps(sent, { offsetMs: 0 }) });
      assert.equal(sent.length, 0);
      record = await getRecord(seed);
      assert.equal(record.sms.reasonCode, "ALREADY_RESPONDED");
    });

    await t.test("round report API: real reasons, clickable lists, separate SMS counts", async () => {
      await clearPending();
      process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";

      const ownerId = new mongoose.Types.ObjectId();
      const invitationId = new mongoose.Types.ObjectId();
      await User.collection.insertOne({
        _id: ownerId,
        email: `${ownerId}@test.local`,
        role: "user",
        isActive: true,
        authVersion: 0,
        maxMessages: 100,
        smsUsed: 0,
      });
      await Invitation.collection.insertOne({
        _id: invitationId,
        ownerId,
        title: "דוח",
        shareId: `share_${invitationId}`,
        eventDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      const mkGuest = async (name: string, phone: string) => {
        const _id = new mongoose.Types.ObjectId();
        await InvitationGuest.collection.insertOne({
          _id,
          invitationId,
          name,
          phone,
          rsvp: "pending",
          guestsCount: 3,
          token: `tok_${_id}`,
        });
        return { ownerId, invitationId, guestId: _id, phone, token: `tok_${_id}` };
      };

      const failedGuest = await mkGuest("אבי נכשל", "0521111111");
      const invalidGuest = await mkGuest("בני לא תקין", "123");
      const okGuest = await mkGuest("גלית נמסר", "0523333333");
      const outsider = await mkGuest("דני לא בסבב", "0524444444");

      const failedQueue = await queueRound(failedGuest);
      await markQueue(failedQueue, { status: "failed", providerStatus: "failed", errorCode: "131026", failedAt: new Date() });
      await recordWhatsappSendFailure({ queueId: failedQueue, error: metaError(131026, "undeliverable") });

      await recordRoundDecisions([
        {
          invitationId,
          guest: { _id: invalidGuest.guestId, name: "בני לא תקין", phone: "123", guestsCount: 3 },
          type: "rsvp",
          round: 1,
          source: "immediate",
          outcome: { kind: "not_sent", reasonCode: "INVALID_PHONE" },
        },
      ]);

      const okQueue = await queueRound(okGuest);
      await markQueue(okQueue, { status: "sent", providerStatus: "delivered", sentAt: new Date(), deliveredAt: new Date(), wamid: "wamid.R1" });
      await recordWhatsappSendSuccess({ queueId: okQueue, wamid: "wamid.R1" });

      await processWhatsappSmsFallbacks({ deps: makeDeps([]) });

      const jwt = (await import("jsonwebtoken")).default;
      const token = jwt.sign({ userId: String(ownerId), role: "user", authVersion: 0 }, process.env.JWT_SECRET!);
      const { GET } = await import("../../app/api/whatsapp/round-report/[invitationId]/route");
      const { NextRequest } = await import("next/server");

      const res = await GET(
        new NextRequest(`http://localhost/api/whatsapp/round-report/${invitationId}`, {
          headers: { authorization: `Bearer ${token}` },
        }),
        { params: Promise.resolve({ invitationId: String(invitationId) }) }
      );
      const body: any = await res.json();
      assert.equal(res.status, 200, JSON.stringify(body));

      const round = body.rounds.find((r: any) => r.key === "rsvp:1");
      assert.ok(round, "rsvp:1 round present");
      assert.equal(round.tracked, true);
      assert.equal(round.intended, 3, "outsider is not counted as intended");
      assert.equal(round.failed, 1);
      assert.equal(round.notSent, 1);
      assert.equal(round.delivered, 1);
      assert.deepEqual(
        { candidates: round.sms.candidates, sent: round.sms.sent, skipped: round.sms.skipped },
        { candidates: 2, sent: 1, skipped: 1 }
      );

      const failedRow = round.attention.find((r: any) => r.name === "אבי נכשל");
      assert.equal(failedRow.whatsappStatus, "failed");
      assert.equal(failedRow.errorCode, "131026");
      assert.equal(failedRow.guestsCount, 3);
      assert.ok(failedRow.reasonText);
      assert.equal(failedRow.sms.status, "SENT");

      const invalidRow = round.attention.find((r: any) => r.name === "בני לא תקין");
      assert.equal(invalidRow.whatsappStatus, "not_sent");
      assert.equal(invalidRow.reasonCode, "INVALID_PHONE");
      assert.equal(invalidRow.sms.status, "SKIPPED");
      assert.equal(invalidRow.sms.reasonCode, "INVALID_PHONE");

      const outsiderRow = body.guests.find((g: any) => g.guestId === String(outsider.guestId));
      assert.equal(
        outsiderRow.roundStatuses.find((r: any) => r.roundKey === "rsvp:1").status,
        "not_in_audience"
      );

      const failedGuestRow = body.guests.find((g: any) => g.guestId === String(failedGuest.guestId));
      const delivery = failedGuestRow.deliveries.find((d: any) => d.roundKey === "rsvp:1");
      assert.equal(delivery.whatsapp.status, "FAILED");
      assert.equal(delivery.sms.status, "SENT");
      assert.ok(delivery.history.some((h: any) => h.event === "WA_FAILED"));
      assert.ok(delivery.history.some((h: any) => h.event === "SMS_SENT"));

      // Guest-level two-channel view (same helper the UI and the Excel export use).
      const viewOf = (guestId: any, roundKey = "rsvp:1") =>
        getGuestChannelView(
          body.guests.find((g: any) => g.guestId === String(guestId)).roundStatuses,
          roundKey
        );

      const okView = viewOf(okGuest.guestId);
      assert.equal(okView.whatsapp.status, "DELIVERED");
      assert.ok(okView.whatsapp.at);
      assert.equal(okView.sms.status, "NOT_NEEDED");

      const failedView = viewOf(failedGuest.guestId);
      assert.equal(failedView.whatsapp.status, "FAILED");
      assert.equal(failedView.whatsapp.errorCode, "131026");
      assert.ok(failedView.whatsapp.reason);
      assert.ok(failedView.whatsapp.at);
      assert.equal(failedView.sms.status, "SENT");
      assert.ok(failedView.sms.at);

      const invalidView = viewOf(invalidGuest.guestId);
      assert.equal(invalidView.whatsapp.status, "NOT_SENT");
      assert.ok(invalidView.whatsapp.reason);
      assert.equal(invalidView.sms.status, "SKIPPED");
      assert.ok(invalidView.sms.reason);

      assert.equal(viewOf(outsider.guestId).whatsapp.status, "NOT_IN_ROUND");

      const allViews = body.guests.map((g: any) => getGuestChannelView(g.roundStatuses, "rsvp:1"));
      const counts = countChannelFilters(allViews);
      assert.equal(counts.wa_failed, 1);
      assert.equal(counts.wa_not_sent, 1);
      assert.equal(counts.sms_sent, 1);
      assert.equal(counts.sms_skipped, 1);
      assert.equal(counts.sms_failed, 0);
      assert.equal(counts.sms_delivered, 0);
      const skippedNames = body.guests
        .filter((g: any) => matchesChannelFilter(getGuestChannelView(g.roundStatuses, "rsvp:1"), "sms_skipped"))
        .map((g: any) => g.name);
      assert.deepEqual(skippedNames, ["בני לא תקין"]);

      // "All rounds" mode picks each guest's own latest round.
      assert.equal(viewOf(failedGuest.guestId, "all").whatsapp.status, "FAILED");
      assert.equal(viewOf(okGuest.guestId, "all").sms.status, "NOT_NEEDED");

      const workbook = await buildWhatsappRoundReportWorkbook({
        summary: body.summary,
        rounds: body.rounds,
        allGuests: body.guests,
        guestsForSheets: body.guests,
        invitationTitle: "דוח",
        eventDate: null,
        clientName: null,
        selectedRoundKey: "rsvp:1",
        selectedRoundTitle: round.title,
        generatedAt: new Date().toISOString(),
      });
      const sheet = workbook.getWorksheet("אורחים")!;
      const headers = (sheet.getRow(1).values as any[]).slice(1);
      const col = (name: string) => headers.indexOf(name) + 1;
      for (const name of ["סטטוס WhatsApp", "סיבת WhatsApp", "קוד שגיאה WhatsApp", "זמן WhatsApp", "סטטוס גיבוי SMS", "סיבת גיבוי SMS", "זמן SMS"]) {
        assert.ok(col(name) > 0, `missing column ${name}`);
      }
      const rowFor = (name: string) => {
        for (let r = 2; r <= sheet.rowCount; r += 1) {
          if (sheet.getRow(r).getCell(col("שם אורח")).value === name) return sheet.getRow(r);
        }
        throw new Error(`row ${name} not found`);
      };
      const failedXl = rowFor("אבי נכשל");
      assert.match(String(failedXl.getCell(col("סטטוס WhatsApp")).value), /FAILED/);
      assert.equal(String(failedXl.getCell(col("קוד שגיאה WhatsApp")).value), "131026");
      assert.match(String(failedXl.getCell(col("סטטוס גיבוי SMS")).value), /SENT\) – סטטוס סופי/);
      assert.match(String(failedXl.getCell(col("סיבת גיבוי SMS")).value), /אינו מספק אישור מסירה/);
      assert.equal(body.smsProvider.deliveryReceipts, false);
      assert.equal(round.sms.deliveryTracking, false);
      const invalidXl = rowFor("בני לא תקין");
      assert.match(String(invalidXl.getCell(col("סטטוס WhatsApp")).value), /NOT_SENT/);
      assert.match(String(invalidXl.getCell(col("סטטוס גיבוי SMS")).value), /SKIPPED/);
      assert.ok(String(invalidXl.getCell(col("סיבת גיבוי SMS")).value));
      assert.match(String(rowFor("גלית נמסר").getCell(col("סטטוס גיבוי SMS")).value), /NOT_NEEDED/);
    });

    await t.test("per-guest eligibility: same invitation + round, only the failed guest gets SMS", async () => {
      await clearPending();
      const guestA = await seedGuest({ phone: "0525550001" });
      const guestBId = new mongoose.Types.ObjectId();
      await InvitationGuest.collection.insertOne({
        _id: guestBId,
        invitationId: guestA.invitationId,
        name: "רון",
        phone: "0525550002",
        rsvp: "pending",
        guestsCount: 1,
        token: `tok_${guestBId}`,
      });
      const guestB = { ...guestA, guestId: guestBId, phone: "0525550002", token: `tok_${guestBId}` };

      const queueA = await queueRound(guestA);
      const queueB = await queueRound(guestB);

      await markQueue(queueA, { status: "sent", providerStatus: "delivered", wamid: "wamid.IND_A" });
      await recordWhatsappSendSuccess({ queueId: queueA, wamid: "wamid.IND_A" });
      await applyWhatsappWebhookStatus({ wamids: ["wamid.IND_A"], state: "delivered", at: new Date() });

      await markQueue(queueB, { status: "failed", providerStatus: "failed", errorCode: "131026", failedAt: new Date() });
      await recordWhatsappSendFailure({ queueId: queueB, error: metaError(131026, "undeliverable") });

      const sent: SentSms[] = [];
      await processWhatsappSmsFallbacks({ deps: makeDeps(sent) });
      await processWhatsappSmsFallbacks({ deps: makeDeps(sent) });

      assert.equal(sent.length, 1, "exactly one SMS for the round");
      assert.equal(sent[0].to, "972525550002", "only the failed guest gets the SMS");
      assert.ok(sent[0].message.includes(`token=${guestB.token}`), "SMS carries guest B's own link");

      const recordA = await getRecord(guestA);
      const recordB = await getRecord(guestB);
      assert.equal(recordA.whatsapp.status, "DELIVERED");
      assert.equal(recordA.sms.status, null);
      assert.equal(recordB.whatsapp.status, "FAILED");
      assert.equal(recordB.sms.status, "SENT");
    });

    await t.test("wedding-website /w/ link: WA NOT_SENT with exact variable, report not_sent, SMS evidence stored", async () => {
      await clearPending();
      process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";
      const seed = await seedGuest({ phone: "0526850711" });
      await User.collection.updateOne(
        { _id: seed.ownerId },
        { $set: { role: "user", isActive: true, authVersion: 0 } }
      );
      const queueId = await queueRound(seed);

      // Reproduce the real sender error (no network: it throws before calling Meta).
      process.env.WHATSAPP_API_KEY = "test-key";
      const sendError = await sendRsvpTemplateMedia({
        to: seed.phone,
        headerImageUrl: "https://www.invistimo.com/header.jpg",
        eventTitle: "בדיקה",
        templateName: "rsvp_invitation_media",
        rsvpLink: `https://www.invistimo.com/unknown/share_${seed.invitationId}?token=${seed.token}`,
      }).then(
        () => null,
        (err) => err
      );
      assert.ok(sendError, "sender must reject an underivable button param");

      await markQueue(queueId, { status: "failed", providerStatus: "failed", error: sendError.message, failedAt: new Date() });
      await recordWhatsappSendFailure({ queueId, error: sendError });

      let record = await getRecord(seed);
      assert.equal(record.whatsapp.status, "NOT_SENT");
      assert.equal(record.whatsapp.reasonCode, "MISSING_TEMPLATE_VARIABLE");
      assert.equal(record.whatsapp.templateVariable.component, "button");
      assert.equal(record.whatsapp.templateVariable.variable, "{{1}}");
      assert.match(record.whatsapp.reasonMessage, /כפתור URL \{\{1\}\}/);
      const waHistory = record.history.find((h: any) => h.event === "WA_NOT_SENT" || h.event === "WA_FAILED");
      assert.equal(waHistory.meta.templateVariable.component, "button");

      const sent: SentSms[] = [];
      await processWhatsappSmsFallbacks({
        deps: makeDeps(sent, { offsetMs: 0, result: () => ({ ...okResult(), recipient: "972526850711" }) }),
      });
      assert.equal(sent.length, 1);

      record = await getRecord(seed);
      assert.equal(record.sms.status, "SENT");
      assert.equal(record.sms.phone, "972526850711");
      assert.equal(record.sms.providerStatus, "1");
      assert.equal(record.sms.httpStatus, 200);
      assert.equal(record.sms.providerResponse, '{"status":1,"message":"accepted"}');
      const smsHistory = record.history.find((h: any) => h.event === "SMS_SENT");
      assert.equal(smsHistory.meta.phone, "972526850711");
      assert.equal(smsHistory.meta.httpStatus, 200);

      const jwt = (await import("jsonwebtoken")).default;
      const token = jwt.sign({ userId: String(seed.ownerId), role: "user", authVersion: 0 }, process.env.JWT_SECRET!);
      const { GET } = await import("../../app/api/whatsapp/round-report/[invitationId]/route");
      const { NextRequest } = await import("next/server");
      const res = await GET(
        new NextRequest(`http://localhost/api/whatsapp/round-report/${seed.invitationId}`, {
          headers: { authorization: `Bearer ${token}` },
        }),
        { params: Promise.resolve({ invitationId: String(seed.invitationId) }) }
      );
      const body: any = await res.json();
      assert.equal(res.status, 200, JSON.stringify(body));

      const round = body.rounds.find((r: any) => r.key === "rsvp:1");
      assert.equal(round.failed, 0, "never reached Meta — not a Meta failure");
      assert.equal(round.notSent, 1);

      const guestRow = body.guests.find((g: any) => g.guestId === String(seed.guestId));
      const chip = guestRow.roundStatuses.find((r: any) => r.roundKey === "rsvp:1");
      assert.equal(chip.status, "not_sent");
      const view = getGuestChannelView(guestRow.roundStatuses, "rsvp:1");
      assert.equal(view.whatsapp.status, "NOT_SENT");
      assert.match(String(view.whatsapp.reason), /כפתור URL \{\{1\}\}/);
      assert.equal(view.sms.status, "SENT");
      assert.equal(view.sms.evidence?.phone, "972526850711");

      const delivery = guestRow.deliveries.find((d: any) => d.roundKey === "rsvp:1");
      assert.equal(delivery.whatsapp.templateVariable.component, "button");
      assert.equal(delivery.sms.statusLabel, "התקבל אצל ספק ה-SMS");
      assert.equal(delivery.sms.providerResponse, '{"status":1,"message":"accepted"}');

      const workbook = await buildWhatsappRoundReportWorkbook({
        summary: body.summary,
        rounds: body.rounds,
        allGuests: body.guests,
        guestsForSheets: body.guests,
        invitationTitle: "בדיקה",
        selectedRoundKey: "rsvp:1",
        selectedRoundTitle: round.title,
      });
      const sheet = workbook.getWorksheet("אורחים")!;
      const headers = (sheet.getRow(1).values as any[]).slice(1);
      const col = (name: string) => headers.indexOf(name) + 1;
      const xl = sheet.getRow(2);
      assert.match(String(xl.getCell(col("סטטוס WhatsApp")).value), /NOT_SENT/);
      assert.match(String(xl.getCell(col("סיבת WhatsApp")).value), /כפתור URL \{\{1\}\}/);
      assert.equal(String(xl.getCell(col("טלפון SMS שנשלח")).value), "972526850711");
      assert.match(String(xl.getCell(col("תוצאת ספק SMS")).value), /accepted.*status=1.*HTTP 200/);
      assert.equal(String(xl.getCell(col("תגובת ספק SMS (גולמית)")).value), '{"status":1,"message":"accepted"}');
    });

    await t.test("SMS provider outcome unknown → OUTCOME_UNKNOWN, evidence kept, never resent", async () => {
      await clearPending();
      const seed = await seedGuest({ phone: "0505855327" });
      const queueId = await queueRound(seed);
      await markQueue(queueId, { status: "failed", providerStatus: "failed" });
      await recordWhatsappSendFailure({ queueId, error: metaError(131026, "undeliverable") });

      const sent: SentSms[] = [];
      const stats = await processWhatsappSmsFallbacks({
        deps: makeDeps(sent, { result: () => ({ ...unknownResult(), recipient: "972505855327" }) }),
      });
      assert.equal(stats.unknown, 1);
      assert.equal(stats.sent, 0);
      assert.equal(sent.length, 1);

      const record = await getRecord(seed);
      assert.equal(record.sms.status, "OUTCOME_UNKNOWN");
      assert.equal(record.sms.errorCode, "PROVIDER_OUTCOME_UNKNOWN");
      assert.ok(record.sms.unknownAt);
      assert.ok(record.history.some((h: any) => h.event === "SMS_OUTCOME_UNKNOWN"));

      const again: SentSms[] = [];
      await processWhatsappSmsFallbacks({
        deps: makeDeps(again, { offsetMs: AFTER_GRACE_MS * 10 }),
      });
      assert.equal(again.length, 0, "an unknown outcome must never be resent automatically");
    });

    const failViaWebhook = async (queueId: any, wamid: string) => {
      await markQueue(queueId, { status: "sent", providerStatus: "sent", wamid });
      await recordWhatsappSendSuccess({ queueId, wamid });
      await markQueue(queueId, { status: "failed", providerStatus: "failed", errorCode: "130472", failedAt: new Date() });
      await applyWhatsappWebhookStatus({
        wamids: [wamid],
        state: "failed",
        at: new Date(),
        errorCode: 130472,
        errorMessage: "User's number is part of an experiment",
      });
    };

    await t.test("resend after SKIPPED (EVENT_PASSED): attempt 2 is evaluated with current data and sends once", async () => {
      await clearPending();
      process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";
      const seed = await seedGuest({ phone: "0505855327" });
      await User.collection.updateOne(
        { _id: seed.ownerId },
        { $set: { role: "user", isActive: true, authVersion: 0 } }
      );
      await Invitation.collection.updateOne(
        { _id: seed.invitationId },
        { $set: { eventDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) } }
      );

      // Attempt 1: WA failed → SMS skipped because the event date is in the past.
      const q1 = await queueRound(seed, { execution: "exec1" });
      await failViaWebhook(q1, "wamid.RS1");
      const s1: SentSms[] = [];
      await processWhatsappSmsFallbacks({ deps: makeDeps(s1) });
      assert.equal(s1.length, 0);
      let record = await getRecord(seed);
      assert.equal(record.sms.status, "SKIPPED");
      assert.equal(record.sms.reasonCode, "EVENT_PASSED");

      // Owner fixes the date and explicitly resends round 1 → new queue row → new attempt.
      await Invitation.collection.updateOne(
        { _id: seed.invitationId },
        { $set: { eventDate: "2026-11-25" } }
      );
      const q2 = await queueRound(seed, { execution: "exec2" });
      record = await getRecord(seed);
      assert.equal(record.attempt, 2);
      assert.equal(String(record.whatsapp.queueId), String(q2));
      assert.equal(record.whatsapp.status, "QUEUED");
      assert.equal(record.sms.status, null, "attempt 2 starts with a clean SMS state");
      assert.equal(record.previousAttempts.length, 1);
      assert.equal(record.previousAttempts[0].attempt, 1);
      assert.equal(record.previousAttempts[0].whatsapp.status, "FAILED");
      assert.equal(record.previousAttempts[0].sms.status, "SKIPPED");
      assert.equal(record.previousAttempts[0].sms.reasonCode, "EVENT_PASSED");

      // Re-recording the same queue row (retry/restart) must not start attempt 3.
      await recordRoundDecisions([
        {
          invitationId: seed.invitationId,
          guest: { _id: seed.guestId, name: "דנה", phone: seed.phone, guestsCount: 2 },
          type: "rsvp",
          round: 1,
          source: "immediate",
          templateName: "rsvp_round_1",
          outcome: { kind: "queued", queueId: q2, idempotencyKey: "x", phone: seed.phone },
        },
      ]);
      assert.equal((await getRecord(seed)).attempt, 2);

      await failViaWebhook(q2, "wamid.RS2");
      record = await getRecord(seed);
      assert.equal(record.whatsapp.status, "FAILED");
      assert.equal(record.whatsapp.wamid, "wamid.RS2");

      // Inside the 2-minute grace window: nothing yet.
      const early: SentSms[] = [];
      await processWhatsappSmsFallbacks({ deps: makeDeps(early, { offsetMs: 0 }) });
      assert.equal(early.length, 0);

      // Two workers race on the same attempt → exactly one SMS.
      const sent: SentSms[] = [];
      await Promise.all([
        processWhatsappSmsFallbacks({ deps: makeDeps(sent, { delayMs: 30 }) }),
        processWhatsappSmsFallbacks({ deps: makeDeps(sent, { delayMs: 30 }) }),
      ]);
      assert.equal(sent.length, 1);
      assert.equal(sent[0].to, "972505855327");

      record = await getRecord(seed);
      assert.equal(record.sms.status, "SENT");
      assert.equal(
        record.sms.idempotencyKey,
        `sms_fallback:${seed.invitationId}:rsvp:1:${seed.guestId}:sms:attempt2`
      );
      assert.equal(record.previousAttempts[0].sms.status, "SKIPPED", "attempt 1 stays untouched");

      const again: SentSms[] = [];
      await processWhatsappSmsFallbacks({ deps: makeDeps(again, { offsetMs: AFTER_GRACE_MS * 10 }) });
      assert.equal(again.length, 0, "no duplicate SMS for the same attempt");

      // A late webhook for attempt 1's wamid must not touch attempt 2.
      await applyWhatsappWebhookStatus({ wamids: ["wamid.RS1"], state: "failed", at: new Date(), errorCode: 131026 });
      assert.equal((await getRecord(seed)).whatsapp.wamid, "wamid.RS2");

      // Full audit timeline for both attempts is preserved, in order.
      const events = record.history.map((h: any) => h.event);
      const started = events.indexOf("WA_ATTEMPT_STARTED");
      assert.ok(started > 0);
      assert.ok(events.slice(0, started).includes("SMS_SKIPPED"));
      assert.ok(events.slice(started).includes("SMS_SENT"));
      assert.equal(record.history.find((h: any) => h.event === "SMS_SENT").attempt, 2);

      const jwt = (await import("jsonwebtoken")).default;
      const token = jwt.sign({ userId: String(seed.ownerId), role: "user", authVersion: 0 }, process.env.JWT_SECRET!);
      const { GET } = await import("../../app/api/whatsapp/round-report/[invitationId]/route");
      const { NextRequest } = await import("next/server");
      const res = await GET(
        new NextRequest(`http://localhost/api/whatsapp/round-report/${seed.invitationId}`, {
          headers: { authorization: `Bearer ${token}` },
        }),
        { params: Promise.resolve({ invitationId: String(seed.invitationId) }) }
      );
      const body: any = await res.json();
      assert.equal(res.status, 200, JSON.stringify(body));
      const guestRow = body.guests.find((g: any) => g.guestId === String(seed.guestId));
      const view = getGuestChannelView(guestRow.roundStatuses, "rsvp:1");
      assert.equal(view.whatsapp.status, "FAILED");
      assert.equal(view.sms.status, "SENT", "report shows the current attempt, not the old SKIPPED");
      const delivery = guestRow.deliveries.find((d: any) => d.roundKey === "rsvp:1");
      assert.equal(delivery.attempt, 2);
      assert.deepEqual(
        delivery.attempts.map((a: any) => [a.attempt, a.whatsapp.status, a.sms?.status, a.sms?.reasonCode ?? null]),
        [
          [1, "FAILED", "SKIPPED", "EVENT_PASSED"],
          [2, "FAILED", "SENT", null],
        ]
      );
    });

    await t.test("resend after SMS FAILED: new attempt sends once; attempt 1 FAILED kept", async () => {
      await clearPending();
      const seed = await seedGuest();

      const q1 = await queueRound(seed, { execution: "execA" });
      await failViaWebhook(q1, "wamid.RF1");
      const s1: SentSms[] = [];
      await processWhatsappSmsFallbacks({ deps: makeDeps(s1, { result: () => failResult(false) }) });
      assert.equal(s1.length, 1);
      assert.equal((await getRecord(seed)).sms.status, "FAILED");

      const q2 = await queueRound(seed, { execution: "execB" });
      await failViaWebhook(q2, "wamid.RF2");

      const sent: SentSms[] = [];
      const stats = await processWhatsappSmsFallbacks({ deps: makeDeps(sent) });
      assert.equal(stats.sent, 1);
      assert.equal(sent.length, 1);

      const record = await getRecord(seed);
      assert.equal(record.attempt, 2);
      assert.equal(record.sms.status, "SENT");
      assert.equal(record.previousAttempts[0].sms.status, "FAILED");
      assert.equal(record.previousAttempts[0].sms.errorCode, "PROVIDER_REJECTED");

      const again: SentSms[] = [];
      await processWhatsappSmsFallbacks({ deps: makeDeps(again, { offsetMs: AFTER_GRACE_MS * 10 }) });
      assert.equal(again.length, 0);
    });

    await t.test("resend after WhatsApp success: new attempt that succeeds needs no SMS", async () => {
      await clearPending();
      const seed = await seedGuest();
      const q1 = await queueRound(seed, { execution: "execS1" });
      await markQueue(q1, { status: "sent", providerStatus: "delivered", wamid: "wamid.S1" });
      await recordWhatsappSendSuccess({ queueId: q1, wamid: "wamid.S1" });
      await applyWhatsappWebhookStatus({ wamids: ["wamid.S1"], state: "delivered", at: new Date() });

      const q2 = await queueRound(seed, { execution: "execS2" });
      await markQueue(q2, { status: "sent", providerStatus: "delivered", wamid: "wamid.S2" });
      await recordWhatsappSendSuccess({ queueId: q2, wamid: "wamid.S2" });
      await applyWhatsappWebhookStatus({ wamids: ["wamid.S2"], state: "delivered", at: new Date() });

      const sent: SentSms[] = [];
      await processWhatsappSmsFallbacks({ deps: makeDeps(sent) });
      assert.equal(sent.length, 0);
      const record = await getRecord(seed);
      assert.equal(record.attempt, 2);
      assert.equal(record.whatsapp.status, "DELIVERED");
      assert.equal(record.previousAttempts[0].whatsapp.status, "DELIVERED");
    });

    await t.test("resend while attempt 1's SMS is in flight: result lands on attempt 1, attempt 2 untouched", async () => {
      await clearPending();
      const seed = await seedGuest();
      const q1 = await queueRound(seed, { execution: "execF1" });
      await failViaWebhook(q1, "wamid.IF1");

      const sent: SentSms[] = [];
      let resendDone: Promise<any> | null = null;
      const deps = makeDeps(sent, { delayMs: 50 });
      const originalSend = deps.sendSms!;
      deps.sendSms = async (input) => {
        resendDone = queueRound(seed, { execution: "execF2" });
        await resendDone;
        return originalSend(input);
      };
      await processWhatsappSmsFallbacks({ deps });
      assert.equal(sent.length, 1);

      const record = await getRecord(seed);
      assert.equal(record.attempt, 2);
      assert.equal(record.whatsapp.status, "QUEUED");
      assert.equal(record.sms.status, null, "attempt 2 SMS not yet decided");
      assert.equal(record.previousAttempts[0].sms.status, "SENT", "in-flight send recorded on attempt 1");
      assert.equal(record.previousAttempts[0].sms.lockId, null);
    });

    await t.test("kill switch disables the fallback worker", async () => {
      process.env.WHATSAPP_SMS_FALLBACK_DISABLED = "1";
      try {
        const stats = await processWhatsappSmsFallbacks({ deps: makeDeps([]) });
        assert.equal(stats.enabled, false);
        assert.equal(stats.claimed, 0);
      } finally {
        delete process.env.WHATSAPP_SMS_FALLBACK_DISABLED;
      }
    });
  } finally {
    await mongoose.disconnect();
    await mongod.stop();
  }
});
