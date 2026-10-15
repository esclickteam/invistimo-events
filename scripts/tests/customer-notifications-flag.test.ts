import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { customerNotificationsEnabled } from "../../lib/customerNotifications/featureFlag";
import {
  createCustomerNotification,
  listActiveAdminNotifications,
  listActiveCustomerNotifications,
} from "../../lib/customerNotifications/service";
import { notifyNativeUser } from "../../lib/push/sendNativePush";
import { processAllVenueSeatingReminders } from "../../lib/venueSeatingContacts/service";
import CustomerNotification from "../../models/CustomerNotification";

const root = path.resolve(process.cwd());

function read(rel: string) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function withoutCustomerNotificationEnv<T>(run: () => T) {
  const previousServer = process.env.CUSTOMER_NOTIFICATIONS_ENABLED;
  const previousWeb = process.env.NEXT_PUBLIC_CUSTOMER_NOTIFICATIONS_ENABLED;
  delete process.env.CUSTOMER_NOTIFICATIONS_ENABLED;
  delete process.env.NEXT_PUBLIC_CUSTOMER_NOTIFICATIONS_ENABLED;
  try {
    return run();
  } finally {
    if (previousServer === undefined) delete process.env.CUSTOMER_NOTIFICATIONS_ENABLED;
    else process.env.CUSTOMER_NOTIFICATIONS_ENABLED = previousServer;
    if (previousWeb === undefined) delete process.env.NEXT_PUBLIC_CUSTOMER_NOTIFICATIONS_ENABLED;
    else process.env.NEXT_PUBLIC_CUSTOMER_NOTIFICATIONS_ENABLED = previousWeb;
  }
}

test("customer notifications stay off until the flag is explicitly enabled", () => {
  withoutCustomerNotificationEnv(() => {
    assert.equal(customerNotificationsEnabled(), false);
  });

  const previous = process.env.CUSTOMER_NOTIFICATIONS_ENABLED;
  process.env.CUSTOMER_NOTIFICATIONS_ENABLED = "false";
  process.env.NEXT_PUBLIC_CUSTOMER_NOTIFICATIONS_ENABLED = "true";
  try {
    assert.equal(customerNotificationsEnabled(), false);
  } finally {
    if (previous === undefined) delete process.env.CUSTOMER_NOTIFICATIONS_ENABLED;
    else process.env.CUSTOMER_NOTIFICATIONS_ENABLED = previous;
    delete process.env.NEXT_PUBLIC_CUSTOMER_NOTIFICATIONS_ENABLED;
  }

  process.env.CUSTOMER_NOTIFICATIONS_ENABLED = "true";
  try {
    assert.equal(customerNotificationsEnabled(), true);
  } finally {
    delete process.env.CUSTOMER_NOTIFICATIONS_ENABLED;
  }
});

test("disabled customer notifications do not create rows, send push, or send reminder SMS", async () => {
  const previousServer = process.env.CUSTOMER_NOTIFICATIONS_ENABLED;
  const previousWeb = process.env.NEXT_PUBLIC_CUSTOMER_NOTIFICATIONS_ENABLED;
  delete process.env.CUSTOMER_NOTIFICATIONS_ENABLED;
  delete process.env.NEXT_PUBLIC_CUSTOMER_NOTIFICATIONS_ENABLED;
  try {
    const blocked = await createCustomerNotification({
      userId: new mongoose.Types.ObjectId().toString(),
      type: "rsvp.round.done",
      category: "rsvp_rounds",
      severity: "info",
      title: "לא אמור להיווצר",
      body: "לקוח",
      dedupeKey: "flag:customer:blocked",
    });
    assert.deepEqual(blocked, { created: false, reason: "DISABLED" });

    notifyNativeUser(new mongoose.Types.ObjectId().toString(), "rsvp");

    const reminders = await processAllVenueSeatingReminders();
    assert.equal(reminders.disabled, true);
    assert.equal(reminders.processed, 0);
  } finally {
    if (previousServer === undefined) delete process.env.CUSTOMER_NOTIFICATIONS_ENABLED;
    else process.env.CUSTOMER_NOTIFICATIONS_ENABLED = previousServer;
    if (previousWeb === undefined) delete process.env.NEXT_PUBLIC_CUSTOMER_NOTIFICATIONS_ENABLED;
    else process.env.NEXT_PUBLIC_CUSTOMER_NOTIFICATIONS_ENABLED = previousWeb;
  }
});

