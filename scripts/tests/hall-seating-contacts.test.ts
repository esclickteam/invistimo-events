import test, { before } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "path";
import { ensureVenueSeatingHolidayCalendar } from "../../lib/venueSeatingContacts/smsSchedule";
import {
  VENUE_SEATING_RESPONSIBILITY_TEXT,
  VENUE_SEATING_RESPONSIBILITY_VERSION,
  buildVenueSeatingUrgentSms,
  classifyEventAccess,
  completionStatus,
  hasActiveVenueSeatingUpsell,
  isLateCompletion,
  planVenueSeatingReminders,
  resolveEventStart,
  shouldShowNotificationBell,
  showMissingContactsAlert,
  validateVenueSeatingContacts,
} from "../../lib/venueSeatingContacts/logic";

const root = path.resolve(process.cwd());

before(async () => {
  await ensureVenueSeatingHolidayCalendar();
});

function read(rel: string) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

const upsellUser = {
  salesUpsells: { venueSeating: { enabled: true } },
};

const digitalOnlyUser = {
  includeDigitalSeating: true,
  packageName: "הושבה באולם",
  venueSeatingTemplateId: "map-1",
  salesUpsells: {
    digitalSeating: { enabled: true },
    venueSeating: { enabled: false },
  },
  venueSeatingService: { enabled: false },
};

function at(iso: string) {
  return new Date(iso);
}

test("hall seating upsell is the venueSeating flag, not a map or digital seating", () => {
  assert.equal(hasActiveVenueSeatingUpsell(upsellUser), true);
  assert.equal(
    hasActiveVenueSeatingUpsell({ venueSeatingService: { enabled: true } }),
    true
  );
  assert.equal(hasActiveVenueSeatingUpsell(digitalOnlyUser), false);
  assert.equal(
    hasActiveVenueSeatingUpsell({
      packageName: "הושבה באולם",
      venueSeatingTemplateId: "template",
    }),
    false
  );
  assert.equal(hasActiveVenueSeatingUpsell(null), false);
});

test("future event with the upsell is eligible, and the other three cases are not", () => {
  const now = at("2026-10-11T09:00:00.000Z");
  const future = { date: "2026-12-01", time: "19:00", status: "active" };
  const past = { date: "2024-01-01", time: "19:00", status: "active" };

  const futureWith = classifyEventAccess({ user: upsellUser, event: future, now });
  assert.equal(futureWith.showTab, true);
  assert.equal(futureWith.allowEdit, true);
  assert.equal(futureWith.runAutomations, true);
  assert.equal(futureWith.contributesToBell, true);

  const futureWithout = classifyEventAccess({
    user: digitalOnlyUser,
    event: future,
    now,
  });
  assert.equal(futureWithout.showTab, false);
  assert.equal(futureWithout.runAutomations, false);
  assert.equal(futureWithout.contributesToBell, true);

  const pastWith = classifyEventAccess({ user: upsellUser, event: past, now });
  assert.equal(pastWith.showTab, false);
  assert.equal(pastWith.allowEdit, false);
  assert.equal(pastWith.runAutomations, false);
  assert.equal(pastWith.contributesToBell, false);

  const pastWithout = classifyEventAccess({
    user: digitalOnlyUser,
    event: past,
    now,
  });
  assert.equal(pastWithout.showTab, false);
  assert.equal(pastWithout.runAutomations, false);
  assert.equal(pastWithout.contributesToBell, false);
});

test("a customer with a past and a future event only qualifies the future event", () => {
  const now = at("2026-10-11T09:00:00.000Z");
  const events = [
    { date: "2024-05-01", time: "20:00", status: "active" },
    { date: "2026-11-02", time: "19:30", status: "active" },
  ];
  const access = events.map((event) =>
    classifyEventAccess({ user: upsellUser, event, now })
  );
  assert.deepEqual(
    access.map((item) => item.showTab),
    [false, true]
  );
  assert.equal(shouldShowNotificationBell(events, now), true);
  assert.equal(
    shouldShowNotificationBell([events[0]], now),
    false
  );
});

test("cancelled upsell or archived event stops new automations", () => {
  const now = at("2026-10-11T09:00:00.000Z");
  const event = { date: "2026-12-01", time: "19:00", status: "archived" };
  const access = classifyEventAccess({ user: upsellUser, event, now });
  assert.equal(access.showTab, false);
  assert.equal(access.runAutomations, false);

  const plan = planVenueSeatingReminders({
    now,
    eventStart: resolveEventStart({ date: "2026-12-01", time: "19:00" }),
    cancelled: true,
    upsellActive: true,
    contactsComplete: false,
    alreadySent: [],
    initialSentAt: null,
  });
  assert.equal(plan.automation, "stop");
  assert.deepEqual(plan.actions, []);
});

