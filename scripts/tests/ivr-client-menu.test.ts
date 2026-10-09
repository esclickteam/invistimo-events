/**
 * Client dashboard must expose "שיחות מוקלטות" for callsType=ivr only.
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

test("rounds panel warns before dial when approved audio is missing", () => {
  const panel = readSrc("app/components/IvrRoundsPanel.jsx");
  assert.match(panel, /ivr-audio-not-ready-banner/);
  assert.match(panel, /אין עדיין קובץ שמע מאושר לשיחות/);
  assert.match(panel, /לא\s+יתחיל לחייג/);
  assert.match(panel, /ivr-approve-audio/);
  assert.match(panel, /ConcatPreviewPlayer/);
});
