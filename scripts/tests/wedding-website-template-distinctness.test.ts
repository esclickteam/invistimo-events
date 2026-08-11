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

function extractSectionOrder(src: string): string[] {
  const re = /\bid=["']([a-z0-9-]+)["']/g;
  const order: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    if (!order.includes(m[1])) order.push(m[1]);
  }
  return order.filter((id) => id !== "footer" || true);
}

function main() {
  const ids = getWeddingTemplateIds();
  assert.equal(ids.length, 10);

  const orders: Record<string, string> = {};
  for (const id of ids) {
    const concept = TEMPLATE_CONCEPTS[id as keyof typeof TEMPLATE_CONCEPTS];
    assert.ok(concept, `missing concept for ${id}`);

    const fileGuess = [
      "EternalGoldSite",
      "MidnightVelvetSite",
      "GardenBloomSite",
      "CoastalBreezeSite",
      "DesertRoseSite",
      "MinimalNoirSite",
      "RoyalIvorySite",
      "SunsetBlushSite",
      "ForestEnchantedSite",
      "ModernGlassSite",
    ];
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
    assert.ok(src.includes("useWeddingRsvp") || src.includes("WeddingRsvp"), `${id} missing RSVP hook`);
    assert.ok(src.includes("WeddingSmartNav"), `${id} missing smart nav`);
    assert.ok(src.includes("overflow-x-clip"), `${id} missing overflow-x-clip`);

    const order = extractSectionOrder(src);
    assert.ok(order[0] === "hero", `${id} must start with hero`);
    orders[id] = order.join(">");

    // signature presence
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

  console.log("✓ 10 templates structurally distinct");
  for (const [id, order] of Object.entries(orders)) {
    console.log(`  - ${id}: ${order}`);
  }
}

main();
