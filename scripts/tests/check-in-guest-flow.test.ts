import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "path";

import {
  guestPassView,
  hostRemainingOptions,
  hostScanIsFullyArrived,
  giftUrlIfConfigured,
  formatTableLabel,
} from "../../lib/checkIn/guestPassState";
import { isInvistimoAdmin } from "../../lib/checkIn/adminGate";
import {
  applyDemoCheckIn,
  DEMO_CHECKIN_GUESTS,
  defaultDemoCheckInState,
  writeDemoCheckInState,
} from "../../lib/checkIn/demoCheckIn";

const root = path.resolve(process.cwd());

function read(rel: string) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

test("guest pass stays on QR until someone actually checks in", () => {
  const before = guestPassView({ checkedInCount: 0, confirmedCount: 2 });
  assert.equal(before.phase, "qr");
  assert.equal(before.showQr, true);
  assert.equal(before.showWelcome, false);
  assert.equal(before.showShowQrAgain, false);
});

test("partial arrival shows welcome and extra QR button", () => {
  const view = guestPassView({ checkedInCount: 2, confirmedCount: 4 });
  assert.equal(view.phase, "welcome");
  assert.equal(view.showWelcome, true);
  assert.equal(view.showShowQrAgain, true);
  assert.equal(view.fullyArrived, false);
  assert.equal(view.remaining, 2);

  const again = guestPassView({
    checkedInCount: 2,
    confirmedCount: 4,
    showQrAgain: true,
  });
  assert.equal(again.showQr, true);
  assert.equal(again.showWelcome, false);
});

test("full arrival hides extra QR", () => {
  const view = guestPassView({ checkedInCount: 4, confirmedCount: 4 });
  assert.equal(view.fullyArrived, true);
  assert.equal(view.showShowQrAgain, false);
  assert.equal(view.showQr, false);
});

test("host quantity options never exceed remaining", () => {
  assert.deepEqual(hostRemainingOptions(4, 0), [1, 2, 3, 4]);
  assert.deepEqual(hostRemainingOptions(4, 2), [1, 2]);
  assert.deepEqual(hostRemainingOptions(4, 4), []);
  assert.equal(hostScanIsFullyArrived(4, 4), true);
  assert.equal(hostScanIsFullyArrived(4, 2), false);
});

test("gift URL only when a real http(s) link exists", () => {
  assert.equal(giftUrlIfConfigured(""), "");
  assert.equal(giftUrlIfConfigured("not-a-url"), "");
  assert.equal(
    giftUrlIfConfigured("https://pay.invistimo.com/gifts/demo"),
    "https://pay.invistimo.com/gifts/demo"
  );
});

test("table label is guest-facing", () => {
  assert.equal(formatTableLabel({ tableNumber: 12 }), "שולחן 12");
  assert.equal(formatTableLabel({ tableName: "שולחן 8" }), "שולחן 8");
});

test("only Invistimo admin can toggle check-in", () => {
  assert.equal(isInvistimoAdmin({ role: "admin" }), true);
  assert.equal(isInvistimoAdmin({ role: "user", impersonationRole: "admin" }), true);
  assert.equal(isInvistimoAdmin({ role: "user" }), false);
  assert.equal(isInvistimoAdmin({ role: "producer" }), false);
});

test("demo check-in can record more arrivals than were confirmed", () => {
  writeDemoCheckInState(defaultDemoCheckInState());
  const cohen = DEMO_CHECKIN_GUESTS.find((g) => g.name === "משפחת כהן");
  assert.ok(cohen);
  const first = applyDemoCheckIn(cohen.token, 2);
  assert.equal(first.ok, true);
  if (first.ok) {
    assert.equal(first.previousCheckedInCount, 0);
    assert.equal(first.newCheckedInCount, 2);
  }
  const extra = applyDemoCheckIn(cohen.token, 3);
  assert.equal(extra.ok, true);
  if (extra.ok) assert.equal(extra.newCheckedInCount, 5);
  const zero = applyDemoCheckIn(cohen.token, 0);
  assert.equal(zero.ok, false);
});

test("check-in settings PATCH is admin-only and mints tokens on enable", () => {
  const route = read("app/api/events/[eventId]/check-in-settings/route.ts");
  assert.match(route, /isInvistimoAdmin/);
  assert.match(route, /ADMIN_ONLY/);
  assert.match(route, /ensureCheckInTokensForEvent/);
  assert.doesNotMatch(route, /authHasCheckInPermission/);
});

test("owner surfaces never offer a check-in toggle", () => {
  const page = read("app/dashboard/page.tsx");
  const settings = read("app/api/events/[eventId]/check-in-settings/route.ts");
  assert.doesNotMatch(page, /checkInToggleBusy/);
  assert.doesNotMatch(page, /userCanManageCheckIn/);
  assert.doesNotMatch(page, /הפעילו את Invistimo Check-in בהגדרות/);
  assert.match(settings, /isInvistimoAdmin/);
});

test("admin users page marks Check-in as an add-on", () => {
  const admin = read("app/admin/users/page.tsx");
  assert.match(admin, /Invistimo Check-in/);
  assert.match(admin, /ADD-ON \/ UPSELL/);
  assert.match(admin, /QR וניהול כניסה לאירוע/);
  assert.match(admin, /check-in-settings/);
});

test("guest check-in pass hides public marketing chrome", () => {
  const shell = read("app/PublicPageShell.tsx");
  const layout = read("app/components/LayoutShell.tsx");
  assert.match(shell, /isCheckInPassRoute/);
  assert.match(shell, /\/check-in\/pass/);
  assert.match(layout, /\/check-in\/pass/);
  assert.match(layout, /\/try\/check-in\/pass/);
});

test("guest check-in pass copy stays unchanged", () => {
  const pass = read("app/check-in/pass/CheckInPassView.tsx");
  assert.match(pass, /תודה שהגעתם לשמוח איתנו/);
  assert.match(pass, /קוד הכניסה האישי שלכם/);
  assert.match(pass, /הציגו את הקוד בכניסה לאירוע/);
  assert.match(pass, /הצגת קוד כניסה נוסף/);
  assert.match(pass, /לכל פרטי האירוע/);
  assert.match(pass, /שליחת מתנה/);
  assert.doesNotMatch(pass, />פרטי האירוע</);
});

test("host scanner saves on quantity tap and only while live", () => {
  const host = read("app/dashboard/check-in/CheckInHostClient.tsx");
  const confirm = read("app/api/check-in/confirm/route.ts");
  const gate = read("lib/checkIn/eventGate.ts");
  const apply = read("lib/checkIn/applyCheckIn.ts");
  assert.match(host, /הכניסה נרשמה/);
  assert.match(host, /כמה הגיעו עכשיו/);
  assert.match(host, /כמות אחרת/);
  assert.match(host, /אישרו מראש/);
  assert.match(host, /הגיעו בפועל עד עכשיו/);
  assert.doesNotMatch(host, /אישור כניסה/);
  assert.doesNotMatch(host, /האורחים כבר נכנסו/);
  assert.match(host, /pause\(false\)/);
  assert.match(confirm, /checkInActionBlocked/);
  assert.match(gate, /EVENT_NOT_LIVE/);
  assert.match(confirm, /undoCheckIn/);
  assert.doesNotMatch(apply, /EXCEEDS_CONFIRMED/);
  assert.match(apply, /actualArrivedCount: previous/);
});
