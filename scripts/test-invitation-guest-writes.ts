import assert from "node:assert/strict";
import test from "node:test";

import {
  applyCoalescedGuestWrites,
  coalesceLatestByGuestId,
  countLegacySeatingGuestDocumentWrites,
  diffSeatingAssignment,
  emptySeatingAssignment,
  getChangedFields,
  planInvitationGuestSeatingWrites,
  planSingleGuestWrite,
  resetInvitationGuestWriteInstrumentation,
  seatingWritesTouchIndexedFields,
  simulateRepeatedSeatingSaves,
  type SeatingAssignment,
} from "../lib/invitationGuestWrites";

function makeGuest(index: number, assignment: SeatingAssignment = emptySeatingAssignment()) {
  return {
    _id: `guest-${String(index).padStart(3, "0")}`,
    tableId: assignment.tableId,
    tableNumber: assignment.tableNumber,
    tableName: assignment.tableName,
  };
}

function makeSyncedEvent(guestCount = 299) {
  const tables = [
    {
      id: "table-1",
      name: "שולחן 1",
      seatedGuests: Array.from({ length: 150 }, (_, i) => ({
        guestId: `guest-${String(i + 1).padStart(3, "0")}`,
      })),
    },
    {
      id: "table-2",
      name: "שולחן 2",
      seatedGuests: Array.from({ length: guestCount - 150 }, (_, i) => ({
        guestId: `guest-${String(i + 151).padStart(3, "0")}`,
      })),
    },
  ];

  const guests = [
    ...tables[0].seatedGuests.map((_, index) =>
      makeGuest(index + 1, {
        tableId: "table-1",
        tableNumber: 1,
        tableName: "שולחן 1",
      })
    ),
    ...tables[1].seatedGuests.map((_, index) =>
      makeGuest(index + 151, {
        tableId: "table-2",
        tableNumber: 2,
        tableName: "שולחן 2",
      })
    ),
  ];

  return { guests, tables };
}

test("legacy seating save rewrote every guest on every autosave", () => {
  const before = countLegacySeatingGuestDocumentWrites({
    guestCount: 299,
    saveCount: 57,
  });

  assert.equal(before, 17043);
  assert.ok(before > 17000);
});

test("unchanged seating state produces 0 Mongo writes", () => {
  resetInvitationGuestWriteInstrumentation();
  const { guests, tables } = makeSyncedEvent(299);

  const plan = planInvitationGuestSeatingWrites({
    guests,
    tables,
    source: "test.seating.save",
    eventId: "event-observed",
    invitationId: "invitation-observed",
    instrument: false,
  });

  assert.equal(plan.writes.length, 0);
  assert.equal(plan.skippedUnchanged, 299);
  assert.equal(seatingWritesTouchIndexedFields(plan.writes).length, 0);
});

test("one real guest seating change produces at most one write", () => {
  resetInvitationGuestWriteInstrumentation();
  const { guests, tables } = makeSyncedEvent(299);
  guests[0].tableId = null;
  guests[0].tableNumber = null;
  guests[0].tableName = "";

  const plan = planInvitationGuestSeatingWrites({
    guests,
    tables,
    source: "test.seating.save",
    instrument: false,
  });

  assert.equal(plan.writes.length, 1);
  assert.equal(plan.writes[0].guestId, "guest-001");
  assert.deepEqual(plan.writes[0].changedFields.sort(), [
    "tableId",
    "tableName",
    "tableNumber",
  ]);
});

test("identical realtime seating events coalesce to one write", () => {
  resetInvitationGuestWriteInstrumentation();
  const { guests, tables } = makeSyncedEvent(20);

  guests[3].tableId = "table-old";
  guests[3].tableNumber = 9;
  guests[3].tableName = "שולחן 9";

  const identicalSaves = Array.from({ length: 20 }, () =>
    planInvitationGuestSeatingWrites({
      guests,
      tables,
      source: "test.seating.realtime",
      instrument: false,
    })
  );

  assert.equal(identicalSaves[0].writes.length, 1);

  const applied = simulateRepeatedSeatingSaves({
    guests,
    tables,
    saveCount: 20,
    source: "test.seating.realtime",
  });

  assert.equal(applied.writesPerSave[0], 1);
  assert.deepEqual(applied.writesPerSave.slice(1), Array(19).fill(0));
  assert.equal(applied.totalWrites, 1);
});

