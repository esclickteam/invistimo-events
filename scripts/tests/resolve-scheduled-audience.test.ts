import test from "node:test";
import assert from "node:assert/strict";

import {
  buildScheduledGuestsQuery,
  emptyScheduleGuestIds,
  isDynamicScheduleType,
  needsInvitationDeliveryStatusPostFilter,
  needsNeverInvitedPostFilter,
  scheduleUsesExplicitGuestIds,
} from "../../lib/messages/resolveScheduledAudience";

const INV = "inv-1";

test("schedule guestIds helper is always empty", () => {
  assert.deepEqual(emptyScheduleGuestIds(), []);
});

test("all known message types are dynamic (criteria-based)", () => {
  for (const type of [
    "rsvp",
    "reminder",
    "thankyou",
    "table",
    "custom",
    "save_the_date",
    "invitation_only",
  ]) {
    assert.equal(isDynamicScheduleType(type), true);
  }
});

test("stored guestIds are ignored — RSVP rounds use live criteria", () => {
  const staleIds = ["g1", "g2"];

  assert.deepEqual(
    buildScheduledGuestsQuery({
      invitationId: INV,
      schedule: {
        type: "rsvp",
        round: 1,
        filter: "all",
        guestIds: staleIds,
      },
    }),
    { invitationId: INV }
  );

  assert.deepEqual(
    buildScheduledGuestsQuery({
      invitationId: INV,
      schedule: {
        type: "rsvp",
        round: 2,
        filter: "pending",
        guestIds: staleIds,
      },
    }),
    { invitationId: INV, rsvp: "pending" }
  );

  assert.deepEqual(
    buildScheduledGuestsQuery({
      invitationId: INV,
      schedule: {
        type: "rsvp",
        round: 3,
        filter: "pending",
        guestIds: staleIds,
      },
    }),
    { invitationId: INV, rsvp: "pending" }
  );
});

test("reminder / thankyou recompute confirmed guests at send time", () => {
  const staleIds = ["old-yes-guest"];

  assert.deepEqual(
    buildScheduledGuestsQuery({
      invitationId: INV,
      schedule: {
        type: "reminder",
        filter: "all",
        guestIds: staleIds,
      },
    }),
    { invitationId: INV, rsvp: "yes" }
  );

  assert.deepEqual(
    buildScheduledGuestsQuery({
      invitationId: INV,
      schedule: {
        type: "thankyou",
        filter: "all",
        guestIds: staleIds,
      },
    }),
    { invitationId: INV, rsvp: "yes" }
  );

  const withTable = buildScheduledGuestsQuery({
    invitationId: INV,
    schedule: {
      type: "reminder",
      filter: "withTable",
      guestIds: staleIds,
    },
  });
  assert.equal(withTable.rsvp, "yes");
  assert.ok(withTable.$or);
});

test("invitation_only uses all guests; never_invited is a post-filter", () => {
  assert.deepEqual(
    buildScheduledGuestsQuery({
      invitationId: INV,
      schedule: {
        type: "invitation_only",
        filter: "never_invited",
        guestIds: ["x"],
      },
    }),
    { invitationId: INV }
  );

  assert.equal(
    needsNeverInvitedPostFilter({
      type: "invitation_only",
      filter: "never_invited",
    }),
    true
  );

  assert.equal(
    needsNeverInvitedPostFilter({
      type: "invitation_only",
      filter: "all",
    }),
    false
  );

  assert.equal(
    needsNeverInvitedPostFilter({
      type: "rsvp",
      filter: "never_invited",
    }),
    false
  );
});

test("save_the_date audience is all guests at send time", () => {
  assert.deepEqual(
    buildScheduledGuestsQuery({
      invitationId: INV,
      schedule: {
        type: "save_the_date",
        filter: "all",
        guestIds: ["stale"],
      },
    }),
    { invitationId: INV }
  );
});

test("invitation_only failed / not_sent recompute from delivery status at send time", () => {
  assert.equal(
    needsInvitationDeliveryStatusPostFilter({
      type: "invitation_only",
      filter: "failed",
    }),
    "failed"
  );
  assert.equal(
    needsInvitationDeliveryStatusPostFilter({
      type: "invitation_only",
      filter: "not_sent",
    }),
    "not_sent"
  );
  assert.equal(
    needsInvitationDeliveryStatusPostFilter({
      type: "rsvp",
      filter: "failed",
    }),
    null
  );

  // Eligibility filters must ignore stored guestIds.
  assert.equal(
    scheduleUsesExplicitGuestIds({
      type: "invitation_only",
      filter: "failed",
      guestIds: ["g1"],
    }),
    false
  );
});
