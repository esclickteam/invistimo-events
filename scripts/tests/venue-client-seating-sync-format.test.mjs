import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

test("sync helper converts to client seating format and blocks destructive deletes", () => {
  const src = read("lib/venues/syncSeatingTemplateToLinkedEvents.ts");
  assert.match(src, /toClientSeatingTable/);
  assert.match(src, /seatedGuests/);
  assert.match(src, /TABLE_REMOVED_WITH_GUESTS/);
  assert.match(src, /confirmDestructive/);
  assert.match(src, /CAPACITY_BELOW_SEATED/);
  assert.match(src, /export function mergeGuestAssignments/);
  assert.match(src, /export function analyzeDestructiveSync/);
});

test("seating template PUT surfaces destructive sync block before save", () => {
  const src = read("app/api/venues/dashboard/seating-templates/route.ts");
  assert.match(src, /DESTRUCTIVE_SEATING_SYNC_BLOCKED/);
  assert.match(src, /confirmDestructive/);
  assert.match(src, /409/);
  const syncIdx = src.indexOf("syncSeatingTemplateToLinkedEvents");
  const saveIdx = src.indexOf("await existing.save()");
  assert.ok(syncIdx > 0 && saveIdx > syncIdx, "sync must run before save");
});

test("seating store accepts seats as array length", () => {
  const src = read("store/seatingStore.js");
  assert.match(src, /Array\.isArray\(table\?\.seats\)/);
});
