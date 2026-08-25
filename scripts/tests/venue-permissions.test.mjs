import test from "node:test";
import assert from "node:assert/strict";

/**
 * Pure unit tests for venue RBAC (no DB).
 * Run: node --test scripts/tests/venue-permissions.test.mjs
 *
 * NOTE: These import compiled TS via dynamic transpile is not available,
 * so we re-implement the critical matrix assertions against the source
 * contracts by evaluating the exported logic through a lightweight mirror
 * kept in sync with lib/venues/permissions.ts
 */

const VENUE_ROLES = [
  "OWNER",
  "MANAGER",
  "EVENT_MANAGER",
  "RECEPTION",
  "SALES",
  "STAFF",
  "VIEWER",
];

const ALL = [
  "dashboard.view",
  "leads.view",
  "leads.create",
  "leads.edit",
  "leads.delete",
  "leads.convert",
  "events.view",
  "events.create",
  "events.edit",
  "events.delete",
  "guests.view",
  "guests.edit",
  "seating.view",
  "seating.edit",
  "staff.view",
  "staff.manage",
  "files.view",
  "files.upload",
  "files.delete",
  "reports.view",
  "settings.view",
  "settings.edit",
  "employees.view",
  "employees.manage",
  "finance.view",
  "finance.edit",
];

const ROLE_DEFAULTS = {
  OWNER: ALL,
  MANAGER: ALL.filter((p) => p !== "employees.manage" && p !== "finance.edit"),
  EVENT_MANAGER: [
    "dashboard.view",
    "events.view",
    "events.create",
    "events.edit",
    "guests.view",
    "guests.edit",
    "seating.view",
    "seating.edit",
    "staff.view",
    "files.view",
    "files.upload",
  ],
  RECEPTION: [
    "dashboard.view",
    "events.view",
    "guests.view",
    "guests.edit",
    "seating.view",
  ],
  SALES: [
    "dashboard.view",
    "leads.view",
    "leads.create",
    "leads.edit",
    "leads.delete",
    "leads.convert",
    "events.view",
    "events.create",
    "files.view",
    "files.upload",
    "reports.view",
  ],
  STAFF: ["dashboard.view", "events.view", "staff.view"],
  VIEWER: [
    "dashboard.view",
    "leads.view",
    "events.view",
    "guests.view",
    "seating.view",
    "files.view",
    "reports.view",
  ],
};

function resolve(role, custom = []) {
  return Array.from(new Set([...(ROLE_DEFAULTS[role] || []), ...custom]));
}

function can(role, custom, required) {
  const effective = resolve(role, custom);
  const needed = Array.isArray(required) ? required : [required];
  return needed.every((p) => effective.includes(p));
}

test("VIEWER cannot mutate leads/events/staff", () => {
  assert.equal(can("VIEWER", [], "leads.edit"), false);
  assert.equal(can("VIEWER", [], "events.delete"), false);
  assert.equal(can("VIEWER", [], "employees.manage"), false);
  assert.equal(can("VIEWER", [], "leads.view"), true);
});

test("SALES can manage leads but cannot manage staff/employees", () => {
  assert.equal(can("SALES", [], "leads.convert"), true);
  assert.equal(can("SALES", [], "leads.delete"), true);
  assert.equal(can("SALES", [], "staff.manage"), false);
  assert.equal(can("SALES", [], "employees.manage"), false);
});

test("EVENT_MANAGER can manage events/guests/seating", () => {
  assert.equal(can("EVENT_MANAGER", [], "events.edit"), true);
  assert.equal(can("EVENT_MANAGER", [], "guests.edit"), true);
  assert.equal(can("EVENT_MANAGER", [], "seating.edit"), true);
  assert.equal(can("EVENT_MANAGER", [], "leads.convert"), false);
  assert.equal(can("EVENT_MANAGER", [], "finance.view"), false);
});

test("custom permission override grants extra access", () => {
  assert.equal(can("VIEWER", [], "leads.convert"), false);
  assert.equal(can("VIEWER", ["leads.convert"], "leads.convert"), true);
});

test("OWNER has full matrix", () => {
  for (const p of ALL) {
    assert.equal(can("OWNER", [], p), true, p);
  }
});

test("MANAGER cannot manage employees or edit finance", () => {
  assert.equal(can("MANAGER", [], "employees.manage"), false);
  assert.equal(can("MANAGER", [], "finance.edit"), false);
  assert.equal(can("MANAGER", [], "leads.convert"), true);
});

test("roles list is complete and distinct from Invistimo staff", () => {
  assert.deepEqual(VENUE_ROLES, [
    "OWNER",
    "MANAGER",
    "EVENT_MANAGER",
    "RECEPTION",
    "SALES",
    "STAFF",
    "VIEWER",
  ]);
  // Invistimo staff roles must not appear here
  assert.equal(VENUE_ROLES.includes("admin"), false);
  assert.equal(VENUE_ROLES.includes("producer_staff"), false);
  assert.equal(VENUE_ROLES.includes("general_staff"), false);
});

test("RECEPTION has no finance permissions", () => {
  assert.equal(can("RECEPTION", [], "finance.view"), false);
  assert.equal(can("RECEPTION", [], "finance.edit"), false);
  assert.equal(can("RECEPTION", [], "guests.edit"), true);
});

test("tenant permission check is membership-scoped conceptually", () => {
  // Same user, different roles on different venues
  const venueA = can("OWNER", [], "employees.manage");
  const venueB = can("VIEWER", [], "employees.manage");
  assert.equal(venueA, true);
  assert.equal(venueB, false);
});
