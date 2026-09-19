import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "path";

import {
  REMINDER_WITH_TABLE_SERVER_TEMPLATE,
  REMINDER_WITHOUT_TABLE_SERVER_TEMPLATE,
} from "../../lib/messages/resolveReminderSmsTemplate";
import {
  buildEventDetailsAfterQrUrl,
  buildReminderNavigationUrl,
  shouldOpenCheckInQrFirst,
} from "../../lib/messages/reminderNavigationLink";

const root = path.resolve(process.cwd());

function read(rel: string) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

test("reminder wording stays the original table / no-table copy", () => {
  assert.match(REMINDER_WITH_TABLE_SERVER_TEMPLATE, /תזכורת לאירוע \{\{invitationTitle\}\}/);
  assert.match(REMINDER_WITH_TABLE_SERVER_TEMPLATE, /לכל פרטי האירוע והניווט:/);
  assert.match(REMINDER_WITH_TABLE_SERVER_TEMPLATE, /\{\{navigationLink\}\}/);
  assert.doesNotMatch(REMINDER_WITH_TABLE_SERVER_TEMPLATE, /checkInQrLink/);
  assert.doesNotMatch(REMINDER_WITH_TABLE_SERVER_TEMPLATE, /מחכים לכם/);
  assert.doesNotMatch(REMINDER_WITHOUT_TABLE_SERVER_TEMPLATE, /checkInQrLink/);
});

test("regular reminder link stays /e/shareId when check-in is off", () => {
  assert.equal(
    buildReminderNavigationUrl({
      shareId: "abc",
      guestToken: "guest-1",
      checkInEnabled: false,
    }),
    "https://www.invistimo.com/e/abc"
  );
  assert.equal(
    buildReminderNavigationUrl({
      shareId: "abc",
      checkInEnabled: true,
    }),
    "https://www.invistimo.com/e/abc"
  );
});

test("check-in reminder uses the same /e link with a guest token", () => {
  assert.equal(
    buildReminderNavigationUrl({
      shareId: "abc",
      guestToken: "guest-1",
      checkInEnabled: true,
    }),
    "https://www.invistimo.com/e/abc?token=guest-1"
  );
  assert.equal(
    buildEventDetailsAfterQrUrl({ shareId: "abc", guestToken: "guest-1" }),
    "/e/abc?token=guest-1&details=1"
  );
});

test("QR-first only when check-in is on, token exists, and details is not requested", () => {
  assert.equal(
    shouldOpenCheckInQrFirst({
      checkInEnabled: true,
      guestToken: "guest-1",
    }),
    true
  );
  assert.equal(
    shouldOpenCheckInQrFirst({
      checkInEnabled: true,
      guestToken: "guest-1",
      details: "1",
    }),
    false
  );
  assert.equal(
    shouldOpenCheckInQrFirst({
      checkInEnabled: false,
      guestToken: "guest-1",
    }),
    false
  );
});

test("event details page and send paths wire the QR-first reminder link", () => {
  const eventPage = read("app/e/[shareId]/page.tsx");
  assert.match(eventPage, /loadGuestPassForEventDetailsLink/);
  assert.match(eventPage, /shouldOpenCheckInQrFirst/);
  assert.match(eventPage, /CheckInPassClient/);

  const send = read("app/api/sms/send/route.ts");
  assert.match(send, /buildReminderNavigationUrl/);
  assert.doesNotMatch(send, /checkInQrLink/);

  const worker = read("workers/sendScheduledSms.ts");
  assert.match(worker, /buildReminderNavigationUrl/);
  assert.doesNotMatch(worker, /checkInQrLink/);

  const tab = read("app/dashboard/messages/new/tabs/ReminderTab.tsx");
  assert.match(tab, /buildReminderNavigationUrl/);
  assert.doesNotMatch(tab, /checkInQrLink/);
});
