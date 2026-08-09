import test from "node:test";
import assert from "node:assert/strict";

/**
 * Conceptual multi-venue isolation tests (no DB).
 * Mirrors tenant boundaries enforced by VenueMembership + hallId scoping.
 */

function resolveMembershipRole(memberships, venueId) {
  const row = memberships.find(
    (m) => m.venueId === venueId && m.status === "active"
  );
  return row?.role ?? null;
}

function canOnVenue(memberships, venueId, permission, roleMatrix) {
  const role = resolveMembershipRole(memberships, venueId);
  if (!role) return false;
  return (roleMatrix[role] || []).includes(permission);
}

function scopedLeads(leads, hallId) {
  return leads.filter((lead) => lead.hallId === hallId);
}

const ROLE_DEFAULTS = {
  OWNER: ["employees.manage", "leads.delete", "finance.edit"],
  MANAGER: ["leads.delete", "finance.view"],
  VIEWER: ["leads.view"],
  SALES: ["leads.convert", "leads.delete"],
};

const memberships = [
  { venueId: "hall-a", role: "OWNER", status: "active" },
  { venueId: "hall-b", role: "VIEWER", status: "active" },
  { venueId: "hall-c", role: "SALES", status: "disabled" },
];

const leads = [
  { id: "l1", hallId: "hall-a", name: "Lead A" },
  { id: "l2", hallId: "hall-b", name: "Lead B" },
  { id: "l3", hallId: "hall-c", name: "Lead C" },
];

test("same user has OWNER on hall-a but VIEWER on hall-b", () => {
  assert.equal(resolveMembershipRole(memberships, "hall-a"), "OWNER");
  assert.equal(resolveMembershipRole(memberships, "hall-b"), "VIEWER");
  assert.equal(
    canOnVenue(memberships, "hall-a", "employees.manage", ROLE_DEFAULTS),
    true
  );
  assert.equal(
    canOnVenue(memberships, "hall-b", "employees.manage", ROLE_DEFAULTS),
    false
  );
});

test("disabled membership on hall-c is ignored for access", () => {
  assert.equal(resolveMembershipRole(memberships, "hall-c"), null);
  assert.equal(
    canOnVenue(memberships, "hall-c", "leads.convert", ROLE_DEFAULTS),
    false
  );
});

test("lead queries scoped by hallId cannot cross venues", () => {
  const hallALeads = scopedLeads(leads, "hall-a");
  const hallBLeads = scopedLeads(leads, "hall-b");

  assert.deepEqual(hallALeads.map((l) => l.id), ["l1"]);
  assert.deepEqual(hallBLeads.map((l) => l.id), ["l2"]);
  assert.equal(
    scopedLeads(leads, "hall-a").some((l) => l.hallId === "hall-b"),
    false
  );
});

test("SALES on one hall does not grant convert on another hall", () => {
  const multi = [
    { venueId: "hall-a", role: "VIEWER", status: "active" },
    { venueId: "hall-b", role: "SALES", status: "active" },
  ];

  assert.equal(
    canOnVenue(multi, "hall-a", "leads.convert", ROLE_DEFAULTS),
    false
  );
  assert.equal(
    canOnVenue(multi, "hall-b", "leads.convert", ROLE_DEFAULTS),
    true
  );
});

test("OWNER permissions do not leak when role differs per venue", () => {
  const multi = [
    { venueId: "venue-x", role: "OWNER", status: "active" },
    { venueId: "venue-y", role: "MANAGER", status: "active" },
  ];

  assert.equal(
    canOnVenue(multi, "venue-x", "finance.edit", ROLE_DEFAULTS),
    true
  );
  assert.equal(
    canOnVenue(multi, "venue-y", "finance.edit", ROLE_DEFAULTS),
    false
  );
  assert.equal(
    canOnVenue(multi, "venue-y", "finance.view", ROLE_DEFAULTS),
    true
  );
});

test("membership venueId is the tenant key, not user global role", () => {
  const userGlobalRole = "user";
  const venueRole = resolveMembershipRole(memberships, "hall-a");

  assert.equal(userGlobalRole, "user");
  assert.equal(venueRole, "OWNER");
  assert.notEqual(userGlobalRole, venueRole);
});
