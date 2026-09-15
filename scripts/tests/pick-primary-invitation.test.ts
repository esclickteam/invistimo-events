import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";

import {
  comparePrimaryInvitations,
  isPlaceholderInvitationTitle,
  pickPrimaryInvitation,
} from "../../lib/pickPrimaryInvitation";

const root = path.resolve(process.cwd());

function read(rel: string) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

test("placeholder title detection covers empty and default Hebrew title", () => {
  assert.equal(isPlaceholderInvitationTitle(""), true);
  assert.equal(isPlaceholderInvitationTitle("הזמנה חדשה"), true);
  assert.equal(isPlaceholderInvitationTitle("  הזמנה חדשה  "), true);
  assert.equal(
    isPlaceholderInvitationTitle("החינה של ספיר אלון ויונתן ויצמן"),
    false
  );
});

test("invitation with guests always beats newer empty duplicate", () => {
  const emptyNewer = {
    _id: "empty",
    title: "הזמנה חדשה",
    guestCount: 0,
    updatedAt: "2026-09-15T08:36:08.150Z",
  };
  const hennaOlder = {
    _id: "henna",
    title: "החינה של ספיר אלון ויונתן ויצמן",
    guestCount: 69,
    updatedAt: "2026-09-15T08:36:08.049Z",
  };

  assert.equal(pickPrimaryInvitation([emptyNewer, hennaOlder])?._id, "henna");
  assert.ok(comparePrimaryInvitations(hennaOlder, emptyNewer) < 0);
});

test("among empty invitations, non-placeholder title wins over default title", () => {
  const placeholder = {
    _id: "a",
    title: "הזמנה חדשה",
    guestCount: 0,
    updatedAt: "2026-09-15T10:00:00.000Z",
  };
  const named = {
    _id: "b",
    title: "חתונה של נועה ויוסי",
    guestCount: 0,
    updatedAt: "2026-09-14T10:00:00.000Z",
  };

  assert.equal(pickPrimaryInvitation([placeholder, named])?._id, "b");
});

test("equal guest counts fall back to newest updatedAt", () => {
  const older = {
    _id: "older",
    title: "אירוע א",
    guestCount: 10,
    updatedAt: "2026-09-01T00:00:00.000Z",
  };
  const newer = {
    _id: "newer",
    title: "אירוע ב",
    guestCount: 10,
    updatedAt: "2026-09-10T00:00:00.000Z",
  };

  assert.equal(pickPrimaryInvitation([older, newer])?._id, "newer");
});

test("pickPrimaryInvitation scales to many candidates without preferring empty shells", () => {
  const candidates = Array.from({ length: 1000 }, (_, index) => ({
    _id: `empty-${index}`,
    title: "הזמנה חדשה",
    guestCount: 0,
    updatedAt: new Date(Date.UTC(2026, 8, 15, 8, 0, index)).toISOString(),
  }));

  candidates.push({
    _id: "real",
    title: "האירוע האמיתי",
    guestCount: 12,
    updatedAt: "2020-01-01T00:00:00.000Z",
  });

  assert.equal(pickPrimaryInvitation(candidates)?._id, "real");
});

test("dashboard invitation resolution uses guest-ranked primary helpers everywhere", () => {
  const files = [
    "app/api/invitations/my/route.ts",
    "app/api/dashboard/guest-activity/stream/route.ts",
    "app/api/guest-messages/route.ts",
    "app/api/wedding-website/route.ts",
    "app/api/wedding-website/publish/route.ts",
    "app/api/wedding-website/media/route.ts",
    "app/api/wedding-website/event-uploads/route.ts",
    "app/api/admin/users/[id]/route.ts",
  ];

  for (const rel of files) {
    const src = read(rel);
    if (rel.includes("invitations/my")) {
      assert.match(src, /findPrimaryInvitationId/);
      assert.doesNotMatch(src, /\.limit\(25\)/);
    } else if (rel.includes("admin/users")) {
      assert.match(src, /timestamps:\s*false/);
    } else {
      assert.match(
        src,
        /findManagedPrimaryInvitation/,
        `${rel} must resolve invitations via findManagedPrimaryInvitation`
      );
      assert.doesNotMatch(
        src,
        /Invitation\.findOne\(\{\s*ownerId:\s*auth\.userId\s*\}\)\s*\.sort\(\{\s*updatedAt:\s*-1/,
        `${rel} still sorts by updatedAt alone`
      );
    }
  }
});
