/**
 * Admin / sales UI must expose a required callsType choice when calls package is on.
 */

import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  "../.."
);

function readSrc(rel: string) {
  return readFileSync(path.join(root, rel), "utf8");
}

test("shared CallsTypeField exposes human + IVR radios", () => {
  const src = readSrc("app/components/admin/CallsTypeField.tsx");
  assert.match(src, /מוקד אנושי/);
  assert.match(src, /שיחות מוקלטות \(IVR\)/);
  assert.match(src, /type="radio"/);
  assert.match(src, /data-testid="calls-type-field"/);
});

test("admin sales create form requires callsType for smart/seating", () => {
  const src = readSrc("app/admin/sales/new/page.tsx");
  assert.match(src, /CallsTypeField/);
  assert.match(src, /packageIncludesCalls/);
  assert.match(src, /callsType/);
  assert.match(src, /סוג השיחות/);
  assert.match(src, /callsType !== "human" && callsType !== "ivr"/);
});

test("employee sales create form also requires callsType", () => {
  const src = readSrc("app/employee/sales/new/page.tsx");
  assert.match(src, /CallsTypeField/);
  assert.match(src, /packageIncludesCalls/);
  assert.match(src, /callsType/);
});

test("admin edit + upgrade modals show CallsTypeField when includeCalls", () => {
  const src = readSrc("app/admin/users/page.tsx");
  assert.match(src, /CallsTypeField/);
  assert.match(src, /user\.includeCalls/);
  assert.match(src, /form\.includeCalls/);
  assert.match(src, /callsType/);
});

test("admin + employee sales APIs reject missing callsType for calls packages", () => {
  const admin = readSrc("app/api/admin/sales/route.ts");
  const employee = readSrc("app/api/employee/sales/route.ts");
  assert.match(admin, /CALLS_TYPE_REQUIRED/);
  assert.match(employee, /CALLS_TYPE_REQUIRED/);
  assert.match(admin, /callsType/);
  assert.match(employee, /callsType/);
});

test("dashboard shows IvrRoundsPanel only for callsType=ivr", () => {
  const dash = readSrc("app/dashboard/page.tsx");
  assert.match(dash, /callsType === "ivr"/);
  assert.match(dash, /IvrRoundsPanel/);
});
