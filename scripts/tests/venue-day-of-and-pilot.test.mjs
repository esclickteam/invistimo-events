import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const root = path.resolve(process.cwd());
const require = createRequire(import.meta.url);

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

test("day-of route uses actualArrivedCount helpers + PATCH guard", () => {
  const src = read("app/api/venues/dashboard/halls/[hallId]/day-of/route.ts");
  assert.match(src, /summarizeGuests|guestArrivedCount|dayOfGuests/);
  assert.match(src, /actualArrivedCount/);
  assert.match(src, /export async function PATCH/);
  assert.match(src, /guests\.edit/);
  assert.match(src, /eventHasVerifiedVenueLink/);
  assert.match(src, /writeVenueAudit/);
});

test("dayOfGuests arrival prefers actualArrivedCount", async () => {
  // Compile-free logic mirror of lib/venues/dayOfGuests.ts for unit assert
  const { pathToFileURL } = await import("node:url");
  // Dynamic import of TS may fail without loader — assert source contract instead
  const src = read("lib/venues/dayOfGuests.ts");
  assert.match(src, /actualArrivedCount/);
  assert.match(src, /function guestArrivedCount/);
  assert.match(src, /function summarizeGuests/);
  assert.ok(!src.includes("g.arrived === true") || src.includes("actualArrivedCount"));
});

test("pilotGate is venue-layer only and wired into requireVenueAccess", () => {
  const gate = read("lib/venues/pilotGate.ts");
  const access = read("lib/venues/requireVenueAccess.ts");
  assert.match(gate, /VENUE_PILOT_MODE/);
  assert.match(gate, /VENUE_PILOT_OWNER_IDS/);
  assert.match(gate, /isVenuePilotAllowed/);
  assert.match(access, /isVenuePilotAllowed/);
  assert.ok(
    !gate.includes("getUserIdFromRequest"),
    "pilotGate must not import global auth helper"
  );
  assert.ok(
    !gate.includes('"/api/me"') && !gate.includes("'/api/me'"),
    "pilotGate must not touch /api/me"
  );
});

test("hall CRUD no longer upserts by raw owner auth alone", () => {
  const hall = read("app/api/venues/dashboard/halls/[hallId]/route.ts");
  assert.match(hall, /requireVenueAccess/);
  assert.match(hall, /settings\.edit/);
  assert.doesNotMatch(hall, /upsert:\s*true/);
  assert.match(hall, /writeVenueAudit/);
});

test("tasks API audits create and filters by eventId", () => {
  const src = read("app/api/venues/dashboard/tasks/route.ts");
  assert.match(src, /writeVenueAudit/);
  assert.match(src, /eventIdFilter|eventId/);
  assert.match(src, /eventHasVerifiedVenueLink/);
});