test("event day still allows edits after the start time, without new automations", () => {
  const now = at("2026-10-11T18:00:00.000Z");
  const event = { date: "2026-10-11", time: "16:00", status: "active" };
  const access = classifyEventAccess({ user: upsellUser, event, now });
  assert.equal(access.future, false);
  assert.equal(access.eventDayOrUpcoming, true);
  assert.equal(access.allowEdit, true);
  assert.equal(access.runAutomations, false);
});

test("contacts require a primary, one reserve approver, and the responsibility checkbox", () => {
  const missing = validateVenueSeatingContacts({
    primary: {
      fullName: "דנה כהן",
      phone: "0501234567",
      relation: "אחות",
      canApproveReserves: false,
    },
    secondary: null,
    responsibilityAccepted: true,
  });
  assert.equal(missing.ok, false);

  const unchecked = validateVenueSeatingContacts({
    primary: {
      fullName: "דנה כהן",
      phone: "0501234567",
      relation: "אחות",
      canApproveReserves: true,
    },
    responsibilityAccepted: false,
  });
  assert.equal(unchecked.ok, false);

  const saved = validateVenueSeatingContacts({
    primary: {
      fullName: "דנה כהן",
      phone: "050-123-4567",
      relation: "אחות",
      canApproveReserves: true,
    },
    secondary: {
      fullName: "",
      phone: "",
      relation: "",
      canApproveReserves: false,
    },
    responsibilityAccepted: true,
  });
  assert.equal(saved.ok, true);
  if (saved.ok) {
    assert.equal(saved.secondary, null);
    assert.equal(saved.responsibilityVersion, VENUE_SEATING_RESPONSIBILITY_VERSION);
    assert.equal(saved.responsibilityText, VENUE_SEATING_RESPONSIBILITY_TEXT);
    assert.match(saved.responsibilityText, /יתרת התשלום/);
  }
});

test("reminder plan sends only the stages that are still relevant", () => {
  const start = resolveEventStart({ date: "2026-10-20", time: "19:00" });
  assert.ok(start);

  const far = planVenueSeatingReminders({
    now: new Date(start.getTime() - 100 * 60 * 60 * 1000),
    eventStart: start,
    cancelled: false,
    upsellActive: true,
    contactsComplete: false,
    alreadySent: [],
    initialSentAt: null,
  });
  assert.deepEqual(far.actions, [{ stage: "initial", channels: ["in_app"] }]);

  const inside72 = planVenueSeatingReminders({
    now: new Date(start.getTime() - 30 * 60 * 60 * 1000),
    eventStart: start,
    cancelled: false,
    upsellActive: true,
    contactsComplete: false,
    alreadySent: [],
    initialSentAt: null,
  });
  assert.deepEqual(inside72.actions, [{ stage: "initial", channels: ["in_app"] }]);

  const due72Night = planVenueSeatingReminders({
    now: new Date(start.getTime() - 70 * 60 * 60 * 1000),
    eventStart: start,
    cancelled: false,
    upsellActive: true,
    contactsComplete: false,
    alreadySent: [{ stage: "initial", channel: "in_app" }],
    initialSentAt: new Date(start.getTime() - 100 * 60 * 60 * 1000),
  });
  assert.deepEqual(due72Night.actions, []);

  const due72 = planVenueSeatingReminders({
    now: new Date(start.getTime() - 50 * 60 * 60 * 1000),
    eventStart: start,
    cancelled: false,
    upsellActive: true,
    contactsComplete: false,
    alreadySent: [{ stage: "initial", channel: "in_app" }],
    initialSentAt: new Date(start.getTime() - 100 * 60 * 60 * 1000),
  });
  assert.deepEqual(due72.actions, [{ stage: "h72", channels: ["in_app"] }]);

  const urgent = planVenueSeatingReminders({
    now: new Date(start.getTime() - 10 * 60 * 60 * 1000),
    eventStart: start,
    eventDate: "2026-10-20",
    cancelled: false,
    upsellActive: true,
    contactsComplete: false,
    alreadySent: [],
    initialSentAt: null,
  });
  assert.deepEqual(urgent.actions, [{ stage: "initial", channels: ["in_app"] }]);
  assert.equal(
    urgent.actions.some((action) => action.channels.includes("sms")),
    false
  );

  const noDuplicateSms = planVenueSeatingReminders({
    now: new Date(start.getTime() - 8 * 60 * 60 * 1000),
    eventStart: start,
    cancelled: false,
    upsellActive: true,
    contactsComplete: false,
    alreadySent: [
      { stage: "initial", channel: "in_app" },
      { stage: "h24", channel: "in_app" },
      { stage: "h24", channel: "sms" },
    ],
    initialSentAt: new Date(start.getTime() - 10 * 60 * 60 * 1000),
  });
  assert.deepEqual(noDuplicateSms.actions, []);

  const completed = planVenueSeatingReminders({
    now: new Date(start.getTime() - 10 * 60 * 60 * 1000),
    eventStart: start,
    cancelled: false,
    upsellActive: true,
    contactsComplete: true,
    alreadySent: [],
    initialSentAt: null,
  });
  assert.equal(completed.resolveActive, true);
  assert.deepEqual(completed.actions, []);

  const passed = planVenueSeatingReminders({
    now: new Date(start.getTime() + 60 * 60 * 1000),
    eventStart: start,
    cancelled: false,
    upsellActive: true,
    contactsComplete: false,
    alreadySent: [],
    initialSentAt: null,
  });
  assert.equal(passed.automation, "stop");
  assert.deepEqual(passed.actions, []);
});

