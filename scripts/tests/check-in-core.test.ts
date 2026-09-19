import test from "node:test";
import assert from "node:assert/strict";
import {
  computeCheckInStatus,
  confirmedGuestCount,
  checkedInGuestCount,
  summarizeCheckIn,
} from "../../lib/checkIn/status";
import {
  parseCheckInQrPayload,
  isValidCheckInTokenShape,
  generateCheckInToken,
} from "../../lib/checkIn/token";
import {
  buildReminderSmsTemplateForGuest,
  REMINDER_WITH_TABLE_SERVER_TEMPLATE,
} from "../../lib/messages/resolveReminderSmsTemplate";
import {
  normalizeGuestRsvp,
  guestRsvpAdminLabel,
  guestRsvpGuestLabel,
} from "../../lib/rsvpStatus";

test("check-in status computed from counts", () => {
  assert.equal(
    computeCheckInStatus({ rsvp: "yes", arrivedCount: 4, actualArrivedCount: 0 }),
    "NOT_ARRIVED"
  );
  assert.equal(
    computeCheckInStatus({ rsvp: "yes", arrivedCount: 4, actualArrivedCount: 2 }),
    "PARTIALLY_ARRIVED"
  );
  assert.equal(
    computeCheckInStatus({ rsvp: "yes", arrivedCount: 4, actualArrivedCount: 4 }),
    "FULLY_ARRIVED"
  );
});

test("maybe never counts as confirmed attending", () => {
  assert.equal(
    confirmedGuestCount({ rsvp: "maybe", arrivedCount: 4, guestsCount: 4 }),
    0
  );
  assert.equal(
    confirmedGuestCount({ rsvp: "pending", arrivedCount: 2, guestsCount: 3 }),
    0
  );
  assert.equal(
    confirmedGuestCount({ rsvp: "yes", arrivedCount: 3, guestsCount: 4 }),
    3
  );
});

test("rsvp maybe vs pending are distinct", () => {
  assert.equal(normalizeGuestRsvp("maybe"), "maybe");
  assert.equal(normalizeGuestRsvp("מתלבטים"), "maybe");
  assert.equal(normalizeGuestRsvp("undecided"), "maybe");
  assert.equal(normalizeGuestRsvp(""), "pending");
  assert.equal(guestRsvpAdminLabel("maybe"), "מתלבטים");
  assert.equal(guestRsvpGuestLabel("maybe"), "עדיין לא בטוחים");
  assert.equal(guestRsvpAdminLabel("pending"), "לא ענו");
});

test("summary aggregates day-of arrivals", () => {
  const summary = summarizeCheckIn([
    { rsvp: "yes", arrivedCount: 4, actualArrivedCount: 4 },
    { rsvp: "yes", arrivedCount: 2, actualArrivedCount: 0 },
    { rsvp: "yes", arrivedCount: 3, actualArrivedCount: 1 },
    { rsvp: "maybe", arrivedCount: 0, actualArrivedCount: 0 },
  ]);
  assert.equal(summary.confirmed, 9);
  assert.equal(summary.checkedIn, 5);
  assert.equal(summary.remaining, 4);
});

test("QR payload is opaque random token only", () => {
  const token = generateCheckInToken();
  assert.equal(isValidCheckInTokenShape(token), true);
  assert.ok(token.length >= 24);
  assert.doesNotMatch(token, /^[0-9]+$/);
  assert.equal(parseCheckInQrPayload(token), token);
  assert.equal(
    parseCheckInQrPayload(`https://www.invistimo.com/check-in/pass/${token}`),
    token
  );
});

test("reminder template stays the original wording even when check-in is on", () => {
  const withCheckIn = buildReminderSmsTemplateForGuest({
    body: "",
    event: { checkInEnabled: true },
    guest: {
      tableName: "שולחן 12",
      tableNumber: 12,
      checkInToken: "abcdefghijklmnopqrstuvwx",
    },
  });
  assert.equal(withCheckIn.template, REMINDER_WITH_TABLE_SERVER_TEMPLATE);
  assert.doesNotMatch(withCheckIn.template, /checkInQrLink/);
  assert.doesNotMatch(withCheckIn.template, /מחכים לכם/);

  const without = buildReminderSmsTemplateForGuest({
    body: "",
    event: { checkInEnabled: false },
    guest: {
      tableName: "שולחן 12",
      tableNumber: 12,
      checkInToken: "abcdefghijklmnopqrstuvwx",
    },
  });
  assert.equal(without.template, REMINDER_WITH_TABLE_SERVER_TEMPLATE);
  assert.doesNotMatch(without.template, /checkInQrLink/);
});

test("checkedInGuestCount independent of rsvp maybe", () => {
  assert.equal(
    checkedInGuestCount({ actualArrivedCount: 2 }),
    2
  );
});
