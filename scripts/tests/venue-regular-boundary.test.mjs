import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd());

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

/**
 * Pure invariant helpers mirrored from lib/venues/eventVenueLinkInvariant.ts
 * so CI can prove classification without Mongo.
 */
function cleanString(value) {
  return String(value || "").trim();
}

function idsEqual(a, b) {
  return cleanString(a) !== "" && cleanString(a) === cleanString(b);
}

function isDeterministicVenueLink({ event, venueEvent, hall }) {
  if (!event || !venueEvent || !hall) return false;
  const eventId = cleanString(event._id);
  const linked = cleanString(venueEvent.linkedEventId);
  if (!eventId || !idsEqual(eventId, linked)) return false;
  const eventHallId = cleanString(event.venueHallId);
  const veHallId = cleanString(venueEvent.hallId || venueEvent.venueId);
  const hallKey = cleanString(hall.id || hall._id);
  if (!hallKey) return false;
  if (!idsEqual(veHallId, hallKey) && !idsEqual(veHallId, hall._id)) {
    return false;
  }
  if (
    eventHallId &&
    !idsEqual(eventHallId, hallKey) &&
    !idsEqual(eventHallId, hall._id) &&
    !idsEqual(eventHallId, veHallId)
  ) {
    return false;
  }
  return true;
}

function classify({ event, venueEvent, hall }) {
  const status = cleanString(event?.venueAccessStatus) || "none";
  if (status !== "linked") {
    return { classification: "REGULAR", reason: "not linked" };
  }
  if (isDeterministicVenueLink({ event, venueEvent, hall })) {
    return { classification: "TRUE_VENUE_LINK", reason: "verified" };
  }
  return { classification: "FALSE_VENUE_LINK", reason: "missing relation" };
}

/** Invitation sync must only write venueClient* when verified. */
function invitationSyncWouldSetLinked({ event, venueEvent, hall }) {
  return isDeterministicVenueLink({ event, venueEvent, hall });
}

test("Regular Event invitation sync must NOT promote to linked", () => {
  const event = {
    _id: "evt-regular-1",
    venueAccessStatus: "none",
    venueHallId: "",
  };
  assert.equal(
    invitationSyncWouldSetLinked({
      event,
      venueEvent: null,
      hall: null,
    }),
    false
  );
  assert.equal(classify({ event, venueEvent: null, hall: null }).classification, "REGULAR");
});

test("stale venueAccessStatus=linked without VenueEvent is FALSE_VENUE_LINK", () => {
  const event = {
    _id: "evt-false-1",
    venueAccessStatus: "linked",
    venueHallId: "ghost-hall",
  };
  const result = classify({ event, venueEvent: null, hall: null });
  assert.equal(result.classification, "FALSE_VENUE_LINK");
  assert.equal(
    invitationSyncWouldSetLinked({ event, venueEvent: null, hall: null }),
    false
  );
});

test("true VenueHall + VenueEvent.linkedEventId is TRUE_VENUE_LINK", () => {
  const event = {
    _id: "evt-true-1",
    venueAccessStatus: "linked",
    venueHallId: "hall-a",
  };
  const venueEvent = {
    _id: "ve-1",
    hallId: "hall-a",
    linkedEventId: "evt-true-1",
  };
  const hall = { id: "hall-a", _id: "mongo-hall-a" };
  const result = classify({ event, venueEvent, hall });
  assert.equal(result.classification, "TRUE_VENUE_LINK");
  assert.equal(invitationSyncWouldSetLinked({ event, venueEvent, hall }), true);
});

test("Regular customer access does not require venueId / VenueEvent / VenueMembership", () => {
  const regularCustomerView = {
    eventId: "evt-regular-1",
    invitationId: "inv-1",
    guestCount: 12,
    rsvpYes: 8,
    seatingAssigned: 5,
    venueId: undefined,
    venueEvent: null,
    venueMembership: null,
    venueAccessStatus: "none",
  };
  assert.equal(regularCustomerView.venueId, undefined);
  assert.equal(regularCustomerView.venueEvent, null);
  assert.equal(regularCustomerView.venueMembership, null);
  assert.notEqual(regularCustomerView.venueAccessStatus, "linked");
  assert.ok(regularCustomerView.eventId);
  assert.ok(regularCustomerView.invitationId);
  assert.ok(regularCustomerView.guestCount > 0);
});

test("invitations/route.ts no longer stamps linked unconditionally", () => {
  const src = read("app/api/invitations/route.ts");
  assert.match(src, /eventHasVerifiedVenueLink/);
  assert.match(src, /NEVER promotes Regular/i);
  // The old unconditional $set block must not remain
  assert.doesNotMatch(
    src,
    /venueClientRecordsCount:\s*0,\s*venueAccessStatus:\s*"linked"/
  );
  // Bare linked match removed from event lookup $or
  assert.doesNotMatch(
    src,
    /\$or:\s*\[[\s\S]*\{\s*venueAccessStatus:\s*"linked"\s*\}/
  );
  // createEvent path creates VenueEvent before linked
  assert.match(src, /VenueEvent\.findOneAndUpdate/);
  assert.match(src, /VENUE_HALL_NOT_FOUND/);
});

test("eventVenueLinkInvariant module exists with hard boundary helpers", () => {
  const src = read("lib/venues/eventVenueLinkInvariant.ts");
  assert.match(src, /TRUE_VENUE_LINK/);
  assert.match(src, /FALSE_VENUE_LINK/);
  assert.match(src, /assessEventVenueLink/);
  assert.match(src, /eventHasVerifiedVenueLink/);
  assert.match(src, /must NOT receive venueAccessStatus/);
});

test("menus / tasks / client-invite enforce requireVenueAccess server-side", () => {
  const menus = read(
    "app/api/venues/dashboard/halls/[hallId]/menus/route.ts"
  );
  assert.match(menus, /requireVenueAccess/);
  assert.doesNotMatch(menus, /getUserIdFromRequest/);

  const dishes = read(
    "app/api/venues/dashboard/halls/[hallId]/menu-dishes/route.ts"
  );
  assert.match(dishes, /requireVenueAccess/);
  assert.doesNotMatch(dishes, /getUserIdFromRequest/);

  const tasks = read("app/api/venues/dashboard/tasks/route.ts");
  assert.match(tasks, /requireVenueDashboardActor/);
  assert.doesNotMatch(tasks, /getUserIdFromRequest/);

  const taskId = read("app/api/venues/dashboard/tasks/[taskId]/route.ts");
  assert.match(taskId, /requireVenueDashboardActor/);

  const invite = read(
    "app/api/venues/dashboard/events/[eventId]/client-invite/route.ts"
  );
  assert.match(invite, /requireVenueAccess/);
  assert.match(invite, /eventHasVerifiedVenueLink/);
  assert.doesNotMatch(invite, /getUserIdFromRequest/);
});

test("staging false-link cleanup script refuses production invite DB", () => {
  const src = read("scripts/staging/cleanup-false-venue-links.ts");
  assert.match(src, /REFUSING production invite/);
  assert.match(src, /FALSE_VENUE_LINK/);
  assert.match(src, /DRY_RUN/);
  assert.match(src, /ALLOW_PROD_WRITE is not permitted/);
});
