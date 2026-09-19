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
} from "../../lib/checkIn/token";
import {
  buildReminderSmsTemplateForGuest,
  REMINDER_WITH_CHECKIN_SERVER_TEMPLATE,
} from "../../lib/messages/resolveReminderSmsTemplate";

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

test("confirmed vs checked-in stay separate from link open", () => {
  const guest = {
    rsvp: "pending",
    arrivedCount: 0,
    actualArrivedCount: 0,
    guestsCount: 3,
  };
  assert.equal(confirmedGuestCount(guest), 0);
  assert.equal(checkedInGuestCount(guest), 0);
});

test("summary aggregates day-of arrivals", () => {
  const summary = summarizeCheckIn([
    { rsvp: "yes", arrivedCount: 4, actualArrivedCount: 4 },
    { rsvp: "yes", arrivedCount: 2, actualArrivedCount: 0 },
    { rsvp: "yes", arrivedCount: 3, actualArrivedCount: 1 },
  ]);
  assert.equal(summary.confirmed, 9);
  assert.equal(summary.checkedIn, 5);
  assert.equal(summary.remaining, 4);
  assert.equal(summary.partiallyArrived, 1);
  assert.equal(summary.fullyArrived, 1);
  assert.equal(summary.notArrived, 1);
});

test("QR payload is opaque token only", () => {
  const token = "abcdefghijklmnopqrstuvwx";
  assert.equal(isValidCheckInTokenShape(token), true);
  assert.equal(parseCheckInQrPayload(token), token);
  assert.equal(
    parseCheckInQrPayload(`https://www.invistimo.com/check-in/pass/${token}`),
    token
  );
});

test("reminder template includes QR only when check-in enabled", () => {
  const withCheckIn = buildReminderSmsTemplateForGuest({
    body: "",
    event: { checkInEnabled: true },
    guest: {
      tableName: "שולחן 12",
      tableNumber: 12,
      checkInToken: "abcdefghijklmnopqrstuvwx",
    },
  });
  assert.equal(withCheckIn.includeCheckIn, true);
  assert.match(withCheckIn.template, /checkInQrLink/);
  assert.equal(withCheckIn.template, REMINDER_WITH_CHECKIN_SERVER_TEMPLATE);

  const without = buildReminderSmsTemplateForGuest({
    body: "",
    event: { checkInEnabled: false },
    guest: {
      tableName: "שולחן 12",
      tableNumber: 12,
      checkInToken: "abcdefghijklmnopqrstuvwx",
    },
  });
  assert.equal(without.includeCheckIn, false);
  assert.doesNotMatch(without.template, /checkInQrLink/);
});
