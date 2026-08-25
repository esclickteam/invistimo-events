import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd());
function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

test("notifications cover core venue mutation types", () => {
  const alerts = read("lib/venues/alerts.ts");
  assert.match(alerts, /ALERT_TYPE_PERMISSION/);
  assert.match(alerts, /refreshProactiveVenueAlerts/);
  assert.match(alerts, /dedupeKey/);
  const model = read("models/VenueAlert.ts");
  for (const t of ["tasks", "events", "clients", "files", "day_of"]) {
    assert.ok(model.includes(`"${t}"`), `missing alert type ${t}`);
  }
  assert.match(read("app/api/venues/dashboard/tasks/route.ts"), /createVenueAlert/);
  assert.match(
    read("app/api/venues/dashboard/events/[eventId]/client-invite/route.ts"),
    /createVenueAlert/
  );
  assert.match(
    read("app/api/venues/dashboard/events/[eventId]/route.ts"),
    /createVenueAlert/
  );
});

test("event menu uses requireLinkedVenueEventAccess not owner-raw", () => {
  const src = read("app/api/venues/dashboard/events/[eventId]/menu/route.ts");
  assert.match(src, /requireLinkedVenueEventAccess/);
  assert.ok(!src.includes("getUserIdFromRequest"));
  assert.match(src, /venueOwnerId: (ownerId|guard\.ctx\.ownerId)/);
  assert.match(src, /writeVenueAudit/);
});

test("hall menu routes keep requireVenueAccess", () => {
  for (const rel of [
    "app/api/venues/dashboard/halls/[hallId]/menus/route.ts",
    "app/api/venues/dashboard/halls/[hallId]/menu-dishes/route.ts",
    "app/api/venues/dashboard/halls/[hallId]/menu-dish-categories/route.ts",
  ]) {
    const src = read(rel);
    assert.match(src, /requireVenueAccess/);
    assert.match(src, /writeVenueAudit/);
  }
});

test("equipment module is real API+UI not placeholder", () => {
  assert.ok(fs.existsSync(path.join(root, "models/VenueEquipment.ts")));
  assert.ok(
    fs.existsSync(path.join(root, "models/VenueEquipmentAssignment.ts"))
  );
  const api = read(
    "app/api/venues/dashboard/halls/[hallId]/equipment/route.ts"
  );
  assert.match(api, /requireVenueAccess/);
  assert.match(api, /eventHasVerifiedVenueLink/);
  assert.match(api, /writeVenueAudit/);
  const page = read(
    "app/venues/dashboard/halls/[hallId]/equipment/page.tsx"
  );
  assert.match(page, /שיוך לאירוע|assign/);
  const overview = read("app/venues/dashboard/halls/[hallId]/page.tsx");
  assert.ok(!overview.includes("אחרי שנחבר את המודול"));
  assert.match(overview, /equipment/);
});

test("activity API supports actor/action/entity/date filters", () => {
  const src = read(
    "app/api/venues/dashboard/halls/[hallId]/activity/route.ts"
  );
  assert.match(src, /actorUserId/);
  assert.match(src, /targetType/);
  assert.match(src, /from/);
  assert.match(src, /to/);
  const ui = read("app/venues/dashboard/halls/[hallId]/activity/page.tsx");
  assert.match(ui, /סינון/);
});
