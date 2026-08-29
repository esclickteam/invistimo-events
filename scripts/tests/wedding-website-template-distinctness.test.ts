/**
 * Assert the 10 templates remain structurally distinct (section order + signatures).
 * Run: npx tsx scripts/tests/wedding-website-template-distinctness.test.ts
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { TEMPLATE_CONCEPTS } from "../../config/weddingWebsite/templateConcepts";
import { getWeddingTemplateIds } from "../../config/weddingWebsite/templates";

const ROOT = path.join(process.cwd(), "components/wedding-website/templates");

const BLOCK_TO_SECTION: Record<string, string> = {
  WelcomeBlock: "invitation",
  CountdownBlock: "countdown",
  StoryBlock: "our-story",
  HowWeMetBlock: "how-we-met",
  ProposalBlock: "proposal",
  DateRevealBlock: "event-details",
  CouplePhotosBlock: "video",
  FullBleedPhoto: "full-bleed",
  QuoteBlock: "quote",
  ScheduleBlock: "schedule",
  LocationBlock: "location",
  DressCodeBlock: "dress-code",
  TransportationBlock: "transportation",
  AccommodationsBlock: "accommodations",
  FaqBlock: "faq",
  GiftsBlock: "gifts",
  RsvpBlock: "rsvp",
  ContactPeopleBlock: "contact",
  FinalMomentBlock: "final",
  RichGalleryGrid: "gallery",
  FilmStripGallery: "gallery",
  PolaroidGallery: "gallery",
  EnvelopeRsvp: "rsvp",
  PathDrawTimeline: "schedule",
};

function extractSectionOrder(src: string): string[] {
  const order: string[] = [];
  const push = (id: string) => {
    if (!id || order.includes(id)) return;
    order.push(id);
  };

  // Ignore helper components above the default export (e.g. WatercolorStoryBlock)
  const start = src.indexOf("export default function");
  const body = start >= 0 ? src.slice(start) : src;

  // Walk source in order: either JSX id= or known block components
  const tokenRe =
    /\bid=["']([a-z0-9-]+)["']|<(WelcomeBlock|CountdownBlock|StoryBlock|HowWeMetBlock|ProposalBlock|DateRevealBlock|CouplePhotosBlock|FullBleedPhoto|QuoteBlock|ScheduleBlock|LocationBlock|DressCodeBlock|TransportationBlock|AccommodationsBlock|FaqBlock|GiftsBlock|RsvpBlock|ContactPeopleBlock|FinalMomentBlock|RichGalleryGrid|FilmStripGallery|PolaroidGallery|EnvelopeRsvp|PathDrawTimeline|WatercolorStoryBlock)\b/g;

  let m: RegExpExecArray | null;
  while ((m = tokenRe.exec(body))) {
    if (m[1]) {
      push(m[1]);
    } else if (m[2]) {
      if (m[2] === "WatercolorStoryBlock") push("our-story");
      else push(BLOCK_TO_SECTION[m[2]] || m[2]);
    }
  }
  return order;
}

function main() {
  const ids = getWeddingTemplateIds();
  assert.equal(ids.length, 10);

  const orders: Record<string, string> = {};
  for (const id of ids) {
    const concept = TEMPLATE_CONCEPTS[id as keyof typeof TEMPLATE_CONCEPTS];
    assert.ok(concept, `missing concept for ${id}`);

    const map: Record<string, string> = {
      "eternal-gold": "EternalGoldSite.tsx",
      "midnight-velvet": "MidnightVelvetSite.tsx",
      "garden-bloom": "GardenBloomSite.tsx",
      "coastal-breeze": "CoastalBreezeSite.tsx",
      "desert-rose": "DesertRoseSite.tsx",
      "minimal-noir": "MinimalNoirSite.tsx",
      "royal-ivory": "RoyalIvorySite.tsx",
      "sunset-blush": "SunsetBlushSite.tsx",
      "forest-enchanted": "ForestEnchantedSite.tsx",
      "modern-glass": "ModernGlassSite.tsx",
    };
    const file = map[id];
    const src = fs.readFileSync(path.join(ROOT, file), "utf8");
    assert.ok(!src.includes("overflow-x-auto"), `${id} still has overflow-x-auto`);
    assert.ok(
      src.includes("useWeddingRsvp") ||
        src.includes("RsvpBlock") ||
        src.includes("EnvelopeRsvp") ||
        src.includes("WeddingRsvp"),
      `${id} missing RSVP`
    );
    assert.ok(src.includes("WeddingActionBar"), `${id} missing action bar CTAs`);
    assert.ok(src.includes("overflow-x-clip"), `${id} missing overflow-x-clip`);
    assert.ok(
      src.includes("FullLengthBlocks") || src.includes("FullBleedPhoto"),
      `${id} should use full-length block system`
    );

    const order = extractSectionOrder(src);
    assert.ok(order[0] === "hero", `${id} must start with hero, got ${order[0]}`);
    assert.ok(
      order.length >= 12,
      `${id} too short: ${order.length} sections (${order.join(">")})`
    );
    orders[id] = order.join(">");

    const sig = concept.signatureElement.toLowerCase();
    if (sig.includes("goldscroll")) assert.ok(src.includes("GoldScrollLine"), id);
    if (sig.includes("starfield")) assert.ok(src.includes("Starfield"), id);
    if (sig.includes("floatingpetals") || sig.includes("petal"))
      assert.ok(src.includes("FloatingPetals"), id);
    if (sig.includes("shuttle")) assert.ok(src.includes("ShuttleRide"), id);
    if (sig.includes("watercolor")) assert.ok(src.includes("WatercolorReveal"), id);
    if (sig.includes("envelope")) assert.ok(src.includes("EnvelopeRsvp"), id);
    if (sig.includes("polaroid")) assert.ok(src.includes("PolaroidGallery"), id);
    if (sig.includes("pathdraw")) assert.ok(src.includes("PathDrawTimeline"), id);
  }

  const uniqueOrders = new Set(Object.values(orders));
  assert.equal(
    uniqueOrders.size,
    10,
    `section orders not unique:\n${JSON.stringify(orders, null, 2)}`
  );

  console.log("✓ 10 templates structurally distinct + full-length");
  for (const [id, order] of Object.entries(orders)) {
    console.log(`  - ${id}: ${order.split(">").length} · ${order}`);
  }
}

main();
