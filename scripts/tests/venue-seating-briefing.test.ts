import test, { before } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "path";
import { ensureVenueSeatingHolidayCalendar } from "../../lib/venueSeatingContacts/smsSchedule";
import { wallTimeInZoneToUtc } from "../../lib/weddingChallenges/timezone";
import {
  automaticClaimDecision,
  briefingAccess,
  buildVenueSeatingBriefing,
  collectibleBalance,
  dedupeRecipients,
  manualClaimDecision,
  planVenueSeatingBriefingAdminNotice,
  resolveArrivalTime,
} from "../../lib/venueSeatingBriefing/logic";

before(async () => {
  await ensureVenueSeatingHolidayCalendar();
});

const root = path.resolve(process.cwd());

function read(rel: string) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function atIsrael(wall: string) {
  const date = wallTimeInZoneToUtc(wall, "Asia/Jerusalem");
  if (!date) throw new Error(`bad wall time ${wall}`);
  return date;
}

const upsellUser = { salesUpsells: { venueSeating: { enabled: true } } };
const serviceUser = { venueSeatingService: { enabled: true } };
const digitalOnly = {
  includeDigitalSeating: true,
  packageName: "הושבה באולם",
  salesUpsells: { digitalSeating: { enabled: true }, venueSeating: { enabled: false } },
  venueSeatingService: { enabled: false },
};

const wedding = {
  hostsNames: "ליאור ונועה",
  eventType: "wedding",
  date: "2026-10-12",
  venueName: "גני האירועים",
  city: "חיפה",
  receptionTime: "19:30",
  primary: {
    fullName: "ישראל ישראלי",
    phone: "050-0000000",
    relation: "אבא",
  },
  secondary: {
    fullName: "דנה כהן",
    phone: "052-0000000",
    relation: "",
  },
  totalDealAmount: 5000,
  paidAmount: 0,
  payments: [
    { amount: 3600, status: "paid", type: "deposit" },
    { amount: 900, status: "failed", type: "balance" },
  ],
};

test("arrival time is 30 minutes before reception unless an admin override is saved", () => {
  assert.deepEqual(resolveArrivalTime({ receptionTime: "19:30" }), {
    time: "19:00",
    manual: false,
  });

  const manual = resolveArrivalTime({
    receptionTime: "19:30",
    arrivalManual: true,
    arrivalTimeManual: "18:15",
  });
  assert.deepEqual(manual, { time: "18:15", manual: true });

  const afterReceptionChange = resolveArrivalTime({
    receptionTime: "21:00",
    arrivalManual: true,
    arrivalTimeManual: "18:15",
  });
  assert.equal(afterReceptionChange.time, "18:15");

  assert.equal(
    resolveArrivalTime({
      receptionTime: "21:00",
      arrivalManual: false,
      arrivalTimeManual: "18:15",
    }).time,
    "20:30"
  );
});

test("balance comes from the deal and captured payments, not a stored event-day figure", () => {
  assert.equal(
    collectibleBalance({
      totalDealAmount: 5000,
      paidAmount: 1,
      payments: [
        { amount: 3600, status: "paid", type: "deposit" },
        { amount: 400, status: "paid", type: "refund" },
        { amount: 900, status: "failed", type: "balance" },
      ],
    }),
    1800
  );

  assert.equal(
    collectibleBalance({
      totalDealAmount: 2000,
      paidAmount: 600,
      payments: [],
    }),
    1400
  );
});

test("sms uses the sample shape and omits other financial figures and missing contacts", () => {
  const briefing = buildVenueSeatingBriefing({
    ...wedding,
    eventDayBalance: 9999,
    venuePaymentAmount: 9999,
  } as never);

  assert.equal(briefing.balance, 1400);
  assert.match(briefing.text, /Invistimo \| פרטי אירוע/);
  assert.match(briefing.text, /אירוע: החתונה של ליאור ונועה/);
  assert.match(briefing.text, /תאריך: 12\.10\.2026/);
  assert.match(briefing.text, /אולם: גני האירועים, חיפה/);
  assert.match(briefing.text, /קבלת פנים: 19:30/);
  assert.match(briefing.text, /שעת התייצבות: 19:00/);
  assert.match(briefing.text, /איש קשר ראשי:\nישראל ישראלי – 050-0000000\nתפקיד: אבא/);
  assert.match(briefing.text, /איש קשר נוסף:\nדנה כהן – 052-0000000/);
  assert.doesNotMatch(briefing.text, /תפקיד: \n/);
  assert.match(briefing.text, /יתרה לגבייה באירוע: 1,400 ₪/);
  assert.match(briefing.text, /יש לתאם את גביית היתרה מול איש הקשר האחראי לתשלום\./);
  assert.equal(briefing.text.includes("5,000"), false);
  assert.equal(briefing.text.includes("3,600"), false);
  assert.equal(briefing.text.includes("9999"), false);
  assert.equal(briefing.text.includes("9,999"), false);

  const missing = buildVenueSeatingBriefing({
    ...wedding,
    primary: null,
    secondary: { fullName: "דנה", phone: "", relation: "" },
    receptionTime: "",
  });
  assert.equal(missing.text.includes("ישראל"), false);
  assert.equal(missing.text.includes("דנה"), false);
  assert.equal(missing.text.includes("אחראי לתשלום"), false);
  assert.equal(missing.text.includes("קבלת פנים"), false);
  assert.ok(missing.alerts.some((alert) => alert.includes("איש הקשר הראשי")));
  assert.ok(missing.alerts.some((alert) => alert.includes("קבלת הפנים")));
});

