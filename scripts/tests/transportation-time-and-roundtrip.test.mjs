/**
 * Unit tests for time normalization + round-trip dual capacity counters.
 * Run: node scripts/tests/transportation-time-and-roundtrip.test.mjs
 */
import assert from "node:assert/strict";

function normalizeTimeInput(raw) {
  const value = String(raw || "").trim();
  if (!value) return "";
  const colon = value.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (colon) {
    const h = Number(colon[1]);
    const m = Number(colon[2]);
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    }
    return "";
  }
  const digits = value.replace(/\D/g, "");
  if (digits.length === 3 || digits.length === 4) {
    const padded = digits.padStart(4, "0");
    const h = Number(padded.slice(0, 2));
    const m = Number(padded.slice(2, 4));
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    }
  }
  return "";
}

function canReserve(reservedSeats, capacity, seats) {
  return reservedSeats + seats <= capacity;
}

function applyReserve(reservedSeats, capacity, seats) {
  if (!canReserve(reservedSeats, capacity, seats)) {
    return { ok: false, reservedSeats, remaining: Math.max(0, capacity - reservedSeats) };
  }
  return {
    ok: true,
    reservedSeats: reservedSeats + seats,
    remaining: capacity - (reservedSeats + seats),
  };
}

assert.equal(normalizeTimeInput("8:00"), "08:00");
assert.equal(normalizeTimeInput("08:00"), "08:00");
assert.equal(normalizeTimeInput("00:30"), "00:30");
assert.equal(normalizeTimeInput("01:15"), "01:15");
assert.equal(normalizeTimeInput("0030"), "00:30");
assert.equal(normalizeTimeInput("745"), "07:45");
assert.equal(normalizeTimeInput("25:00"), "");
assert.equal(normalizeTimeInput("bad"), "");

// Round-trip: independent outbound / return counters
let outboundReserved = 0;
let returnReserved = 0;
const outboundCapacity = 40;
const returnCapacity = 35;

let out = applyReserve(outboundReserved, outboundCapacity, 10);
assert.equal(out.ok, true);
outboundReserved = out.reservedSeats;

let ret = applyReserve(returnReserved, returnCapacity, 10);
assert.equal(ret.ok, true);
returnReserved = ret.reservedSeats;

assert.equal(outboundReserved, 10);
assert.equal(returnReserved, 10);

// Fill return without affecting outbound
ret = applyReserve(returnReserved, returnCapacity, 25);
assert.equal(ret.ok, true);
returnReserved = ret.reservedSeats;
assert.equal(returnReserved, 35);
assert.equal(outboundReserved, 10);

ret = applyReserve(returnReserved, returnCapacity, 1);
assert.equal(ret.ok, false);
assert.equal(outboundReserved, 10);

out = applyReserve(outboundReserved, outboundCapacity, 30);
assert.equal(out.ok, true);
outboundReserved = out.reservedSeats;
assert.equal(outboundReserved, 40);

console.log(
  JSON.stringify(
    {
      ok: true,
      TIME_NORMALIZE: "PASS",
      ROUND_TRIP_DUAL_CAPACITY: "PASS",
    },
    null,
    2
  )
);
