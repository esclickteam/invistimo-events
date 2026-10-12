import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { shouldDeliverPush, DEFAULT_PUSH_PREFERENCES } from "../../lib/customerNotifications/planners";
import {
  ADMIN_START_GRACE_MS,
  classifyEventDetailChanges,
  currentDeviceTestEndpoint,
  dedupeDecision,
  describeTestPushResult,
  filterAdminNotifications,
  isActiveScheduledShift,
  isLateUnstarted,
  planBalanceDue,
  planCallNotStarted,
  planCriticalMissing,
  planEventSummary,
  planMessageNotStarted,
  planSeatingIncomplete,
  planSeatingTeamMissing,
  planShiftNotStarted,
  planVenueSeatingBriefingNotice,
  seatingTeamGap,
} from "../../lib/customerNotifications/adminCenter";
import {
  createCustomerNotification,
  listActiveCustomerNotifications,
  resolveAdminIncident,
} from "../../lib/customerNotifications/service";
import CustomerNotification from "../../models/CustomerNotification";

const root = path.resolve(process.cwd());
const now = new Date("2026-10-12T12:00:00.000Z");

test("late notices wait for the existing worker grace and ignore old rounds", () => {
  const scheduled = new Date(now.getTime() - ADMIN_START_GRACE_MS + 60_000);
  assert.equal(isLateUnstarted({ scheduledAt: scheduled, now }), false);
  const late = new Date(now.getTime() - ADMIN_START_GRACE_MS - 60_000);
  assert.equal(isLateUnstarted({ scheduledAt: late, now }), true);
  const ancient = new Date(now.getTime() - 40 * 60 * 60 * 1000);
  assert.equal(isLateUnstarted({ scheduledAt: ancient, now }), false);

  assert.equal(
    planMessageNotStarted({
      scheduleId: "job-1",
      channel: "whatsapp",
      round: 2,
      eventTitle: "חתונת דנה",
      status: "scheduled",
      scheduledAt: scheduled,
      now,
    }),
    null
  );
  const notice = planMessageNotStarted({
    scheduleId: "job-1",
    channel: "sms",
    round: 1,
    eventTitle: "חתונת דנה",
    status: "scheduled",
    scheduledAt: late,
    now,
    customerId: "a".repeat(24),
  });
  assert.equal(notice?.severity, "urgent");
  assert.equal(notice?.category, "admin_urgent");
  assert.equal(notice?.reopen, true);
  assert.match(notice?.title || "", /חתונת דנה/);
  assert.doesNotMatch(`${notice?.title} ${notice?.body}`, /05\d{8}/);
  for (const status of ["sent", "sending", "failed", "cancelled"]) {
    assert.equal(
      planMessageNotStarted({
        scheduleId: "job-1",
        channel: "sms",
        round: 1,
        eventTitle: "חתונת דנה",
        status,
        scheduledAt: late,
        now,
      }),
      null
    );
  }
  assert.equal(
    planMessageNotStarted({
      scheduleId: "job-1",
      channel: "sms",
      round: 1,
      eventTitle: "חתונת דנה",
      status: "scheduled",
      scheduledAt: new Date(now.getTime() + 60 * 60 * 1000),
      now,
    }),
    null
  );
});

