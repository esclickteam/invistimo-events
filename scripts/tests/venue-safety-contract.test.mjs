import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd());
function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

test("Safety Contract doc exists with central rules", () => {
  const src = read("docs/venues-safety-contract.md");
  assert.match(src, /VENUE SCOPE = VERIFIED VENUE CUSTOMERS ONLY/);
  assert.match(src, /REGULAR USERS \/ EVENTS \/ INVITATIONS/);
  assert.match(src, /requireVenueAccess/);
  assert.match(src, /eventHasVerifiedVenueLink/);
  assert.match(src, /PROTECTED CORE/);
  assert.match(src, /FALSE VENUE LINKS/);
});

test("CI protected-core guard exists and lists core paths", () => {
  const src = read("scripts/ci/venue-pr-protected-core-guard.mjs");
  assert.match(src, /getUserIdFromRequest/);
  assert.ok(src.includes("Event"));
  assert.ok(src.includes("Invitation"));
  assert.ok(src.includes("InvitationGuest"));
  assert.match(src, /venue-protected-core-allowlist/);
  assert.ok(
    fs.existsSync(path.join(root, ".github/workflows/venue-safety.yml"))
  );
});

test("requireLinkedVenueEventAccess requires verified VenueEvent relation", () => {
  const src = read("lib/venues/requireLinkedEventAccess.ts");
  assert.match(src, /eventHasVerifiedVenueLink|assessEventVenueLink/);
  assert.match(src, /requireVenueAccess/);
  // Must not trust venueAccessStatus alone
  assert.match(src, /verified|VenueEvent/i);
});

test("invitation sync still never promotes Regular unconditionally", () => {
  const src = read("app/api/invitations/route.ts");
  assert.match(src, /eventHasVerifiedVenueLink/);
  assert.match(src, /NEVER promotes Regular/i);
});

test("client-contract send requires venue access guard", () => {
  const src = read(
    "app/api/venues/dashboard/events/[eventId]/client-contract/send/route.ts"
  );
  assert.match(src, /requireLinkedVenueEventAccess/);
  assert.match(src, /events\.edit/);
});
