import assert from "node:assert/strict";
import test from "node:test";

/**
 * Lightweight pure helpers mirroring webhook idempotency claim semantics.
 * Full Mongo webhook tests require DB; this guards the double-apply logic.
 */

function claimRsvpApply(state: {
  rsvpApplied: boolean;
}): { applied: boolean; reason?: string } {
  if (state.rsvpApplied) {
    return { applied: false, reason: "already_applied" };
  }
  state.rsvpApplied = true;
  return { applied: true };
}

function markEventProcessed(
  processed: Set<string>,
  eventId: string
): boolean {
  if (!eventId) return true;
  if (processed.has(eventId)) return false;
  processed.add(eventId);
  return true;
}

test("RSVP apply claim is one-shot", () => {
  const state = { rsvpApplied: false };
  assert.equal(claimRsvpApply(state).applied, true);
  assert.equal(claimRsvpApply(state).applied, false);
  assert.equal(state.rsvpApplied, true);
});

test("webhook event ids are idempotent", () => {
  const processed = new Set<string>();
  assert.equal(markEventProcessed(processed, "evt_1"), true);
  assert.equal(markEventProcessed(processed, "evt_1"), false);
  assert.equal(markEventProcessed(processed, "evt_2"), true);
});
