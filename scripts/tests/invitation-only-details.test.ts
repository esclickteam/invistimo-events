import test from "node:test";
import assert from "node:assert/strict";

import {
  buildInvitationLocationLabel,
  filterGuestsByInvitationAudience,
  formatInvitationDisplayDate,
  formatInvitationPreviewDateBlock,
  formatInvitationWhatsappDateParam,
  parseInvitationOnlyAudienceFilter,
  resolveInvitationImageUrl,
} from "../../lib/messages/invitationOnlyDetails";
import { buildEventLocationLabel } from "../../lib/messages/liveEventDetails";

test("invitation location matches RSVP live-details (no duplicated venue name)", () => {
  const invitation = {
    location: {
      name: "קאלה אירועים",
      address: "קאלה אירועים, דרך יוליוס סימון, חיפה, ישראל",
    },
  };

  const rsvpLabel = buildEventLocationLabel(invitation);
  const inviteLabel = buildInvitationLocationLabel(invitation);

  assert.equal(inviteLabel, rsvpLabel);
  assert.equal(inviteLabel, "קאלה אירועים, דרך יוליוס סימון, חיפה");
  assert.doesNotMatch(inviteLabel, /קאלה אירועים, קאלה אירועים/);
});

test("invitation date/time stay on separate lines", () => {
  const localDate = new Date(2026, 10, 9); // 09/11/2026 local
  const date = formatInvitationDisplayDate(localDate);
  const whatsapp = formatInvitationWhatsappDateParam(localDate, "19:30");
  const preview = formatInvitationPreviewDateBlock(localDate, "19:30");

  assert.equal(date, "09/11/2026");
  assert.doesNotMatch(date, /19:30/);
  assert.equal(whatsapp, "09/11/2026 · 🕒 שעה: 19:30");
  assert.match(preview, /📅 תאריך: 09\/11\/2026/);
  assert.match(preview, /🕒 שעה: 19:30/);
});

test("never_invited audience excludes guests with prior invitation attempts", () => {
  const guests = [{ _id: "a" }, { _id: "b" }, { _id: "c" }];
  const already = new Set(["b"]);

  const filtered = filterGuestsByInvitationAudience({
    guests,
    filter: "never_invited",
    alreadyInvitedGuestIds: already,
  });

  assert.deepEqual(
    filtered.map((g) => g._id),
    ["a", "c"]
  );
  assert.equal(parseInvitationOnlyAudienceFilter("never_invited"), "never_invited");
  assert.equal(parseInvitationOnlyAudienceFilter("all"), "all");
});

test("invitation image prefers permanent invite fields and pre-rsvp media", () => {
  assert.equal(
    resolveInvitationImageUrl({
      preRsvpMedia: { invitationOnlyImageUrl: "https://cdn.example.com/pre.png" },
      headerImageUrl: "https://cdn.example.com/header.png",
    }),
    "https://cdn.example.com/pre.png"
  );

  assert.equal(
    resolveInvitationImageUrl({
      headerImageUrl: "https://cdn.example.com/header.png",
      previewImageUrl: "https://cdn.example.com/preview.png",
    }),
    "https://cdn.example.com/header.png"
  );
});
