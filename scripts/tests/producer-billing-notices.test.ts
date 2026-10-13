import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import { resolveProducerBill } from "../../lib/producerBilling/calc";
import {
  buildClearFollowUpScheduleUpdate,
  buildFollowUpUpdate,
  formatShekels,
  isIsraelSummaryHour,
  planDailySummary,
  planDebtSchedule,
  planFinalRecordsNotice,
  planFollowUp,
  planPaymentNotice,
  planProducerOpenedClient,
} from "../../lib/producerBilling/notices";

function read(path: string) {
  return fs.readFileSync(path, "utf8");
}

const clientId = "64b0000000000000000000aa";
const producerId = "64b0000000000000000000bb";

test("final quantity changes the charge up and down without touching payments", () => {
  const down = resolveProducerBill({
    guests: 500,
    producerBilling: {
      pricePerRecord: 1.6,
      initialRecords: 500,
      finalRecords: 420,
      finalRecordsConfirmed: true,
      payments: [],
    },
  });
  assert.equal(down.amountDue, 672);
  assert.equal(down.balance, 672);
  assert.equal(down.status, "unpaid");

  const up = resolveProducerBill({
    guests: 500,
    producerBilling: {
      pricePerRecord: 1.6,
      initialRecords: 500,
      finalRecords: 450,
      finalRecordsConfirmed: true,
      payments: [{ amount: 672 }],
    },
  });
  assert.equal(up.amountDue, 720);
  assert.equal(up.paidAmount, 672);
  assert.equal(up.balance, 48);
  assert.equal(up.status, "partial");
});

test("producer notices use the required wording and do not duplicate a replay", () => {
  const opened = planProducerOpenedClient({
    clientId,
    producerId,
    producerName: "דנה",
    clientName: "יעל",
    eventDate: "2026-10-16",
  });
  assert.equal(
    opened.body,
    "המפיק/ה דנה פתח/ה לקוח חדש: יעל, אירוע בתאריך 16.10.2026.",
  );
  assert.equal(opened.incidentKey, `producer-billing:opened:${clientId}`);
  assert.equal(opened.reopen, false);

  const lowered = planFinalRecordsNotice({
    clientId,
    producerId,
    producerName: "דנה",
    eventName: "החתונה",
    previous: 500,
    next: 420,
    amountDue: 672,
    updatedAt: new Date("2026-07-01T12:00:00.000Z"),
  });
  assert.ok(lowered);
  assert.match(lowered.body, /מ־500 ל־420/);
  assert.match(lowered.body, /הכמות קטנה/);
  assert.match(lowered.body, /672 ₪/);

  const raised = planFinalRecordsNotice({
    clientId,
    producerId,
    producerName: "דנה",
    eventName: "החתונה",
    previous: 420,
    next: 450,
    amountDue: 720,
    updatedAt: new Date("2026-07-02T12:00:00.000Z"),
  });
  assert.match(raised!.body, /הכמות גדלה/);
  assert.match(raised!.body, /720 ₪/);
  assert.equal(
    planFinalRecordsNotice({
      clientId,
      producerId,
      producerName: "דנה",
      eventName: "החתונה",
      previous: 450,
      next: 450,
      amountDue: 720,
      updatedAt: new Date("2026-07-02T12:00:00.000Z"),
    }),
    null,
  );

  const payment = planPaymentNotice({
    clientId,
    producerId,
    eventName: "החתונה",
    amount: 200,
    balance: 472,
    recordedAt: new Date("2026-07-03T08:00:00.000Z"),
  });
  assert.equal(
    payment.body,
    "נרשם תשלום בסך 200 ₪ עבור החתונה. יתרה נוכחית: 472 ₪.",
  );
  assert.equal(
    payment.incidentKey,
    planPaymentNotice({
      clientId,
      producerId,
      eventName: "החתונה",
      amount: 200,
      balance: 472,
      recordedAt: new Date("2026-07-03T08:00:00.000Z"),
    }).incidentKey,
  );
});