test("the same person is one recipient, and unassigned roles are not invented", () => {
  const merged = dedupeRecipients([
    { userId: "a", name: "נועה", phone: "0501111111", role: "seating_staff" },
    { userId: "a", name: "נועה", phone: "0501111111", role: "producer" },
    { userId: "b", name: "יוסי", phone: "050-1111111", role: "producer" },
  ]);
  assert.equal(merged.length, 1);
  assert.equal(merged[0]?.role, "both");
  assert.equal(merged[0]?.userId, "a");
});

test("automatic briefing is 14:00 the permitted day before, and manual send stays available", () => {
  const wednesday = { date: "2026-10-14", receptionTime: "19:30", status: "active" };
  const beforeHour = briefingAccess({
    user: upsellUser,
    event: wednesday,
    now: atIsrael("2026-10-13T13:59"),
  });
  const atTwo = briefingAccess({
    user: serviceUser,
    event: wednesday,
    now: atIsrael("2026-10-13T14:00"),
  });
  const sameEvening = briefingAccess({
    user: upsellUser,
    event: wednesday,
    now: atIsrael("2026-10-13T21:30"),
  });
  const tooLate = briefingAccess({
    user: upsellUser,
    event: wednesday,
    now: atIsrael("2026-10-13T22:00"),
  });
  const eventMorning = briefingAccess({
    user: upsellUser,
    event: wednesday,
    now: atIsrael("2026-10-14T09:30"),
  });
  const withoutService = briefingAccess({
    user: digitalOnly,
    event: wednesday,
    now: atIsrael("2026-10-13T14:00"),
  });
  const archived = briefingAccess({
    user: upsellUser,
    event: { ...wednesday, status: "archived" },
    now: atIsrael("2026-10-13T14:00"),
  });

  assert.equal(beforeHour.allowAutomaticSend, false);
  assert.equal(beforeHour.allowManualSend, true);
  assert.equal(beforeHour.sendDate, "2026-10-13");
  assert.equal(atTwo.allowAutomaticSend, true);
  assert.equal(sameEvening.allowAutomaticSend, true);
  assert.equal(tooLate.allowAutomaticSend, false);
  assert.equal(eventMorning.allowAutomaticSend, false);
  assert.equal(eventMorning.allowManualSend, true);
  assert.equal(eventMorning.showToAssignee, true);
  assert.equal(withoutService.allowAutomaticSend, false);
  assert.equal(withoutService.allowManualSend, false);
  assert.equal(archived.allowAutomaticSend, false);

  const sunday = { date: "2026-10-18", status: "active" };
  const friday = briefingAccess({
    user: upsellUser,
    event: sunday,
    now: atIsrael("2026-10-16T14:00"),
  });
  const shabbat = briefingAccess({
    user: upsellUser,
    event: sunday,
    now: atIsrael("2026-10-17T14:00"),
  });
  assert.equal(friday.sendDate, "2026-10-16");
  assert.equal(friday.allowAutomaticSend, true);
  assert.equal(shabbat.allowAutomaticSend, false);
  assert.equal(shabbat.allowManualSend, true);

  const afterHoliday = { date: "2026-05-24", status: "active" };
  const beforeStreak = briefingAccess({
    user: upsellUser,
    event: afterHoliday,
    now: atIsrael("2026-05-21T14:00"),
  });
  const onHoliday = briefingAccess({
    user: upsellUser,
    event: afterHoliday,
    now: atIsrael("2026-05-22T14:00"),
  });
  assert.equal(beforeStreak.sendDate, "2026-05-21");
  assert.equal(beforeStreak.allowAutomaticSend, true);
  assert.equal(onHoliday.allowAutomaticSend, false);

  const moved = briefingAccess({
    user: upsellUser,
    event: { date: "2026-10-18", status: "active" },
    now: atIsrael("2026-10-13T14:00"),
  });
  assert.equal(moved.sendDate, "2026-10-16");
  assert.equal(moved.allowAutomaticSend, false);
});

