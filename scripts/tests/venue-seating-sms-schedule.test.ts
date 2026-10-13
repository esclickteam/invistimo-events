import test, { before } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  buildVenueSeatingUrgentSms,
  planVenueSeatingReminders,
  resolveEventStart,
} from "../../lib/venueSeatingContacts/logic";
import {
  ensureVenueSeatingHolidayCalendar,
  isBlockedVenueSeatingSmsMorning,
  isVenueSeatingSmsDue,
  scheduledVenueSeatingSmsDate,
  venueSeatingSmsTiming,
} from "../../lib/venueSeatingContacts/smsSchedule";
import { wallTimeInZoneToUtc } from "../../lib/weddingChallenges/timezone";

const root = path.resolve(process.cwd());

before(async () => {
  await ensureVenueSeatingHolidayCalendar();
});

function at(wall: string) {
  const date = wallTimeInZoneToUtc(wall, "Asia/Jerusalem");
  assert.ok(date, wall);
  return date;
}

function smsActions(eventDate: string, now: Date, alreadySent: Array<{
  stage: "initial" | "h72" | "h24";
  channel: "in_app" | "sms";
}> = [{ stage: "initial", channel: "in_app" }]) {
  const plan = planVenueSeatingReminders({
    now,
    eventStart: resolveEventStart({ date: eventDate, time: "19:00" }),
    eventDate,
    cancelled: false,
    upsellActive: true,
    contactsComplete: false,
    alreadySent,
    initialSentAt: null,
  });
  return plan.actions.filter((action) => action.channels.includes("sms"));
}

test("a regular event sends the day before at 10:00 Israel time, not at midnight", () => {
  assert.equal(scheduledVenueSeatingSmsDate("2026-10-14"), "2026-10-13");
  assert.equal(isBlockedVenueSeatingSmsMorning("2026-10-13"), false);

  const sendAt = at("2026-10-13T10:00");
  assert.equal(sendAt.toISOString(), "2026-10-13T07:00:00.000Z");
  assert.equal(smsActions("2026-10-14", at("2026-10-13T09:59")).length, 0);
  assert.equal(smsActions("2026-10-14", sendAt).length, 1);
  assert.equal(smsActions("2026-10-14", at("2026-10-13T00:00")).length, 0);
  assert.equal(smsActions("2026-10-14", at("2026-10-14T00:00")).length, 0);
  assert.equal(isVenueSeatingSmsDue("2026-10-14", at("2026-10-13T23:30")), false);

  const text = buildVenueSeatingUrgentSms("https://www.invistimo.com/5lMsZ", {
    eventDate: "2026-10-14",
  });
  assert.match(text, /לקראת האירוע שלכם מחר,/);
  assert.match(text, /צוות Invistimo/);
  assert.doesNotMatch(text, /אינויסטימו/);
  assert.match(text, /https:\/\/www\.invistimo\.com\/5lMsZ/);
});

test("a Sunday event is sent on Friday because Saturday is Shabbat", () => {
  assert.equal(isBlockedVenueSeatingSmsMorning("2026-10-17"), true);
  assert.equal(isBlockedVenueSeatingSmsMorning("2026-10-16"), false);
  assert.equal(scheduledVenueSeatingSmsDate("2026-10-18"), "2026-10-16");

  assert.equal(smsActions("2026-10-18", at("2026-10-17T10:00")).length, 0);
  assert.equal(smsActions("2026-10-18", at("2026-10-16T10:00")).length, 1);
  assert.equal(smsActions("2026-10-18", at("2026-10-16T00:00")).length, 0);

  const text = buildVenueSeatingUrgentSms("https://www.invistimo.com/go", {
    eventDate: "2026-10-18",
  });
  assert.doesNotMatch(text, /מחר/);
  assert.match(text, /ביום ראשון, 18 באוקטובר 2026/);
  assert.match(text, /צוות Invistimo/);
});

