import test from "node:test";
import assert from "node:assert/strict";

import {
  ADDON_LABELS,
  DESIGNED_INVITATION_DESCRIPTION,
  EMPTY_ADDONS,
  calculateQuote,
  packageIncludesDigitalInvitation,
} from "../../lib/pricing/packageQuote";
import {
  STUDIO_CATEGORIES,
  STUDIO_STYLES,
} from "../../lib/invitationStudio/types";
import { STUDIO_TEMPLATES } from "../../lib/invitationStudio/templates";
import { freezeSnapshot, renderSnapshot } from "../../lib/invitationStudio/render";
import { renderModelToSvg } from "../../lib/invitationStudio/svg";
import { stripStudioMotion } from "../../lib/invitationStudio/rasterize";
import {
  canPublishOrExport,
  resolveDesignedInvitationEntitlement,
  studioCheckoutGate,
  studioPaymentShouldGrant,
} from "../../lib/invitationStudio/entitlement";
import { hebrewDateFromIso } from "../../lib/invitationStudio/hebrewDate";
import { mergeCatalog } from "../../lib/invitationStudio/catalog";
import { envelopeTimeline } from "../../lib/invitationStudio/envelopeTimeline";
import { mergePlates, publicPlates } from "../../lib/invitationStudio/plateCatalog";
import { STUDIO_PLATES } from "../../lib/invitationStudio/plates";

test("catalog has at least 30 original layered templates across every category and style", () => {
  assert.ok(STUDIO_TEMPLATES.length >= 30);
  for (const category of STUDIO_CATEGORIES) {
    assert.ok(STUDIO_TEMPLATES.some((item) => item.category === category));
  }
  for (const style of STUDIO_STYLES) {
    assert.ok(STUDIO_TEMPLATES.some((item) => item.style === style));
  }
  const ids = new Set(STUDIO_TEMPLATES.map((item) => item.id));
  assert.equal(ids.size, STUDIO_TEMPLATES.length);
  for (const template of STUDIO_TEMPLATES) {
    assert.equal(template.formats.video, false);
    assert.equal(template.formats.static, true);
    assert.equal(template.formats.digital, true);
    assert.ok(template.layers.some((layer) => layer.type === "text"));
    assert.ok(template.layers.some((layer) => layer.type === "shape" || layer.type === "ornament"));
    assert.ok(template.layers.filter((layer) => layer.type === "text").length >= 6);
  }
});

test("a saved design keeps its snapshot after the source template changes", () => {
  const template = structuredClone(STUDIO_TEMPLATES[0]);
  const snapshot = freezeSnapshot(template, {
    content: { ...template.defaultContent, hostNames: "נועה ודני" },
  });
  template.layers[0] = { ...template.layers[0], x: 999 } as typeof template.layers[0];
  template.defaultContent.hostNames = "מישהו אחר";
  template.palette.ink = "#000000";
  const svg = renderModelToSvg(renderSnapshot(snapshot));
  assert.match(svg, /נועה ודני/);
  assert.doesNotMatch(svg, /מישהו אחר/);
  assert.equal(snapshot.layers[0].x, STUDIO_TEMPLATES[0].layers[0].x);
});

test("admin catalog edits do not rewrite an existing customer snapshot", () => {
  const template = STUDIO_TEMPLATES.find((item) => item.id === "wedding-ivory-classic");
  assert.ok(template);
  const saved = freezeSnapshot(template);
  const edited = mergeCatalog([
    {
      key: template.id,
      name: "שם חדש שלא אמור להופיע אצל הלקוח",
      template: { ...template, name: "שם חדש", palette: { ...template.palette, ink: "#010101" } },
    },
  ]);
  assert.equal(edited.find((item) => item.id === template.id)?.name, "שם חדש");
  assert.notEqual(saved.palette.ink, "#010101");
  assert.match(renderModelToSvg(renderSnapshot(saved)), new RegExp(saved.palette.ink));
});

test("paid packages already include the digital invitation and are not charged again", () => {
  for (const packageId of ["messages", "voice", "personal", "hybrid"] as const) {
    assert.equal(packageIncludesDigitalInvitation(packageId), true);
  }
  const without = calculateQuote({
    packageId: "messages",
    records: 80,
    addons: EMPTY_ADDONS,
    designedInvitationPrice: 150,
  });
  const withAddon = calculateQuote({
    packageId: "messages",
    records: 80,
    addons: { ...EMPTY_ADDONS, designedInvitation: true },
    designedInvitationPrice: 150,
  });
  assert.equal(withAddon.total, without.total);
  assert.equal(withAddon.addons.find((item) => item.key === "designedInvitation")?.price, 0);
  assert.equal(withAddon.addons.find((item) => item.key === "designedInvitation")?.includedInPackage, true);
  assert.match(ADDON_LABELS.designedInvitation, /הזמנה דיגיטלית מעוצבת/);
  assert.match(DESIGNED_INVITATION_DESCRIPTION, /תבניות יוקרתיות/);
});

