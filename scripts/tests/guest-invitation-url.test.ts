import test from "node:test";
import assert from "node:assert/strict";

import {
  getGuestInvitationUrl,
  buildGuestInviteUrl,
  buildGuestInvitePath,
} from "../../lib/guestInviteUrl";
import { mergeGuestActivity } from "../../lib/dashboardGuestActivity";
import {
  overlayWeddingTemplateImages,
  sanitizeWeddingImageUrls,
} from "../../lib/weddingWebsite/images";
import { mergeWeddingWebsiteContent } from "../../lib/weddingWebsite/content";
import { WEDDING_DEMO_CONTENT } from "../../config/weddingWebsite/demoContent";
import type { WeddingTemplate } from "../../types/weddingWebsite";

test("getGuestInvitationUrl selects /invite for regular customers and /w for wedding website", () => {
  assert.equal(
    getGuestInvitationUrl({ shareId: "share1", token: "tok1" }),
    "https://www.invistimo.com/invite/share1?token=tok1"
  );
  assert.equal(
    getGuestInvitationUrl({
      shareId: "share1",
      token: "tok1",
      guestExperienceType: "personal_invitation",
    }),
    "https://www.invistimo.com/invite/share1?token=tok1"
  );
  assert.equal(
    getGuestInvitationUrl({
      shareId: "share1",
      token: "tok1",
      guestExperienceType: "wedding_website",
    }),
    "https://www.invistimo.com/w/share1?token=tok1"
  );
  assert.equal(buildGuestInvitePath("share1", "standard"), "/invite/share1");
  assert.equal(buildGuestInvitePath("share1", "personal"), "/w/share1");
  assert.equal(getGuestInvitationUrl, buildGuestInviteUrl);
});

test("changing guestExperienceType does not require new tokens", () => {
  const token = "same-token";
  assert.match(
    getGuestInvitationUrl({
      shareId: "abc",
      token,
      guestExperienceType: "personal_invitation",
    }),
    /token=same-token/
  );
  assert.match(
    getGuestInvitationUrl({
      shareId: "abc",
      token,
      guestExperienceType: "wedding_website",
    }),
    /token=same-token/
  );
});

test("staff preview stays on the same guest path without rewriting tokens", () => {
  assert.equal(
    getGuestInvitationUrl({
      shareId: "abc",
      guestExperienceType: "wedding_website",
      origin: "",
      preview: "staff",
      extraParams: { readonly: "1" },
    }),
    "/w/abc?preview=staff&readonly=1"
  );
  assert.equal(
    getGuestInvitationUrl({
      shareId: "abc",
      guestExperienceType: "personal_invitation",
      origin: "",
      preview: "staff",
    }),
    "/invite/abc?preview=staff"
  );
});

test("opened guests move from notOpened to opened without replacing the whole list", () => {
  const guests = [
    {
      _id: "g1",
      name: "Dana",
      token: "t1",
      firstOpenedAt: null,
      lastOpenedAt: null,
      openCount: 0,
      rsvp: "pending",
    },
    {
      _id: "g2",
      name: "Noam",
      token: "t2",
      firstOpenedAt: "2026-08-29T10:00:00.000Z",
      lastOpenedAt: "2026-08-29T10:00:00.000Z",
      openCount: 1,
      rsvp: "yes",
    },
  ];

  const next = mergeGuestActivity(guests, [
    {
      id: "g1",
      token: "t1",
      firstOpenedAt: "2026-08-29T11:00:00.000Z",
      lastOpenedAt: "2026-08-29T11:00:00.000Z",
      openCount: 1,
      rsvp: "pending",
    },
  ]);

  assert.equal(next[0].name, "Dana");
  assert.equal(next[0].firstOpenedAt, "2026-08-29T11:00:00.000Z");
  assert.equal(next[0].openCount, 1);
  assert.equal(next[1].name, "Noam");
});

test("customer wedding images are stored separately from template demo images", () => {
  const merged = mergeWeddingWebsiteContent(WEDDING_DEMO_CONTENT, {
    heroImage: "https://res.cloudinary.com/demo/image/upload/hero.jpg",
    galleryImages: [
      "https://res.cloudinary.com/demo/image/upload/g1.jpg",
      "javascript:alert(1)",
    ],
  });

  assert.equal(
    merged.heroImage,
    "https://res.cloudinary.com/demo/image/upload/hero.jpg"
  );
  assert.deepEqual(sanitizeWeddingImageUrls(merged.galleryImages), [
    "https://res.cloudinary.com/demo/image/upload/g1.jpg",
  ]);
  assert.equal(merged.galleryImages?.includes("javascript:alert(1)"), false);

  const empty = mergeWeddingWebsiteContent(WEDDING_DEMO_CONTENT, {
    galleryImages: [],
  });
  assert.deepEqual(empty.galleryImages, []);
});

test("overlay uses customer images and never writes template demo URLs into content", () => {
  const template = {
    id: "eternal-gold",
    name: "Eternal",
    tagline: "",
    description: "",
    previewImage: "https://example.com/preview.jpg",
    heroImage: "https://example.com/demo-hero.jpg",
    galleryImages: ["https://example.com/demo-1.jpg"],
    theme: {} as WeddingTemplate["theme"],
    mood: "romantic",
  } as WeddingTemplate;

  const live = overlayWeddingTemplateImages(template, {
    heroImage: "https://res.cloudinary.com/demo/image/upload/hero.jpg",
    galleryImages: ["https://res.cloudinary.com/demo/image/upload/g1.jpg"],
  });

  assert.ok(live?.heroImage.includes("hero.jpg"));
  assert.ok(live?.galleryImages[0].includes("g1.jpg"));
  assert.equal(live?.heroImage.includes("demo-hero.jpg"), false);

  const fallback = overlayWeddingTemplateImages(template, {});
  assert.equal(fallback?.heroImage, template.heroImage);
});