test("a send that lands on a holiday, including a two-day holiday, moves to the last permitted morning", () => {
  assert.equal(isBlockedVenueSeatingSmsMorning("2026-09-12"), true);
  assert.equal(isBlockedVenueSeatingSmsMorning("2026-09-13"), true);
  assert.equal(isBlockedVenueSeatingSmsMorning("2026-09-11"), false);
  assert.equal(scheduledVenueSeatingSmsDate("2026-09-14"), "2026-09-11");
  assert.equal(smsActions("2026-09-14", at("2026-09-13T10:00")).length, 0);
  assert.equal(smsActions("2026-09-14", at("2026-09-11T10:00")).length, 1);

  const text = buildVenueSeatingUrgentSms("https://www.invistimo.com/go", {
    eventDate: "2026-09-14",
  });
  assert.doesNotMatch(text, /מחר/);
  assert.match(text, /14 בספטמבר 2026/);
});

test("Shabbat following a holiday keeps moving back to the last permitted morning", () => {
  assert.equal(isBlockedVenueSeatingSmsMorning("2026-05-22"), true);
  assert.equal(isBlockedVenueSeatingSmsMorning("2026-05-23"), true);
  assert.equal(isBlockedVenueSeatingSmsMorning("2026-05-21"), false);
  assert.equal(scheduledVenueSeatingSmsDate("2026-05-24"), "2026-05-21");
  assert.equal(smsActions("2026-05-24", at("2026-05-22T10:00")).length, 0);
  assert.equal(smsActions("2026-05-24", at("2026-05-21T10:00")).length, 1);
});

test("Chol HaMoed and Erev alone do not move the send", () => {
  assert.equal(isBlockedVenueSeatingSmsMorning("2026-09-27"), false);
  assert.equal(isBlockedVenueSeatingSmsMorning("2026-09-28"), false);
  assert.equal(scheduledVenueSeatingSmsDate("2026-09-28"), "2026-09-27");
  const chol = buildVenueSeatingUrgentSms("https://www.invistimo.com/go", {
    eventDate: "2026-09-28",
  });
  assert.match(chol, /מחר/);

  assert.equal(isBlockedVenueSeatingSmsMorning("2026-04-01"), false);
  assert.equal(scheduledVenueSeatingSmsDate("2026-04-02"), "2026-04-01");
  const erev = buildVenueSeatingUrgentSms("https://www.invistimo.com/go", {
    eventDate: "2026-04-02",
  });
  assert.match(erev, /מחר/);
});

test("an event date change is recalculated, and a completed form is not texted", () => {
  assert.equal(smsActions("2026-10-18", at("2026-10-13T10:00")).length, 0);
  assert.equal(smsActions("2026-10-18", at("2026-10-16T10:00")).length, 1);

  const completed = planVenueSeatingReminders({
    now: at("2026-10-13T10:00"),
    eventStart: resolveEventStart({ date: "2026-10-14", time: "19:00" }),
    eventDate: "2026-10-14",
    cancelled: false,
    upsellActive: true,
    contactsComplete: true,
    alreadySent: [],
    initialSentAt: null,
  });
  assert.equal(completed.resolveActive, true);
  assert.deepEqual(completed.actions, []);

  const inactive = planVenueSeatingReminders({
    now: at("2026-10-13T10:00"),
    eventStart: resolveEventStart({ date: "2026-10-14", time: "19:00" }),
    eventDate: "2026-10-14",
    cancelled: false,
    upsellActive: false,
    contactsComplete: false,
    alreadySent: [],
    initialSentAt: null,
  });
  assert.deepEqual(inactive.actions, []);
});

test("a second cron run does not send the SMS again for the same event date", () => {
  const now = at("2026-10-13T10:00");
  const first = smsActions("2026-10-14", now, []);
  assert.equal(first.length, 1);

  const second = smsActions("2026-10-14", now, [
    { stage: "h24", channel: "sms" },
  ]);
  assert.equal(second.length, 0);

  const laterSameDay = smsActions("2026-10-14", at("2026-10-13T15:00"), [
    { stage: "h24", channel: "sms" },
  ]);
  assert.equal(laterSameDay.length, 0);
});

