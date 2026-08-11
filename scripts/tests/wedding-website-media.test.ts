/**
 * Ensures wedding website media catalog has zero broken assets.
 * Run: npx tsx scripts/tests/wedding-website-media.test.ts
 */

import assert from "node:assert/strict";
import { WEDDING_TEMPLATES } from "../../config/weddingWebsite/templates";
import { WW_IMAGES, WW_VIDEOS } from "../../config/weddingWebsite/media";
import { DEMO_GUEST_UPLOADS } from "../../config/weddingWebsite/demoContent";
import { VIDEOS } from "../../components/wedding-website/shared/weddingUtils";

async function isHealthy(url: string) {
  const res = await fetch(url, {
    headers: { Range: "bytes=0-1" },
    redirect: "follow",
  });
  const ct = res.headers.get("content-type") || "";
  const ok = (res.ok || res.status === 206) && !ct.includes("text/html");
  return { ok, status: res.status, ct };
}

async function main() {
  const urls = new Set<string>();
  for (const t of WEDDING_TEMPLATES) {
    urls.add(t.previewImage);
    urls.add(t.heroImage);
    t.galleryImages.forEach((u) => urls.add(u));
  }
  Object.values(WW_IMAGES).forEach((u) => urls.add(u));
  Object.values(WW_VIDEOS).forEach((u) => urls.add(u));
  Object.values(VIDEOS).forEach((u) => urls.add(u));
  DEMO_GUEST_UPLOADS.forEach((u) => urls.add(u.url));

  const broken: string[] = [];
  for (const url of urls) {
    const result = await isHealthy(url);
    if (!result.ok) broken.push(`${result.status} ${result.ct} ${url}`);
  }

  assert.equal(
    broken.length,
    0,
    `Broken media found:\n${broken.join("\n")}`
  );
  console.log(`✓ ${urls.size} wedding media URLs healthy`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
