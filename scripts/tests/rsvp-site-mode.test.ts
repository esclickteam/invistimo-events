import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  RSVP_SITE_MODE_DEFAULT,
  normalizeRsvpSiteMode,
} from "../../types/rsvpSite";
import {
  buildGuestInviteUrl,
  getInvitationRsvpSiteMode,
} from "../../lib/guestInviteUrl";

const root = path.resolve(process.cwd());

function read(rel: string) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

test("existing customers default to standard personal guest links", () => {
  assert.equal(RSVP_SITE_MODE_DEFAULT, "standard");
  assert.equal(normalizeRsvpSiteMode(undefined), "standard");
  assert.equal(normalizeRsvpSiteMode(null), "standard");
  assert.equal(normalizeRsvpSiteMode("standard"), "standard");
  assert.equal(normalizeRsvpSiteMode("personal"), "personal");
  assert.equal(normalizeRsvpSiteMode("something-else"), "standard");
});

test("guest invite URL stays on /invite unless personal mode is explicit", () => {
  const standardInvitation = { shareId: "abc123" };
  const personalInvitation = {
    shareId: "abc123",
    invitationSettings: { rsvpSiteMode: "personal" },
  };

  assert.equal(getInvitationRsvpSiteMode(standardInvitation), "standard");
  assert.equal(getInvitationRsvpSiteMode(personalInvitation), "personal");

  assert.equal(
    buildGuestInviteUrl({
      shareId: "abc123",
      token: "tok1",
    }),
    "https://www.invistimo.com/invite/abc123?token=tok1"
  );

  assert.equal(
    buildGuestInviteUrl({
      shareId: "abc123",
      token: "tok1",
      rsvpSiteMode: "personal",
    }),
    "https://www.invistimo.com/w/abc123?token=tok1"
  );
});

test("user schema defaults rsvpSiteMode to standard", () => {
  const src = read("models/User.ts");
  assert.match(src, /rsvpSiteMode/);
  assert.match(src, /enum: \["standard", "personal"\]/);
  assert.match(src, /default: "standard"/);
});

test("sales creation persists rsvpSiteMode without forcing personal", () => {
  const adminSales = read("app/api/admin/sales/route.ts");
  const employeeSales = read("app/api/employee/sales/route.ts");
  const adminUi = read("app/admin/sales/new/page.tsx");

  assert.match(adminSales, /rsvpSiteMode/);
  assert.match(adminSales, /normalizeRsvpSiteMode/);
  assert.match(employeeSales, /rsvpSiteMode/);
  assert.match(adminUi, /RsvpSiteModeField/);
  assert.match(adminUi, /RSVP_SITE_MODE_DEFAULT/);
});
