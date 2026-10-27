import test from "node:test";
import assert from "node:assert/strict";

import { sanitizeSalesDocumentForCustomer } from "../../lib/salesDocumentTerms";
import {
  SEATING_START_DEFAULT_UNSCHEDULED,
  SEATING_START_DEFAULT_WITH_RECEPTION,
  applySeatingScheduleUpdate,
  clockMinusMinutes,
  missingSeatingScheduleLabels,
  orderIncludesVenueSeating,
  parseSeatingScheduleTimes,
  seatingServiceStartDisplay,
  toCustomerSeatingSchedule,
} from "../../lib/seatingSchedule";

const times = {
  receptionStartTime: "19:00",
  plannedChuppahTime: "20:00",
  plannedSeatingStartTime: "19:30",
  teamArrivalTime: "18:30",
};

test("venue seating is detected by key or legacy Hebrew title", () => {
  assert.equal(orderIncludesVenueSeating([{ key: "venueSeating" }]), true);
  assert.equal(orderIncludesVenueSeating([{ title: "הושבה באולם" }]), true);
  assert.equal(orderIncludesVenueSeating([{ key: "digitalSeating" }]), false);
  assert.equal(orderIncludesVenueSeating([]), false);
});

test("clock times are normalized and arrival can be thirty minutes earlier", () => {
  const parsed = parseSeatingScheduleTimes({
    ...times,
    receptionStartTime: "19:00:00",
  });
  assert.equal(parsed.ok, true);
  if (parsed.ok) assert.equal(parsed.times.receptionStartTime, "19:00");
  assert.equal(clockMinusMinutes("00:15", 30), "23:45");
  assert.deepEqual(missingSeatingScheduleLabels({ receptionStartTime: "19:00" }), []);
});

test("partial and empty seating hours are accepted without inventing values", () => {
  const partial = parseSeatingScheduleTimes({
    receptionStartTime: "19:00",
    plannedChuppahTime: "",
    plannedSeatingStartTime: "",
    teamArrivalTime: "",
  });
  assert.equal(partial.ok, true);
  if (partial.ok) {
    assert.equal(partial.times.receptionStartTime, "19:00");
    assert.equal(partial.times.plannedChuppahTime, "");
    assert.equal(partial.times.plannedSeatingStartTime, "");
    assert.equal(partial.times.teamArrivalTime, "");
  }

  const empty = parseSeatingScheduleTimes({});
  assert.equal(empty.ok, true);
  if (empty.ok) {
    assert.equal(empty.times.receptionStartTime, "");
    assert.equal(empty.times.teamArrivalTime, "");
  }

  const invalid = parseSeatingScheduleTimes({ receptionStartTime: "25:99" });
  assert.equal(invalid.ok, false);
  if (!invalid.ok) {
    assert.deepEqual(invalid.missing, ["שעת תחילת קבלת הפנים"]);
  }
});

test("seating service start display distinguishes explicit times from defaults", () => {
  assert.deepEqual(seatingServiceStartDisplay({ plannedSeatingStartTime: "19:45" }), {
    kind: "explicit",
    time: "19:45",
    label: "שעת תחילת ההושבה המתוכננת",
  });
  assert.deepEqual(
    seatingServiceStartDisplay({ receptionStartTime: "19:00" }),
    {
      kind: "default_reception",
      time: "19:00",
      text: SEATING_START_DEFAULT_WITH_RECEPTION,
    },
  );
  assert.deepEqual(seatingServiceStartDisplay({}), {
    kind: "default_unscheduled",
    text: SEATING_START_DEFAULT_UNSCHEDULED,
  });
  assert.deepEqual(
    seatingServiceStartDisplay({
      receptionStartTime: "19:00",
      plannedSeatingStartTime: "19:30",
    }),
    {
      kind: "explicit",
      time: "19:30",
      label: "שעת תחילת ההושבה המתוכננת",
    },
  );
});

