import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { planRoundSendSummaryNotice, planSystemErrorNotification } from "@/lib/customerNotifications/planners";
import { classifyGuestPhoneForSend, splitGuestsBySendPhone } from "@/lib/messages/sendPhoneEligibility";
import {
  formatRoundSendSummaryBody,
  summarizeRoundDeliveries,
  type RoundDeliverySnapshot,
} from "@/lib/messages/roundSendSummary";
import { buildSmsFallbackIdempotencyKey } from "@/lib/sms/whatsappSmsFallback";

function read(path: string) {
  return readFileSync(path, "utf8");
}

function row(
  whatsappStatus: string,
  smsStatus: string | null = null,
  whatsappReasonCode: string | null = null
): RoundDeliverySnapshot {
  return { whatsappStatus, smsStatus, whatsappReasonCode };
}

test("missing, invalid and valid phones are classified before any send", () => {
  assert.equal(classifyGuestPhoneForSend({ phone: "" }), "missing");
  assert.equal(classifyGuestPhoneForSend({ phone: "   " }), "missing");
  assert.equal(classifyGuestPhoneForSend({ phone: "123" }), "invalid");
  assert.equal(classifyGuestPhoneForSend({ phone: "050123456" }), "invalid");
  assert.equal(
    classifyGuestPhoneForSend({ phone: "050123456", phoneLengthApproved: true }),
    "sendable"
  );
  assert.equal(classifyGuestPhoneForSend({ phone: "0501234567" }), "sendable");
  assert.equal(classifyGuestPhoneForSend({ phone: "0527654321" }), "sendable");

  const split = splitGuestsBySendPhone([
    { phone: "" },
    { phone: "12345" },
    { phone: "0501111111" },
  ]);
  assert.equal(split.missing.length, 1);
  assert.equal(split.invalid.length, 1);
  assert.equal(split.sendable.length, 1);
});

test("round summary uses real delivery rows and waits while WhatsApp is pending", () => {
  const pending = summarizeRoundDeliveries([
    row("SENT"),
    row("SENDING"),
    row("FAILED", null),
  ]);
  assert.equal(pending, null);

  const waitingForSms = summarizeRoundDeliveries([
    row("SENT"),
    row("FAILED", "PENDING"),
  ]);
  assert.equal(waitingForSms, null);

  const unknown = summarizeRoundDeliveries([row("FAILED", "OUTCOME_UNKNOWN")]);
  assert.ok(unknown);
  assert.equal(unknown.smsFallbackFailed, 0);
  assert.equal(unknown.smsFallbackSent, 0);
  assert.equal(unknown.leftWithoutSuccess, 1);

  const ready = summarizeRoundDeliveries([
    row("DELIVERED"),
    row("FAILED", "SENT"),
    row("FAILED", "FAILED"),
    row("NOT_SENT", null, "MISSING_PHONE"),
    row("NOT_SENT", "SKIPPED", "INVALID_PHONE"),
  ]);
  assert.ok(ready);
  assert.equal(ready.eligible, 3);
  assert.equal(ready.whatsappSent, 1);
  assert.equal(ready.whatsappDelivered, 1);
  assert.equal(ready.whatsappFailed, 2);
  assert.equal(ready.smsFallbackAttempted, 2);
  assert.equal(ready.smsFallbackSent, 1);
  assert.equal(ready.smsFallbackFailed, 1);
  assert.equal(ready.leftWithoutSuccess, 1);
  assert.equal(
    ready.whatsappSent + ready.whatsappFailed,
    ready.eligible
  );
});

