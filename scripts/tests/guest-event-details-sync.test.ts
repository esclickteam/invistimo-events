import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "path";

import {
  detectGuestEventDetailsMismatch,
  resolveCentralEventDetails,
} from "../../lib/eventDetails/centralEventDetails";
import { resolveLiveEventMessageDetails } from "../../lib/messages/liveEventDetails";
import { buildReminderNavigationUrl } from "../../lib/messages/reminderNavigationLink";

const root = path.resolve(process.cwd());

function read(rel: string) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

const PRODUCTION_SHARE_ID = "h_BnzL2Nis";

const PRODUCTION_EVENT_SHELL = {
  _id: "6a849ece321a9794dabe496f",
  title: "הזמנה חדשה",
  eventType: "wedding",
  date: "2026-08-18",
  time: "00:00",
  location: {
    name: "יסמין מתחם אירועים, חלוצי התעשיה, חיפה, ישראל",
    address: "יסמין מתחם אירועים, חלוצי התעשיה, חיפה, ישראל",
    lat: 32.8171584,
    lng: 35.0564512,
  },
};

const PRODUCTION_INVITATION = {
  _id: "6a849ece321a9794dabe497a",
  shareId: PRODUCTION_SHARE_ID,
  eventId: "6a849ece321a9794dabe496f",
  title: "דויד חיים מלול - בר מצווה",
  eventType: "bar-mitzvah",
  eventDate: "2026-10-11T00:00:00.000Z",
  eventTime: "19:30",
  location: {
    name: "יסמין מתחם אירועים, חלוצי התעשיה, חיפה, ישראל",
    address: "יסמין מתחם אירועים, חלוצי התעשיה, חיפה, ישראל",
    lat: 32.8171584,
    lng: 35.0564512,
  },
  headerImageUrl:
    "https://res.cloudinary.com/dnbewcz79/image/upload/v1788978595/invistimo/invitations/yivdrixav9gwqusgbvae.png",
};

test("production Malul fixture: /e and reminders use invitation details, not Event shell", () => {
  const details = resolveCentralEventDetails(
    PRODUCTION_EVENT_SHELL,
    PRODUCTION_INVITATION
  );
  assert.equal(details.title, "דויד חיים מלול - בר מצווה");
  assert.equal(details.date, "2026-10-11");
  assert.equal(details.time, "19:30");
  assert.notEqual(details.title, "הזמנה חדשה");
  assert.notEqual(details.time, "00:00");

  const live = resolveLiveEventMessageDetails(
    PRODUCTION_INVITATION,
    PRODUCTION_EVENT_SHELL
  );
  assert.equal(live.eventTitle, "דויד חיים מלול - בר מצווה");
  assert.match(live.eventDate, /11\.10\.2026|11\/10\/2026/);
  assert.equal(live.eventTime, "19:30");
  assert.equal(live.shareId, PRODUCTION_SHARE_ID);
  assert.equal(live.headerImageUrl, PRODUCTION_INVITATION.headerImageUrl);

  assert.equal(
    buildReminderNavigationUrl({
      shareId: PRODUCTION_SHARE_ID,
      checkInEnabled: false,
    }),
    `https://www.invistimo.com/e/${PRODUCTION_SHARE_ID}`
  );

  const mismatches = detectGuestEventDetailsMismatch(
    PRODUCTION_EVENT_SHELL,
    PRODUCTION_INVITATION
  );
  assert.ok(mismatches.length >= 3);
  for (const row of mismatches) {
    if (row.field === "title") {
      assert.equal(row.guestWouldSee, "דויד חיים מלול - בר מצווה");
    }
    if (row.field === "time") {
      assert.equal(row.guestWouldSee, "19:30");
    }
  }
});

test("short reminder links stay bound to the same shareId and never invent another event", () => {
  const otherShareId = "otherEvent99";
  assert.equal(
    buildReminderNavigationUrl({
      shareId: PRODUCTION_SHARE_ID,
      guestToken: "guest-1",
      checkInEnabled: true,
    }),
    `https://www.invistimo.com/e/${PRODUCTION_SHARE_ID}?token=guest-1`
  );
  assert.notEqual(
    buildReminderNavigationUrl({ shareId: PRODUCTION_SHARE_ID }),
    buildReminderNavigationUrl({ shareId: otherShareId })
  );

  const shortRoute = read("app/[code]/route.ts");
  assert.match(shortRoute, /ShortLink\.findOne\(\{ code \}\)/);
  assert.match(shortRoute, /targetUrl/);
  assert.doesNotMatch(shortRoute, /findOne\(\{ shareId/);

  const shortener = read("lib/shortenUrl.ts");
  assert.match(shortener, /findOne\(\{ targetUrl \}\)/);
  assert.match(shortener, /ShortLink\.create\(\{/);
});

test("/e page and invitation PUT keep a single guest-facing source of truth", () => {
  const eventPage = read("app/e/[shareId]/page.tsx");
  assert.match(eventPage, /resolveCentralEventDetails\(event, invitation\)/);
  assert.match(eventPage, /central\.title/);
  assert.match(eventPage, /central\.date/);
  assert.match(eventPage, /central\.time/);
  assert.doesNotMatch(eventPage, /function getInvitationTitle/);
  assert.doesNotMatch(eventPage, /function getEventDate/);
  assert.doesNotMatch(eventPage, /function getEventTime/);

  const putRoute = read("app/api/invitations/[id]/route.ts");
  assert.match(putRoute, /persistSharedIdentityMirror/);
  assert.match(putRoute, /invitationAfterBasicUpdate/);
});
