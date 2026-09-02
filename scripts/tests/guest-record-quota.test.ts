import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "path";

import {
  BILLABLE_GUEST_PHONE_FILTER,
  canAssignPhoneToGuest,
  countGuestsTowardRecordQuota,
  guestCountsTowardRecordQuota,
  guestPhoneDigits,
} from "../../lib/guestRecordQuota";

const root = path.resolve(process.cwd());

function read(rel: string) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

test("only guests with phone digits count toward record quota", () => {
  assert.equal(guestPhoneDigits("050-123-4567"), "0501234567");
  assert.equal(guestCountsTowardRecordQuota(""), false);
  assert.equal(guestCountsTowardRecordQuota(null), false);
  assert.equal(guestCountsTowardRecordQuota("   "), false);
  assert.equal(guestCountsTowardRecordQuota("0501234567"), true);

  assert.equal(
    countGuestsTowardRecordQuota([
      { phone: "0501234567" },
      { phone: "" },
      { phone: null },
      { phone: "abc" },
    ]),
    1
  );
});

test("cannot add a phone later to a guest created without one", () => {
  assert.equal(canAssignPhoneToGuest("", "0501234567"), false);
  assert.equal(canAssignPhoneToGuest(null, "0501234567"), false);
  assert.equal(canAssignPhoneToGuest("0501111111", "0502222222"), true);
  assert.equal(canAssignPhoneToGuest("", ""), true);
});

test("guest create/import/update paths use phone-based record quota", () => {
  const invitationGuests = read("app/api/invitations/[id]/guests/route.ts");
  const guestsRoute = read("app/api/guests/route.ts");
  const guestsIdRoute = read("app/api/guests/[id]/route.ts");
  const importRoute = read("app/api/guests/import/route.ts");
  const addModal = read("app/components/AddGuestModal.tsx");
  const editModal = read("app/components/EditGuestModal.tsx");
  const dashboard = read("app/dashboard/page.tsx");

  assert.match(invitationGuests, /guestCountsTowardRecordQuota|billableGuestMatch/);
  assert.match(invitationGuests, /canAssignPhoneToGuest/);
  assert.match(guestsRoute, /billableGuestMatch|countGuestsTowardRecordQuota/);
  assert.match(guestsIdRoute, /canAssignPhoneToGuest/);
  assert.match(importRoute, /guestCountsTowardRecordQuota/);
  assert.match(addModal, /billableRows/);
  assert.match(editModal, /phoneLocked/);
  assert.match(dashboard, /countGuestsTowardRecordQuota/);
  assert.equal(BILLABLE_GUEST_PHONE_FILTER.phone.$regex, "\\d");
});
