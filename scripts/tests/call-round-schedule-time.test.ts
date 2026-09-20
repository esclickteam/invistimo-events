import assert from "node:assert/strict";
import {
  formatCallRoundDateOnlyDisplay,
  formatCallRoundDateTimeInput,
  getCallRoundDateKeyInIsrael,
  isCallRoundDue,
  normalizeCallRoundScheduledAtForSave,
  parseCallRoundScheduledAt,
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

console.log("call-round-schedule-time.test.ts: ok");
