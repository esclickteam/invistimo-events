import test from "node:test";
import assert from "node:assert/strict";

import {
  normalizeLoginIdentifier,
  normalizeLoginPassword,
  stripInvisibleChars,
} from "../../lib/auth/normalizeLoginInput";

test("stripInvisibleChars removes WhatsApp/iOS bidi and zero-width marks", () => {
  assert.equal(
    stripInvisibleChars("\u200ebdbydh045@gmail.com\u200f"),
    "bdbydh045@gmail.com"
  );
  assert.equal(
    stripInvisibleChars("bdby\u200bdh045@gmail.com"),
    "bdbydh045@gmail.com"
  );
  assert.equal(
    stripInvisibleChars("\uFEFFbdbydh045@gmail.com"),
    "bdbydh045@gmail.com"
  );
});

test("normalizeLoginIdentifier lowercases and trims", () => {
  assert.equal(
    normalizeLoginIdentifier("  \u200eBDByDH045@Gmail.COM\u200f  "),
    "bdbydh045@gmail.com"
  );
  assert.equal(normalizeLoginIdentifier(" 053-482-5046 "), "053-482-5046");
});

test("normalizeLoginPassword trims edges and invisible marks only", () => {
  assert.equal(normalizeLoginPassword("  secret pass  "), "secret pass");
  assert.equal(normalizeLoginPassword("\u200esecret\u200f"), "secret");
});