test("299 guests x 57 identical seating saves write 0 after sync", () => {
  resetInvitationGuestWriteInstrumentation();
  const { guests, tables } = makeSyncedEvent(299);

  const after = simulateRepeatedSeatingSaves({
    guests,
    tables,
    saveCount: 57,
    source: "test.incident.299x57",
  });

  const before = countLegacySeatingGuestDocumentWrites({
    guestCount: 299,
    saveCount: 57,
  });

  assert.equal(before, 17043);
  assert.equal(after.totalWrites, 0);
  assert.deepEqual(after.writesPerSave, Array(57).fill(0));
});

test("batch seating updates do not create N times dozens of writes", () => {
  resetInvitationGuestWriteInstrumentation();
  const { guests, tables } = makeSyncedEvent(299);

  guests[0].tableId = null;
  guests[1].tableId = null;
  guests[2].tableId = null;
  guests[10].tableName = "other";
  guests[20].tableNumber = 8;

  const plan = planInvitationGuestSeatingWrites({
    guests,
    tables,
    source: "test.seating.batch",
    instrument: false,
  });

  assert.equal(plan.writes.length, 5);
  assert.ok(plan.writes.length < 20);
  assert.ok(plan.writes.length < guests.length);
  assert.equal(plan.skippedUnchanged, 294);
});

test("RSVP state that did not change produces 0 writes", () => {
  resetInvitationGuestWriteInstrumentation();

  const plan = planSingleGuestWrite({
    source: "test.rsvp",
    guestId: "guest-001",
    current: { rsvp: "yes", arrivedCount: 2, notes: "ok" },
    next: { rsvp: "yes", arrivedCount: 2, notes: "ok" },
    keys: ["rsvp", "arrivedCount", "notes"],
  });

  assert.equal(plan.shouldWrite, false);
  assert.deepEqual(plan.changedFields, []);
});

test("several identical RSVP realtime events become one write", () => {
  resetInvitationGuestWriteInstrumentation();

  const events = Array.from({ length: 40 }, () => ({
    guestId: "guest-001",
    rsvp: "yes",
    arrivedCount: 2,
  }));

  const coalesced = coalesceLatestByGuestId(events);
  assert.equal(coalesced.length, 1);

  const result = applyCoalescedGuestWrites({
    source: "test.rsvp.realtime",
    events,
    getCurrent: () => ({ rsvp: "pending", arrivedCount: 0 }),
    getNext: (event) => ({
      rsvp: event.rsvp,
      arrivedCount: event.arrivedCount,
    }),
    keys: ["rsvp", "arrivedCount"],
  });

  assert.equal(result.writes.length, 1);
  assert.equal(result.skipped, 0);

  const alreadySynced = applyCoalescedGuestWrites({
    source: "test.rsvp.realtime",
    events,
    getCurrent: () => ({ rsvp: "yes", arrivedCount: 2 }),
    getNext: (event) => ({
      rsvp: event.rsvp,
      arrivedCount: event.arrivedCount,
    }),
    keys: ["rsvp", "arrivedCount"],
  });

  assert.equal(alreadySynced.writes.length, 0);
});

test("seating $set never includes indexed identity/RSVP fields", () => {
  const { guests, tables } = makeSyncedEvent(12);
  guests[0].tableId = null;

  const plan = planInvitationGuestSeatingWrites({
    guests,
    tables,
    source: "test.indexes",
    instrument: false,
  });

  assert.deepEqual(seatingWritesTouchIndexedFields(plan.writes), []);
  assert.ok(!("updatedAt" in (plan.writes[0]?.fields || {})));
});

test("diff helper reports only fields that actually changed", () => {
  const changed = diffSeatingAssignment(
    { tableId: "t1", tableNumber: 1, tableName: "שולחן 1" },
    { tableId: "t1", tableNumber: 2, tableName: "שולחן 1" }
  );

  assert.deepEqual(changed, ["tableNumber"]);
  assert.deepEqual(
    getChangedFields(
      { rsvp: "yes", notes: "a" },
      { rsvp: "yes", notes: "a" },
      ["rsvp", "notes"]
    ),
    []
  );
});
