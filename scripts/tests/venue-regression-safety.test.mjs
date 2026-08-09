import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd());

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

test("VenueEmployee model is namespaced and separate from Invistimo Employee*", () => {
  const src = read("models/VenueEmployee.ts");
  assert.match(src, /VenueEmployee/);
  assert.doesNotMatch(src, /staffType/);
  assert.doesNotMatch(src, /Softphone/);
  assert.ok(fs.existsSync(path.join(root, "models/EmployeeSale.ts")));
  assert.ok(fs.existsSync(path.join(root, "models/EmployeeForm101.ts")));
});

test("VenueMembership exists for multi-venue owner", () => {
  const src = read("models/VenueMembership.ts");
  assert.match(src, /userId/);
  assert.match(src, /venueId/);
  assert.match(src, /unique: true/);
  assert.match(src, /VENUE_ROLES/);
  assert.match(src, /default: "VIEWER"/);
});

test("Event.venue fields remain optional (no required venueId)", () => {
  const src = read("models/Event.ts");
  assert.match(src, /venueOwnerId/);
  assert.match(src, /venueAccessStatus/);
  assert.doesNotMatch(src, /venueId:\s*\{\s*type:.*required:\s*true/s);
  // venueOwnerId default undefined / not required
  assert.match(src, /venueOwnerId:[\s\S]*default:\s*undefined/);
});

test("lead conversion helper creates linkedEventId and is idempotent-aware", () => {
  const src = read("lib/venues/convertLeadToEvent.ts");
  assert.match(src, /linkedEventId/);
  assert.match(src, /createdFromLeadId/);
  assert.match(src, /alreadyExisted/);
  assert.match(src, /startTransaction/);
  assert.match(src, /VenueEvent\.create/);
  assert.match(src, /Event\.create/);
});

test("CRM closeEvent uses convertLeadToVenueEvent", () => {
  const src = read(
    "app/api/venues/dashboard/halls/[hallId]/crm/route.ts"
  );
  assert.match(src, /convertLeadToVenueEvent/);
  assert.doesNotMatch(
    src,
    /if \(action === "closeEvent"\) \{\s*const event = await VenueEvent\.create/
  );
});

test("staff page no longer uses saveMock / workersInitial", () => {
  const src = read("app/venues/dashboard/halls/[hallId]/staff/page.tsx");
  assert.doesNotMatch(src, /saveMock/);
  assert.doesNotMatch(src, /workersInitial/);
  assert.doesNotMatch(src, /דניאל מזרחי/);
  assert.match(src, /saveSchedule/);
  assert.match(src, /\/api\/venues\/dashboard\/halls\//);
});

test("middleware protects /venues", () => {
  const src = read("middleware.ts");
  assert.match(src, /pathname\.startsWith\("\/venues"\)/);
  assert.match(src, /"\/venues\/:path\*"/);
});

test("employees API refuses Invistimo staff role collision", () => {
  const src = read(
    "app/api/venues/dashboard/halls/[hallId]/employees/route.ts"
  );
  assert.match(src, /employeeScope !== "venue"/);
  assert.match(src, /role === "staff"/);
  assert.match(src, /bcrypt\.hash/);
  assert.match(src, /venueUser:\s*true/);
  assert.match(src, /staffType:\s*null/);
});

test("requireVenueAccess never trusts client venueId alone", () => {
  const src = read("lib/venues/requireVenueAccess.ts");
  assert.match(src, /VenueMembership\.findOne/);
  assert.match(src, /VenueHall\.findOne/);
  assert.match(src, /isInvistimoStaff/);
});
