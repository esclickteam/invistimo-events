/**
 * Unit tests: WW entitlement + outbound WhatsApp link routing (no DB).
 * Run: npx tsx scripts/tests/wedding-website-outbound-routing.test.ts
 */
import assert from "node:assert/strict";
import { isWeddingWebsiteEntitled } from "../../lib/weddingWebsite/entitlement";
import { resolveOutboundGuestLink } from "../../lib/weddingWebsite/outboundGuestLink";
import { toPublicMatches, sanitizeNameQuery } from "../../lib/weddingWebsite/guestLookup";

function main() {
  assert.equal(isWeddingWebsiteEntitled({}), false);
  assert.equal(
    isWeddingWebsiteEntitled({
      salesUpsells: { weddingWebsite: { enabled: true } },
    }),
    true
  );
  assert.equal(
    isWeddingWebsiteEntitled({
      invitationSettings: { rsvpSiteMode: "personal" },
    }),
    true
  );
  assert.equal(
    isWeddingWebsiteEntitled({
      invitationSettings: { weddingWebsiteEntitled: true },
    }),
    true
  );

  const regular = resolveOutboundGuestLink({
    entitled: false,
    invitationShareId: "SHARE1",
    guestToken: "tokA",
  });
  assert.equal(regular.ok, true);
  if (regular.ok) {
    assert.equal(regular.kind, "invite");
    assert.match(regular.fullUrl, /\/invite\/SHARE1\?token=tokA$/);
    assert.equal(regular.urlSuffix, "SHARE1?token=tokA");
  }

  const unpublished = resolveOutboundGuestLink({
    entitled: true,
    websiteStatus: "draft",
    websiteShareId: "SHARE1",
    invitationShareId: "SHARE1",
    guestToken: "tokA",
  });
  assert.equal(unpublished.ok, false);
  if (!unpublished.ok) {
    assert.equal(unpublished.reason, "WEDDING_WEBSITE_NOT_PUBLISHED");
  }

  const ww = resolveOutboundGuestLink({
    entitled: true,
    websiteStatus: "published",
    websiteShareId: "SHARE1",
    invitationShareId: "SHARE1",
    guestToken: "tokA",
  });
  assert.equal(ww.ok, true);
  if (ww.ok) {
    assert.equal(ww.kind, "website");
    assert.match(ww.fullUrl, /\/w\/SHARE1$/);
    assert.equal(ww.urlSuffix, "site/SHARE1");
    // Must NOT be guest-specific token link
    assert.ok(!ww.fullUrl.includes("token="));
  }

  const matches = toPublicMatches([
    {
      token: "t1",
      name: "דנה",
      phone: "0501234567",
      guestsCount: 2,
      rsvp: "pending",
    },
  ]);
  assert.equal(matches.length, 1);
  assert.equal(matches[0].phoneHint, "***4567");
  assert.ok(!matches[0].phoneHint.includes("050"));

  assert.ok(sanitizeNameQuery("דנ.*").includes("\\*"));
  assert.ok(!sanitizeNameQuery("abc").includes("\\"));

  console.log("✓ outbound routing + entitlement + safe lookup helpers");
}

main();
