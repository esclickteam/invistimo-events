/**
 * Browser visual QA for all 10 wedding templates.
 * Fails if any <img> has naturalWidth===0 or empty gallery cards.
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.WW_BASE_URL || "http://127.0.0.1:3000";
const OUT = "/opt/cursor/artifacts/wedding-visual-qa";
fs.mkdirSync(OUT, { recursive: true });

const TEMPLATES = [
  "eternal-gold",
  "midnight-velvet",
  "garden-bloom",
  "coastal-breeze",
  "desert-rose",
  "minimal-noir",
  "royal-ivory",
  "sunset-blush",
  "forest-enchanted",
  "modern-glass",
];

async function auditPage(page, label) {
  // Force scroll + wait until gallery images decode (avoid lazy-load false fails)
  await page.evaluate(async () => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const h = Math.max(document.body.scrollHeight, 2000);
    for (let y = 0; y < h; y += 400) {
      window.scrollTo(0, y);
      await sleep(150);
    }
    const gallery = document.querySelector("#gallery");
    if (gallery) gallery.scrollIntoView({ block: "center" });
    await sleep(300);
    const imgs = [...document.querySelectorAll("#gallery img, img")];
    await Promise.all(
      imgs.map(async (img) => {
        if (img.decode) {
          try {
            await img.decode();
          } catch {
            /* ignore decode errors — checked via naturalWidth */
          }
        }
        if (img.complete && img.naturalWidth > 0) return;
        await new Promise((r) => {
          img.onload = () => r(null);
          img.onerror = () => r(null);
          setTimeout(r, 5000);
        });
      })
    );
  });
  await page.waitForTimeout(500);

  const report = await page.evaluate(() => {
    const imgs = [...document.querySelectorAll("img")];
    const videos = [...document.querySelectorAll("video")];
    const brokenImages = imgs
      .filter((img) => {
        const src = img.getAttribute("src") || "";
        if (!src) return true;
        return img.naturalWidth === 0 || img.naturalHeight === 0;
      })
      .map((img) => ({
        src: img.getAttribute("src") || "",
        alt: img.alt || "",
        className: img.className,
      }));

    const emptySrc = imgs
      .filter((img) => !(img.getAttribute("src") || "").trim())
      .map((img) => img.outerHTML.slice(0, 120));

    const brokenVideos = videos
      .filter((v) => {
        const src = v.currentSrc || v.getAttribute("src") || "";
        if (!src) return true;
        // HAVE_CURRENT_DATA or better, or already playing metadata
        return v.networkState === 3 /* NETWORK_NO_SOURCE */ || v.error != null;
      })
      .map((v) => ({
        src: v.getAttribute("src") || v.currentSrc || "",
        error: v.error?.code || null,
        networkState: v.networkState,
      }));

    const gallerySection = document.querySelector("#gallery");
    const galleryImgs = gallerySection
      ? [...gallerySection.querySelectorAll("img")]
      : [];
    const emptyGalleryCards = galleryImgs.filter(
      (img) => !(img.getAttribute("src") || "").trim() || img.naturalWidth === 0
    ).length;

    return {
      imageCount: imgs.length,
      videoCount: videos.length,
      brokenImages,
      emptySrc,
      brokenVideos,
      galleryImageCount: galleryImgs.length,
      emptyGalleryCards,
      hasHero: !!document.querySelector("#hero"),
      hasGallery: !!gallerySection,
      hasRsvp: !!document.querySelector("#rsvp"),
      hasLocation: !!document.querySelector("#location"),
      hasTransport: !!document.querySelector("#transportation"),
    };
  });

  return { label, ...report };
}

async function main() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.PLAYWRIGHT_CHROME || "/usr/local/bin/google-chrome",
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });

  const results = [];
  for (const id of TEMPLATES) {
    for (const viewport of [
      { name: "desktop", width: 1440, height: 900 },
      { name: "mobile", width: 390, height: 844 },
    ]) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        locale: "he-IL",
      });
      const page = await context.newPage();
      const url = `${BASE}/wedding-website/${id}`;
      const resp = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
      await page.waitForSelector("#hero, .wedding-website-root", { timeout: 30000 }).catch(() => null);
      // scroll through page to trigger lazy media
      await page.evaluate(async () => {
        const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
        const h = document.body.scrollHeight;
        for (let y = 0; y < h; y += 500) {
          window.scrollTo(0, y);
          await sleep(120);
        }
        window.scrollTo(0, 0);
      });
      const audit = await auditPage(page, `${id}:${viewport.name}`);
      audit.status = resp?.status() || 0;
      audit.url = url;
      const shot = path.join(OUT, `${id}-${viewport.name}.png`);
      await page.screenshot({ path: shot, fullPage: true });
      audit.screenshot = shot;

      // gallery close-up
      const gallery = page.locator("#gallery");
      if (await gallery.count()) {
        await gallery.first().scrollIntoViewIfNeeded();
        await page.waitForTimeout(400);
        await page.screenshot({
          path: path.join(OUT, `${id}-${viewport.name}-gallery.png`),
        });
      }

      results.push(audit);
      await context.close();
      console.log(
        `${audit.label} images=${audit.imageCount} broken=${audit.brokenImages.length} galleryEmpty=${audit.emptyGalleryCards} videosBroken=${audit.brokenVideos.length}`
      );
    }
  }

  await browser.close();

  const summary = {
    generatedAt: new Date().toISOString(),
    base: BASE,
    templates: TEMPLATES.map((id) => {
      const desktop = results.find((r) => r.label === `${id}:desktop`);
      const mobile = results.find((r) => r.label === `${id}:mobile`);
      const mediaFail =
        (desktop?.brokenImages.length || 0) > 0 ||
        (desktop?.emptyGalleryCards || 0) > 0 ||
        (desktop?.brokenVideos.length || 0) > 0 ||
        (mobile?.brokenImages.length || 0) > 0 ||
        (mobile?.emptyGalleryCards || 0) > 0;
      return {
        id,
        media: mediaFail ? "FAIL" : "PASS",
        desktop,
        mobile,
      };
    }),
    totals: {
      brokenImages: results.reduce((n, r) => n + r.brokenImages.length, 0),
      brokenVideos: results.reduce((n, r) => n + r.brokenVideos.length, 0),
      emptyGalleryCards: results.reduce((n, r) => n + r.emptyGalleryCards, 0),
    },
  };

  fs.writeFileSync(path.join(OUT, "report.json"), JSON.stringify(summary, null, 2));
  console.log("\n=== SUMMARY ===");
  for (const t of summary.templates) {
    console.log(`TEMPLATE ${t.id} media = ${t.media}`);
  }
  console.log(`BROKEN IMAGES = ${summary.totals.brokenImages}`);
  console.log(`BROKEN VIDEOS = ${summary.totals.brokenVideos}`);
  console.log(`EMPTY GALLERY CARDS = ${summary.totals.emptyGalleryCards}`);

  if (
    summary.totals.brokenImages > 0 ||
    summary.totals.brokenVideos > 0 ||
    summary.totals.emptyGalleryCards > 0
  ) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