test("debt notices follow 24h, 3 days, and the approaching window once per stage", () => {
  const anchor = new Date("2026-07-01T06:00:00.000Z");
  const base = {
    clientId,
    producerId,
    producerName: "דנה",
    eventName: "החתונה",
    confirmed: true,
    finalRecords: 420,
    amountDue: 672,
    balance: 672,
    finalRecordsUpdatedAt: anchor,
    eventDate: "2026-07-20",
  };

  const tooSoon = planDebtSchedule({ ...base, now: new Date(anchor.getTime() + 23 * 60 * 60 * 1000) });
  assert.equal(tooSoon.notices.length, 0);

  const afterDay = planDebtSchedule({ ...base, now: new Date(anchor.getTime() + 24 * 60 * 60 * 1000) });
  assert.equal(afterDay.notices.length, 1);
  assert.match(afterDay.notices[0].body, /ממתין לתשלום: דנה, אירוע החתונה, יתרה 672 ₪/);
  assert.equal(afterDay.notices[0].severity, "important");
  const again = planDebtSchedule({ ...base, now: new Date(anchor.getTime() + 30 * 60 * 60 * 1000) });
  assert.equal(again.notices[0].incidentKey, afterDay.notices[0].incidentKey);

  const afterThree = planDebtSchedule({ ...base, now: new Date(anchor.getTime() + 3 * 24 * 60 * 60 * 1000) });
  assert.equal(afterThree.notices.filter((item) => item.type.endsWith("due3d")).length, 1);
  assert.match(afterThree.notices.find((item) => item.type.endsWith("due3d"))!.body, /חוב פתוח למפיק\/ה דנה/);

  const soon = planDebtSchedule({
    ...base,
    now: new Date("2026-07-15T06:00:00.000Z"),
    eventDate: "2026-07-18",
  });
  const approaching = soon.notices.find((item) => item.type.endsWith("eventSoon"));
  assert.ok(approaching);
  assert.equal(approaching.severity, "urgent");
  assert.match(approaching.body, /אירוע מתקרב עם חוב פתוח: החתונה, 18.7.2026/);

  const tooEarly = planDebtSchedule({
    ...base,
    now: new Date("2026-07-15T06:00:00.000Z"),
    eventDate: "2026-07-19",
    finalRecordsUpdatedAt: new Date("2026-07-15T05:00:00.000Z"),
  });
  assert.equal(tooEarly.notices.some((item) => item.type.endsWith("eventSoon")), false);

  const passed = planDebtSchedule({
    ...base,
    now: new Date("2026-07-15T06:00:00.000Z"),
    eventDate: "2026-07-14",
  });
  assert.equal(passed.notices.some((item) => item.type.endsWith("eventSoon")), false);

  const paid = planDebtSchedule({ ...base, balance: 0, now: new Date("2026-07-15T06:00:00.000Z") });
  assert.equal(paid.notices.length, 0);
  assert.equal(paid.resolveAllDebt, true);
  assert.equal(paid.clearSchedule, true);
});

test("snooze and handled reminders suppress debt notices until the chosen time", () => {
  const anchor = new Date("2026-07-01T06:00:00.000Z");
  const now = new Date("2026-07-10T06:00:00.000Z");
  const base = {
    clientId,
    producerId,
    producerName: "דנה",
    eventName: "החתונה",
    confirmed: true,
    finalRecords: 420,
    amountDue: 672,
    balance: 672,
    finalRecordsUpdatedAt: anchor,
    eventDate: "2026-07-12",
    now,
  };
  const snoozed = planDebtSchedule({
    ...base,
    followUp: { snoozeUntil: new Date("2026-07-16T06:00:00.000Z") },
  });
  assert.equal(snoozed.notices.length, 0);
  assert.equal(snoozed.resolveAllDebt, false);

  const due = planDebtSchedule({
    ...base,
    followUp: { snoozeUntil: new Date("2026-07-10T06:00:00.000Z") },
  });
  assert.equal(due.notices.length, 1);
  assert.match(due.notices[0].body, /תזכורת גבייה/);
  assert.equal(due.markSnoozeFired, true);
  assert.equal(due.notices.some((item) => item.type.endsWith("due24h")), false);

  const steady = planDebtSchedule({
    ...base,
    followUp: {
      snoozeUntil: new Date("2026-07-10T06:00:00.000Z"),
      firedSnoozeAt: new Date("2026-07-10T06:00:00.000Z"),
      noticeBalance: 672,
    },
  });
  assert.equal(steady.notices.length, 0);
  assert.equal(steady.retainKeys.length, 1);

  const handled = planFollowUp({
    mode: "handled",
    now,
    cycleKey: "cycle-1",
  });
  assert.equal(handled.ok, true);
  if (handled.ok) assert.equal(handled.snoozeUntil, null);

  const quiet = planDebtSchedule({
    ...base,
    followUp: { handledCycleKey: planDebtSchedule(base).cycleKey },
  });
  assert.equal(quiet.notices.length, 0);

  const tomorrow = planFollowUp({ mode: "tomorrow", now, cycleKey: "cycle-1" });
  assert.equal(tomorrow.ok, true);
  if (tomorrow.ok) {
    assert.ok(tomorrow.snoozeUntil);
    assert.equal(isIsraelSummaryHour(tomorrow.snoozeUntil), true);
  }
  const past = planFollowUp({ mode: "date", now, remindOn: "2026-07-01", cycleKey: "cycle-1" });
  assert.deepEqual(past, { ok: false, error: "PAST_DATE" });

  const update = buildFollowUpUpdate({
    snoozeUntil: new Date("2026-07-16T06:00:00.000Z"),
    handledCycleKey: "",
    firedSnoozeAt: null,
    noticeBalance: null,
    note: "דיברתי עם המפיקה",
    at: now,
    by: "admin",
  });
  const text = JSON.stringify(update);
  assert.match(text, /collectionFollowUp/);
  assert.doesNotMatch(text, /pricePerRecord|hasPaid|guests|finalRecords/);
  const cleared = JSON.stringify(buildClearFollowUpScheduleUpdate());
  assert.doesNotMatch(cleared, /collectionFollowUp\.note/);
});

