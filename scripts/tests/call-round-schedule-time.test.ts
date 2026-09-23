import assert from "node:assert/strict";
import {
  formatCallRoundDateOnlyDisplay,
  formatCallRoundDateTimeInput,
  formatPlannedExecutionLabel,
  getCallRoundDateKeyInIsrael,
  hasEmployeeShiftStarted,
  isCallRoundDue,
  normalizeCallRoundScheduledAtForSave,
  parseCallRoundScheduledAt,
  parseClockToMinutes,
  shiftCoversScheduledRound,
  shouldExposeCallRoundWorkOrder,
} from "../../lib/calls/callRoundScheduleTime.ts";

const noon = parseCallRoundScheduledAt("2026-09-20");
assert.ok(noon);
assert.equal(getCallRoundDateKeyInIsrael(noon!), "2026-09-20");
assert.equal(formatCallRoundDateTimeInput(noon!), "2026-09-20T12:00");

const withTime = parseCallRoundScheduledAt("2026-09-20T16:30");
assert.ok(withTime);
assert.equal(formatCallRoundDateTimeInput(withTime!), "2026-09-20T16:30");

const dateOnlyDisplay = formatCallRoundDateOnlyDisplay(withTime!);
assert.ok(dateOnlyDisplay);
assert.equal(dateOnlyDisplay!.includes("16:30"), false);
assert.ok(dateOnlyDisplay!.includes("2026") || dateOnlyDisplay!.includes("20"));

const iso = normalizeCallRoundScheduledAtForSave("2026-09-21T10:00");
assert.ok(iso);
const parsedBack = parseCallRoundScheduledAt(iso);
assert.ok(parsedBack);
assert.equal(formatCallRoundDateTimeInput(parsedBack!), "2026-09-21T10:00");

const before = new Date(withTime!.getTime() - 60_000);
assert.equal(
  isCallRoundDue({
    scheduledAt: withTime!,
    dateKey: "2026-09-20",
    now: before,
  }),
  false
);

const after = new Date(withTime!.getTime() + 60_000);
assert.equal(
  isCallRoundDue({
    scheduledAt: withTime!,
    dateKey: "2026-09-20",
    now: after,
  }),
  true
);

assert.equal(
  isCallRoundDue({
    scheduledAt: withTime!,
    dateKey: "2026-09-20",
    now: before,
    force: true,
  }),
  true
);

assert.equal(
  isCallRoundDue({
    scheduledAt: withTime!,
    dateKey: "2026-09-21",
    now: after,
  }),
  true
);

assert.equal(parseClockToMinutes("10:00"), 600);
assert.equal(parseClockToMinutes("13:00"), 780);
assert.equal(parseClockToMinutes("bad"), null);

const noonSameDay = parseCallRoundScheduledAt("2026-09-23T12:00")!;
assert.equal(
  shiftCoversScheduledRound({
    dateKey: "2026-09-23",
    scheduledAt: noonSameDay,
    window: { startMinutes: 600, endMinutes: 780 },
  }),
  true
);
assert.equal(
  shiftCoversScheduledRound({
    dateKey: "2026-09-23",
    scheduledAt: noonSameDay,
    window: { startMinutes: 840, endMinutes: 1020 },
  }),
  false
);

const shiftMorning = new Date("2026-09-23T07:00:00.000Z"); // 10:00 Israel
assert.equal(
  hasEmployeeShiftStarted({
    dateKey: "2026-09-23",
    startMinutes: 600,
    now: shiftMorning,
  }),
  true
);
assert.equal(
  hasEmployeeShiftStarted({
    dateKey: "2026-09-23",
    startMinutes: 600,
    now: new Date("2026-09-23T06:59:00.000Z"),
  }),
  false
);

// Bat Sheva: shift started at 10:00, round planned 12:00 → expose now
assert.equal(
  shouldExposeCallRoundWorkOrder({
    scheduledAt: noonSameDay,
    dateKey: "2026-09-23",
    now: shiftMorning,
    hasCoveringStartedShift: true,
  }),
  true
);
// Before shift start, even with covering window in roster → not exposed yet
assert.equal(
  shouldExposeCallRoundWorkOrder({
    scheduledAt: noonSameDay,
    dateKey: "2026-09-23",
    now: new Date("2026-09-23T06:59:00.000Z"),
    hasCoveringStartedShift: false,
  }),
  false
);

assert.equal(formatPlannedExecutionLabel(noonSameDay), "מתוכנן ל־12:00");

console.log("call-round-schedule-time.test.ts: ok");
