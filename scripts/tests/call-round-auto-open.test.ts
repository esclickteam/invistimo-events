import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";

import CallTask from "../../models/CallTask";
import {
  getHumanCallRoundOpenAt,
  hasReachedSameDayWorkOrderOpenTime,
  shouldExposeCallRoundWorkOrder,
} from "../../lib/calls/callRoundScheduleTime";

function newTask(sortOrder: number) {
  return new CallTask({
    workOrderId: new mongoose.Types.ObjectId(),
    invitationId: new mongoose.Types.ObjectId(),
    guestId: new mongoose.Types.ObjectId(),
    round: 2,
    workDate: new Date("2026-10-12T21:00:00.000Z"),
    status: "pending",
    sortOrder,
    priority: 1,
  });
}

test("callback carry-forward task with sortOrder -1 passes validation", () => {
  const error = newTask(-1).validateSync();
  assert.equal(error?.errors?.sortOrder, undefined);
});

test("human round opens at 09:00 Israel even when scheduled for 10:00", () => {
  const scheduledAt = new Date("2026-10-13T07:00:00.000Z"); // 10:00 IDT
  assert.equal(
    getHumanCallRoundOpenAt(scheduledAt).toISOString(),
    "2026-10-13T06:00:00.000Z"
  );
});

test("round scheduled before 09:00 keeps its earlier time", () => {
  const scheduledAt = new Date("2026-10-13T05:00:00.000Z"); // 08:00 IDT
  assert.equal(
    getHumanCallRoundOpenAt(scheduledAt).toISOString(),
    scheduledAt.toISOString()
  );
});

test("same-day 10:00 round is exposed from 09:00 Israel, not before", () => {
  const scheduledAt = new Date("2026-10-13T07:00:00.000Z");
  const dateKey = "2026-10-13";

  const before = new Date("2026-10-13T05:59:00.000Z"); // 08:59 IDT
  const at = new Date("2026-10-13T06:00:00.000Z"); // 09:00 IDT
  const later = new Date("2026-10-13T11:00:00.000Z"); // 14:00 IDT

  assert.equal(hasReachedSameDayWorkOrderOpenTime({ dateKey, now: before }), false);
  assert.equal(shouldExposeCallRoundWorkOrder({ scheduledAt, dateKey, now: before }), false);
  assert.equal(shouldExposeCallRoundWorkOrder({ scheduledAt, dateKey, now: at }), true);
  assert.equal(shouldExposeCallRoundWorkOrder({ scheduledAt, dateKey, now: later }), true);
});
