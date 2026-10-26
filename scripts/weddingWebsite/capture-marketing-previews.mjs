/**
 * Captures marketing-page screenshots that show real wedding-site content
 * (hero, full scroll, story/gallery sections) — not stock poster images.
 *
 * Output: public/marketing/wedding-website/previews/
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");
const outDir = path.join(root, "public/marketing/wedding-website/previews");
const baseUrl = process.env.WW_DEMO_BASE || "http://localhost:3000";

fs.mkdirSync(outDir, { recursive: true });

async function stripDevOverlay(page) {
  await page.evaluate(() => {
    document.querySelectorAll("nextjs-portal").forEach((el) => el.remove());
    const style = document.createElement("style");
    style.textContent =
      "nextjs-portal{display:none!important;visibility:hidden!important}";
    document.documentElement.appendChild(style);
  });
}

async function waitReady(page) {
  await page.waitForSelector("body", { timeout: 60_000 });
  await stripDevOverlay(page);
  await page.evaluate(async () => {
    const imgs = [...document.images];
    await Promise.all(
      imgs.map((img) => {
        if (img.complete && img.naturalWidth > 0) return Promise.resolve();
        return new Promise((resolve) => {
          img.addEventListener("load", resolve, { once: true });
          img.addEventListener("error", resolve, { once: true });
          setTimeout(resolve, 8000);
        });
      })
    );
    if (document.fonts?.ready) await document.fonts.ready;
  });
  // Let entrance animations settle so text is visible
  await page.waitForTimeout(1800);
}

async function openTemplate(browser, templateId, viewport, deviceScaleFactor = 1) {
  const page = await browser.newPage({ viewport, deviceScaleFactor });
  await page.goto(`${baseUrl}/wedding-website/${templateId}`, {
    waitUntil: "domcontentloaded",
    timeout: 90_000,
  });
  await waitReady(page);
  return page;
}

async function assertHasContent(page, label) {
  const text = await page.evaluate(() => document.body?.innerText || "");
  const needles = ["עמית", "בן", "SAVE THE DATE", "בספטמבר", "אישור הגעה"];
  const hits = needles.filter((n) => text.includes(n));
  if (hits.length < 2) {
    throw new Error(
      `Content missing in ${label}. Found: ${hits.join(", ") || "(none)"}`
    );
  }
  console.log(`content-ok ${label}: ${hits.join(", ")}`);
}

async function shot(page, name, opts = {}) {
  const outPath = path.join(outDir, name);
  await page.screenshot({
    path: outPath,
    type: "jpeg",
    quality: 92,
    fullPage: Boolean(opts.fullPage),
  });
  const size = fs.statSync(outPath).size;
  if (size < 30_000) throw new Error(`Screenshot too small: ${name} (${size})`);
  console.log(`OK ${name} bytes=${size}`);
  return outPath;
}

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || "/usr/bin/google-chrome",
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

try {
  // --- Eternal Gold: hero desktop + mobile (marketing hero) ---
  {
    const page = await openTemplate(browser, "eternal-gold", {
      width: 1440,
      height: 900,
    });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(400);
    await assertHasContent(page, "eternal-gold desktop hero");
    await shot(page, "eternal-gold-desktop.jpg");
    await shot(page, "hero-desktop.jpg");
    // Full-page for anatomy / "more than invite" section
    await shot(page, "eternal-gold-full.jpg", { fullPage: true });
    await page.close();
  }

  {
    const page = await openTemplate(
      browser,
      "eternal-gold",
      { width: 390, height: 844 },
      2
    );
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(400);
    await assertHasContent(page, "eternal-gold mobile hero");
    await shot(page, "eternal-gold-mobile.jpg");
    await shot(page, "hero-mobile.jpg");
    await page.close();
  }

  // --- Anatomy collage pieces: story + gallery + details from eternal-gold ---
  {
    const page = await openTemplate(browser, "eternal-gold", {
      width: 1280,
      height: 900,
    });
    for (const [sel, name] of [
      ["#story, [id*='story'], section", "section-story.jpg"],
      ["#gallery", "section-gallery.jpg"],
      ["#details, #schedule, #location", "section-details.jpg"],
    ]) {
      const loc = page.locator(sel).first();
      if (await loc.count()) {
        await loc.scrollIntoViewIfNeeded();
        await page.waitForTimeout(700);
        await waitReady(page);
        await shot(page, name);
      } else {
        console.warn(`skip missing selector ${sel}`);
      }
    }
    await page.close();
  }

  // --- Garden Bloom for variety in anatomy (different look from hero) ---
  {
    const page = await openTemplate(browser, "garden-bloom", {
      width: 1440,
      height: 900,
    });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(400);
    await shot(page, "garden-bloom-desktop.jpg");
    await shot(page, "anatomy-desktop.jpg");
    await page.close();
  }

  {
    const page = await openTemplate(
      browser,
      "garden-bloom",
      { width: 390, height: 844 },
      2
    );
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(400);
    await shot(page, "garden-bloom-mobile.jpg");
    await shot(page, "mobile-showcase.jpg");
    await page.close();
  }

  // Refresh remaining featured gallery shots
  for (const id of ["minimal-noir", "midnight-velvet"]) {
    const desk = await openTemplate(browser, id, { width: 1440, height: 900 });
    if (id === "minimal-noir" && (await desk.locator("#gallery").count())) {
      await desk.locator("#gallery").scrollIntoViewIfNeeded();
      await desk.waitForTimeout(700);
    } else {
      await desk.evaluate(() => window.scrollTo(0, 0));
      await desk.waitForTimeout(400);
    }
    await shot(desk, `${id}-desktop.jpg`);
    await desk.close();

    const mob = await openTemplate(
      browser,
      id,
      { width: 390, height: 844 },
      2
    );
    if (id === "minimal-noir" && (await mob.locator("#gallery").count())) {
      await mob.locator("#gallery").scrollIntoViewIfNeeded();
      await mob.waitForTimeout(700);
    } else {
      await mob.evaluate(() => window.scrollTo(0, 0));
      await mob.waitForTimeout(400);
    }
    await shot(mob, `${id}-mobile.jpg`);
    await mob.close();
  }
} finally {
  await browser.close();
}

console.log("Wrote marketing previews:", fs.readdirSync(outDir).join("\n"));
