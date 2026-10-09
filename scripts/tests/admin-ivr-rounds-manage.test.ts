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
  assert.match(panel, /סבבי שיחות IVR/);
  assert.match(panel, /פתח סבב עכשיו/);
  assert.match(panel, /פתח מחדש סבב/);
  assert.match(panel, /data-testid="admin-ivr-rounds-panel"/);
  assert.match(panel, /action: "preview"/);
  assert.match(panel, /action: "open"/);
  assert.match(panel, /action: "schedule"/);
  assert.match(panel, /action: "stop"/);
  assert.match(panel, /reopen/);
  assert.match(panel, /IvrCallsReportModal/);
  assert.match(panel, /initialRound/);
  assert.match(panel, /admin-ivr-narration-link/);
  assert.match(panel, /זכאים לחיוג כעת/);
  assert.match(panel, /כבר נתנו תשובה סופית/);
});

test("admin IVR rounds API reuses executeIvrRound via openIvrRoundManually", () => {
  const route = readSrc("app/api/admin/users/[id]/ivr-rounds/route.ts");
  const dialer = readSrc("lib/calls/ivrDialer.ts");

  assert.match(route, /openIvrRoundManually/);
  assert.match(route, /setIvrRoundAdminStatus/);
  assert.match(route, /writeAdminAuditLog/);
  assert.match(route, /admin_ivr_round_open/);
  assert.match(route, /admin_ivr_round_reopen/);
  assert.match(route, /FORCE_NOT_ALLOWED/);
  assert.match(route, /force === 1/);
  assert.match(route, /requireAdmin/);
  assert.match(route, /isIvrCallsUser/);
  assert.match(route, /IVR_ALLOW_LIVE_DIAL/);
  assert.match(route, /EVENT_INACTIVE/);
  assert.match(route, /body\?\.force === "1"/);
  assert.match(route, /canReopen/);
  assert.match(route, /describeIvrAudioDiagnostics/);
  assert.match(route, /finalAnsweredCount/);
  assert.equal(route.includes("listDueIvrRounds"), false);

  assert.match(dialer, /export async function openIvrRoundManually/);
  assert.match(dialer, /export async function setIvrRoundAdminStatus/);
  assert.match(dialer, /export function resolveIvrRoundAudio/);
  assert.match(dialer, /export function describeIvrAudioDiagnostics/);
  assert.match(dialer, /diagnoseAiAudioBlock/);
  assert.match(dialer, /reopenIfDone/);
  assert.match(dialer, /action: "reopen"/);
  assert.match(dialer, /return executeIvrRound\(\{/);
  assert.match(dialer, /LIVE_DIAL_DISABLED/);
  assert.match(dialer, /AUDIO_NOT_READY/);
  assert.match(dialer, /NO_ELIGIBLE_GUESTS/);
  assert.match(dialer, /ROUND_ALREADY_RUNNING/);
  // Manual open ignores due-window but must not call listDueIvrRounds({ force: true })
  const openFn = dialer.slice(
    dialer.indexOf("export async function openIvrRoundManually")
  );
  const openBody = openFn.slice(
    0,
    openFn.indexOf("export async function setIvrRoundAdminStatus")
  );
  assert.equal(openBody.includes("force: true"), false);
  assert.equal(openBody.includes("force:1"), false);
  assert.match(openBody, /executeIvrRound/);
});

test("zero-attempt rounds are not marked done", () => {
  const dialer = readSrc("lib/calls/ivrDialer.ts");
  assert.equal(
    dialer.includes('anyPlaced || attempts.length === 0 ? "done"'),
    false
  );
  assert.match(dialer, /Never mark a round "done" when no dial history exists/);
  assert.match(dialer, /לא בוצע אף חיוג בסבב/);
});

test("audio block reasons are precise — not only the generic AI message", () => {
  const dialer = readSrc("lib/calls/ivrDialer.ts");
  assert.match(dialer, /diagnoseAiAudioBlock/);
  assert.match(dialer, /composeVersion/);
  assert.match(dialer, /recordingApproval/);
  assert.match(dialer, /טוקן מדיה/);
  assert.match(dialer, /לא נבחר קול קריינות/);
});

test("IVR report modal accepts initialRound from admin round link", () => {
  const modal = readSrc("app/components/IvrCallsReportModal.tsx");
  assert.match(modal, /initialRound\?:/);
  assert.match(modal, /round: String\(initialRound\)/);
});

test("admin open path shares eligibility filter with automatic dialer", () => {
  const dialer = readSrc("lib/calls/ivrDialer.ts");
  assert.match(dialer, /filterGuestsForIvrRound/);
  const openFn = dialer.slice(
    dialer.indexOf("export async function openIvrRoundManually")
  );
  assert.match(openFn, /filterGuestsForIvrRound/);
  assert.match(openFn, /resolveRoundAudio\(user\)/);
});

test("schedule update on admin API writes the same callRoundsSchedule field", () => {
  const route = readSrc("app/api/admin/users/[id]/ivr-rounds/route.ts");
  const clientSchedule = readSrc("app/api/ivr/schedule/route.ts");
  assert.match(route, /callRoundsSchedule/);
  assert.match(route, /normalizeCallRoundScheduledAtForSave/);
  assert.match(clientSchedule, /callRoundsSchedule/);
  assert.match(route, /admin_ivr_schedule_update/);
});

test("reopen does not delete attempts or reset RSVP", () => {
  const dialer = readSrc("lib/calls/ivrDialer.ts");
  const reopenFn = dialer.slice(dialer.indexOf('if (input.action === "reopen")'));
  const reopenBody = reopenFn.slice(0, 1200);
  assert.match(reopenBody, /Attempts and guest RSVP stay intact/);
  assert.equal(reopenBody.includes("IvrCallAttempt.delete"), false);
  assert.equal(reopenBody.includes("rsvp"), false);
});