test("the wedding example is calculated from delivery records, not from guesses", () => {
  const records: RoundDeliverySnapshot[] = [
    ...Array.from({ length: 250 }, () => row("SENT")),
    ...Array.from({ length: 28 }, () => row("FAILED", "SENT")),
    ...Array.from({ length: 2 }, () => row("FAILED", "FAILED")),
    ...Array.from({ length: 40 }, () => row("NOT_SENT", null, "MISSING_PHONE")),
    ...Array.from({ length: 6 }, () => row("NOT_SENT", "SKIPPED", "INVALID_PHONE")),
  ];
  const summary = summarizeRoundDeliveries(records);
  assert.ok(summary);
  assert.equal(summary.eligible, 280);
  assert.equal(summary.whatsappSent, 250);
  assert.equal(summary.whatsappFailed, 30);
  assert.equal(summary.smsFallbackAttempted, 30);
  assert.equal(summary.smsFallbackSent, 28);
  assert.equal(summary.smsFallbackFailed, 2);
  assert.equal(summary.leftWithoutSuccess, 2);
  assert.equal(
    summary.whatsappSent + summary.leftWithoutSuccess + summary.smsFallbackSent,
    summary.eligible
  );

  const notice = planRoundSendSummaryNotice({
    invitationId: "inv-wedding",
    round: 1,
    eventTitle: "החתונה של הדר ובן",
    eventDate: "2026-11-02",
    summary,
  });
  assert.equal(notice.title, "סבב אישורי הגעה 1 הסתיים – החתונה של הדר ובן");
  assert.equal(notice.adminTitle, notice.title);
  const adminBody = notice.adminBody || "";
  assert.match(adminBody, /תאריך האירוע: 2026-11-02/);
  assert.match(adminBody, /סבב 1/);
  assert.equal(notice.body, formatRoundSendSummaryBody(summary));
  assert.match(notice.body, /רשומות זכאיות לשליחה: 280/);
  assert.match(notice.body, /נשלחו בהצלחה: 250/);
  assert.match(notice.body, /נכשלו: 30/);
  assert.match(notice.body, /נשלחו בעקבות כשל WhatsApp: 30/);
  assert.match(notice.body, /הצליחו: 28/);
  assert.match(notice.body, /נכשלו: 2/);
  assert.match(notice.body, /סה"כ רשומות שנותרו ללא שליחה מוצלחת: 2/);
  assert.doesNotMatch(notice.body, /40|חסר מספר/);
});

test("a second summary for the same round keeps one dedupe key", () => {
  const summary = summarizeRoundDeliveries([row("SENT")])!;
  const first = planRoundSendSummaryNotice({
    invitationId: "inv-1",
    round: 2,
    eventTitle: "החתונה של נועה",
    summary,
  });
  const second = planRoundSendSummaryNotice({
    invitationId: "inv-1",
    round: 2,
    eventTitle: "החתונה של נועה",
    summary,
  });
  assert.equal(first.dedupeKey, second.dedupeKey);
  assert.equal(
    buildSmsFallbackIdempotencyKey({
      invitationId: "inv-1",
      roundKey: "rsvp:2",
      guestId: "guest-1",
      attempt: 1,
    }),
    buildSmsFallbackIdempotencyKey({
      invitationId: "inv-1",
      roundKey: "rsvp:2",
      guestId: "guest-1",
      attempt: 1,
    })
  );
});

test("scheduled and immediate send paths do not record a missing phone as a failed attempt", () => {
  const worker = read("workers/sendScheduledSms.ts");
  const immediate = read("app/api/whatsapp/send-template/route.ts");
  const preRsvp = read("app/api/messages/pre-rsvp/whatsapp/route.ts");
  const fallback = read("lib/sms/whatsappSmsFallback.ts");
  assert.doesNotMatch(worker, /reasonCode: "MISSING_PHONE"/);
  assert.match(worker, /splitGuestsBySendPhone/);
  assert.match(worker, /Skipping duplicate scheduled WhatsApp send/);
  assert.match(worker, /publishRoundSendSummary/);
  assert.doesNotMatch(immediate, /MISSING_PHONE/);
  assert.match(immediate, /classifyGuestPhoneForSend/);
  assert.doesNotMatch(preRsvp, /MISSING_PHONE/);
  assert.match(fallback, /buildSmsFallbackIdempotencyKey/);
  assert.match(fallback, /publishTouchedRoundSummaries/);
});

test("a system fault without one event is labeled as general", () => {
  const notice = planSystemErrorNotification({ source: "cron", hourBucket: "2026-10-13T15" });
  assert.match(notice.title, /כללית/);
  assert.match(notice.body, /לא משויכת לאירוע אחד/);
});
