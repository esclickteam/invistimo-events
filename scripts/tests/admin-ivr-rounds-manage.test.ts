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

test("admin IVR rounds panel is wired into Edit User message rounds", () => {
  const page = readSrc("app/admin/users/page.tsx");
  const panel = readSrc("app/components/admin/AdminIvrRoundsPanel.tsx");
  assert.match(page, /AdminIvrRoundsPanel/);
  assert.match(page, /callsType === "ivr"/);
  assert.match(page, /invitationId=\{user\.invitationId\}/);
  assert.match(panel, /סבבי שיחות IVR/);
  assert.match(panel, /פתח סבב עכשיו/);
  assert.match(panel, /פתח מחדש סבב/);
  assert.match(panel, /תקן סטטוס/);
  assert.match(panel, /אשר קריינות לאחר האזנה/);
  assert.match(panel, /data-testid="admin-ivr-rounds-panel"/);
  assert.match(panel, /action: "preview"/);
  assert.match(panel, /action: "open"/);
  assert.match(panel, /action: "approve_audio"/);
  assert.match(panel, /showReopen/);
  assert.match(panel, /eligibility/);
  assert.match(panel, /nextSteps/);
});

test("admin IVR rounds API reuses executeIvrRound via openIvrRoundManually", () => {
  const route = readSrc("app/api/admin/users/[id]/ivr-rounds/route.ts");
  const dialer = readSrc("lib/calls/ivrDialer.ts");

  assert.match(route, /openIvrRoundManually/);
  assert.match(route, /setIvrRoundAdminStatus/);
  assert.match(route, /writeAdminAuditLog/);
  assert.match(route, /admin_ivr_round_open/);
  assert.match(route, /FORCE_NOT_ALLOWED/);
  assert.match(route, /canReopen/);
  assert.match(route, /showReopen/);
  assert.match(route, /buildEligibilityBreakdown/);
  assert.match(route, /resolveEventActivity/);
  assert.match(route, /invitation_only/);
  assert.match(route, /canApproveAudio/);
  assert.match(route, /repair_status/);
  assert.equal(route.includes("listDueIvrRounds"), false);

  assert.match(dialer, /export async function openIvrRoundManually/);
  assert.match(dialer, /reopenIfDone/);
  assert.match(dialer, /executeIvrRound/);
});

test("GET ivr/config does not persist approval wipe on stale compose", () => {
  const config = readSrc("app/api/ivr/config/route.ts");
  assert.match(config, /GET must not mutate approvals/);
  assert.match(config, /approvalReset = true/);
  const getStart = config.indexOf("export async function GET");
  const getEnd = config.indexOf("export async function PATCH");
  const getBody = config.slice(getStart, getEnd);
  assert.equal(
    getBody.includes('"ivrConfig.recordingApproval.approved": false'),
    false
  );
  assert.equal(getBody.includes("await user.updateOne"), false);
});

test("zero-attempt rounds are not marked done", () => {
  const dialer = readSrc("lib/calls/ivrDialer.ts");
  assert.equal(
    dialer.includes('anyPlaced || attempts.length === 0 ? "done"'),
    false
  );
  assert.match(dialer, /Never mark a round "done" when no dial history exists/);
});

test("audio block reasons are precise — not only the generic AI message", () => {
  const dialer = readSrc("lib/calls/ivrDialer.ts");
  assert.match(dialer, /diagnoseAiAudioBlock/);
  assert.match(dialer, /composeVersion/);
  assert.match(dialer, /recordingApproval/);
});

test("reopen does not delete attempts or reset RSVP", () => {
  const dialer = readSrc("lib/calls/ivrDialer.ts");
  const reopenFn = dialer.slice(dialer.indexOf('if (input.action === "reopen")'));
  const reopenBody = reopenFn.slice(0, 1200);
  assert.match(reopenBody, /Attempts and guest RSVP stay intact/);
  assert.equal(reopenBody.includes("IvrCallAttempt.delete"), false);
});
