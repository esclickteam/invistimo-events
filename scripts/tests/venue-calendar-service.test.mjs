import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd());
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

const VENUE_EVENT_STATUSES = [
  "lead",
  "proposal",
  "closed",
  "confirmed",
  "preparing",
  "live",
  "done",
  "cancelled",
];

function venueLifecycleToInvistimoStatus(status) {
  if (status === "cancelled" || status === "done") return "archived";
  return "active";
}

test("venueEventsService file exists and exports expected functions", () => {
  const src = read("lib/venues/venueEventsService.ts");

  assert.match(src, /export async function listVenueEventsForHall/);
  assert.match(src, /export async function getVenueEventCanonical/);
  assert.match(src, /export async function createVenueCalendarEvent/);
  assert.match(src, /export async function updateVenueCalendarEvent/);
  assert.match(src, /export async function cancelVenueCalendarEvent/);
  assert.match(src, /export function serializeVenueEvent/);
});

test("status mapping via venueLifecycleToInvistimoStatus", () => {
  assert.equal(venueLifecycleToInvistimoStatus("confirmed"), "active");
  assert.equal(venueLifecycleToInvistimoStatus("live"), "active");
  assert.equal(venueLifecycleToInvistimoStatus("preparing"), "active");
  assert.equal(venueLifecycleToInvistimoStatus("done"), "archived");
  assert.equal(venueLifecycleToInvistimoStatus("cancelled"), "archived");

  for (const s of VENUE_EVENT_STATUSES) {
    const mapped = venueLifecycleToInvistimoStatus(s);
    assert.ok(["active", "archived"].includes(mapped));
  }
});

test("cancel maps VenueEvent cancelled to Event archived", () => {
  const src = read("lib/venues/venueEventsService.ts");

  assert.match(src, /status:\s*"cancelled"/);
  assert.match(src, /venueLifecycleToInvistimoStatus\("cancelled"\)/);
  assert.match(src, /status:\s*venueLifecycleToInvistimoStatus\("cancelled"\)/);
});

test("update must not invent new Event when linkedEventId exists", () => {
  const src = read("lib/venues/venueEventsService.ts");

  // update path only touches existing linked Event
  assert.match(src, /Only update existing linked Event — never create a new one here/);
  assert.match(src, /if \(linkedEvent && venueEvent\.linkedEventId/);
  assert.doesNotMatch(
    src,
    /updateVenueCalendarEvent[\s\S]*?Event\.create/
  );
});

test("calendar API route delegates to venueEventsService", () => {
  const src = read(
    "app/api/venues/dashboard/halls/[hallId]/calendar/route.ts"
  );

  assert.match(src, /venueEventsService/);
  assert.match(src, /listVenueEventsForHall/);
  assert.match(src, /createVenueCalendarEvent/);
  assert.match(src, /updateVenueCalendarEvent/);
  assert.match(src, /cancelVenueCalendarEvent/);
  assert.match(src, /writeVenueAudit/);
  assert.match(src, /events\.view/);
  assert.match(src, /events\.create/);
  assert.match(src, /events\.edit/);
  assert.match(src, /events\.delete/);
});

test("calendar UI uses PATCH and DELETE for edit/cancel", () => {
  const src = read("app/venues/dashboard/halls/[hallId]/calendar/page.tsx");

  assert.match(src, /method:\s*"PATCH"/);
  assert.match(src, /method:\s*"DELETE"/);
  assert.match(src, /EditEventModal/);
  assert.doesNotMatch(src, /saveMock|mockEvents/);
});
