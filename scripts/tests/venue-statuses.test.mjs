import test from "node:test";
import assert from "node:assert/strict";

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

const INVISTIMO_EVENT_STATUSES = ["active", "archived"];

function venueLifecycleToInvistimoStatus(status) {
  if (status === "cancelled" || status === "done") return "archived";
  return "active";
}

test("venue lifecycle and Invistimo Event.status stay separate", () => {
  for (const s of VENUE_EVENT_STATUSES) {
    assert.equal(INVISTIMO_EVENT_STATUSES.includes(s), false);
  }
});

test("mapping venue lifecycle → Invistimo status", () => {
  assert.equal(venueLifecycleToInvistimoStatus("confirmed"), "active");
  assert.equal(venueLifecycleToInvistimoStatus("live"), "active");
  assert.equal(venueLifecycleToInvistimoStatus("done"), "archived");
  assert.equal(venueLifecycleToInvistimoStatus("cancelled"), "archived");
});

test("regular Event does not require venueId conceptually", () => {
  const regularEvent = {
    title: "חתונה רגילה",
    status: "active",
  };
  assert.equal("venueOwnerId" in regularEvent, false);
  assert.equal("venueHallId" in regularEvent, false);
});
