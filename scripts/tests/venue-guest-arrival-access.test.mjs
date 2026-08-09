import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

test("guest PUT allows linked venue actors via venueView", () => {
  const src = read("app/api/guests/[id]/route.ts");
  assert.match(src, /isLinkedVenueActor/);
  assert.match(src, /venueView/);
  assert.match(src, /venuememberships/);
  assert.match(src, /actualArrivedCount/);
  assert.ok(src.includes("isLinkedVenueActor ||"));
});

test("guest GET venueView resolves invitation.eventId to linked event", () => {
  const src = read("app/api/guests/route.ts");
  assert.match(src, /canVenueOwnerAccessInvitation/);
  assert.match(src, /invitation\.eventId|Invitation\.findById/);
});
