import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import {
  computeVirtualRange,
  seatingTablesSignature,
} from "../../lib/dashboard/desktopPerf";

const page = readFileSync("app/dashboard/page.tsx", "utf8");

test("desktop guest window mounts a slice, not every guest", () => {
  const range = computeVirtualRange(650, 0, 700, 84, 8);
  assert.ok(range.end < 40);
  assert.equal(range.start, 0);
  assert.equal(range.paddingTop, 0);
  assert.ok(range.paddingBottom > 600 * 84);

  const scrolled = computeVirtualRange(650, 4200, 700, 84, 8);
  assert.ok(scrolled.start > 20);
  assert.ok(scrolled.end < scrolled.start + 40);
  assert.ok(scrolled.end < 650);
});

test("unchanged seating payload has a stable signature", () => {
  const tables = [
    { _id: "t1", name: "שולחן 1", capacity: 12, seatedGuests: [{ guestId: "a" }] },
  ];
  assert.equal(seatingTablesSignature(tables), seatingTablesSignature(tables));
  assert.notEqual(
    seatingTablesSignature(tables),
    seatingTablesSignature([{ ...tables[0], seatedGuests: [] }])
  );
});

test("countdown tick stays inside its own component", () => {
  const hero = page.slice(
    page.indexOf("function GoldenEventHero"),
    page.indexOf("function buildCountdownTarget")
  );
  assert.doesNotMatch(hero, /setInterval/);
  assert.doesNotMatch(hero, /useState\(\(\) => Date\.now\(\)\)/);
  assert.match(page, /function LiveGoldenCountdown/);
  assert.match(page, /setInterval\(\(\) => setNow\(Date\.now\(\)\), 1000\)/);
});

test("guest activity stream does not refetch seating tables", () => {
  const stream = page.slice(
    page.indexOf("new EventSource"),
    page.indexOf("source.close")
  );
  assert.doesNotMatch(stream, /loadSeatingTables/);
});

test("desktop does not keep the mobile guest list mounted", () => {
  assert.match(page, /showMobileGuests &&/);
  assert.match(page, /showDesktopGuests &&/);
  assert.match(page, /GuestsMobileList/);
});
