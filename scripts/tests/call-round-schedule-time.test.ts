import assert from "node:assert/strict";
import {
  formatCallRoundDateOnlyDisplay,
  formatCallRoundDateTimeInput,
  formatPlannedExecutionLabel,
  getCallRoundDateKeyInIsrael,
  hasEmployeeShiftStarted,
  hasReachedSameDayWorkOrderOpenTime,
  isCallRoundDue,
  isEmployeeTodayWorkOrderVisible,
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

// After 09:00 Israel, same-day 12:00 round is open even without a covering shift.
assert.equal(
  shouldExposeCallRoundWorkOrder({
    scheduledAt: noonSameDay,
    dateKey: "2026-09-23",
    now: shiftMorning,
    hasCoveringStartedShift: false,
  }),
  true
);

assert.equal(formatPlannedExecutionLabel(noonSameDay), "מתוכנן ל־12:00");

const dateKey = "2026-09-30";
const at1000 = parseCallRoundScheduledAt("2026-09-30T10:00")!;
const at1500 = parseCallRoundScheduledAt("2026-09-30T15:00")!;
const at2200 = parseCallRoundScheduledAt("2026-09-30T22:00")!;
const tomorrow1000 = parseCallRoundScheduledAt("2026-10-01T10:00")!;
const now0859 = parseCallRoundScheduledAt("2026-09-30T08:59")!;
const now0900 = parseCallRoundScheduledAt("2026-09-30T09:00")!;
const now1500 = parseCallRoundScheduledAt("2026-09-30T15:00")!;
const now2200 = parseCallRoundScheduledAt("2026-09-30T22:00")!;

assert.equal(
  hasReachedSameDayWorkOrderOpenTime({ dateKey, now: now0859 }),
  false
);
assert.equal(
  hasReachedSameDayWorkOrderOpenTime({ dateKey, now: now0900 }),
  true
);
assert.equal(
  hasReachedSameDayWorkOrderOpenTime({ dateKey, now: now1500 }),
  true
);
assert.equal(
  hasReachedSameDayWorkOrderOpenTime({ dateKey, now: now2200 }),
  true
);
assert.equal(
  hasReachedSameDayWorkOrderOpenTime({
    dateKey: "2026-10-01",
    now: now1500,
  }),
  false
);

for (const scheduledAt of [at1000, at1500, at2200]) {
  assert.equal(
    shouldExposeCallRoundWorkOrder({
      scheduledAt,
      dateKey,
      now: now0859,
    }),
    false
  );
  assert.equal(
    shouldExposeCallRoundWorkOrder({
      scheduledAt,
      dateKey,
      now: now0900,
    }),
    true
  );
  assert.equal(
    shouldExposeCallRoundWorkOrder({
      scheduledAt,
      dateKey,
      now: now1500,
    }),
    true
  );
  assert.equal(
    shouldExposeCallRoundWorkOrder({
      scheduledAt,
      dateKey,
      now: now2200,
    }),
    true
  );
}

assert.equal(
  shouldExposeCallRoundWorkOrder({
    scheduledAt: tomorrow1000,
    dateKey,
    now: now1500,
  }),
  false
);
assert.equal(formatPlannedExecutionLabel(at2200), "מתוכנן ל־22:00");
assert.equal(formatPlannedExecutionLabel(at1500), "מתוכנן ל־15:00");
assert.equal(
  isEmployeeTodayWorkOrderVisible({
    status: "scheduled",
    dateKey,
    configuredRoundAt: at2200,
    myTasksRemaining: 0,
  }),
  true
);

console.log("call-round-schedule-time.test.ts: ok");
