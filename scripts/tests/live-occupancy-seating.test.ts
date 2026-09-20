import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCurrentTableLiveOption,
  describeAllocatedGap,
  findAbsolutelyFreeSeatIndexes,
  getTableLiveActualOccupied,
  getTableLiveFreeSeats,
  reclaimUnusedAllocatedSeats,
} from "../../lib/seating/liveOccupancy";

test("LIVE free seats use actual occupancy, not planned seating", () => {
  const table = {
    capacity: 12,
    seatedGuests: [
      { guestId: "avi", seatIndex: 0 },
      { guestId: "avi", seatIndex: 1 },
      { guestId: "other1", seatIndex: 2 },
      { guestId: "other1", seatIndex: 3 },
      { guestId: "other2", seatIndex: 4 },
      { guestId: "other2", seatIndex: 5 },
      { guestId: "other3", seatIndex: 6 },
      { guestId: "other3", seatIndex: 7 },
      { guestId: "other4", seatIndex: 8 },
      { guestId: "other4", seatIndex: 9 },
      { guestId: "other5", seatIndex: 10 },
      { guestId: "other5", seatIndex: 11 },
    ],
  };

  const lookup = new Map<string, any>([
    ["avi", { _id: "avi", actualArrivedCount: 3 }],
    ["other1", { _id: "other1", actualArrivedCount: 2 }],
    ["other2", { _id: "other2", actualArrivedCount: 2 }],
    ["other3", { _id: "other3", actualArrivedCount: 2 }],
    ["other4", { _id: "other4", actualArrivedCount: 2 }],
    ["other5", { _id: "other5", actualArrivedCount: 1 }],
  ]);

  // Planned seating is 12/12, but actual occupancy with avi still at allocated=2 is 11.
  const occupied = getTableLiveActualOccupied(table, lookup, {
    focusGuestId: "avi",
    focusGuestOccupancy: 2,
  });
  assert.equal(occupied, 11);

  const free = getTableLiveFreeSeats(table, lookup, {
    focusGuestId: "avi",
    focusGuestOccupancy: 2,
  });
  assert.equal(free, 1);

  const option = buildCurrentTableLiveOption({
    table,
    tableId: "t3",
    tableName: "שולחן 3",
    guestLookup: lookup,
    guestId: "avi",
    allocated: 2,
    requiredSeats: 1,
  });

  assert.equal(option.canFit, true);
  assert.equal(option.freeSeats, 1);
  assert.equal(option.actualOccupied, 11);
  assert.equal(option.canFitPartial, false);
});

test("partial fit when current table covers only some of the shortage", () => {
  const table = {
    capacity: 12,
    seatedGuests: Array.from({ length: 12 }, (_, seatIndex) => ({
      guestId: seatIndex < 2 ? "avi" : `g${seatIndex}`,
      seatIndex,
    })),
  };

  const lookup = new Map<string, any>([
    ["avi", { _id: "avi", actualArrivedCount: 4 }],
    ...Array.from({ length: 10 }, (_, i) => [
      `g${i + 2}`,
      { _id: `g${i + 2}`, actualArrivedCount: 1 },
    ] as const),
  ]);

  const option = buildCurrentTableLiveOption({
    table,
    tableId: "t3",
    tableName: "שולחן 3",
    guestLookup: lookup,
    guestId: "avi",
    allocated: 2,
    requiredSeats: 2,
  });

  // others actual = 10, avi allocated = 2 → occupied 12, free 0
  // Adjust: others have actual 9 total
  const lookup2 = new Map<string, any>([
    ["avi", { _id: "avi", actualArrivedCount: 4 }],
    ...Array.from({ length: 10 }, (_, i) => [
      `g${i + 2}`,
      {
        _id: `g${i + 2}`,
        actualArrivedCount: i === 0 ? 0 : 1,
      },
    ] as const),
  ]);

  const option2 = buildCurrentTableLiveOption({
    table,
    tableId: "t3",
    tableName: "שולחן 3",
    guestLookup: lookup2,
    guestId: "avi",
    allocated: 2,
    requiredSeats: 2,
  });

  assert.equal(option2.freeSeats, 1);
  assert.equal(option2.canFit, false);
  assert.equal(option2.canFitPartial, true);
  assert.equal(option2.usableSeats, 1);
  assert.ok(option);
});

test("reclaim unused planned seats unlocks physical chairs", () => {
  const table = {
    capacity: 4,
    seatedGuests: [
      { guestId: "a", seatIndex: 0 },
      { guestId: "a", seatIndex: 1 },
      { guestId: "b", seatIndex: 2 },
      { guestId: "b", seatIndex: 3 },
    ],
  };

  const lookup = new Map<string, any>([
    ["a", { _id: "a", actualArrivedCount: 1 }],
    ["b", { _id: "b", actualArrivedCount: 2 }],
  ]);

  const reclaimed = reclaimUnusedAllocatedSeats(table, lookup, "b");
  assert.equal(reclaimed, 1);
  assert.equal(table.seatedGuests.length, 3);

  const free = findAbsolutelyFreeSeatIndexes(table, 2);
  assert.equal(free.length, 1);
});

test("allocated gap status", () => {
  assert.deepEqual(describeAllocatedGap(3, 2), {
    actual: 3,
    allocated: 2,
    shortage: 1,
    surplus: 0,
    diff: 1,
    status: "over",
  });
});
