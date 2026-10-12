/**
 * Client dashboard must expose "שיחות מוקלטות" for callsType=ivr only.
 */

import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../.."
);

function readSrc(rel: string) {
  return readFileSync(path.join(root, rel), "utf8");
}

test("dedicated recorded-calls page exists for IVR clients", () => {
  const src = readSrc("app/dashboard/recorded-calls/page.tsx");
  assert.match(src, /שיחות מוקלטות/);
  assert.match(src, /IvrRoundsPanel/);
  assert.match(src, /isIvrCallsUser/);
  assert.match(src, /\/api\/ivr\/schedule/);
});

test("sidebar shows שיחות מוקלטות only for IVR users", () => {
  const src = readSrc("app/dashboard/components/DashboardSidebar.tsx");
  assert.match(src, /שיחות מוקלטות/);
  assert.match(src, /\/dashboard\/recorded-calls/);
  assert.match(src, /isIvrCallsUser/);
  assert.match(src, /hidden: !isIvrCalls/);
});

test("mobile menu includes שיחות מוקלטות for IVR", () => {
  const src = readSrc("app/dashboard/DashboardMobileMenu.tsx");
  assert.match(src, /שיחות מוקלטות/);
  assert.match(src, /recorded-calls/);
  assert.match(src, /canOpenRecordedCalls/);
});

test("RSVP schedule labels distinguish IVR from human call-center", () => {
  const labels = readSrc("lib/calls/ivrRoundLabels.ts");
  assert.match(labels, /סבב מוקלט/);
  assert.match(labels, /סבבי שיחות מוקלטות/);
  assert.match(labels, /isIvrCallsUser/);

  const me = readSrc("app/api/me/route.ts");
  assert.match(me, /callRoundLabelForUser/);
  assert.match(me, /סבב מוקלט/);

  const dash = readSrc("app/dashboard/page.tsx");
  assert.match(dash, /callRoundScheduleLabel/);
  assert.match(dash, /סבבי שיחות מוקלטות/);
  assert.match(dash, /מעבר לשיחות מוקלטות/);
});

test("AuthContext exposes callsType on client user", () => {
  const src = readSrc("context/AuthContext.tsx");
  assert.match(src, /callsType\?: "human" \| "ivr"/);
});

test("rounds panel schedules calls without a recording or approval step", () => {
  const panel = readSrc("app/components/IvrRoundsPanel.jsx");
  assert.match(panel, /ivr-auto-narration-note/);
  assert.match(panel, /קריינות היא AI/);
  assert.match(panel, /שם האירוע מפרטי האירוע/);
  assert.equal(panel.includes("הקלטה אישית"), false);
  assert.equal(panel.includes("ivr-approve-audio"), false);
  assert.equal(panel.includes("ivr-event-name"), false);
  assert.equal(panel.includes("ivr-audio-not-ready-banner"), false);
  assert.match(panel, /data-testid="ivr-round-date"/);
});
