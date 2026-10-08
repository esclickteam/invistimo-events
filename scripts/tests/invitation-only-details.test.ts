import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

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
  assert.equal(parseInvitationOnlyAudienceFilter("failed"), "failed");
  assert.equal(parseInvitationOnlyAudienceFilter("not_sent"), "not_sent");
});

test("failed / not_sent audience keeps only guests in the delivery status set", () => {
  const guests = [{ _id: "a" }, { _id: "b" }, { _id: "c" }];

  assert.deepEqual(
    filterGuestsByInvitationAudience({
      guests,
      filter: "failed",
      deliveryStatusGuestIds: new Set(["b"]),
    }).map((g) => g._id),
    ["b"]
  );

  assert.deepEqual(
    filterGuestsByInvitationAudience({
      guests,
      filter: "not_sent",
      deliveryStatusGuestIds: new Set(["a", "c"]),
    }).map((g) => g._id),
    ["a", "c"]
  );
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

test("invitation-only helpers used by client pages must not import mongoose models", () => {
  const details = readFileSync(
    join(process.cwd(), "lib/messages/invitationOnlyDetails.ts"),
    "utf8"
  );
  const page = readFileSync(
    join(process.cwd(), "app/dashboard/messages/new/page.tsx"),
    "utf8"
  );

  const importLines = (source: string) =>
    source
      .split("\n")
      .filter((line) => /^\s*import\s/.test(line) || /from ["']/.test(line))
      .join("\n");

  const detailsImports = importLines(details);
  const pageImports = importLines(page);

  assert.doesNotMatch(detailsImports, /from ["']@\/models\//);
  assert.doesNotMatch(detailsImports, /mongoose/);
  assert.doesNotMatch(detailsImports, /invitationOnlySendHistory/);
  assert.match(
    pageImports,
    /from ["']@\/lib\/messages\/invitationOnlyDetails["']/
  );
  assert.doesNotMatch(pageImports, /invitationOnlySendHistory/);
  assert.doesNotMatch(pageImports, /from ["']@\/models\//);
});
