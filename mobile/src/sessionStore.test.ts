import assert from "node:assert/strict";
import test from "node:test";
import { accessTokenExpiresAt, accessTokenNeedsRefresh } from "./jwtExpiry.ts";
import { customerError } from "./errors.ts";

test("expired access tokens need refresh without exposing the token", () => {
  const payload = Buffer.from(
    JSON.stringify({ exp: Math.floor(Date.now() / 1000) - 10 }),
    "utf8"
  ).toString("base64url");
  const token = `aaa.${payload}.sig`;
  assert.equal(accessTokenExpiresAt(token) < Date.now(), true);
  assert.equal(accessTokenNeedsRefresh(token), true);
});

test("customer errors never echo JWTs or internal codes", () => {
  assert.equal(
    customerError(401, { error: "eyJhbGciOiJIUzI1NiJ9.aaa.bbb" }),
    "יש להתחבר מחדש"
  );
  assert.equal(customerError(500, { error: "SERVER_ERROR" }), "השירות לא זמין כרגע. נסו שוב בעוד רגע.");
  assert.equal(
    customerError(undefined, { error: "מייל/טלפון או סיסמה שגויים" }),
    "מייל/טלפון או סיסמה שגויים"
  );
});
