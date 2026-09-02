import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  buildPasswordSmsMessage,
  buildPasswordTargetUrl,
} from "../../lib/admin/createUserPasswordLink";

function read(path: string) {
  return fs.readFileSync(path, "utf8");
}

test("password setup and reset links use the existing public pages", () => {
  const setup = buildPasswordTargetUrl("setup", "abc123");
  const reset = buildPasswordTargetUrl("reset", "abc123");

  assert.match(setup, /\/set-password\?token=abc123$/);
  assert.match(reset, /\/reset-password\/abc123$/);
  assert.match(
    buildPasswordSmsMessage("setup", "https://www.invistimo.com/x"),
    /הגדרת סיסמה/,
  );
  assert.match(
    buildPasswordSmsMessage("reset", "https://www.invistimo.com/x"),
    /איפוס סיסמה/,
  );
});

test("admin users page exposes send-password action and modal", () => {
  const page = read("app/admin/users/page.tsx");
  const modal = read("app/admin/users/SendPasswordModal.tsx");
  const route = read("app/api/admin/users/[id]/password-link/route.ts");

  assert.match(page, /SendPasswordModal/);
  assert.match(page, /שליחת סיסמה/);
  assert.match(page, /onSendPassword/);
  assert.match(modal, /הגדרת סיסמה חדשה/);
  assert.match(modal, /איפוס סיסמה/);
  assert.match(modal, /טלפון לשליחת SMS/);
  assert.match(route, /action === "sms"/);
  assert.match(route, /createUserPasswordLink/);
});
