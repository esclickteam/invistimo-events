import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import {
  countPhonesNeedingReview,
  customerNotificationQuery,
  detectPushSupport,
  placeNotificationPanel,
  planCallRoundNotifications,
  planEventDigestNotifications,
  planMessageRoundNotifications,
  shouldDeliverPush,
} from "../../lib/customerNotifications/planners";
import {
  formatHumanCallDuration,
  planHumanCallRoundNotification,
} from "../../lib/customerNotifications/humanCallRound";
import {
  createCustomerNotification,
  listActiveAdminNotifications,
  listActiveCustomerNotifications,
  markCustomerNotificationRead,
} from "../../lib/customerNotifications/service";

const root = path.resolve(process.cwd());

function read(rel: string) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

test("notification panel stays inside the viewport on phone and desktop", () => {
  const phone = placeNotificationPanel({
    anchorTop: 70,
    anchorBottom: 114,
    anchorLeft: 12,
    anchorRight: 56,
    viewportWidth: 360,
    viewportHeight: 740,
  });
  assert.ok(phone.left >= 8);
  assert.ok(phone.left + phone.width <= 360 - 8);
  assert.equal(phone.top, 122);
  assert.ok(phone.maxHeight > 160);

  const desktop = placeNotificationPanel({
    anchorTop: 20,
    anchorBottom: 64,
    anchorLeft: 900,
    anchorRight: 944,
    viewportWidth: 1280,
    viewportHeight: 800,
  });
  assert.equal(desktop.width, 380);
  assert.equal(desktop.left, 944 - 380);
  assert.ok(desktop.left + desktop.width <= 1280 - 8);

  const above = placeNotificationPanel({
    anchorTop: 620,
    anchorBottom: 664,
    anchorLeft: 20,
    anchorRight: 64,
    viewportWidth: 390,
    viewportHeight: 700,
  });
  assert.ok(above.bottom);
  assert.equal(above.top, undefined);
  assert.ok((above.bottom || 0) >= 8);
});

test("message rounds collapse to one notice and never fan out per guest", () => {
  const partial = planMessageRoundNotifications({
    scheduleId: "sched-1",
    invitationId: "inv-1",
    channel: "sms",
    messageType: "rsvp",
    round: 2,
    audienceCount: 80,
    sentCount: 70,
    outcome: "sent",
    phonesNeedingReview: 4,
    salt: "sched-1",
  });
  assert.equal(partial.length, 2);
  assert.equal(partial[0].title, "הודעות שלא נשלחו");
  assert.equal(partial[1].title, "מספרי טלפון המחייבים בדיקה");
  assert.equal(partial[0].dedupeKey, partial[0].dedupeKey);
  assert.doesNotMatch(partial[0].body, /05\d{8}/);

  const done = planMessageRoundNotifications({
    invitationId: "inv-1",
    channel: "whatsapp",
    messageType: "rsvp",
    round: 1,
    audienceCount: 12,
    sentCount: 12,
    outcome: "sent",
    phonesNeedingReview: 0,
    salt: "exec-1",
  });
  assert.equal(done.length, 1);
  assert.equal(done[0].title, "סבב הודעות הסתיים");
  assert.equal(done[0].notifyAdmins, undefined);

  const again = planMessageRoundNotifications({
    scheduleId: "sched-1",
    invitationId: "inv-1",
    channel: "sms",
    messageType: "rsvp",
    round: 2,
    audienceCount: 80,
    sentCount: 70,
    outcome: "sent",
    phonesNeedingReview: 4,
    salt: "sched-1",
  });
  assert.equal(again[0].dedupeKey, partial[0].dedupeKey);
});

