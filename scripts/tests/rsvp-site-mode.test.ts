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
  getGuestInvitationUrl,
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

  assert.equal(getGuestInvitationUrl, buildGuestInviteUrl);

  assert.equal(
    getGuestInvitationUrl({
      shareId: "abc123",
      token: "tok1",
    }),
    "https://www.invistimo.com/invite/abc123?token=tok1"
  );

  assert.equal(
    getGuestInvitationUrl({
      shareId: "abc123",
      token: "tokA",
      rsvpSiteMode: "personal",
    }),
    "https://www.invistimo.com/w/abc123?token=tokA"
  );

  assert.equal(
    getGuestInvitationUrl({
      shareId: "abc123",
      token: "tokB",
      guestExperienceType: "wedding_website",
    }),
    "https://www.invistimo.com/w/abc123?token=tokB"
  );

  assert.equal(
    getGuestInvitationUrl({
      shareId: "abc123",
      token: "tokC",
      guestExperienceType: "personal_invitation",
    }),
    "https://www.invistimo.com/invite/abc123?token=tokC"
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

test("link-open tracking is recorded outside RSVP and guest-message flows", () => {
  const rsvp = read("app/api/invitationGuests/respondByToken/[token]/route.ts");
  const message = read("app/api/w/[shareId]/message/route.ts");
  const tracking = read("lib/guestLinkTracking.ts");
  const trackingServer = read("lib/guestLinkTracking.server.ts");

  assert.match(tracking, /firstOpenedAt/);
  assert.doesNotMatch(tracking, /from ["']@\/models\/InvitationGuest["']/);
  assert.match(trackingServer, /recordGuestLinkOpen/);
  assert.doesNotMatch(rsvp, /recordGuestLinkOpen/);
  assert.doesNotMatch(message, /recordGuestLinkOpen/);
});

test("admin has no separate wedding website customer list", () => {
  const layout = read("app/admin/layout.tsx");
  const usersPage = read("app/admin/users/page.tsx");
  const wwAdminPage = read("app/admin/wedding-websites/page.tsx");

  assert.doesNotMatch(layout, /href: "\/admin\/wedding-websites"/);
  assert.doesNotMatch(layout, /אתרי חתונה/);
  assert.match(usersPage, /GuestExperienceBadge/);
  assert.match(usersPage, /RsvpSiteModeField/);
  assert.match(usersPage, /קישור אישי/);
  assert.match(usersPage, /אתר חתונה/);
  assert.match(wwAdminPage, /redirect\("\/admin\/users"\)/);
});

test("guest invitation URL helper is the single source for guest-facing links", () => {
  const helper = read("lib/guestInviteUrl.ts");
  assert.match(helper, /export function getGuestInvitationUrl/);
  assert.match(helper, /export const buildGuestInviteUrl = getGuestInvitationUrl/);

  const sendFiles = [
    "lib/messageTemplates.ts",
    "lib/sms/buildFinalSmsText.ts",
    "app/api/sms/send/route.ts",
    "app/api/whatsapp/send-template/route.ts",
    "workers/sendScheduledSms.ts",
    "app/api/employee/call-tasks/[taskId]/send-rsvp-invite/route.ts",
    "app/dashboard/messages/MessagesClient.tsx",
    "app/dashboard/messages/new/tabs/RsvpTab.tsx",
    "app/dashboard/messages/new/tabs/RsvpSmsTab.tsx",
    "app/dashboard/messages/new/shared/WhatsappTemplatePreview.tsx",
    "app/admin/users/AdminManualSmsPanel.tsx",
    "app/dashboard/page.tsx",
    "app/components/GuestsTable.tsx",
    "app/dashboard/DashboardMobileMenu.tsx",
  ];

  for (const rel of sendFiles) {
    const src = read(rel);
    assert.match(
      src,
      /getGuestInvitationUrl|buildGuestInviteUrl/,
      `${rel} should use the shared guest URL helper`
    );
    assert.doesNotMatch(
      src,
      /https:\/\/www\.invistimo\.com\/invite\/\$\{/,
      `${rel} still hardcodes /invite/`
    );
    assert.doesNotMatch(
      src,
      /https:\/\/invistimo\.com\/invite\//,
      `${rel} still hardcodes invistimo.com/invite`
    );
  }
});

test("dashboard guest row and my-invitation expose rsvp site mode for the helper", () => {
  const dashboard = read("app/dashboard/page.tsx");
  const myInvitation = read("app/api/invitations/my/route.ts");
  const guestsTable = read("app/components/GuestsTable.tsx");

  assert.match(dashboard, /getGuestInviteLink/);
  assert.match(dashboard, /getGuestInvitationUrl/);
  assert.match(dashboard, /EventSource/);
  assert.match(dashboard, /mergeGuestActivity/);
  assert.match(dashboard, /firstOpenedAt/);
  assert.match(myInvitation, /invitationSettings/);
  assert.match(guestsTable, /getGuestInvitationUrl/);
});

test("realtime opened filter uses existing guest tracking fields", () => {
  const stream = read("app/api/dashboard/guest-activity/stream/route.ts");
  const merge = read("lib/dashboardGuestActivity.ts");
  const dashboard = read("app/dashboard/page.tsx");

  assert.match(stream, /text\/event-stream/);
  assert.match(stream, /firstOpenedAt/);
  assert.match(stream, /unreadGuestMessages/);
  assert.match(merge, /export function mergeGuestActivity/);
  assert.match(dashboard, /matchesGuestLinkOpenFilter/);
  assert.match(dashboard, /guest-activity\/stream/);
});

test("wedding website editor can upload replace remove and reorder images", () => {
  const editor = read("app/dashboard/wedding-website/page.tsx");
  const media = read("app/api/wedding-website/media/route.ts");
  const content = read("lib/weddingWebsite/content.ts");
  const images = read("lib/weddingWebsite/images.ts");
  const publicApi = read("app/api/w/[shareId]/route.ts");

  assert.match(editor, /\/api\/wedding-website\/media/);
  assert.match(editor, /heroImage/);
  assert.match(editor, /galleryImages/);
  assert.match(editor, /moveGalleryImage/);
  assert.match(editor, /WeddingTemplateSiteRenderer/);
  assert.match(media, /ALLOWED_TYPES/);
  assert.match(media, /MAX_IMAGE_BYTES/);
  assert.match(media, /cloudinary/);
  assert.match(content, /heroImage/);
  assert.match(content, /galleryImages/);
  assert.match(images, /overlayWeddingTemplateImages/);
  assert.match(publicApi, /overlayWeddingTemplateImages/);
});

test("public wedding website and demo templates hide Invistimo chrome", () => {
  const shell = read("app/PublicPageShell.tsx");
  const renderer = read("components/wedding-website/WeddingTemplateSiteRenderer.tsx");
  const sections = read("components/wedding-website/WeddingWebsiteSections.tsx");
  const layoutShell = read("app/components/LayoutShell.tsx");

  assert.match(shell, /isWeddingWebsiteRoute/);
  assert.match(renderer, /a\[href="\/wedding-website"\]/);
  assert.doesNotMatch(sections, /Invistimo Wedding · Preview/);
  assert.match(layoutShell, /pathname.startsWith\("\/w\/"\)/);
  assert.match(layoutShell, /pathname.startsWith\("\/wedding-website\/"\)/);
});