test("a new event date can schedule its own SMS without repeating the old one", () => {
  const start = resolveEventStart({ date: "2026-11-02", time: "19:00" });
  assert.ok(start);
  const plan = planVenueSeatingReminders({
    now: new Date("2026-11-01T08:00:00.000Z"),
    eventStart: start,
    eventDate: "2026-11-02",
    cancelled: false,
    upsellActive: true,
    contactsComplete: false,
    alreadySent: [],
    initialSentAt: null,
  });
  assert.deepEqual(plan.actions, [
    { stage: "initial", channels: ["in_app"] },
    { stage: "h24", channels: ["sms"] },
  ]);
});

test("completion is late only inside the last 24 hours, and the admin alert matches that window", () => {
  const start = resolveEventStart({ date: "2026-10-20", time: "19:00" });
  assert.ok(start);
  assert.equal(isLateCompletion(start, new Date(start.getTime() - 30 * 60 * 60 * 1000)), false);
  assert.equal(isLateCompletion(start, new Date(start.getTime() - 2 * 60 * 60 * 1000)), true);
  assert.equal(completionStatus({ completedAt: null }), "missing");
  assert.equal(
    completionStatus({ completedAt: new Date(), completedLate: false }),
    "complete"
  );
  assert.equal(
    completionStatus({ completedAt: new Date(), completedLate: true }),
    "complete_late"
  );
  assert.equal(
    showMissingContactsAlert({
      status: "missing",
      eventStart: start,
      now: new Date(start.getTime() - 10 * 60 * 60 * 1000),
    }),
    true
  );
  assert.equal(
    showMissingContactsAlert({
      status: "complete",
      eventStart: start,
      now: new Date(start.getTime() - 10 * 60 * 60 * 1000),
    }),
    false
  );
});

test("urgent SMS is customer-facing Hebrew and does not use WhatsApp", () => {
  const text = buildVenueSeatingUrgentSms("https://www.invistimo.com/go", {
    eventDate: "2026-10-14",
  });
  assert.match(text, /טרם הושלמו פרטי אנשי הקשר/);
  assert.match(text, /https:\/\/www\.invistimo\.com\/go/);
  assert.match(text, /צוות Invistimo/);
  assert.doesNotMatch(text, /אינויסטימו/);
  assert.doesNotMatch(text, /whatsapp/i);

  const service = read("lib/venueSeatingContacts/service.ts");
  assert.match(service, /sendSmsDetailed/);
  assert.match(service, /channel: "sms"/);
  assert.doesNotMatch(service, /whatsapp/i);
  assert.doesNotMatch(service, /Event\.update/);
  assert.doesNotMatch(service, /User\.update/);
  assert.doesNotMatch(service, /salesUpsells\.venueSeating\.enabled\s*=/);
});

test("customer surfaces are gated and past-event screens are not given a new requirement", () => {
  const sidebar = read("app/dashboard/components/DashboardSidebar.tsx");
  const header = read("app/dashboard/DashboardHeader.tsx");
  const page = read("app/dashboard/venue-seating/page.tsx");
  assert.match(sidebar, /label: "הושבה באולם"/);
  assert.match(sidebar, /hidden: gameOnly \|\| !canVenueSeatingContacts/);
  assert.doesNotMatch(header, /CustomerNotificationBell/);
  assert.match(page, /אנשי קשר ואישור רזרבות/);
  assert.match(page, /VENUE_SEATING_RESPONSIBILITY_TEXT/);
  assert.match(read("vercel.json"), /venue-seating-contact-reminders/);
  assert.doesNotMatch(
    read("app/dashboard/invitations/[id]/edit/page.tsx"),
    /אנשי קשר ואישור רזרבות/
  );
});