test("daily summary is once per Israel morning and ignores credit balances", () => {
  const morning = new Date("2026-07-15T06:00:00.000Z");
  const winterMorning = new Date("2026-01-15T07:00:00.000Z");
  assert.equal(isIsraelSummaryHour(morning), true);
  assert.equal(isIsraelSummaryHour(winterMorning), true);
  assert.equal(isIsraelSummaryHour(new Date("2026-07-15T05:30:00.000Z")), false);

  const summary = planDailySummary({
    now: morning,
    rows: [
      { confirmed: true, amountDue: 1000, balance: 1000, eventDate: "2026-07-15" },
      { confirmed: true, amountDue: 1450, balance: 1450, eventDate: "2026-07-16" },
      { confirmed: true, amountDue: 400, balance: 400, eventDate: "2026-07-28" },
      { confirmed: true, amountDue: 300, balance: 300, eventDate: "2026-07-29" },
      { confirmed: true, amountDue: 300, balance: 300, eventDate: "2026-07-30" },
      { confirmed: true, amountDue: 80, balance: -20, eventDate: "2026-07-15" },
      { confirmed: false, amountDue: null, balance: null, eventDate: "2026-07-15" },
    ],
  });
  assert.ok(summary);
  assert.equal(
    summary.body,
    "סיכום גבייה יומי: 5 אירועים ממתינים לתשלום, יתרה כוללת 3,450 ₪. מתוכם 2 אירועים מתקיימים השבוע.",
  );
  assert.equal(summary.incidentKey, "producer-billing:daily:2026-07-15");
  assert.equal(planDailySummary({ now: morning, rows: [] }), null);
  assert.equal(
    planDailySummary({
      now: new Date("2026-07-15T05:30:00.000Z"),
      rows: [{ confirmed: true, amountDue: 10, balance: 10, eventDate: "2026-07-15" }],
    }),
    null,
  );
  assert.equal(formatShekels(2450), "2,450 ₪");
  assert.equal(formatShekels(-30), "יתרת זכות 30 ₪");
});

test("producer billing stays hidden from producers and creation stays active", () => {
  const createRoute = read("app/api/producer/create-client/route.ts");
  const producerRoute = read("app/api/producer/clients/[id]/billing/route.ts");
  const adminRoute = read("app/api/admin/producers/[producerId]/billing/route.ts");
  const button = read("app/components/producer/ProducerClientBillingButton.jsx");
  const users = `${read("app/admin/users/page.tsx")}\n${read("app/admin/users/UserDirectoryTables.tsx")}`;
  const cron = read("app/api/cron/event-notifications/route.ts");

  assert.doesNotMatch(createRoute, /stripe|checkout/i);
  assert.match(createRoute, /grantAccessBeforePayment: true/);
  assert.match(createRoute, /isActive: true/);
  assert.match(createRoute, /notifyProducerOpenedClient/);
  assert.match(createRoute, /buildProducerClientPasswordSms/);
  const view = producerRoute.slice(
    producerRoute.indexOf("function producerBillingView"),
    producerRoute.indexOf("export async function GET"),
  );
  assert.doesNotMatch(view, /amountDue|statusLabel|collectionFollowUp|pricePerRecord|payments/);
  assert.match(producerRoute, /pricePerRecord != null/);
  assert.match(producerRoute, /markPaid/);
  assert.match(producerRoute, /auth\.role !== "producer"/);
  assert.match(adminRoute, /action === "follow-up"/);
  assert.match(adminRoute, /isAdminContext/);
  assert.match(button, /עדכון כמות סופית/);
  assert.match(button, /שמירת כמות סופית/);
  assert.doesNotMatch(button, /יתרה|סכום לחיוב|statusLabel/);
  assert.match(users, /יתרה לגבייה/);
  assert.match(cron, /processProducerCollectionNotices/);
});
