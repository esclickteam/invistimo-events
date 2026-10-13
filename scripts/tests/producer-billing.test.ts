import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  buildCollectionPaymentUpdate,
  buildFinalRecordsUpdate,
  canAssignCollectionPayer,
  isInProducerCollection,
  resolveProducerBill,
} from "../../lib/producerBilling/calc";
import {
  buildProducerClientPasswordSms,
  evaluatePasswordSmsRateLimit,
  shouldRateLimitProducerPasswordSms,
} from "../../lib/producerBilling/passwordSms";

function read(path: string) {
  return fs.readFileSync(path, "utf8");
}

test("new producer client starts unpaid and active access is separate from collection", () => {
  const bill = resolveProducerBill({
    billingSource: "producer",
    guests: 20,
    producerBilling: {
      grantAccessBeforePayment: true,
      payerProducerId: "producer-1",
      pricePerRecord: 12,
      initialRecords: 20,
      finalRecords: 20,
      finalRecordsConfirmed: true,
      payments: [],
    },
  });

  assert.equal(bill.status, "unpaid");
  assert.equal(bill.statusLabel, "טרם שולם");
  assert.equal(bill.amountDue, 240);
  assert.equal(bill.paidAmount, 0);
  assert.equal(bill.balance, 240);
});

test("final record changes move the balance without deleting prior payments", () => {
  const partial = resolveProducerBill({
    guests: 10,
    producerBilling: {
      pricePerRecord: 10,
      initialRecords: 10,
      finalRecords: 10,
      finalRecordsConfirmed: true,
      payments: [{ amount: 40 }],
    },
  });
  assert.equal(partial.status, "partial");
  assert.equal(partial.balance, 60);

  const credit = resolveProducerBill({
    guests: 10,
    producerBilling: {
      pricePerRecord: 10,
      initialRecords: 10,
      finalRecords: 2,
      finalRecordsConfirmed: true,
      payments: [{ amount: 40 }, { amount: 10 }],
    },
  });
  assert.equal(credit.status, "credit");
  assert.equal(credit.paidAmount, 50);
  assert.equal(credit.amountDue, 20);
  assert.equal(credit.balance, -30);
  assert.equal(credit.statusLabel, "יתרת זכות");
});

test("unconfirmed quantity waits, and a zero price is not treated as paid", () => {
  const waiting = resolveProducerBill({
    billingSource: "producer",
    guests: 8,
    producerBilling: { finalRecordsConfirmed: false, pricePerRecord: 15 },
  });
  assert.equal(waiting.status, "awaiting_final_records");
  assert.equal(waiting.amountDue, null);

  const noPrice = resolveProducerBill({
    guests: 8,
    producerBilling: {
      finalRecordsConfirmed: true,
      finalRecords: 8,
      pricePerRecord: 0,
      payments: [],
    },
  });
  assert.equal(noPrice.status, "unpaid");
});

test("a client is billed by one producer only", () => {
  const shared = {
    billingSource: "producer",
    assignedProducerId: "producer-a",
    producerBilling: { payerProducerId: "producer-a" },
  };
  assert.equal(isInProducerCollection(shared, "producer-a"), true);
  assert.equal(isInProducerCollection(shared, "producer-b"), false);

  const managedOnly = {
    billingSource: "admin",
    assignedProducerId: "producer-a",
    producerBilling: {},
  };
  assert.equal(isInProducerCollection(managedOnly, "producer-a"), false);

  const legacyPrimary = {
    billingSource: "producer",
    assignedProducerId: "producer-a",
  };
  assert.equal(isInProducerCollection(legacyPrimary, "producer-a"), true);
  assert.equal(isInProducerCollection(legacyPrimary, "producer-b"), false);
});

test("admin can attach a regular client once, and cannot double-bill", () => {
  assert.equal(
    canAssignCollectionPayer({ role: "user", billingSource: "admin" }, "producer-a").ok,
    true,
  );
  assert.equal(
    canAssignCollectionPayer(
      {
        role: "user",
        billingSource: "admin",
        producerBilling: { payerProducerId: "producer-b" },
      },
      "producer-a",
    ).code,
    "ALREADY_BILLED_BY_ANOTHER_PRODUCER",
  );
  assert.equal(
    canAssignCollectionPayer(
      {
        role: "client",
        billingSource: "producer",
        assignedProducerId: "producer-a",
      },
      "producer-a",
    ).code,
    "ALREADY_TRACKED",
  );
  assert.equal(
    canAssignCollectionPayer({ role: "user", billingSource: "venue" }, "producer-a").code,
    "VENUE_CLIENT",
  );
});

