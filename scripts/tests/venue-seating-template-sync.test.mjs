import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

test("venue seating sync helper exists and preserves guests", () => {
  const src = read("lib/venues/syncSeatingTemplateToLinkedEvents.ts");
  assert.match(src, /syncSeatingTemplateToLinkedEvents/);
  assert.match(src, /mergeGuestAssignments/);
  assert.match(src, /sourceTemplateUpdatedAt/);
  assert.match(src, /Never invents Events|never invents/i);
});

test("seating template PUT triggers live sync", () => {
  const src = read("app/api/venues/dashboard/seating-templates/route.ts");
  assert.match(src, /syncSeatingTemplateToLinkedEvents/);
});

test("client invite selects template and syncs seating", () => {
  const src = read(
    "app/api/venues/dashboard/events/[eventId]/client-invite/route.ts"
  );
  assert.match(src, /selectedSeatingTemplateId/);
  assert.match(src, /syncSeatingTemplateToLinkedEvents/);
});

test("venues hide marketing footer and use VenueAppHeader", () => {
  const shell = read("app/ClientShell.tsx");
  const layout = read("app/components/LayoutShell.tsx");
  assert.match(shell, /VenueAppHeader/);
  assert.match(shell, /isVenues/);
  assert.match(layout, /isVenues/);
  assert.match(layout, /shouldHideFooter/);
});

test("seating page polls venue template updates", () => {
  const src = read("app/dashboard/seating/page.tsx");
  assert.match(src, /VENUE TEMPLATE → EVENT LIVE SYNC/);
  assert.match(src, /sourceTemplateUpdatedAt/);
});