test("a draft stores the approved times and a later issued change does not replace them", () => {
  const draft = applySeatingScheduleUpdate({
    nextTimes: times,
    status: "draft",
    actor: { userId: "user-1", name: "נועה" },
    now: "2026-10-09T18:00:00.000Z",
  });
  assert.equal(draft.ok, true);
  if (!draft.ok) return;
  assert.equal(draft.schedule.receptionStartTime, "19:00");
  assert.equal(draft.schedule.approvedByName, "נועה");
  assert.deepEqual(draft.schedule.changes, []);

  const changed = applySeatingScheduleUpdate({
    current: draft.schedule,
    nextTimes: { ...times, plannedSeatingStartTime: "21:00" },
    status: "sent",
    actor: { userId: "user-2", name: "יוסי" },
    now: "2026-10-10T09:30:00.000Z",
  });
  assert.equal(changed.ok, true);
  if (!changed.ok) return;
  assert.equal(changed.schedule.plannedSeatingStartTime, "19:30");
  assert.equal(changed.schedule.approvedAt, "2026-10-09T18:00:00.000Z");
  assert.equal(changed.schedule.approvedByName, "נועה");
  assert.equal(changed.schedule.changes.length, 1);
  assert.equal(changed.schedule.changes[0].plannedSeatingStartTime, "21:00");
  assert.equal(changed.schedule.changes[0].changedByUserId, "user-2");
  assert.equal(changed.schedule.changes[0].changedByName, "יוסי");
  assert.equal(changed.schedule.changes[0].changedAt, "2026-10-10T09:30:00.000Z");

  const repeat = applySeatingScheduleUpdate({
    current: changed.schedule,
    nextTimes: { ...times, plannedSeatingStartTime: "21:00" },
    status: "signed",
    actor: { userId: "user-2", name: "יוסי" },
    now: "2026-10-10T10:00:00.000Z",
  });
  assert.equal(repeat.ok, true);
  if (!repeat.ok) return;
  assert.equal(repeat.changed, false);
  assert.equal(repeat.schedule.changes.length, 1);
  assert.equal(repeat.schedule.plannedSeatingStartTime, "19:30");
});

test("an issued document without original times cannot be backfilled", () => {
  const result = applySeatingScheduleUpdate({
    nextTimes: times,
    status: "signed",
    actor: { userId: "user-1", name: "נועה" },
  });
  assert.equal(result.ok, false);
});

test("a partial draft schedule can later receive a change log when the document is frozen", () => {
  const draft = applySeatingScheduleUpdate({
    nextTimes: {
      receptionStartTime: "19:00",
      plannedChuppahTime: "",
      plannedSeatingStartTime: "",
      teamArrivalTime: "",
    },
    status: "draft",
    actor: { userId: "user-1", name: "נועה" },
    now: "2026-10-09T18:00:00.000Z",
  });
  assert.equal(draft.ok, true);
  if (!draft.ok) return;

  const changed = applySeatingScheduleUpdate({
    current: draft.schedule,
    nextTimes: {
      receptionStartTime: "19:00",
      plannedChuppahTime: "20:30",
      plannedSeatingStartTime: "",
      teamArrivalTime: "",
    },
    status: "sent",
    actor: { userId: "user-2", name: "יוסי" },
    now: "2026-10-10T09:30:00.000Z",
  });
  assert.equal(changed.ok, true);
  if (!changed.ok) return;
  assert.equal(changed.schedule.receptionStartTime, "19:00");
  assert.equal(changed.schedule.plannedChuppahTime, "");
  assert.equal(changed.schedule.changes.length, 1);
  assert.equal(changed.schedule.changes[0].plannedChuppahTime, "20:30");
});

test("the customer document keeps the approved hours and hides the change log", () => {
  const sanitized = sanitizeSalesDocumentForCustomer({
    seatingSchedule: {
      ...times,
      approvedAt: "2026-10-09T18:00:00.000Z",
      approvedByUserId: "user-1",
      approvedByName: "נועה",
      changes: [
        {
          ...times,
          plannedSeatingStartTime: "21:00",
          changedAt: "2026-10-10T09:30:00.000Z",
          changedByUserId: "user-2",
          changedByName: "יוסי",
        },
      ],
    },
  });

  assert.deepEqual(sanitized?.seatingSchedule, times);
  assert.equal(
    toCustomerSeatingSchedule(sanitized?.seatingSchedule)?.teamArrivalTime,
    "18:30",
  );
});

test("a quote shows only event hours that were actually saved", () => {
  const onlyReception = toCustomerSeatingSchedule({
    receptionStartTime: "19:30",
    plannedChuppahTime: "",
    plannedSeatingStartTime: "לא הוגדר",
    teamArrivalTime: null,
  });

  assert.deepEqual(onlyReception, { receptionStartTime: "19:30" });
  assert.equal(toCustomerSeatingSchedule({ receptionStartTime: "" }), null);
  assert.equal(JSON.stringify(onlyReception).includes("לא הוגדר"), false);
});