test("the flag hides customer UI and leaves admin notifications and business SMS in place", () => {
  const bell = read("app/dashboard/components/CustomerNotificationBell.tsx");
  assert.match(bell, /source === "admin" \|\| customerNotificationsEnabled\(\)/);
  assert.match(read("app/admin/layout.tsx"), /CustomerNotificationBell source="admin"/);
  assert.match(read("app/dashboard/components/DashboardSidebar.tsx"), /העדפות התראות/);
  assert.match(
    read("app/dashboard/components/DashboardSidebar.tsx"),
    /hidden: isDemo \|\| !customerNotificationsEnabled\(\)/
  );
  assert.match(read("app/dashboard/notifications/page.tsx"), /customerNotificationsEnabled\(\)/);
  assert.match(read("app/dashboard/notifications/page.tsx"), /redirect\("\/dashboard"\)/);
  assert.match(read("app/api/customer-notifications/route.ts"), /showBell: false/);
  assert.match(read("app/api/customer-notifications/sync/route.ts"), /customerNotificationsEnabled/);
  assert.match(read("lib/customerNotifications/service.ts"), /reason: "DISABLED"/);
  assert.match(read("lib/push/webPush.ts"), /preview.audience !== "admin"/);
  assert.match(read("lib/push/sendNativePush.ts"), /!customerNotificationsEnabled\(\)/);
  assert.match(read("lib/venueSeatingContacts/service.ts"), /deliverCustomerSms/);
  assert.match(read("lib/venueSeatingContacts/service.ts"), /!customerNotificationsEnabled\(\)/);
  assert.match(read("app/api/admin/notifications/route.ts"), /listActiveAdminNotifications|listAdminCenterNotifications/);
  assert.doesNotMatch(read("app/api/admin/notifications/route.ts"), /customerNotificationsEnabled/);
  assert.doesNotMatch(read("workers/sendScheduledSms.ts"), /customerNotificationsEnabled/);
  assert.doesNotMatch(read("app/api/sms/send/route.ts"), /customerNotificationsEnabled/);
  assert.match(read("workers/sendScheduledSms.ts"), /recordMessageRoundOutcome/);
  assert.match(read("mobile/src/customerNotificationsFlag.ts"), /EXPO_PUBLIC_CUSTOMER_NOTIFICATIONS_ENABLED/);
  assert.match(read("mobile/src/PushHost.tsx"), /customerNotificationsEnabled/);
});

test("existing customer rows stay stored but hidden, and admin rows still arrive", async (t) => {
  let mongod: MongoMemoryServer | null = null;
  try {
    mongod = await MongoMemoryServer.create();
  } catch (err: unknown) {
    t.skip(`mongodb-memory-server unavailable: ${err instanceof Error ? err.message : err}`);
    return;
  }

  const previousServer = process.env.CUSTOMER_NOTIFICATIONS_ENABLED;
  const previousWeb = process.env.NEXT_PUBLIC_CUSTOMER_NOTIFICATIONS_ENABLED;
  delete process.env.CUSTOMER_NOTIFICATIONS_ENABLED;
  delete process.env.NEXT_PUBLIC_CUSTOMER_NOTIFICATIONS_ENABLED;
  process.env.VAPID_PUBLIC_KEY = "";
  process.env.VAPID_PRIVATE_KEY = "";
  await mongoose.connect(mongod.getUri());

  try {
    const customerId = new mongoose.Types.ObjectId();
    const adminId = new mongoose.Types.ObjectId();
    await CustomerNotification.create({
      userId: customerId,
      audience: "customer",
      type: "stored.before.flag",
      category: "rsvp_rounds",
      severity: "info",
      title: "התראה ישנה",
      body: "נשארת במסד",
      actionHref: "/dashboard",
      status: "active",
      dedupeKey: `stored:${customerId}`,
    });

    assert.equal(customerNotificationsEnabled(), false);
    assert.deepEqual(await listActiveCustomerNotifications(String(customerId)), []);

    const adminNotice = await createCustomerNotification({
      userId: String(adminId),
      audience: "admin",
      customerId: String(customerId),
      type: "admin.failure",
      category: "admin_failures",
      severity: "urgent",
      title: "כשל אדמין",
      body: "עדיין פעיל",
      actionHref: "/admin",
      dedupeKey: `admin-live:${adminId}`,
      skipPush: true,
    });
    assert.equal(adminNotice.created, true);
    const adminList = await listActiveAdminNotifications(String(adminId));
    assert.equal(adminList.length, 1);
    assert.equal(adminList[0].title, "כשל אדמין");

    const stillStored = await CustomerNotification.findOne({ dedupeKey: `stored:${customerId}` }).lean();
    assert.equal(stillStored?.title, "התראה ישנה");
    assert.equal(stillStored?.status, "active");
  } finally {
    if (previousServer === undefined) delete process.env.CUSTOMER_NOTIFICATIONS_ENABLED;
    else process.env.CUSTOMER_NOTIFICATIONS_ENABLED = previousServer;
    if (previousWeb === undefined) delete process.env.NEXT_PUBLIC_CUSTOMER_NOTIFICATIONS_ENABLED;
    else process.env.NEXT_PUBLIC_CUSTOMER_NOTIFICATIONS_ENABLED = previousWeb;
    await mongoose.disconnect();
    await mongod.stop();
  }
});