test("human call rounds notify once from original call times when the round is complete", () => {
  const start = new Date("2026-10-12T06:12:00.000Z");
  const end = new Date("2026-10-12T12:48:00.000Z");
  assert.equal(formatHumanCallDuration(end.getTime() - start.getTime()), "6 שעות ו־36 דקות");

  const open = planHumanCallRoundNotification({
    invitationId: "inv-1",
    round: 1,
    eventName: "החתונה של הדר ובן",
    completed: true,
    openTaskCount: 2,
    calls: [
      {
        taskId: "task-1",
        invitationId: "inv-1",
        round: 1,
        status: "confirmed",
        completedAt: new Date("2026-10-12T18:00:00.000Z"),
      },
    ],
  });
  assert.equal(open, null);

  const notice = planHumanCallRoundNotification({
    invitationId: "inv-1",
    round: 1,
    eventName: "החתונה של הדר ובן",
    completed: true,
    openTaskCount: 0,
    now: new Date("2026-10-12T16:00:00.000Z"),
    calls: [
      {
        taskId: "task-1",
        invitationId: "inv-1",
        round: 1,
        status: "confirmed",
        startedAt: new Date("2026-10-12T07:00:00.000Z"),
        completedAt: new Date("2026-10-12T16:30:00.000Z"),
      },
      {
        taskId: "task-2",
        invitationId: "inv-1",
        round: 1,
        status: "no_answer",
        completedAt: new Date("2026-10-12T16:40:00.000Z"),
      },
      {
        taskId: "other-event",
        invitationId: "inv-2",
        round: 1,
        status: "confirmed",
        startedAt: new Date("2026-10-12T04:00:00.000Z"),
        completedAt: new Date("2026-10-12T14:00:00.000Z"),
      },
      {
        taskId: "other-round",
        invitationId: "inv-1",
        round: 2,
        status: "confirmed",
        startedAt: new Date("2026-10-12T05:00:00.000Z"),
        completedAt: new Date("2026-10-12T15:00:00.000Z"),
      },
    ],
    recordings: [
      {
        taskId: "task-1",
        startedAt: start,
        endedAt: new Date("2026-10-12T06:20:00.000Z"),
      },
      {
        taskId: "task-2",
        startedAt: new Date("2026-10-12T12:40:00.000Z"),
        endedAt: end,
      },
    ],
  });
  assert.ok(notice);
  assert.equal(notice?.title, "סבב שיחות אנושיות 1 הסתיים – החתונה של הדר ובן.");
  assert.match(notice?.body || "", /תחילת שיחות: 09:12/);
  assert.match(notice?.body || "", /סיום שיחות: 15:48/);
  assert.match(notice?.body || "", /משך כולל: 6 שעות ו־36 דקות/);
  assert.match(notice?.body || "", /סה״כ שיחות שתועדו: 2\./);
  assert.equal(notice?.dedupeKey, "human-call-round:inv-1:1");
  assert.equal(notice?.category, "rsvp_rounds");
  assert.equal(notice?.adminActionHref, "/admin/shift-management");
  assert.equal(notice?.notifyAdmins, true);

  const again = planHumanCallRoundNotification({
    invitationId: "inv-1",
    round: 1,
    eventName: "החתונה של הדר ובן",
    completed: true,
    openTaskCount: 0,
    calls: [
      {
        taskId: "task-1",
        invitationId: "inv-1",
        round: 1,
        status: "confirmed",
        completedAt: end,
      },
    ],
  });
  assert.equal(again?.dedupeKey, notice?.dedupeKey);
});

test("call rounds notify once per run and skip in-progress", () => {
  assert.deepEqual(
    planCallRoundNotifications({
      invitationId: "inv",
      round: 1,
      runId: "run-a",
      status: "in_progress",
      dialed: 3,
    }),
    []
  );
  const failed = planCallRoundNotifications({
    invitationId: "inv",
    round: 2,
    runId: "run-b",
    status: "failed",
    dialed: 0,
  });
  assert.equal(failed.length, 1);
  assert.equal(failed[0].notifyAdmins, true);
  assert.equal(failed[0].severity, "urgent");
});