test("Israel summer and winter clocks both send at 10:00 local, including the transition days", () => {
  const summer = venueSeatingSmsTiming("2026-07-16");
  assert.ok(summer);
  assert.equal(summer.sendDate, "2026-07-15");
  assert.equal(summer.sendAt.toISOString(), "2026-07-15T07:00:00.000Z");
  assert.equal(isVenueSeatingSmsDue("2026-07-16", summer.sendAt), true);
  assert.equal(isVenueSeatingSmsDue("2026-07-16", at("2026-07-15T00:00")), false);

  const winter = venueSeatingSmsTiming("2027-01-14");
  assert.ok(winter);
  assert.equal(winter.sendDate, "2027-01-13");
  assert.equal(winter.sendAt.toISOString(), "2027-01-13T08:00:00.000Z");
  assert.equal(isVenueSeatingSmsDue("2027-01-14", winter.sendAt), true);

  assert.equal(at("2026-10-25T10:00").toISOString(), "2026-10-25T08:00:00.000Z");
  assert.equal(at("2026-03-27T10:00").toISOString(), "2026-03-27T07:00:00.000Z");
  assert.equal(smsActions("2026-10-26", at("2026-10-25T00:00")).length, 0);
  assert.equal(smsActions("2026-10-26", at("2026-10-25T10:00")).length, 1);
});

test("a missing event time no longer opens the SMS at midnight", () => {
  const start = resolveEventStart({ date: "2026-10-14" });
  assert.equal(start?.toISOString(), at("2026-10-14T00:00").toISOString());

  const midnight = planVenueSeatingReminders({
    now: at("2026-10-13T00:00"),
    eventStart: start,
    eventDate: "2026-10-14",
    cancelled: false,
    upsellActive: true,
    contactsComplete: false,
    alreadySent: [],
    initialSentAt: null,
  });
  assert.equal(
    midnight.actions.some((action) => action.channels.includes("sms")),
    false
  );

  const morning = planVenueSeatingReminders({
    now: at("2026-10-13T10:00"),
    eventStart: start,
    eventDate: "2026-10-14",
    cancelled: false,
    upsellActive: true,
    contactsComplete: false,
    alreadySent: [{ stage: "initial", channel: "in_app" }],
    initialSentAt: null,
  });
  const sms = morning.actions.find((action) => action.channels.includes("sms"));
  assert.ok(sms);
  assert.equal(sms.stage, "h24");
  assert.equal(sms.channels.includes("sms"), true);
});

test("the schedule is calculated, and only this SMS uses it", () => {
  const source = fs.readFileSync(
    path.join(root, "lib/venueSeatingContacts/smsSchedule.ts"),
    "utf8"
  );
  assert.match(source, /@hebcal\/core/);
  assert.match(source, /isAssurBemlacha/);
  assert.doesNotMatch(source, /2026-09-12/);
  assert.doesNotMatch(source, /2026-10-17/);

  const service = fs.readFileSync(
    path.join(root, "lib/venueSeatingContacts/service.ts"),
    "utf8"
  );
  assert.match(service, /eventDate: startKey/);
  assert.match(service, /eventDate: eventStartKey\(input\.event\)/);
  assert.match(service, /input\.channel === "in_app" && age > SENDING_STALE_MS/);

  const model = fs.readFileSync(
    path.join(root, "models/HallSeatingReminderLog.ts"),
    "utf8"
  );
  assert.match(model, /eventId: 1, stage: 1, channel: 1, startKey: 1/);
  assert.match(model, /unique: true/);

  assert.doesNotMatch(
    fs.readFileSync(path.join(root, "lib/customerNotifications/planners.ts"), "utf8"),
    /buildVenueSeatingUrgentSms|smsSchedule/
  );
  assert.doesNotMatch(
    fs.readFileSync(path.join(root, "workers/sendScheduledSms.ts"), "utf8"),
    /buildVenueSeatingUrgentSms|smsSchedule/
  );
});
