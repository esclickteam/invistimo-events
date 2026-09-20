import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { countAllocatedSeats } from "../../lib/seating/allocatedSeats";

test("allocated seats count one chair per live seat index", () => {
  const tables = [
    {
      name: "שולחן 8",
      seatedGuests: [
        { guestId: "fam", seatIndex: 0 },
        { guestId: "fam", seatIndex: 1 },
        { guestId: "other", seatIndex: 2 },
      ],
    },
  ];

  assert.equal(countAllocatedSeats(tables, "fam"), 2);
  assert.equal(countAllocatedSeats(tables, "missing"), 0);
});

test("check-in and the guest stepper share actualArrived seating prompts", () => {
  const route = readFileSync("app/api/guests/[id]/route.ts", "utf8");
  const page = readFileSync("app/dashboard/page.tsx", "utf8");
  const host = readFileSync("app/dashboard/check-in/CheckInHostClient.tsx", "utf8");

  assert.match(route, /countAllocatedSeats/);
  assert.match(route, /buildCurrentTableLiveOption/);
  assert.match(route, /reclaimUnusedAllocatedSeats/);
  assert.match(route, /mode: shouldSyncSeatsToActual \? "sync" : "check"/);
  assert.match(route, /shortage/);
  assert.doesNotMatch(page, /CheckInStatusBadge/);
  assert.match(page, /הגיעו \{shortage\} אורחים יותר ממספר המקומות שהוקצו/);
  assert.match(page, /השולחן הנוכחי/);
  assert.match(page, /להושיב בשולחן/);
  assert.match(page, /שולחנות נוספים/);
  assert.match(page, /שחרור \{surplus\} כיסאות\?/);
  assert.match(page, /לא עכשיו/);
  assert.match(host, /checkSeatOptionsOnly: true/);
  assert.match(host, /חסרים \{seatPrompt\.shortage\} מקומות/);
  assert.match(host, /השולחן הנוכחי/);
  assert.match(host, /להושיב בשולחן/);
  assert.match(host, /שחרור כיסאות/);
  assert.match(host, /הכניסה נרשמה/);
  assert.match(host, /syncSeatsToActual: true/);
  assert.match(host, /move-guest-table/);
});
