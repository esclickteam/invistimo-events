import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "path";

import {
  LINK_OPEN_DEDUP_MS,
  buildGuestLinkTimeline,
  formatGuestLinkOpenedAt,
  guestLinkWasOpened,
  matchesGuestLinkOpenFilter,
  nextGuestLinkOpenState,
  shouldSkipGuestLinkTracking,
} from "../../lib/guestLinkTracking";

const root = path.resolve(process.cwd());

function read(rel: string) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

test("first valid open sets firstOpenedAt, lastOpenedAt and openCount=1", () => {
  const now = new Date("2026-08-29T05:00:00.000Z");
  const next = nextGuestLinkOpenState({}, now);

  assert.equal(next.counted, true);
  assert.equal(next.write, true);
  assert.equal(next.openCount, 1);
  assert.equal(next.firstOpenedAt.toISOString(), now.toISOString());
  assert.equal(next.lastOpenedAt.toISOString(), now.toISOString());
});

test("refresh inside 5 minutes does not write and keeps lastOpenedAt as the last counted open", () => {
  const first = new Date("2026-08-29T05:00:00.000Z");
  const refresh = new Date(first.getTime() + 4 * 60 * 1000);
  const next = nextGuestLinkOpenState(
    {
      firstOpenedAt: first,
      lastOpenedAt: first,
      openCount: 1,
    },
    refresh
  );

  assert.equal(next.counted, false);
  assert.equal(next.write, false);
  assert.equal(next.openCount, 1);
  assert.equal(next.firstOpenedAt.toISOString(), first.toISOString());
  assert.equal(next.lastOpenedAt.toISOString(), first.toISOString());
  assert.ok(LINK_OPEN_DEDUP_MS === 5 * 60 * 1000);
});

test("20 refreshes inside 5 minutes stay at openCount=1 with no extra writes", () => {
  const first = new Date("2026-08-29T05:00:00.000Z");
  let current = nextGuestLinkOpenState({}, first);
  assert.equal(current.write, true);
  assert.equal(current.openCount, 1);

  for (let i = 1; i <= 20; i++) {
    current = nextGuestLinkOpenState(
      {
        firstOpenedAt: first,
        lastOpenedAt: current.lastOpenedAt,
        openCount: current.openCount,
      },
      new Date(first.getTime() + i * 10 * 1000)
    );
    assert.equal(current.write, false);
    assert.equal(current.counted, false);
    assert.equal(current.openCount, 1);
    assert.equal(current.lastOpenedAt.toISOString(), first.toISOString());
  }
});

test("open after the 5 minute window increments openCount", () => {
  const first = new Date("2026-08-29T05:00:00.000Z");
  const later = new Date(first.getTime() + 5 * 60 * 1000);
  const next = nextGuestLinkOpenState(
    {
      firstOpenedAt: first,
      lastOpenedAt: first,
      openCount: 1,
    },
    later
  );

  assert.equal(next.counted, true);
  assert.equal(next.write, true);
  assert.equal(next.openCount, 2);
  assert.equal(next.firstOpenedAt.toISOString(), first.toISOString());
  assert.equal(next.lastOpenedAt.toISOString(), later.toISOString());
});

test("existing guests without tracking fields are not opened", () => {
  assert.equal(guestLinkWasOpened({}), false);
  assert.equal(guestLinkWasOpened({ openCount: 0 }), false);
  assert.equal(guestLinkWasOpened({ firstOpenedAt: null, openCount: 0 }), false);
  assert.equal(guestLinkWasOpened({ firstOpenedAt: "2026-08-29T05:00:00.000Z" }), true);
  assert.equal(guestLinkWasOpened({ openCount: 2 }), true);
});

test("opened / notOpened filters only query existing tracking fields", () => {
  const opened = { firstOpenedAt: "2026-08-29T05:00:00.000Z", openCount: 1 };
  const closed = { firstOpenedAt: null, openCount: 0 };

  assert.equal(matchesGuestLinkOpenFilter(opened, "opened"), true);
  assert.equal(matchesGuestLinkOpenFilter(closed, "opened"), false);
  assert.equal(matchesGuestLinkOpenFilter(opened, "notOpened"), false);
  assert.equal(matchesGuestLinkOpenFilter(closed, "notOpened"), true);
  assert.equal(matchesGuestLinkOpenFilter(closed, "all"), true);

  const controls = read("app/components/GuestsControls.tsx");
  const dashboard = read("app/dashboard/page.tsx");
  assert.match(controls, /נפתח/);
  assert.match(controls, /לא נפתח/);
  assert.match(dashboard, /matchesGuestLinkOpenFilter/);
});

