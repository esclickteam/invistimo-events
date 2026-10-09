import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  overlayGuestTableAssignments,
  plannedAllocatedSeats,
  guestHasSavedTable,
} from "../../lib/seating/overlayGuestTableAssignments";

test("overlay restores yesterday table numbers without moving arrived guests already on the map", () => {
  const tables = [
    {
      id: "t12",
      name: "שולחן 12",
      number: 12,
      seats: 12,
      seatedGuests: [
        { guestId: "arrived", seatIndex: 0 },
        { guestId: "arrived", seatIndex: 1 },
      ],
    },
  ];

  const guests = [
    {
      _id: "arrived",
      tableName: "שולחן 12",
      arrivedCount: 2,
      actualArrivedCount: 2,
    },
    {
      _id: "missing",
      tableName: "שולחן 12",
      arrivedCount: 4,
      guestsCount: 4,
      actualArrivedCount: 0,
    },
    {
      _id: "moved-live",
      tableName: "שולחן 3",
      arrivedCount: 3,
      actualArrivedCount: 3,
    },
  ];

  const { tables: next, overlaidGuestIds } = overlayGuestTableAssignments(
    tables,
    guests
  );

  assert.deepEqual(overlaidGuestIds, ["missing"]);
  assert.equal(
    next[0].seatedGuests.filter((s: any) => s.guestId === "arrived").length,
    2,
    "arrived guest chairs stay exactly as they were"
  );
  assert.equal(
    next[0].seatedGuests.filter((s: any) => s.guestId === "missing").length,
    4
  );
  assert.equal(
    next[0].seatedGuests.some((s: any) => s.guestId === "moved-live"),
    false,
    "do not invent a table that is not on this map"
  );
});

test("release surplus uses RSVP allocated seats when map chairs were wiped", () => {
  const guest = {
    tableName: "שולחן 5",
    arrivedCount: 5,
    guestsCount: 5,
    actualArrivedCount: 3,
  };
  assert.equal(guestHasSavedTable(guest), true);
  assert.equal(plannedAllocatedSeats(guest, 0), 5);
  assert.equal(5 - 3, 2);
});

test("tables API and dashboard keep overlay + release wiring", () => {
  const tablesRoute = readFileSync(
    "app/api/seating/tables/[eventId]/route.ts",
    "utf8"
  );
  const page = readFileSync("app/dashboard/page.tsx", "utf8");
  assert.match(tablesRoute, /overlayGuestTableAssignments/);
  assert.match(tablesRoute, /overlayOnly: true/);
  assert.match(page, /plannedAllocatedSeats/);
  assert.match(page, /שחרור \$\{surplus\} כיסאות/);
  assert.doesNotMatch(page, /if \(!hasSeatingAccess\) \{\s*setSeatingTables\(\[\]\)/);
});