test("entitlement extends an existing purchase and blocks unpaid publish", () => {
  assert.equal(resolveDesignedInvitationEntitlement({ plan: "plan1", hasPaid: true }).reason, "package");
  assert.equal(resolveDesignedInvitationEntitlement({ plan: "plan1", hasPaid: false }).entitled, false);
  assert.equal(resolveDesignedInvitationEntitlement({ customDesignEnabled: true }).reason, "custom_design");
  assert.equal(resolveDesignedInvitationEntitlement({ designedInvitationEnabled: true }).reason, "addon");
  assert.equal(canPublishOrExport({ entitled: false, templateFree: false }), false);
  assert.equal(canPublishOrExport({ entitled: false, templateFree: true }), true);
  assert.equal(canPublishOrExport({ entitled: true, templateFree: false }), true);
});

test("checkout and webhook grant only a paid test session", () => {
  assert.equal(studioCheckoutGate("sk_live_123").ok, false);
  assert.equal(studioCheckoutGate("").ok, false);
  assert.equal(studioCheckoutGate("sk_test_123").ok, true);
  assert.equal(
    studioPaymentShouldGrant({
      payment_status: "unpaid",
      livemode: false,
      metadata: { source: "invitation_studio" },
    }).grant,
    false
  );
  assert.equal(
    studioPaymentShouldGrant({
      payment_status: "paid",
      livemode: true,
      metadata: { source: "invitation_studio" },
    }).grant,
    false
  );
  assert.equal(
    studioPaymentShouldGrant({
      payment_status: "paid",
      livemode: false,
      metadata: { source: "invitation_studio" },
    }).grant,
    true
  );
});

test("svg keeps nikud and hebrew direction", () => {
  const template = STUDIO_TEMPLATES[0];
  const snapshot = freezeSnapshot(template, {
    content: { ...template.defaultContent, wording: "בְּשִׂמְחָה גְּדוֹלָה" },
    personalGreeting: true,
  });
  const svg = renderModelToSvg(renderSnapshot(snapshot, "דנה"));
  assert.match(svg, /בְּשִׂמְחָה גְּדוֹלָה/);
  assert.match(svg, /direction="rtl"/);
  assert.match(svg, /דנה/);
  const hidden = renderModelToSvg(renderSnapshot(snapshot));
  assert.doesNotMatch(hidden, /\{name\}/);
});

test("export svg drops the fade-in so text is not captured blank", () => {
  const template = STUDIO_TEMPLATES.find((item) => item.motion === "soft") || STUDIO_TEMPLATES[0];
  const svg = renderModelToSvg(renderSnapshot(freezeSnapshot(template)));
  const stripped = stripStudioMotion(svg);
  assert.match(svg, /class="s-in"/);
  assert.doesNotMatch(stripped, /class="s-in"/);
  assert.doesNotMatch(stripped, /studio-motion/);
  assert.doesNotMatch(stripped, /@keyframes/);
  assert.match(stripped, /נועה ודני/);
});

test("hebrew date helper returns a hebrew string", () => {
  assert.equal(hebrewDateFromIso("2026-11-12"), "ב׳ כסלו תשפ״ז");
  assert.equal(hebrewDateFromIso("2024-10-03"), "א׳ תשרי תשפ״ה");
  assert.equal(hebrewDateFromIso("2027-03-01"), "כ״ב אדר א׳ תשפ״ז");
  assert.equal(hebrewDateFromIso(""), "");
});

test("envelope timeline keeps invitation art visible while the flap opens", () => {
  const closed = envelopeTimeline(0.5);
  assert.equal(closed.flap, 1);
  assert.equal(closed.rise, 0);
  assert.equal(closed.cardAbovePocket, false);

  const opening = envelopeTimeline(1.8);
  assert.ok(opening.flap < 1);
  assert.ok(opening.flap > 0);
  assert.ok(opening.rise > 0);
  assert.equal(opening.cardAbovePocket, true);

  const mid = envelopeTimeline(3.2);
  assert.ok(mid.rise > 0.4);
  assert.equal(mid.envelopeAlpha, 1);

  const fading = envelopeTimeline(5.0);
  assert.ok(fading.envelopeAlpha < 1);
  assert.ok(fading.envelopeAlpha > 0);
});

test("plate catalog overrides hide boards without rewriting the source plate", () => {
  const merged = mergePlates([
    { key: "ivory-garden", hidden: true, name: "שם אדמין" },
    { key: "modern-ink", free: false, sort: 99 },
  ]);
  const ivory = merged.find((item) => item.id === "ivory-garden");
  const ink = merged.find((item) => item.id === "modern-ink");
  assert.ok(ivory);
  assert.ok(ink);
  assert.equal(ivory.published, false);
  assert.equal(ivory.name, "שם אדמין");
  assert.equal(STUDIO_PLATES.find((item) => item.id === "ivory-garden")?.name, "עלעל השנהב");
  assert.equal(ink.free, false);
  assert.equal(ink.sort, 99);
  assert.equal(publicPlates([{ key: "ivory-garden", hidden: true }]).some((item) => item.id === "ivory-garden"), false);
});
