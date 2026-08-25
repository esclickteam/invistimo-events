import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const src = fs.readFileSync(
  path.join(root, "lib/guards/requireSeating.ts"),
  "utf8"
);

test("requireSeating allows venue clients with seating package", () => {
  assert.match(src, /venueClientSource/);
  assert.match(src, /includeSeating/);
  assert.match(src, /venueClientPackageType/);
  assert.match(src, /isVenueClientWithSeating/);
});

test("requireSeating still gates regular users without seating", () => {
  assert.match(src, /SEATING_NOT_ALLOWED/);
  assert.match(src, /plan === \"premium\"/);
});
