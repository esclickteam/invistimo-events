import assert from "node:assert/strict";
import { test } from "node:test";
import { computeSeatingCapacity } from "../../app/(marketing)/info/guides/wedding-seating-arrangements/calcLogic";

test("30×10 seats exactly 300 confirmers", () => {
  const r = computeSeatingCapacity({
    confirmedGuests: 300,
    tablesCount: 30,
    seatsPerTable: 10,
    approvedReserves: 0,
    noShowPct: 10,
  });
  assert.equal(r.regularSeats, 300);
  assert.equal(r.totalWithReserves, 300);
  assert.equal(r.shortfall, 0);
  assert.equal(r.spare, 0);
  assert.equal(r.canSeatAllConfirmers, true);
  assert.equal(r.expectedArrivals, 270);
  assert.equal(r.noShowMasksShortfall, false);
});

test("280 seats + 0 reserves shortfall of 20 despite 10% no-show", () => {
  const r = computeSeatingCapacity({
    confirmedGuests: 300,
    tablesCount: 28,
    seatsPerTable: 10,
    approvedReserves: 0,
    noShowPct: 10,
  });
  assert.equal(r.regularSeats, 280);
  assert.equal(r.shortfall, 20);
  assert.equal(r.expectedArrivals, 270);
  assert.equal(r.canSeatAllConfirmers, false);
  assert.equal(r.noShowMasksShortfall, true);
  assert.ok(r.warnings.some((w) => w.includes("חסרים") || w.includes("20")));
});

test("280 regular + 20 approved reserves can seat all 300", () => {
  const r = computeSeatingCapacity({
    confirmedGuests: 300,
    tablesCount: 28,
    seatsPerTable: 10,
    approvedReserves: 20,
    noShowPct: 10,
  });
  assert.equal(r.totalWithReserves, 300);
  assert.equal(r.canSeatAllConfirmers, true);
  assert.equal(r.shortfall, 0);
  assert.equal(r.noShowMasksShortfall, false);
});

test("clamps negative and no-show over 100", () => {
  const r = computeSeatingCapacity({
    confirmedGuests: -5,
    tablesCount: 2,
    seatsPerTable: 10,
    approvedReserves: -1,
    noShowPct: 150,
  });
  assert.equal(r.confirmed, 0);
  assert.equal(r.approvedReserves, 0);
  assert.equal(r.expectedArrivals, 0);
  assert.equal(r.regularSeats, 20);
});

test("34 flexible tables example capacity", () => {
  // 28×9 + 6×8 = 300 seated into 34×10 = 340 capacity
  const r = computeSeatingCapacity({
    confirmedGuests: 300,
    tablesCount: 34,
    seatsPerTable: 10,
    approvedReserves: 0,
    noShowPct: 0,
  });
  assert.equal(r.regularSeats, 340);
  assert.equal(r.spare, 40);
  assert.equal(r.fullArrival, 300);
  assert.equal(r.expectedArrivals, 300);
});
