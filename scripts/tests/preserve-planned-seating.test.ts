import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  countGuestAllocatedChairs,
  getSeatsCountForLiveMove,
  getLiveDisplaySeatCount,
} from "../../lib/seating/preservePlannedSeating";
import { reclaimUnusedAllocatedSeats } from "../../lib/seating/liveOccupancy";

test("live move preserves couple allocated chairs when actualArrivedCount is 0", () => {
  const tables = [
    {
      seatedGuests: [
        { guestId: "avi", seatIndex: 0 },
        { guestId: "avi", seatIndex: 1 },
        { guestId: "avi", seatIndex: 2 },
        { guestId: "other", seatIndex: 3 },
      ],
    },
  ];

  const allocated = countGuestAllocatedChairs(tables, "avi");
  assert.equal(allocated, 3);

  const seats = getSeatsCountForLiveMove(
    { actualArrivedCount: 0, arrivedCount: 3, guestsCount: 3 },
    allocated
  );
  assert.equal(seats, 3, "must not release planned chairs on actual=0");
});

test("live move for unseated guest with actual=0 falls back to RSVP expected", () => {
  const seats = getSeatsCountForLiveMove(
    { actualArrivedCount: 0, arrivedCount: 4, guestsCount: 4 },
    0
  );
  assert.equal(seats, 4);
});

test("live move grows with actual arrivals only when not yet allocated", () => {
  assert.equal(
    getSeatsCountForLiveMove({ actualArrivedCount: 5, guestsCount: 4 }, 0),
    5
  );
  assert.equal(
    getSeatsCountForLiveMove({ actualArrivedCount: 5, guestsCount: 4 }, 4),
    4,
    "relocating keeps existing allocation size"
  );
});

test("live display seat count keeps plan visible before check-in", () => {
  assert.equal(
    getLiveDisplaySeatCount(
      { actualArrivedCount: 0, arrivedCount: 3, guestsCount: 3 },
      3
    ),
    3
  );
  assert.equal(
    getLiveDisplaySeatCount(
      { actualArrivedCount: 2, arrivedCount: 3, guestsCount: 3 },
      3
    ),
    3
  );
});

test("reclaim helper still exists for explicit sync only — move route must not call it", () => {
  const table = {
    seatedGuests: [
      { guestId: "a", seatIndex: 0 },
      { guestId: "a", seatIndex: 1 },
      { guestId: "b", seatIndex: 2 },
    ],
  };
  const lookup = new Map<string, any>([
    ["a", { actualArrivedCount: 1 }],
    ["b", { actualArrivedCount: 1 }],
  ]);
  // Helper still works for explicit syncSeatsToActual paths / unit tests.
  assert.equal(reclaimUnusedAllocatedSeats(table, lookup, "b"), 1);

  const moveRoute = readFileSync(
    "app/api/seating/live/move-guest-table/route.ts",
    "utf8"
  );
  assert.doesNotMatch(moveRoute, /reclaimUnusedAllocatedSeats/);
  assert.match(moveRoute, /getSeatsCountForLiveMove/);
  assert.match(moveRoute, /countGuestAllocatedChairs/);
});

test("guest PATCH sync must not reclaim other guests as a side-effect", () => {
  const route = readFileSync("app/api/guests/[id]/route.ts", "utf8");
  assert.doesNotMatch(route, /reclaimUnusedAllocatedSeats/);
  assert.match(route, /trimGuestSeatsToCount/);
  assert.match(route, /Never reclaim \/ delete other guests/);
});

test("sidebar + stats keep seated guests visible without arrivals", () => {
  const sidebar = readFileSync(
    "app/dashboard/seating/SeatingSidebar.tsx",
    "utf8"
  );
  const stats = readFileSync("app/hooks/useSeatingStats.ts", "utf8");
  const renderer = readFileSync(
    "app/components/seating/TableRenderer.jsx",
    "utf8"
  );

  assert.match(sidebar, /Already-seated guests from the saved plan/);
  assert.match(sidebar, /getTableAssignmentCount/);
  assert.match(sidebar, /משובץ/);
  assert.match(stats, /Presence on the seating map is the source of truth/);
  assert.doesNotMatch(stats, /planned > 0 && guestTableMap/);
  assert.match(renderer, /table\.seatedGuests מהשרת/);
  assert.match(renderer, /משובצים:/);
  assert.match(renderer, /טרם הגיעו:/);
  assert.match(renderer, /assignedSeatsCount/);
});

test("dashboard guests API never blanks tableName when map misses a guest", () => {
  const guestsRoute = readFileSync("app/api/guests/route.ts", "utf8");
  const seatingGuests = readFileSync(
    "app/api/seating/guests/[eventId]/route.ts",
    "utf8"
  );

  assert.match(guestsRoute, /tableName \|\| guest\.tableName/);
  assert.match(seatingGuests, /Read-only overlay/);
  assert.match(seatingGuests, /fromMap\?\.tableName \|\| guest\.tableName/);
});