test("call and shift lateness stay separate from shift-start duration", () => {
  const late = new Date(now.getTime() - 20 * 60 * 1000);
  const human = planCallNotStarted({
    userId: "u1",
    round: 2,
    scheduledAt: late,
    status: "scheduled",
    ivr: false,
    eventTitle: "אירוע א",
    now,
  });
  const ivr = planCallNotStarted({
    userId: "u1",
    round: 2,
    scheduledAt: late,
    status: "scheduled",
    ivr: true,
    eventTitle: "אירוע א",
    now,
  });
  assert.match(human?.title || "", /שיחות אנושיות/);
  assert.match(ivr?.title || "", /IVR/);
  for (const status of ["cancelled", "done", "failed", "draft", "opened", "in_progress"]) {
    assert.equal(
      planCallNotStarted({
        userId: "u1",
        round: 2,
        scheduledAt: late,
        status,
        ivr: false,
        eventTitle: "אירוע א",
        now,
      }),
      null
    );
  }
  assert.equal(
    planCallNotStarted({
      userId: "u1",
      round: 2,
      scheduledAt: new Date(now.getTime() + 2 * 60 * 60 * 1000),
      status: "scheduled",
      ivr: false,
      eventTitle: "אירוע א",
      now,
    }),
    null
  );
  assert.equal(
    planShiftNotStarted({
      employeeId: "e1",
      employeeName: "נועה",
      dateKey: "2026-10-12",
      todayKey: "2026-10-12",
      shiftStart: late,
      hasStartedSession: true,
      now,
    }),
    null
  );
  assert.equal(
    planShiftNotStarted({
      employeeId: "e1",
      employeeName: "נועה",
      dateKey: "2026-10-11",
      todayKey: "2026-10-12",
      shiftStart: late,
      hasStartedSession: false,
      now,
    }),
    null
  );
  for (const status of ["cancelled", "postponed", "completed", "done"]) {
    assert.equal(isActiveScheduledShift({ status }), false);
    assert.equal(
      planShiftNotStarted({
        employeeId: "e1",
        employeeName: "נועה",
        dateKey: "2026-10-12",
        todayKey: "2026-10-12",
        shiftStart: late,
        hasStartedSession: false,
        status,
        now,
      }),
      null
    );
  }
  assert.equal(isActiveScheduledShift({ cancelled: true }), false);
  assert.equal(isActiveScheduledShift({ postponed: true }), false);
  assert.equal(isActiveScheduledShift({ completed: true }), false);
  assert.equal(isActiveScheduledShift({}), true);
  const activeShift = planShiftNotStarted({
    employeeId: "e1",
    employeeName: "נועה",
    dateKey: "2026-10-12",
    todayKey: "2026-10-12",
    shiftStart: late,
    hasStartedSession: false,
    status: "scheduled",
    now,
  });
  assert.equal(activeShift?.type, "admin.shift.notStarted");
});

test("pre-event notices apply only to upcoming events and hide payment amounts", () => {
  const soon = new Date(now.getTime() + 20 * 60 * 60 * 1000);
  const later = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const past = new Date(now.getTime() - 60 * 60 * 1000);
  assert.ok(planCriticalMissing({
    eventId: "e1",
    title: "חתונה",
    start: soon,
    now,
    cancelled: false,
    missingLocation: true,
    missingTime: false,
  }));
  assert.equal(
    planCriticalMissing({
      eventId: "e1",
      title: "חתונה",
      start: later,
      now,
      cancelled: false,
      missingLocation: true,
      missingTime: true,
    }),
    null
  );
  assert.equal(
    planCriticalMissing({
      eventId: "e1",
      title: "חתונה",
      start: past,
      now,
      cancelled: false,
      missingLocation: true,
      missingTime: true,
    }),
    null
  );
  const balance = planBalanceDue({
    userId: "a".repeat(24),
    eventId: "e1",
    title: "חתונה",
    hoursUntil: 48,
    remainingAmount: 1800,
    paymentMode: "deposit",
    cancelled: false,
  });
  assert.equal(balance?.category, "admin_important");
  assert.doesNotMatch(`${balance?.title} ${balance?.body}`, /1800|₪/);
  assert.equal(
    planEventSummary({
      eventId: "e1",
      title: "חתונה",
      start: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      now,
      cancelled: false,
      hasClock: true,
    })?.type,
    "admin.event.summary"
  );
  assert.equal(
    planEventSummary({
      eventId: "e1",
      title: "חתונה",
      start: new Date(now.getTime() - 30 * 60 * 60 * 1000),
      now,
      cancelled: false,
      hasClock: true,
    }),
    null
  );
});