test("an employee removed before the briefing send is not a recipient", () => {
  const assigned = dedupeRecipients([
    { userId: "staff-1", name: "נועה", phone: "0501234567", role: "seating_staff" },
    { userId: "producer-1", name: "דנה", phone: "0507654321", role: "producer" },
  ]);
  const afterChange = dedupeRecipients([
    { userId: "staff-2", name: "יוסי", phone: "0521111111", role: "seating_staff" },
    { userId: "producer-1", name: "דנה", phone: "0507654321", role: "producer" },
  ]);
  assert.deepEqual(assigned.map((person) => person.userId).sort(), ["producer-1", "staff-1"]);
  assert.equal(afterChange.some((person) => person.userId === "staff-1"), false);
  assert.equal(afterChange.some((person) => person.userId === "staff-2"), true);
});

test("a successful send blocks the automatic copy, and only an explicit retry claims a failure", () => {
  const now = atIsrael("2026-10-12T10:00");
  assert.equal(automaticClaimDecision(null, now), "claim");
  assert.equal(automaticClaimDecision({ status: "sent", lastAttemptAt: now }, now), "skip");
  assert.equal(automaticClaimDecision({ status: "failed", lastAttemptAt: now }, now), "skip");
  assert.equal(automaticClaimDecision({ status: "sending", lastAttemptAt: now }, now), "skip");
  assert.equal(
    automaticClaimDecision(
      { status: "sending", lastAttemptAt: new Date(now.getTime() - 3 * 60 * 1000) },
      now
    ),
    "claim"
  );

  assert.equal(manualClaimDecision({ status: "sent", lastAttemptAt: now }, now), "claim");
  assert.equal(manualClaimDecision({ status: "failed", lastAttemptAt: now }, now), "claim");
  assert.equal(manualClaimDecision({ status: "sending", lastAttemptAt: now }, now), "skip");
});

test("server, cron, and both assignee screens are wired without a second sender", () => {
  const service = read("lib/venueSeatingBriefing/service.ts");
  const adminRoute = read("app/api/admin/users/[id]/venue-seating-briefing/route.ts");
  const cron = read("app/api/cron/venue-seating-briefing/route.ts");
  const vercel = read("vercel.json");
  const adminPage = read("app/admin/users/page.tsx");
  const adminPanel = read("app/admin/users/VenueSeatingBriefingPanel.tsx");
  const employee = read("app/components/staff/EmployeeDashboardPage.tsx");
  const producer = read("app/components/producer/ProducerDashboard.jsx");
  const assignees = read("app/api/admin/users/[id]/assignees/route.ts");

  assert.match(service, /briefingAccess/);
  assert.match(service, /שירות הושבה באולם אינו פעיל/);
  assert.match(service, /staffType: "seating_staff"/);
  assert.match(service, /role: "producer"/);
  assert.match(service, /sendSmsDetailed/);
  assert.match(service, /recordVenueSeatingBriefingAdminNotice/);
  assert.equal(service.includes("sendWhatsapp"), false);
  assert.equal(service.includes("eventDayBalance"), false);
  assert.match(adminRoute, /kind: "manual"/);
  assert.match(cron, /processAutomaticBriefings/);
  assert.match(vercel, /\/api\/cron\/venue-seating-briefing/);
  assert.match(adminPage, /VenueSeatingBriefingPanel/);
  assert.match(adminPanel, /שליחת פרטי אירוע לעובדים/);
  assert.match(adminPanel, /אישור ושליחה/);
  assert.match(employee, /EventDayBriefingPanel/);
  assert.match(producer, /EventDayBriefingPanel/);
  assert.equal(assignees.includes("venueSeatingBriefing"), false);
});

test("admin notices follow a real briefing send without phone numbers or amounts", () => {
  const sent = planVenueSeatingBriefingAdminNotice({
    eventId: "e1",
    eventTitle: "חתונת דנה",
    customerId: "a".repeat(24),
    recipientId: "staff-1",
    recipientRole: "seating_staff",
    kind: "automatic",
    ok: true,
    attemptAt: "2026-10-12T06:00:00.000Z",
  });
  assert.equal(sent?.category, "admin_info");
  assert.match(sent?.body || "", /עובד הושבה/);
  const failed = planVenueSeatingBriefingAdminNotice({
    eventId: "e1",
    eventTitle: "חתונת דנה",
    customerId: "a".repeat(24),
    recipientId: "prod-1",
    recipientRole: "producer",
    kind: "manual",
    ok: false,
    attemptAt: "2026-10-12T06:05:00.000Z",
  });
  assert.equal(failed?.category, "admin_important");
  const text = `${sent?.title} ${sent?.body} ${failed?.title} ${failed?.body}`;
  assert.doesNotMatch(text, /05\d{8}/);
  assert.doesNotMatch(text, /₪/);
  assert.equal(
    planVenueSeatingBriefingAdminNotice({
      eventId: "",
      eventTitle: "חתונת דנה",
      recipientId: "staff-1",
      kind: "automatic",
      ok: true,
      attemptAt: "2026-10-12T06:00:00.000Z",
    }),
    null
  );
});