test("billing updates do not touch quotas, guest data, or hasPaid", () => {
  const records = buildFinalRecordsUpdate({
    previousFinalRecords: 10,
    nextFinalRecords: 14,
    at: new Date("2026-01-01T00:00:00Z"),
    by: "admin-1",
  });
  const payment = buildCollectionPaymentUpdate({
    amount: 25,
    paidAt: new Date("2026-01-02T00:00:00Z"),
    method: "bit",
    note: "העברה",
    recordedBy: "admin-1",
    createdAt: new Date("2026-01-02T00:00:00Z"),
  });

  const recordText = JSON.stringify(records);
  const paymentText = JSON.stringify(payment);
  for (const token of ["guests", "maxGuests", "maxMessages", "hasPaid", "isActive", "\"payments\""]) {
    assert.equal(recordText.includes(token), false, token);
    assert.equal(paymentText.includes(token), false, token);
  }
  assert.match(recordText, /producerBilling\.finalRecords/);
  assert.match(paymentText, /producerBilling\.payments/);
});

test("password sms is personal, rate limited, and does not include a password", () => {
  const message = buildProducerClientPasswordSms("https://invistimo.com/set-password?token=abc");
  assert.match(message, /להגדרת סיסמה/);
  assert.match(message, /token=abc/);
  assert.doesNotMatch(message, /סיסמה היא|password=/i);

  const now = new Date("2026-04-01T12:00:00Z");
  assert.equal(
    evaluatePasswordSmsRateLimit(
      { lastAttemptAt: new Date("2026-04-01T11:59:30Z"), attempts: [] },
      now,
    ).code,
    "PASSWORD_SMS_COOLDOWN",
  );
  assert.equal(
    evaluatePasswordSmsRateLimit(
      {
        attempts: [1, 2, 3, 4, 5].map((hour) => new Date(`2026-04-01T0${hour}:00:00Z`)),
      },
      now,
    ).code,
    "PASSWORD_SMS_DAILY_LIMIT",
  );
  assert.equal(shouldRateLimitProducerPasswordSms({ billingSource: "admin" }), false);
  assert.equal(shouldRateLimitProducerPasswordSms({ billingSource: "producer" }), true);
});

test("producer client creation no longer opens Stripe", () => {
  const route = read("app/api/producer/create-client/route.ts");
  const form = read("app/components/producer/CreateClientByProducer.jsx");
  const userModel = read("models/User.ts");

  assert.doesNotMatch(route, /stripe|checkout/i);
  assert.match(route, /billingSource: "producer"/);
  assert.match(route, /role: "client"/);
  assert.match(route, /grantAccessBeforePayment: true/);
  assert.match(route, /isActive: true/);
  assert.match(route, /buildProducerClientPasswordSms/);
  assert.match(route, /EMAIL_ALREADY_EXISTS/);
  assert.doesNotMatch(form, /checkoutUrl|המשך לתשלום/);
  assert.match(form, /פתיחת לקוח/);
  assert.match(userModel, /grantAccessBeforePayment === true/);
  assert.match(userModel, /doc\.hasPaid = true/);
});

test("collection permissions stay on the server", () => {
  const admin = read("app/api/admin/producers/[producerId]/billing/route.ts");
  const producer = read("app/api/producer/clients/[id]/billing/route.ts");
  const page = read("app/admin/users/page.tsx");

  assert.match(admin, /isAdminContext/);
  assert.match(admin, /FORBIDDEN/);
  assert.match(admin, /action === "payment"/);
  assert.doesNotMatch(admin, /hasPaid:\s*true/);
  assert.match(producer, /auth\.role !== "producer"/);
  assert.match(producer, /markPaid/);
  assert.match(page, /מעקב תשלומים/);
});
