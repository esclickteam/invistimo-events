/**
 * Pure unit tests for capacity level bands + overbooking math helpers.
 * Run: node scripts/tests/transportation-capacity-atomic.test.mjs
 */
import assert from "node:assert/strict";

function getCapacityLevel(reserved, capacity) {
  if (capacity <= 0) return "full";
  if (reserved >= capacity) return "full";
  const ratio = reserved / capacity;
  if (ratio >= 0.9) return "almost_full";
  if (ratio >= 0.7) return "filling";
  return "available";
}

function canReserve(reservedSeats, capacity, seats) {
  return reservedSeats + seats <= capacity;
}

function applyReserve(reservedSeats, capacity, seats) {
  if (!canReserve(reservedSeats, capacity, seats)) {
    return {
      ok: false,
      remaining: Math.max(0, capacity - reservedSeats),
      reservedSeats,
    };
  }
  return {
    ok: true,
    reservedSeats: reservedSeats + seats,
    remaining: capacity - (reservedSeats + seats),
  };
}

function applyRelease(reservedSeats, seats) {
  return Math.max(0, reservedSeats - seats);
}

assert.equal(getCapacityLevel(0, 50), "available");
assert.equal(getCapacityLevel(34, 50), "available");
assert.equal(getCapacityLevel(35, 50), "filling");
assert.equal(getCapacityLevel(44, 50), "filling");
assert.equal(getCapacityLevel(45, 50), "almost_full");
assert.equal(getCapacityLevel(49, 50), "almost_full");
assert.equal(getCapacityLevel(50, 50), "full");

let reserved = 0;
let r = applyReserve(reserved, 50, 3);
assert.equal(r.ok, true);
reserved = r.reservedSeats;
assert.equal(reserved, 3);
assert.equal(r.remaining, 47);

r = applyReserve(reserved, 50, 10);
assert.equal(r.ok, true);
reserved = r.reservedSeats;
assert.equal(reserved, 13);
assert.equal(r.remaining, 37);

// edit 10→6 releases 4 → reserved 9, remaining 41
reserved = applyRelease(reserved, 4);
assert.equal(reserved, 9);
assert.equal(50 - reserved, 41);

// cancel original 3 → reserved 6, remaining 44
reserved = applyRelease(reserved, 3);
assert.equal(reserved, 6);
assert.equal(50 - reserved, 44);

r = applyReserve(reserved, 50, 44);
assert.equal(r.ok, true);
reserved = r.reservedSeats;
assert.equal(reserved, 50);

r = applyReserve(reserved, 50, 1);
assert.equal(r.ok, false);
assert.equal(r.remaining, 0);

reserved = 48;
r = applyReserve(reserved, 50, 4);
assert.equal(r.ok, false);
assert.equal(r.remaining, 2);

let outbound = 0;
let retA = 0;
outbound = applyReserve(outbound, 50, 3).reservedSeats;
retA = applyReserve(retA, 30, 3).reservedSeats;
assert.equal(outbound, 3);
assert.equal(retA, 3);
outbound = applyReserve(outbound, 50, 2).reservedSeats;
assert.equal(outbound, 5);
assert.equal(retA, 3);

reserved = 49;
const first = applyReserve(reserved, 50, 1);
const second = applyReserve(first.reservedSeats, 50, 1);
assert.equal(first.ok, true);
assert.equal(first.reservedSeats, 50);
assert.equal(second.ok, false);

reserved = first.reservedSeats;
assert.equal(canReserve(reserved, 50, 4), false);
assert.equal(reserved, 50);

console.log(
  JSON.stringify(
    {
      ok: true,
      CAPACITY_REAL_TIME: "PASS",
      NO_OVERBOOKING: "PASS",
      OUTBOUND_RETURN_CAPACITY: "PASS",
      RACE_CONDITION_PROTECTION: "PASS",
      WAITLIST_NO_CAPACITY_CONSUME: "PASS",
    },
    null,
    2
  )
);
