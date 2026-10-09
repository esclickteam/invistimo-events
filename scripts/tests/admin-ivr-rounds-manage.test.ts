/**
 * Admin Edit User — IVR round management panel + API.
 * Source-level checks only; never places live dials.
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

test("admin IVR rounds panel mirrors WhatsApp/SMS reopen + block buttons", () => {
  const page = readSrc("app/admin/users/page.tsx");
  const panel = readSrc("app/components/admin/AdminIvrRoundsPanel.tsx");
  assert.match(page, /AdminIvrRoundsPanel/);
  assert.match(page, /invitationId=\{user\.invitationId\}/);
  assert.match(panel, /סבבי שיחות IVR/);
  assert.match(panel, /פתיחה מחדש/);
  assert.match(panel, /חסימה/);
  assert.match(panel, /בטל חסימה/);
  assert.match(panel, /bg-\[#B97821\]/);
  assert.match(panel, /bg-red-600/);
  assert.match(panel, /action: "reset"|updateRound\("reset"/);
  assert.match(panel, /updateRound\("block"/);
  assert.match(panel, /updateRound\("unblock"/);
  assert.match(panel, /לא יבוצע חיוג מיידי/);
  assert.match(panel, /תזמון מחדש/);
  // Open-now is not the primary WA/SMS-parity control.
  assert.equal(panel.includes("פתח סבב עכשיו"), false);
});

test("admin IVR reset/block never dial and never wipe attempts", () => {
  const dialer = readSrc("lib/calls/ivrDialer.ts");
  const route = readSrc("app/api/admin/users/[id]/ivr-rounds/route.ts");

  assert.match(dialer, /Never dials\. Never deletes IvrCallAttempt/);
  assert.match(dialer, /action: "stop" \| "resume" \| "reopen" \| "block"/);
  assert.match(dialer, /Allowed even when narration is not approved/);
  assert.match(route, /action === "block"/);
  assert.match(route, /action === "unblock"/);
  assert.match(route, /action === "reset"/);
  assert.match(route, /admin_ivr_round_block/);
  assert.match(route, /admin_ivr_round_reopen/);
  assert.match(route, /canReset/);

  const statusFn = dialer.slice(
    dialer.indexOf("export async function setIvrRoundAdminStatus")
  );
  const body = statusFn.slice(0, statusFn.indexOf("function resolveReadySelfAudio"));
  assert.equal(body.includes("executeIvrRound"), false);
  assert.equal(body.includes("IvrCallAttempt.delete"), false);
});

test("dial gates stay on executeIvrRound path only", () => {
  const dialer = readSrc("lib/calls/ivrDialer.ts");
  assert.match(dialer, /export async function openIvrRoundManually/);
  assert.match(dialer, /AUDIO_NOT_READY/);
  assert.match(dialer, /executeIvrRound/);
});
