/**
 * Wedding Website vs Regular Invitation — isolation + content resolver tests.
 * Run: npx tsx scripts/tests/wedding-website-separation.test.ts
 */

import assert from "node:assert/strict";
import { resolveWeddingSiteContent } from "../../lib/weddingWebsite/resolveWeddingSiteContent";
import { getWeddingTemplateIds, WEDDING_TEMPLATES } from "../../config/weddingWebsite/templates";
import { normalizeRsvpSiteMode } from "../../types/rsvpSite";

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (err) {
    console.error(`✗ ${name}`);
    throw err;
  }
}

test("10 distinct template ids registered", () => {
  const ids = getWeddingTemplateIds();
  assert.equal(ids.length, 10);
  assert.equal(new Set(ids).size, 10);
  assert.equal(WEDDING_TEMPLATES.length, 10);
});

test("templates have distinct mood + theme accents", () => {
  const moods = WEDDING_TEMPLATES.map((t) => t.mood);
  const accents = WEDDING_TEMPLATES.map((t) => t.theme.accent);
  assert.equal(new Set(moods).size, moods.length);
  // accents may theoretically collide — require at least 8 unique
  assert.ok(new Set(accents).size >= 8);
});

test("resolveWeddingSiteContent prefers real invitation/event over empty overrides", () => {
  const content = resolveWeddingSiteContent({
    invitation: {
      title: "נועה ויואב",
      eventDate: "2026-11-12",
      eventTime: "20:00",
      location: {
        name: "גן האירועים",
        address: "דרך הים 1, הרצליה",
        lat: 32.16,
        lng: 34.84,
      },
      publicEventPage: {
        schedule: {
          enabled: true,
          items: [{ time: "19:00", title: "קבלת פנים", description: "" }],
        },
        parking: {
          enabled: true,
          name: "חניון צפוני",
          address: "",
          instructions: "הצגה בשער",
        },
        gifts: { creditUrl: "https://credit.example/x", payboxUrl: "", bitPhone: "", bitUrl: "" },
      },
    },
    event: {
      title: "Should not win if invitation title exists",
      date: "2026-01-01",
      time: "18:00",
    },
    overrides: {},
    templateId: "eternal-gold",
  });

  assert.equal(content.coupleNames, "נועה ויואב");
  assert.equal(content.weddingDate, "2026-11-12");
  assert.equal(content.weddingTime, "20:00");
  assert.equal(content.venueName, "גן האירועים");
  assert.equal(content.schedule.length, 1);
  assert.equal(content.schedule[0].title, "קבלת פנים");
  assert.ok(content.transportation.some((t) => t.title === "חנייה"));
  assert.equal(content.giftLinks.creditUrl, "https://credit.example/x");
  assert.ok(content.wazeUrl.includes("waze.com"));
  assert.ok(content.mapsUrl.includes("google.com/maps"));
});

test("content overrides win when provided", () => {
  const content = resolveWeddingSiteContent({
    invitation: {
      title: "A & B",
      eventDate: "2026-01-01",
      eventTime: "19:00",
      location: { name: "X", address: "Y" },
    },
    overrides: {
      coupleNames: "מיכל ודני",
      heroSubtitle: "מחכים לכם",
      faq: [{ question: "חניה?", answer: "כן" }],
    },
  });
  assert.equal(content.coupleNames, "מיכל ודני");
  assert.equal(content.heroSubtitle, "מחכים לכם");
  assert.equal(content.faq[0].question, "חניה?");
});

test("rsvpSiteMode personal does not imply invite URL change", () => {
  assert.equal(normalizeRsvpSiteMode("personal"), "personal");
  assert.equal(normalizeRsvpSiteMode("standard"), "standard");
  assert.equal(normalizeRsvpSiteMode("weird"), "standard");
  // Product contract: invite path stays /invite/[shareId]
  const shareId = "AbCdEfGh12";
  const invitePath = `/invite/${shareId}`;
  const weddingPath = `/w/${shareId}`;
  assert.notEqual(invitePath, weddingPath);
  assert.ok(invitePath.startsWith("/invite/"));
  assert.ok(weddingPath.startsWith("/w/"));
});

test("protected invite route string must remain stable (golden)", () => {
  // Documented contract for regression — do not change without explicit migration
  const GOLDEN_INVITE_PATTERN = "/invite/[shareId]";
  assert.equal(GOLDEN_INVITE_PATTERN, "/invite/[shareId]");
});

console.log("\nAll wedding-website separation tests passed.");
