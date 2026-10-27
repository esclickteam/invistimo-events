import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { WEDDING_TEMPLATES } from "../../config/weddingWebsite/templates";
import {
  INTERACTIVE_WEDDING_THEMES,
  getInteractiveWeddingTheme,
  isInteractiveWeddingThemeId,
} from "../../config/weddingWebsite/interactiveThemes";

const root = join(process.cwd());

function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

test("interactive wedding themes expose exactly 6 distinct templates", () => {
  assert.equal(INTERACTIVE_WEDDING_THEMES.length, 6);
  const ids = INTERACTIVE_WEDDING_THEMES.map((t) => t.id);
  assert.equal(new Set(ids).size, 6);
  for (const id of ids) {
    assert.ok(WEDDING_TEMPLATES.some((t) => t.id === id), `${id} missing from WEDDING_TEMPLATES`);
    assert.ok(isInteractiveWeddingThemeId(id));
    assert.ok(getInteractiveWeddingTheme(id));
  }
});

test("interactive templates live in wedding-website system with physical envelope", () => {
  assert.match(read("app/preview/interactive-invites/page.tsx"), /redirect/);
  assert.match(
    read("app/preview/interactive-invites/[templateId]/page.tsx"),
    /wedding-website/
  );
  assert.match(read("components/wedding-website/interactive/PhysicalEnvelope.tsx"), /data-pe-flap/);
  assert.match(read("components/wedding-website/interactive/PhysicalEnvelope.tsx"), /gsap/);
  assert.match(read("components/wedding-website/interactive/FriendsDrinkingScene.tsx"), /ScrollTrigger/);
  assert.match(read("components/wedding-website/interactive/InteractiveWeddingSite.tsx"), /PhysicalEnvelope/);
  assert.match(read("components/wedding-website/templates/index.ts"), /lunar-silk/);
  assert.match(read("config/weddingWebsite/interactiveThemes.ts"), /amber-archive/);
  assert.match(read("config/weddingWebsite/templates.ts"), /INTERACTIVE_WEDDING_THEMES/);

  const inviteApi = read("app/api/wedding-website/route.ts");
  assert.doesNotMatch(inviteApi, /interactive-invites/);
});

test("lunar-silk ships original local media assets (not stock URLs)", () => {
  const theme = getInteractiveWeddingTheme("lunar-silk")!;
  assert.match(theme.heroImage, /^\/interactive-invites\/lunar-silk\//);
  assert.ok(theme.galleryImages.every((src) => src.startsWith("/interactive-invites/lunar-silk/")));
  const required = [
    "public/interactive-invites/lunar-silk/envelope-photo.webp",
    "public/interactive-invites/lunar-silk/wax-seal.webp",
    "public/interactive-invites/lunar-silk/silk-ribbon.webp",
    "public/interactive-invites/lunar-silk/invite-card.webp",
    "public/interactive-invites/lunar-silk/hero.webp",
  ];
  for (const rel of required) {
    assert.ok(readFileSync(join(root, rel)).byteLength > 1000, `${rel} missing or empty`);
  }
});

test("preview path is marked noindex in next config", () => {
  const cfg = read("next.config.ts");
  assert.match(cfg, /\/preview/);
  assert.match(cfg, /\/preview\/:path\*/);
});
