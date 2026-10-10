/**
 * IVR routes must use AuthPayload.userId — never the whole auth object — for User.findById.
 */

import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  resolveAuthUserId,
  resolveOptionalTargetUserId,
} from "../../lib/calls/ivrRequestAuth";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../.."
);

test("resolveAuthUserId extracts bare ObjectId from AuthPayload", () => {
  const id = "507f1f77bcf86cd799439011";
  assert.equal(
    resolveAuthUserId({
      userId: id,
      role: "user",
      impersonated: false,
    }),
    id
  );
});

test("resolveAuthUserId rejects whole auth-shaped objects and invalid ids", () => {
  assert.equal(resolveAuthUserId(null), null);
  assert.equal(resolveAuthUserId(undefined), null);
  assert.equal(
    resolveAuthUserId({
      // @ts-expect-error intentional bad shape
      userId: {
        userId: "507f1f77bcf86cd799439011",
        role: "user",
      },
      role: "user",
      impersonated: false,
    }),
    null
  );
  assert.equal(
    resolveAuthUserId({
      userId: "not-an-objectid",
      role: "user",
      impersonated: false,
    }),
    null
  );
});

test("resolveOptionalTargetUserId never accepts objects", () => {
  assert.equal(
    resolveOptionalTargetUserId({
      userId: "507f1f77bcf86cd799439011",
      role: "admin",
    }),
    null
  );
  assert.equal(
    resolveOptionalTargetUserId("507f1f77bcf86cd799439011"),
    "507f1f77bcf86cd799439011"
  );
});

test("all IVR API routes use ivrRequestAuth helpers (no raw findById on auth payload)", () => {
  const dir = path.join(root, "app/api/ivr");
  const files: string[] = [];

  function walk(current: string) {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name === "route.ts") files.push(full);
    }
  }
  walk(dir);

  assert.ok(files.length >= 5, "expected IVR route files");

  for (const file of files) {
    const src = readFileSync(file, "utf8");
    const rel = path.relative(root, file).split(path.sep).join("/");

    // media/[token] is public and does not use session auth.
    if (rel.includes("media/")) continue;

    assert.match(
      src,
      /requireIvrSession|resolveAuthUserId|ivrRequestAuth/,
      `${rel} must use ivrRequestAuth helpers`
    );
    assert.doesNotMatch(
      src,
      /User\.findById\(\s*userId\s*\)/,
      `${rel} must not pass raw getUserIdFromRequest result to findById`
    );
    assert.doesNotMatch(
      src,
      /const userId = await getUserIdFromRequest/,
      `${rel} must not treat AuthPayload as a string userId`
    );
  }
});
