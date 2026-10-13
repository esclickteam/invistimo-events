import test, { before } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "path";
import {
  SAME_DAY_WORK_ORDER_OPEN_HOUR,
  parseCallRoundScheduledAt,
  shouldExposeCallRoundWorkOrder,
} from "../../lib/calls/callRoundScheduleTime";
import {
  planCallRoundNotifications,
  planMessageRoundNotifications,
} from "../../lib/customerNotifications/planners";
import {
  isOperationalNoticeDue,
  planOperationalDelivery,
} from "../../lib/notifications/israelQuietHours";
import { briefingSendDate } from "../../lib/venueSeatingBriefing/logic";
import {
  ensureVenueSeatingHolidayCalendar,
  venueSeatingSmsTiming,
} from "../../lib/venueSeatingContacts/smsSchedule";
import { getRsvpSmsRoundTemplate } from "../../lib/sms/roundSmsTemplates";
import { wallTimeInZoneToUtc } from "../../lib/weddingChallenges/timezone";

before(async () => {
  await ensureVenueSeatingHolidayCalendar();
});

function at(wall: string) {
  const date = wallTimeInZoneToUtc(wall, "Asia/Jerusalem");
  if (!date) throw new Error(wall);
  return date;
}

test("a 24-hour notice calculated at 02:00 waits until 10:00 Israel time", () => {
  const calculated = at("2026-10-14T02:00");
  const event = at("2026-10-15T02:00");
  const plan = planOperationalDelivery(calculated, event);
  assert.equal(plan.pulledEarlier, false);
  assert.equal(plan.at.getTime(), at("2026-10-14T10:00").getTime());
  assert.equal(isOperationalNoticeDue(calculated, at("2026-10-14T02:05"), event), false);
  assert.equal(isOperationalNoticeDue(calculated, at("2026-10-14T10:00"), event), true);
});

test("a 72-hour notice calculated at 21:00 is not sent at night", () => {
  const calculated = at("2026-10-14T21:00");
  const event = at("2026-10-17T21:00");
  const plan = planOperationalDelivery(calculated, event);
  assert.equal(plan.pulledEarlier, false);
  assert.equal(plan.at.getTime(), at("2026-10-15T10:00").getTime());
  assert.equal(isOperationalNoticeDue(calculated, calculated, event), false);
  assert.equal(isOperationalNoticeDue(calculated, at("2026-10-14T23:30"), event), false);
  assert.equal(isOperationalNoticeDue(calculated, at("2026-10-15T10:00"), event), true);
});

test("19:00 moves to the next morning, and a shift that would miss the event moves earlier", () => {
  const evening = planOperationalDelivery(at("2026-10-14T19:00"), at("2026-10-16T20:00"));
  assert.equal(evening.at.getTime(), at("2026-10-15T10:00").getTime());
  assert.equal(evening.pulledEarlier, false);

  const calculated = at("2026-10-14T21:00");
  const event = at("2026-10-15T09:00");
  const early = planOperationalDelivery(calculated, event);
  assert.equal(early.pulledEarlier, true);
  assert.equal(early.at.getTime(), at("2026-10-14T10:00").getTime());
  assert.equal(isOperationalNoticeDue(calculated, at("2026-10-14T10:00"), event), true);
  assert.equal(isOperationalNoticeDue(calculated, at("2026-10-15T08:00"), event), false);
});

test("summer and winter send clocks follow Asia/Jerusalem", () => {
  const summerContacts = venueSeatingSmsTiming("2026-07-16");
  const winterContacts = venueSeatingSmsTiming("2027-01-14");
  assert.ok(summerContacts && winterContacts);
  assert.equal(summerContacts.sendAt.getTime(), at("2026-07-15T10:00").getTime());
  assert.equal(summerContacts.sendAt.toISOString(), "2026-07-15T07:00:00.000Z");
  assert.equal(winterContacts.sendAt.getTime(), at("2027-01-13T10:00").getTime());
  assert.equal(winterContacts.sendAt.toISOString(), "2027-01-13T08:00:00.000Z");

  assert.equal(briefingSendDate("2026-07-16"), "2026-07-15");
  assert.equal(at("2026-07-15T14:00").toISOString(), "2026-07-15T11:00:00.000Z");
  assert.equal(briefingSendDate("2027-01-14"), "2027-01-13");
  assert.equal(at("2027-01-13T14:00").toISOString(), "2027-01-13T12:00:00.000Z");
});

test("a message round that finishes at 23:30 still notifies immediately", () => {
  const notices = planMessageRoundNotifications({
    invitationId: "inv-night",
    channel: "whatsapp",
    messageType: "rsvp",
    round: 2,
    audienceCount: 6,
    sentCount: 6,
    outcome: "sent",
    phonesNeedingReview: 0,
    salt: "2026-10-14T23:30",
  });
  assert.equal(notices.length > 0, true);
  assert.match(notices[0]?.title || "", /סבב הודעות הסתיים|הודעות/);
});

test("call work orders still open at 09:00 Israel time", () => {
  assert.equal(SAME_DAY_WORK_ORDER_OPEN_HOUR, 9);
  const scheduledAt = parseCallRoundScheduledAt("2026-10-14T18:00");
  assert.ok(scheduledAt);
  const open = shouldExposeCallRoundWorkOrder({
    scheduledAt,
    dateKey: "2026-10-14",
    now: parseCallRoundScheduledAt("2026-10-14T09:00") || undefined,
  });
  const early = shouldExposeCallRoundWorkOrder({
    scheduledAt,
    dateKey: "2026-10-14",
    now: parseCallRoundScheduledAt("2026-10-14T08:59") || undefined,
  });
  assert.equal(open, true);
  assert.equal(early, false);

  const done = planCallRoundNotifications({
    invitationId: "inv-calls",
    round: 1,
    runId: "run-0900",
    status: "done",
    dialed: 3,
  });
  assert.equal(done.length, 1);
});

test("scheduled round crons and guest copy are unchanged", () => {
  const vercel = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "vercel.json"), "utf8")
  ) as { crons: Array<{ path: string; schedule: string }> };
  const schedule = Object.fromEntries(vercel.crons.map((cron) => [cron.path, cron.schedule]));
  assert.equal(schedule["/api/cron/send-scheduled-sms"], "* * * * *");
  assert.equal(schedule["/api/cron/whatsapp"], "* * * * *");
  assert.equal(schedule["/api/cron/whatsapp-sms-fallback"], "* * * * *");
  assert.equal(schedule["/api/cron/ivr-dial"], "* * * * *");
  assert.equal(schedule["/api/admin/call-work-orders/auto-open"], "* * * * *");
  assert.match(getRsvpSmsRoundTemplate(1), /הוזמנתם לאירוע/);
  assert.match(getRsvpSmsRoundTemplate(2), /תזכורת לאישור הגעה/);
  assert.match(getRsvpSmsRoundTemplate(3), /תזכורת לאישור הגעה/);
});
