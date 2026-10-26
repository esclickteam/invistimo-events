import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  canExposeCustomerNotificationFeed,
  canSeeAdminNotificationCenter,
} from "../../lib/customerNotifications/visibility";

const root = path.resolve(process.cwd());

function read(relativePath: string) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

test("only a real super-admin session can see the notification center", () => {
  assert.equal(canSeeAdminNotificationCenter(null), false);
  assert.equal(canSeeAdminNotificationCenter({ role: "user" }), false);
  assert.equal(canSeeAdminNotificationCenter({ role: "client" }), false);
  assert.equal(canSeeAdminNotificationCenter({ role: "producer" }), false);
  assert.equal(canSeeAdminNotificationCenter({ role: "producer_staff" }), false);
  assert.equal(canSeeAdminNotificationCenter({ role: "venue_owner" }), false);
  assert.equal(canSeeAdminNotificationCenter({ role: "staff" }), false);
  assert.equal(
    canSeeAdminNotificationCenter({
      role: "user",
      impersonationSourceRole: "producer",
    }),
    false
  );
  assert.equal(
    canSeeAdminNotificationCenter({
      role: "user",
      impersonated: true,
      impersonatedByAdmin: true,
      impersonationSourceRole: "admin",
    }),
    false
  );
  assert.equal(
    canSeeAdminNotificationCenter({
      role: "admin",
      adminManagingUserId: "customer-1",
    }),
    false
  );
  assert.equal(canSeeAdminNotificationCenter({ role: "admin" }), true);
});

test("customer accounts are not given the failed-message feed", () => {
  for (const role of ["user", "client", "producer", "producer_staff", "venue_owner"]) {
    assert.equal(canExposeCustomerNotificationFeed({ role }), false);
  }
  assert.equal(canExposeCustomerNotificationFeed({ role: "admin" }), false);
});

test("customer nav and mobile surfaces do not mount the bell", () => {
  assert.doesNotMatch(read("app/dashboard/DashboardHeader.tsx"), /CustomerNotificationBell/);
  assert.doesNotMatch(read("app/dashboard/seating/page.tsx"), /CustomerNotificationBell/);
  assert.doesNotMatch(read("app/dashboard/DashboardMobileMenu.tsx"), /העדפות התראות/);
  assert.doesNotMatch(read("app/dashboard/components/DashboardSidebar.tsx"), /העדפות התראות/);
  assert.doesNotMatch(read("mobile/app/(app)/_layout.tsx"), /CustomerNotificationBell/);
  assert.doesNotMatch(read("mobile/app/(producer)/_layout.tsx"), /CustomerNotificationBell/);
  assert.match(read("app/admin/layout.tsx"), /CustomerNotificationBell source="admin"/);
  assert.match(
    read("app/dashboard/components/CustomerNotificationBell.tsx"),
    /canSeeAdminNotificationCenter/
  );
  assert.match(read("app/api/admin/notifications/route.ts"), /auth\.role !== "admin"/);
  assert.doesNotMatch(read("app/api/customer-notifications/route.ts"), /showBell: true/);
  assert.match(read("lib/venueSeatingContacts/service.ts"), /processVenueSeatingRemindersForUser/);
  assert.match(read("lib/customerNotifications/service.ts"), /createCustomerNotification/);
});
