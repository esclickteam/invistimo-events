import assert from "node:assert/strict";
import test from "node:test";
import { phoneKey, phonesMatch, preferPhone } from "./phones.ts";

test("israeli numbers with and without country code match", () => {
  assert.equal(phoneKey("050-123-4567"), phoneKey("+972501234567"));
  assert.equal(phonesMatch("0501234567", "972501234567"), true);
  assert.equal(phonesMatch("0501234567", "0509999999"), false);
});

test("mobile numbers are preferred", () => {
  const picked = preferPhone([
    { number: "031234567", label: "home" },
    { number: "0501111111", label: "mobile" },
  ]);
  assert.equal(picked?.number, "0501111111");
});
