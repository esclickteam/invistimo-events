import test from "node:test";
import assert from "node:assert/strict";

import {
  buildInvitationLocationLabel,
  filterGuestsByInvitationAudience,
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
