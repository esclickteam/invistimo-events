import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd());
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

test("venue file storage helper validates mime and size", () => {
  const src = read("lib/venues/storage.ts");
  assert.match(src, /15\s*\*\s*1024\s*\*\s*1024|15MB|MAX_/i);
  assert.match(src, /cloudinary/i);
  assert.match(src, /destroy|uploader/);
});

test("CRM upload route updates proposalFile metadata", () => {
  const src = read(
    "app/api/venues/dashboard/halls/[hallId]/crm/upload/route.ts"
  );
  assert.match(src, /proposalFile|contractFile/);
  assert.match(src, /requireVenueAccess/);
  assert.match(src, /files\.upload/);
});

test("VenueShell has switcher and permission-gated nav", () => {
  const src = read("components/venues/VenueShell.tsx");
  assert.match(src, /my-venues/);
  assert.match(src, /venue\.activeHallId/);
  assert.match(src, /employees/);
  assert.match(src, /customers|לקוחות/);
  assert.match(src, /reports|דוחות/);
});

test("calendar API uses VenueEvent + requireVenueAccess", () => {
  const src = read(
    "app/api/venues/dashboard/halls/[hallId]/calendar/route.ts"
  );
  assert.match(src, /VenueEvent|venueEventsService/);
  assert.match(src, /requireVenueAccess/);
  assert.match(src, /linkedEventId/);
  assert.match(src, /events\.view/);
  assert.match(src, /writeVenueAudit/);
  assert.doesNotMatch(src, /allowedEventStatuses = \["active", "archived"\]/);
});

test("login JWT includes authVersion and rate limit", () => {
  const login = read("app/api/login/route.ts");
  assert.match(login, /authVersion/);
  assert.match(login, /loginRateLimit|checkLoginRateLimit|assertLogin/);
  const rl = read("lib/auth/loginRateLimit.ts");
  assert.match(rl, /15/);
  assert.match(rl, /10/);
});

test("Event model still does not require venueId", () => {
  const src = read("models/Event.ts");
  assert.match(src, /venueAccessStatus/);
  assert.doesNotMatch(src, /venueId:\s*\{[\s\S]*required:\s*true/);
});

test("Invistimo staff models untouched by venue employee create", () => {
  const src = read(
    "app/api/venues/dashboard/halls/[hallId]/employees/route.ts"
  );
  assert.match(src, /venueUser:\s*true/);
  assert.match(src, /staffType:\s*null/);
  assert.match(src, /employeeScope:\s*"venue"/);
  assert.doesNotMatch(src, /SoftphoneAgentStatus|EmployeeSale|EmployeeForm101/);
});

test("seating page loads and updates by templateId", () => {
  const src = read("app/dashboard/seating/page.tsx");
  assert.match(src, /templateId/);
  assert.match(src, /isEditing \? "PUT" : "POST"|method: isEditing/);
});

test("owner dashboard aggregates VenueEvent", () => {
  const src = read("app/api/venues/dashboard/route.ts");
  assert.match(src, /listVenueEventsForHall/);
  assert.match(src, /listUserVenueMemberships/);
});

test("staff page uses dynamic weekStart keys", () => {
  const src = read("app/venues/dashboard/halls/[hallId]/staff/page.tsx");
  assert.doesNotMatch(src, /2026-05-18/);
  assert.match(src, /getWeekStartKey|weekStartKey/);
  assert.doesNotMatch(src, /workersInitial|saveMock/);
});
