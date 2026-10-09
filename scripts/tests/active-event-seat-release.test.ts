import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { countAllocatedSeats } from "../../lib/seating/allocatedSeats";
import { trimGuestSeatsToCount } from "../../lib/seating/liveOccupancy";
import {
  getSeatsCountForLiveMove,
  countGuestAllocatedChairs,
} from "../../lib/seating/preservePlannedSeating";
import {
  buildSeatReleaseAuditEntry,
  logSeatReleaseAudit,
} from "../../lib/seating/seatReleaseAudit";

function cloneTables(tables: any[]) {
  return JSON.parse(JSON.stringify(tables));
}

test("active event: planned seats stay until explicit release", () => {
  const tables = [
    {
      id: "t5",
      name: "שולחן 5",
      seats: 12,
      seatedGuests: [
        { guestId: "fam", seatIndex: 0 },
        { guestId: "fam", seatIndex: 1 },
        { guestId: "fam", seatIndex: 2 },
        { guestId: "fam", seatIndex: 3 },
        { guestId: "fam", seatIndex: 4 },
        { guestId: "other", seatIndex: 5 },
        { guestId: "other", seatIndex: 6 },
      ],
    },
  ];

  // Before anyone arrives — couple plan remains fully allocated.
  assert.equal(countAllocatedSeats(tables, "fam"), 5);
  assert.equal(
    getSeatsCountForLiveMove({ actualArrivedCount: 0, arrivedCount: 5 }, 5),
    5
  );

  // Mark 3 arrived — still 5 chairs until explicit release.
  const afterArrival = cloneTables(tables);
  assert.equal(countAllocatedSeats(afterArrival, "fam"), 5);
  assert.equal(countAllocatedSeats(afterArrival, "other"), 2);

  // Explicit release for fam only (actual=3).
  const released = trimGuestSeatsToCount(afterArrival[0], "fam", 3);
  assert.equal(released, 2);
  assert.equal(countAllocatedSeats(afterArrival, "fam"), 3);
  assert.equal(
    countAllocatedSeats(afterArrival, "other"),
    2,
    "other guest chairs must stay untouched"
  );

  const audit = logSeatReleaseAudit(
    buildSeatReleaseAuditEntry({
      guestId: "fam",
      guestName: "משפחה",
      allocatedBefore: 5,
      actualArrivedCount: 3,
      released: 2,
      source: "syncSeatsToActual",
      actorUserId: "usher-1",
    })
  );

  assert.equal(audit.released, 2);
  assert.equal(audit.allocatedAfter, 3);
  assert.equal(audit.actualArrivedCount, 3);
});

test("active event: never auto-release when actualArrivedCount is 0", () => {
  const allocated = countGuestAllocatedChairs(
    [
      {
        seatedGuests: Array.from({ length: 12 }, (_, seatIndex) => ({
          guestId: "g",
          seatIndex,
        })),
      },
    ],
    "g"
  );
  assert.equal(allocated, 12);
  assert.equal(
    getSeatsCountForLiveMove({ actualArrivedCount: 0, arrivedCount: 12 }, allocated),
    12
  );
});

test("release button + explicit sync remain wired (no auto reclaim on move)", () => {
  const page = readFileSync("app/dashboard/page.tsx", "utf8");
  const route = readFileSync("app/api/guests/[id]/route.ts", "utf8");
  const move = readFileSync(
    "app/api/seating/live/move-guest-table/route.ts",
    "utf8"
  );

  assert.match(page, /שחרור \$\{surplus\} כיסאות/);
  assert.match(page, /surplus > 0 && actual > 0/);
  assert.match(page, /setSeatReleaseGuestId/);
  assert.match(page, /syncSeatsToActual: true/);
  assert.match(route, /trimGuestSeatsToCount/);
  assert.match(route, /seatReleaseLog/);
  assert.match(route, /releasableSeats/);
  assert.doesNotMatch(route, /reclaimUnusedAllocatedSeats/);
  assert.doesNotMatch(move, /reclaimUnusedAllocatedSeats/);
});

test("PR does not ship migrations or arrival resets", () => {
  const route = readFileSync("app/api/guests/[id]/route.ts", "utf8");
  assert.match(
    route,
    /Do not change actualArrivedCount; only adjust seated chairs/
  );
  assert.match(route, /Never reclaim \/ delete other guests/);
});