test("event digest ignores past events and keeps one reminder per window", () => {
  const start = new Date("2026-10-20T16:00:00.000Z");
  const past = planEventDigestNotifications({
    now: new Date("2026-10-21T16:00:00.000Z"),
    eventId: "event-1",
    title: "החתונה",
    start,
    dateKey: "2026-10-20",
    cancelled: false,
    missingLocation: true,
    missingTime: true,
    actionHref: "/dashboard",
  });
  assert.deepEqual(past, []);

  const upcoming = planEventDigestNotifications({
    now: new Date("2026-10-19T18:00:00.000Z"),
    eventId: "event-1",
    title: "החתונה",
    start,
    dateKey: "2026-10-20",
    cancelled: false,
    missingLocation: true,
    missingTime: false,
    actionHref: "https://evil.example",
  });
  assert.ok(upcoming.some((item) => item.type === "event.reminder.h24"));
  assert.ok(upcoming.some((item) => item.type === "event.missing.location"));
  assert.equal(
    upcoming.find((item) => item.audience === "customer")?.actionHref,
    "/dashboard"
  );
  const keys = new Set(upcoming.map((item) => item.dedupeKey));
  assert.equal(keys.size, upcoming.length);
});

test("push stays off without permission, support, or a selected category", () => {
  const ios = detectPushSupport({
    hasNotification: true,
    hasServiceWorker: true,
    hasPushManager: true,
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
    standalone: false,
    permission: "default",
  });
  assert.equal(ios.supported, false);
  assert.equal(ios.reason, "ios-home-screen");

  const denied = detectPushSupport({
    hasNotification: true,
    hasServiceWorker: true,
    hasPushManager: true,
    userAgent: "Mozilla/5.0 (Linux; Android 14)",
    standalone: false,
    permission: "denied",
  });
  assert.equal(denied.supported, true);
  assert.equal(denied.permission, "denied");

  assert.equal(
    shouldDeliverPush({
      category: "message_failures",
      preferences: {
        rsvp: true,
        failures: false,
        eventManagement: true,
        reminders: true,
      },
      configured: true,
      subscriptionCount: 2,
    }),
    false
  );
  assert.equal(
    shouldDeliverPush({
      category: "venue_seating_contacts",
      preferences: {
        rsvp: false,
        failures: false,
        eventManagement: false,
        reminders: true,
      },
      configured: true,
      subscriptionCount: 1,
    }),
    true
  );
});

test("customer queries cannot include admin notifications", () => {
  const query = customerNotificationQuery("user-a");
  assert.equal(query.userId, "user-a");
  assert.deepEqual(query.audience, { $ne: "admin" });
  assert.equal(countPhonesNeedingReview([{ phone: "0501234567" }]), 0);
  assert.equal(countPhonesNeedingReview([{ phone: "050123456" }]), 1);
});

