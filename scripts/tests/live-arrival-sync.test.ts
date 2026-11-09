import assert from "node:assert/strict";
import test from "node:test";

import {
  chunkGuestActivity,
  mergeActualArrivals,
  mergeGuestActivity,
} from "../../lib/dashboardGuestActivity";
import {
  isArrivalOnlyPayload,
  nextActualArrivedCount,
  resolveActualArrivedDelta,
} from "../../lib/liveArrivals/actualArrivedMath";

test("arrival delta counts people added by each device, not a stale absolute total", () => {
  assert.equal(nextActualArrivedCount({ current: 4, delta: 1 }), 5);
  assert.equal(nextActualArrivedCount({ current: 4, delta: -1 }), 3);
  assert.equal(nextActualArrivedCount({ current: 0, delta: -3 }), 0);
  assert.equal(nextActualArrivedCount({ current: 2, absolute: 7 }), 7);
  assert.equal(resolveActualArrivedDelta(1.9), 1);
  assert.equal(resolveActualArrivedDelta("1"), null);
});

test("two devices incrementing the same guest do not collapse to the last absolute write", () => {
  let stored = 0;
  const device = (base: number, clicks: number) => {
    const delta = clicks;
    stored = nextActualArrivedCount({ current: stored, delta });
    assert.equal(base + clicks >= 0, true);
  };

  device(0, 2);
  device(0, 1);
  assert.equal(stored, 3);
});

test("mergeActualArrivals updates other devices and keeps an in-flight edit", () => {
  const guests = [
    { _id: "a", actualArrivedCount: 0, name: "א" },
    { _id: "b", actualArrivedCount: 1, name: "ב" },
  ];
  const pending = new Set(["b"]);
  const next = mergeActualArrivals(
    guests,
    [
      { id: "a", actualArrivedCount: 4 },
      { id: "b", actualArrivedCount: 9 },
    ],
    pending
  );

  assert.equal(next[0].actualArrivedCount, 4);
  assert.equal(next[1].actualArrivedCount, 1);
  assert.equal(next[1].name, "ב");
  assert.equal(
    mergeActualArrivals(next, [
      { id: "a", actualArrivedCount: 4 },
      { id: "b", actualArrivedCount: 1 },
    ]),
    next
  );
});

test("activity snapshots can arrive in small chunks and still sum people", () => {
  const patches = Array.from({ length: 5 }, (_, index) => ({
    id: `g${index}`,
    actualArrivedCount: index + 1,
    rsvp: "yes" as const,
    arrivedCount: index + 1,
    guestsCount: index + 1,
  }));
  const chunks = chunkGuestActivity(patches, 2);
  assert.equal(chunks.length, 3);

  let guests = patches.map((patch) => ({
    _id: patch.id,
    actualArrivedCount: 0,
    rsvp: "pending",
    arrivedCount: 0,
    guestsCount: 1,
  }));

  for (const chunk of chunks) {
    guests = mergeGuestActivity(guests, chunk);
  }

  const people = guests.reduce((sum, guest) => sum + Number(guest.actualArrivedCount || 0), 0);
  assert.equal(people, 15);
  assert.equal(guests.filter((guest) => guest.actualArrivedCount > 0).length, 5);
});

test("plus and minus from the live list is an arrival-only write", () => {
  assert.equal(
    isArrivalOnlyPayload({
      actualArrivedDelta: 1,
      syncSeatsToActual: false,
      releaseSeatsToActual: false,
      checkSeatOptionsOnly: false,
    }),
    true
  );
  assert.equal(
    isArrivalOnlyPayload({
      actualArrivedCount: 2,
      name: "מישהו",
    }),
    false
  );
});