test("seating team and completion use the required count without inventing a second workflow", () => {
  assert.deepEqual(
    seatingTeamGap({
      requiredStaff: 2,
      assignedStaffIds: ["a"],
      hallShiftEmployeeIds: ["a", "b"],
    }).short,
    false
  );
  const missing = planSeatingTeamMissing({
    eventId: "e1",
    title: "אולם",
    start: new Date(now.getTime() + 10 * 60 * 60 * 1000),
    now,
    cancelled: false,
    venueSeating: true,
    requiredStaff: 2,
    assignedStaffIds: [],
    hallShiftEmployeeIds: ["a"],
  });
  assert.equal(missing?.severity, "urgent");
  assert.equal(
    planSeatingIncomplete({
      eventId: "e1",
      title: "אולם",
      hoursUntil: 10,
      venueSeating: true,
      seatingEnabled: true,
      totalTables: 4,
      seatedGuests: 2,
      confirmedGuests: 5,
    })?.category,
    "admin_important"
  );
  assert.equal(
    planSeatingIncomplete({
      eventId: "e1",
      title: "אולם",
      hoursUntil: 10,
      venueSeating: false,
      seatingEnabled: false,
      totalTables: 0,
      seatedGuests: 0,
      confirmedGuests: 5,
    }),
    null
  );
});

test("detail changes, filters, and push defaults keep read separate from handled", () => {
  assert.deepEqual(
    classifyEventDetailChanges(
      { title: "ישן", time: "", location: { address: "" } },
      { title: "חדש", time: "19:30", location: { address: "הרצל 1" } }
    ),
    { significant: ["שם האירוע"], completed: ["שעה", "מיקום"] }
  );
  const items = [
    {
      type: "admin.critical.missing",
      eventId: "e1",
      eventTitle: "חתונה",
      severity: "urgent" as const,
      status: "active" as const,
      read: true,
    },
    {
      type: "admin.task.done",
      eventId: "e2",
      eventTitle: "ברית",
      severity: "info" as const,
      status: "resolved" as const,
      read: false,
    },
  ];
  assert.equal(filterAdminNotifications(items, { status: "open" }).length, 1);
  assert.equal(filterAdminNotifications(items, { status: "resolved" })[0].type, "admin.task.done");
  assert.equal(filterAdminNotifications(items, { severity: "urgent", eventId: "e1" }).length, 1);
  assert.equal(dedupeDecision(null, true), "create");
  assert.equal(dedupeDecision("active", true), "skip");
  assert.equal(dedupeDecision("resolved", true), "reopen");
  assert.equal(dedupeDecision("resolved", false), "skip");
  assert.equal(DEFAULT_PUSH_PREFERENCES.adminUrgent, true);
  assert.equal(DEFAULT_PUSH_PREFERENCES.adminInfo, false);
  assert.equal(
    shouldDeliverPush({
      category: "admin_info",
      preferences: DEFAULT_PUSH_PREFERENCES,
      configured: true,
      subscriptionCount: 1,
    }),
    false
  );
  assert.equal(
    shouldDeliverPush({
      category: "admin_urgent",
      preferences: DEFAULT_PUSH_PREFERENCES,
      configured: true,
      subscriptionCount: 1,
    }),
    true
  );
  const unverified = describeTestPushResult({ configured: true, attempted: 1, sent: 1, currentDevice: true });
  assert.equal(unverified.displayed, false);
  assert.match(unverified.message, /לא אומתה/);
  assert.equal(
    describeTestPushResult({ configured: true, attempted: 0, sent: 0, currentDevice: true }).acceptedByPushService,
    false
  );
  const missingDevice = describeTestPushResult({
    configured: true,
    attempted: 0,
    sent: 0,
    currentDevice: false,
  });
  assert.equal(missingDevice.acceptedByPushService, false);
  assert.match(missingDevice.message, /המכשיר הנוכחי/);
  assert.equal(currentDeviceTestEndpoint({ endpoint: "", knownEndpoints: ["a", "b"] }), "");
  assert.equal(currentDeviceTestEndpoint({ endpoint: "b", knownEndpoints: ["a", "b"] }), "b");
  assert.equal(currentDeviceTestEndpoint({ endpoint: "other", knownEndpoints: ["a", "b"] }), "");
  const push = fs.readFileSync(path.join(root, "lib/push/webPush.ts"), "utf8");
  const testPush = push.slice(push.indexOf("export async function deliverWebPushTest"));
  assert.match(testPush, /if \(!target\)/);
  assert.match(testPush, /endpoint: target/);
  assert.equal(testPush.includes("find({"), false);
  const testRoute = fs.readFileSync(
    path.join(root, "app/api/admin/notifications/test/route.ts"),
    "utf8"
  );
  assert.match(testRoute, /deliverWebPushTest\(auth\.userId, endpoint\)/);
  const panel = fs.readFileSync(
    path.join(root, "components/notifications/NotificationPreferencesPanel.tsx"),
    "utf8"
  );
  assert.match(panel, /endpoint: currentEndpoint/);
});

