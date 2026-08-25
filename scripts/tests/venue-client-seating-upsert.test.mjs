/**
 * Guards against E11000 on seatingtables.eventId unique index when
 * client-invite already materialized seating and customer activation
 * tries to attach invitationId/userId.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const helper = readFileSync(
  join(root, "lib/venues/copySeatingTemplateToClientEvent.ts"),
  "utf8"
);
const complete = readFileSync(
  join(root, "app/api/venues/client-registration/complete/route.ts"),
  "utf8"
);
const paymentSuccess = readFileSync(
  join(root, "app/api/venues/client-registration/payment-success/route.ts"),
  "utf8"
);
const activateLib = readFileSync(
  join(root, "lib/venueClient/activateVenueClientPackage.ts"),
  "utf8"
);

test("shared helper upserts seating by eventId only", () => {
  assert.match(helper, /updateOne\(\s*\{\s*eventId\s*\}/);
  assert.doesNotMatch(
    helper,
    /updateOne\(\s*\{\s*eventId:[^}]+invitationId/
  );
  assert.match(helper, /Preserve any already-synced tables/);
});

test("client-registration routes import shared seating copy helper", () => {
  assert.match(
    complete,
    /from \"@\/lib\/venues\/copySeatingTemplateToClientEvent\"/
  );
  assert.match(
    paymentSuccess,
    /from \"@\/lib\/venues\/copySeatingTemplateToClientEvent\"/
  );
  assert.match(
    activateLib,
    /from \"@\/lib\/venues\/copySeatingTemplateToClientEvent\"/
  );
  assert.doesNotMatch(complete, /async function copySeatingTemplateToClientEvent/);
  assert.doesNotMatch(
    paymentSuccess,
    /async function copySeatingTemplateToClientEvent/
  );
  assert.doesNotMatch(
    activateLib,
    /async function copySeatingTemplateToClientEvent/
  );
});