test("push worker does not intercept traffic and permission is opt-in", () => {
  const sw = read("public/push-sw.js");
  assert.match(sw, /addEventListener\("push"/);
  assert.match(sw, /addEventListener\("notificationclick"/);
  assert.doesNotMatch(sw, /addEventListener\("fetch"/);
  const layout = read("app/layout.tsx");
  assert.doesNotMatch(layout, /serviceWorker\.register/);
  const settings = read("components/notifications/NotificationPreferencesPanel.tsx");
  assert.match(settings, /Notification\.requestPermission/);
  assert.match(settings, /push-sw\.js/);
  assert.match(settings, /Service Worker אחר/);
  const bell = read("app/dashboard/components/CustomerNotificationBell.tsx");
  assert.match(bell, /createPortal/);
  assert.match(bell, /סמן הכול כנקרא/);
  assert.match(bell, /סגירת התראות/);
  assert.match(bell, /dir="rtl"/);
  const header = read("app/dashboard/DashboardHeader.tsx");
  assert.match(header, /CustomerNotificationBell/);
  assert.ok(header.indexOf("תמיכה") < header.indexOf("<CustomerNotificationBell"));
  assert.ok(header.indexOf("<CustomerNotificationBell") < header.lastIndexOf("התנתקות"));
  assert.match(bell, /bg-\[#D32F2F\]/);
  assert.match(bell, /#F4B400/);
  assert.match(bell, /M10\.268 21a2 2 0 0 0 3\.464 0/);
  assert.match(bell, /99\+/);
  assert.doesNotMatch(bell, /border-\[#D7BE88\]/);
  assert.match(read("workers/sendScheduledSms.ts"), /notifyRoundQuietly/);
  assert.match(read("lib/calls/ivrDialer.ts"), /recordCallRoundOutcome/);
  assert.match(read("lib/venueSeatingContacts/service.ts"), /createCustomerNotification/);
  assert.doesNotMatch(read("lib/venueSeatingContacts/service.ts"), /web-push/);
});

test("notifications stay isolated by user and are not duplicated", async (t) => {
  let mongod: MongoMemoryServer | null = null;
  try {
    mongod = await MongoMemoryServer.create();
  } catch (err: any) {
    t.skip(`mongodb-memory-server unavailable: ${err?.message || err}`);
    return;
  }

  process.env.VAPID_PUBLIC_KEY = "";
  process.env.VAPID_PRIVATE_KEY = "";
  await mongoose.connect(mongod.getUri());

  try {
  const userA = new mongoose.Types.ObjectId().toString();
  const userB = new mongoose.Types.ObjectId().toString();
  const admin = new mongoose.Types.ObjectId().toString();

  const first = await createCustomerNotification({
    userId: userA,
    type: "rsvp.round.done",
    category: "rsvp_rounds",
    severity: "info",
    title: "סבב הודעות הסתיים",
    body: "נשלחו 3 הודעות.",
    actionHref: "/dashboard/messages/new",
    dedupeKey: "msg:sched:done",
  });
  const duplicate = await createCustomerNotification({
    userId: userA,
    type: "rsvp.round.done",
    category: "rsvp_rounds",
    severity: "info",
    title: "סבב הודעות הסתיים",
    body: "שוב",
    dedupeKey: "msg:sched:done",
  });
  await createCustomerNotification({
    userId: userB,
    type: "rsvp.round.done",
    category: "rsvp_rounds",
    severity: "info",
    title: "של לקוח אחר",
    body: "אסור שיופיע",
    dedupeKey: "msg:other:done",
  });
  await createCustomerNotification({
    userId: admin,
    audience: "admin",
    customerId: userA,
    type: "admin.failure",
    category: "admin_failures",
    severity: "urgent",
    title: "כשל אדמין",
    body: "רק לאדמין",
    actionHref: "/admin",
    dedupeKey: "admin:fail:1",
  });

  assert.equal(first.created, true);
  assert.equal(duplicate.created, false);
  const own = await listActiveCustomerNotifications(userA);
  const other = await listActiveCustomerNotifications(userB);
  const adminList = await listActiveAdminNotifications(admin);
  const customerCannotSeeAdmin = await listActiveCustomerNotifications(admin);
  assert.equal(own.length, 1);
  assert.equal(own[0].title, "סבב הודעות הסתיים");
  assert.equal(other.length, 1);
  assert.equal(other[0].title, "של לקוח אחר");
  assert.equal(adminList.length, 1);
  assert.equal(customerCannotSeeAdmin.length, 0);

  const stolen = await markCustomerNotificationRead({
    userId: userB,
    notificationId: own[0].id,
    audience: "customer",
  });
  assert.equal(stolen.updated, 0);
  const marked = await markCustomerNotificationRead({
    userId: userA,
    notificationId: own[0].id,
    audience: "customer",
  });
  assert.equal(marked.updated, 1);
  const after = await listActiveCustomerNotifications(userA);
  assert.equal(after[0].read, true);
  } finally {
    await mongoose.disconnect();
    await mongod.stop();
  }
});