test("venue seating briefing notices report success or failure without sensitive details", () => {
  const sent = planVenueSeatingBriefingNotice({
    eventId: "e1",
    eventTitle: "חתונת דנה",
    customerId: "a".repeat(24),
    recipientId: "staff-1",
    recipientRole: "seating_staff",
    kind: "automatic",
    ok: true,
    attemptAt: "2026-10-12T06:00:00.000Z",
  });
  assert.equal(sent?.type, "admin.eventDetails.sent");
  assert.equal(sent?.category, "admin_info");
  assert.equal(sent?.severity, "info");
  assert.match(sent?.title || "", /חתונת דנה/);
  const failed = planVenueSeatingBriefingNotice({
    eventId: "e1",
    eventTitle: "חתונת דנה",
    customerId: "a".repeat(24),
    recipientId: "staff-1",
    recipientRole: "producer",
    kind: "manual",
    ok: false,
    attemptAt: "2026-10-12T06:05:00.000Z",
  });
  assert.equal(failed?.category, "admin_important");
  assert.match(failed?.body || "", /מפיק/);
  const text = `${sent?.title} ${sent?.body} ${failed?.title} ${failed?.body}`;
  assert.doesNotMatch(text, /05\d{8}/);
  assert.doesNotMatch(text, /₪|\d+\s*ש"ח/);
  assert.equal(
    planVenueSeatingBriefingNotice({
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

test("admin notices are not written for customers and a resolved fault can reopen", async (t) => {
  const live = fs.readFileSync(
    path.join(root, "lib/customerNotifications/adminCenterLive.ts"),
    "utf8"
  );
  assert.match(live, /role: "admin"/);
  assert.match(live, /audience: "admin"/);
  assert.doesNotMatch(live, /audience: "customer"/);

  let mongod: MongoMemoryServer | null = null;
  try {
    mongod = await MongoMemoryServer.create();
  } catch (err: unknown) {
    t.skip(`mongodb-memory-server unavailable: ${err instanceof Error ? err.message : err}`);
    return;
  }
  process.env.VAPID_PUBLIC_KEY = "";
  process.env.VAPID_PRIVATE_KEY = "";
  await mongoose.connect(mongod.getUri());
  try {
    const adminId = new mongoose.Types.ObjectId().toString();
    const customerId = new mongoose.Types.ObjectId().toString();
    const first = await createCustomerNotification({
      userId: adminId,
      audience: "admin",
      customerId,
      type: "admin.critical.missing",
      category: "admin_urgent",
      severity: "urgent",
      title: "חסר",
      body: "מיקום",
      dedupeKey: "critical-missing:e1:admin:" + adminId,
      meta: { incidentKey: "critical-missing:e1" },
    });
    assert.equal(first.created, true);
    await CustomerNotification.updateOne(
      { _id: first.id },
      { $set: { readAt: new Date() } }
    );
    const resolved = await resolveAdminIncident("critical-missing:e1", "details-completed");
    assert.equal(resolved.updated, 1);
    const stored = await CustomerNotification.findById(first.id).lean();
    assert.equal(stored?.status, "resolved");
    assert.ok(stored?.readAt);
    assert.equal(stored?.resolveReason, "details-completed");

    const reopened = await createCustomerNotification({
      userId: adminId,
      audience: "admin",
      type: "admin.critical.missing",
      category: "admin_urgent",
      severity: "urgent",
      title: "חסר שוב",
      body: "מיקום",
      dedupeKey: "critical-missing:e1:admin:" + adminId,
      reopenResolved: true,
      meta: { incidentKey: "critical-missing:e1" },
    });
    assert.equal(reopened.created, true);
    const customerView = await listActiveCustomerNotifications(customerId);
    assert.equal(customerView.length, 0);
    const active = await CustomerNotification.find({
      dedupeKey: "critical-missing:e1:admin:" + adminId,
      status: "active",
    });
    assert.equal(active.length, 1);
  } finally {
    await mongoose.disconnect();
    await mongod.stop();
  }
});
