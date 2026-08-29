import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "path";

import {
  GUEST_EXPERIENCE_DEFAULT,
  RSVP_SITE_MODE_DEFAULT,
  featuresForExperience,
  guestExperienceFromRsvpSiteMode,
  normalizeGuestExperienceType,
  normalizeRsvpSiteMode,
} from "../../types/rsvpSite";
import {
  buildGuestInviteUrl,
  getInvitationRsvpSiteMode,
} from "../../lib/guestInviteUrl";
import {
  getCustomerFeatures,
  getGuestExperienceType,
  hasGuestMessagesFeature,
  hasWeddingWebsiteFeature,
} from "../../lib/features/entitlements";
import {
  sanitizeGuestMessage,
  GUEST_MESSAGE_MAX_LENGTH,
} from "../../lib/weddingWebsite/guestMessage";

const root = path.resolve(process.cwd());

function read(rel: string) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

test("existing customers default to personal_invitation / standard links", () => {
  assert.equal(RSVP_SITE_MODE_DEFAULT, "standard");
  assert.equal(GUEST_EXPERIENCE_DEFAULT, "personal_invitation");
  assert.equal(normalizeRsvpSiteMode(undefined), "standard");
  assert.equal(normalizeRsvpSiteMode(null), "standard");
  assert.equal(normalizeRsvpSiteMode("standard"), "standard");
  assert.equal(normalizeRsvpSiteMode("personal_invitation"), "standard");
  assert.equal(normalizeRsvpSiteMode("personal"), "personal");
  assert.equal(normalizeRsvpSiteMode("wedding_website"), "personal");
  assert.equal(normalizeGuestExperienceType(undefined), "personal_invitation");
  assert.equal(normalizeGuestExperienceType("wedding_website"), "wedding_website");
  assert.equal(guestExperienceFromRsvpSiteMode("personal"), "wedding_website");
});

test("guest invite URL stays on /invite unless wedding website is explicit", () => {
  const standardInvitation = { shareId: "abc123" };
  const personalInvitation = {
    shareId: "abc123",
    invitationSettings: { rsvpSiteMode: "personal" },
  };
  const experienceInvitation = {
    shareId: "abc123",
    invitationSettings: { guestExperienceType: "wedding_website" },
  };

  assert.equal(getInvitationRsvpSiteMode(standardInvitation), "standard");
  assert.equal(getInvitationRsvpSiteMode(personalInvitation), "personal");
  assert.equal(getInvitationRsvpSiteMode(experienceInvitation), "personal");

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
      token: "tokA",
      rsvpSiteMode: "personal",
    }),
    "https://www.invistimo.com/w/abc123?token=tokA"
  );

  assert.equal(
    buildGuestInviteUrl({
      shareId: "abc123",
      token: "tokB",
      guestExperienceType: "wedding_website",
    }),
    "https://www.invistimo.com/w/abc123?token=tokB"
  );
});

test("feature entitlements are independent and default safely", () => {
  const regular = {};
  assert.equal(getGuestExperienceType(regular), "personal_invitation");
  assert.equal(hasWeddingWebsiteFeature(regular), false);
  assert.equal(hasGuestMessagesFeature(regular), false);

  const wwUser = { guestExperienceType: "wedding_website" };
  assert.equal(hasWeddingWebsiteFeature(wwUser), true);
  assert.equal(hasGuestMessagesFeature(wwUser), true);

  const addonOnly = {
    guestExperienceType: "personal_invitation",
    features: { weddingWebsite: false, guestMessages: true },
  };
  assert.equal(hasWeddingWebsiteFeature(addonOnly), false);
  assert.equal(hasGuestMessagesFeature(addonOnly), true);

  const wwWithoutMessages = {
    guestExperienceType: "wedding_website",
    features: { weddingWebsite: true, guestMessages: false },
  };
  assert.equal(hasWeddingWebsiteFeature(wwWithoutMessages), true);
  assert.equal(hasGuestMessagesFeature(wwWithoutMessages), false);

  assert.deepEqual(featuresForExperience("wedding_website"), {
    weddingWebsite: true,
    guestMessages: true,
  });
  assert.deepEqual(getCustomerFeatures(regular), {
    weddingWebsite: false,
    guestMessages: false,
  });
});

test("guest messages are sanitized and length-limited", () => {
  assert.equal(sanitizeGuestMessage("  שלום <script>alert(1)</script>  "), "שלום");
  assert.equal(sanitizeGuestMessage("<b>ברכה</b>"), "ברכה");
  assert.equal(sanitizeGuestMessage("javascript:alert(1)"), "alert(1)");
  assert.equal(
    sanitizeGuestMessage("x".repeat(GUEST_MESSAGE_MAX_LENGTH + 50)).length,
    GUEST_MESSAGE_MAX_LENGTH
  );
});