test("bot and preview traffic is skipped without counting", () => {
  assert.equal(
    shouldSkipGuestLinkTracking({
      token: "abc",
      userAgent: "facebookexternalhit/1.1",
    }),
    true
  );
  assert.equal(
    shouldSkipGuestLinkTracking({
      token: "abc",
      userAgent: "WhatsApp/2.0",
    }),
    true
  );
  assert.equal(
    shouldSkipGuestLinkTracking({
      token: "abc",
      isPreview: true,
      userAgent: "Mozilla/5.0",
    }),
    true
  );
  assert.equal(
    shouldSkipGuestLinkTracking({
      token: "",
      userAgent: "Mozilla/5.0",
    }),
    true
  );
  assert.equal(
    shouldSkipGuestLinkTracking({
      token: "abc",
      purpose: "prefetch",
      userAgent: "Mozilla/5.0",
    }),
    true
  );
  assert.equal(
    shouldSkipGuestLinkTracking({
      token: "abc",
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
    }),
    false
  );
});

test("opened timestamps format as dd.MM HH:mm for the couple", () => {
  const formatted = formatGuestLinkOpenedAt("2026-08-29T05:00:00.000Z");
  assert.match(formatted, /^\d{2}\.\d{2} \d{2}:\d{2}$/);
});

test("simple guest timeline can include link opens and RSVP without analytics extras", () => {
  const timeline = buildGuestLinkTimeline({
    firstOpenedAt: "2026-08-29T05:00:00.000Z",
    lastOpenedAt: "2026-08-29T05:50:00.000Z",
    openCount: 3,
    rsvp: "yes",
    arrivedCount: 2,
    respondedAt: "2026-08-29T05:51:00.000Z",
  });

  assert.equal(timeline.length, 3);
  assert.equal(timeline[0].label, "פתח את הקישור");
  assert.equal(timeline[1].label, "פתח שוב את הקישור");
  assert.equal(timeline[2].label, "אישר הגעה, 2 מגיעים");
});

test("schema adds tracking fields without changing RSVP defaults", () => {
  const src = read("models/InvitationGuest.ts");
  assert.match(src, /firstOpenedAt/);
  assert.match(src, /lastOpenedAt/);
  assert.match(src, /openCount/);
  assert.match(src, /enum: \["yes", "no", "pending"\]/);
  assert.match(src, /default: "pending"/);
});

test("invite and wedding website record opens by token; RSVP route does not", () => {
  const invite = read("app/api/invite/[shareId]/route.ts");
  const ww = read("app/api/w/[shareId]/route.ts");
  const rsvp = read("app/api/invitationGuests/respondByToken/[token]/route.ts");
  const transport = read("app/api/invite/[shareId]/transportation/route.ts");

  assert.match(invite, /recordGuestLinkOpen/);
  assert.match(ww, /recordGuestLinkOpen/);
  assert.doesNotMatch(rsvp, /recordGuestLinkOpen/);
  assert.doesNotMatch(transport, /recordGuestLinkOpen/);
});

test("dashboard guest list and expanded modal show opened / not opened", () => {
  const dashboard = read("app/dashboard/page.tsx");
  const modal = read("app/components/EditGuestModal.tsx");
  const mobile = read("app/dashboard/components/GuestsMobileList.tsx");
  const badge = read("app/components/GuestLinkOpenBadge.tsx");

  assert.match(dashboard, /GuestLinkOpenBadge/);
  assert.match(mobile, /GuestLinkOpenBadge/);
  assert.match(badge, /נפתח/);
  assert.match(badge, /לא נפתח/);
  assert.match(modal, /נפתח לראשונה/);
  assert.match(modal, /נפתח לאחרונה/);
  assert.match(modal, /מספר פתיחות/);
  assert.doesNotMatch(modal, /\bIP\b/);
  assert.doesNotMatch(modal, /device/i);
  assert.doesNotMatch(badge, /user-agent/i);
});

test("tracking writes stay best-effort and do not use updatedAt timestamps", () => {
  const src = read("lib/guestLinkTracking.server.ts");
  const helpers = read("lib/guestLinkTracking.ts");
  const invite = read("app/api/invite/[shareId]/route.ts");
  const ww = read("app/api/w/[shareId]/route.ts");
  assert.doesNotMatch(helpers, /from ["']@\/models\/InvitationGuest["']/);
  assert.doesNotMatch(helpers, /from ["']mongoose["']/);
  assert.match(src, /timestamps: false/);
  assert.match(src, /best-effort skipped/);
  assert.match(src, /shouldSkipGuestLinkTracking/);
  assert.match(src, /if \(!next\.write\) return true/);
  assert.match(src, /\$inc:\s*\{\s*openCount:\s*1\s*\}/);
  assert.match(src, /lastOpenedAt:\s*\{\s*\$type:\s*"date",\s*\$lte:\s*cutoff\s*\}/);
  assert.match(invite, /guestLinkTracking\.server/);
  assert.match(ww, /guestLinkTracking\.server/);
  assert.match(invite, /after\(/);
  assert.match(ww, /after\(/);
});