test("user schema defaults stay compatible and add entitlements", () => {
  const src = read("models/User.ts");
  assert.match(src, /rsvpSiteMode/);
  assert.match(src, /enum: \["standard", "personal"\]/);
  assert.match(src, /default: "standard"/);
  assert.match(src, /guestExperienceType/);
  assert.match(src, /personal_invitation/);
  assert.match(src, /weddingWebsite/);
  assert.match(src, /guestMessages/);
});

test("sales creation persists rsvpSiteMode and entitlements without forcing personal", () => {
  const adminSales = read("app/api/admin/sales/route.ts");
  const employeeSales = read("app/api/employee/sales/route.ts");
  const adminUi = read("app/admin/sales/new/page.tsx");

  assert.match(adminSales, /rsvpSiteMode/);
  assert.match(adminSales, /normalizeRsvpSiteMode/);
  assert.match(adminSales, /guestExperienceType/);
  assert.match(adminSales, /features: customerFeatures/);
  assert.match(employeeSales, /rsvpSiteMode/);
  assert.match(employeeSales, /guestExperienceType/);
  assert.match(adminUi, /RsvpSiteModeField/);
  assert.match(adminUi, /RSVP_SITE_MODE_DEFAULT/);
});

test("wedding website RSVP reuses existing guest token API", () => {
  const actions = read("components/wedding-website/WeddingGuestActions.tsx");
  const publicApi = read("app/api/w/[shareId]/route.ts");
  const publicPage = read("app/w/[shareId]/page.tsx");

  assert.match(actions, /invitationGuests\/respondByToken/);
  assert.match(actions, /TransportationGuestSection/);
  assert.match(actions, /\/api\/w\/\$\{shareId\}\/message/);
  assert.doesNotMatch(actions, /guest\.name/);
  assert.doesNotMatch(publicApi, /name: guest\.name/);
  assert.match(publicPage, /WeddingGuestActions/);
  assert.doesNotMatch(publicPage, /היי \$\{/);
});

test("guest messages are a separate model from RSVP notes", () => {
  const model = read("models/GuestWeddingMessage.ts");
  const api = read("app/api/w/[shareId]/message/route.ts");
  const dashboard = read("app/dashboard/guest-messages/page.tsx");

  assert.match(model, /GuestWeddingMessage/);
  assert.match(model, /guestId/);
  assert.match(model, /weddingWebsiteId/);
  assert.match(api, /hasGuestMessagesFeature/);
  assert.match(api, /wedding_guest_message_received/);
  assert.match(api, /sanitizeGuestMessage/);
  assert.match(dashboard, /הודעות מהאורחים/);
});

test("location pin is UI-only and keeps existing map URLs", () => {
  const inviteCard = read("app/components/EventLocationCard.jsx");
  const navButtons = read("app/components/EventNavigationButtons.tsx");
  const navLinks = read("lib/navigationLinks.ts");
  const display = read("app/components/LocationDisplay.tsx");
  const wwLocation = read("components/wedding-website/WeddingWebsiteSections.tsx");
  const eternal = read("components/wedding-website/templates/EternalGoldSite.tsx");

  assert.match(display, /lucide-react/);
  assert.match(display, /MapPin/);
  assert.match(inviteCard, /LocationDisplay/);
  assert.doesNotMatch(inviteCard, /📍/);
  assert.match(navButtons, /getGoogleMapsLink/);
  assert.match(navButtons, /getWazeLink/);
  assert.match(navLinks, /https:\/\/www\.google\.com\/maps\/search\/\?api=1/);
  assert.match(navLinks, /https:\/\/waze\.com\/ul\?ll=/);
  assert.match(wwLocation, /https:\/\/waze\.com\/ul\?q=\$\{encodeURIComponent\(content\.venueAddress\)\}/);
  assert.match(wwLocation, /https:\/\/maps\.google\.com\/\?q=\$\{encodeURIComponent\(content\.venueAddress\)\}/);
  assert.match(eternal, /LocationDisplay/);
  assert.match(eternal, /WeddingVenueNav/);
});

test("dashboard wedding website route is feature-guarded", () => {
  const editor = read("app/dashboard/wedding-website/page.tsx");
  const editorApi = read("app/api/wedding-website/route.ts");
  assert.match(editor, /hasWeddingWebsiteFeature/);
  assert.match(editorApi, /hasWeddingWebsiteFeature/);
  assert.match(editorApi, /WEDDING_WEBSITE_NOT_ENABLED/);
});
