/**
 * Captures real desktop + mobile screenshots of featured wedding demo templates
 * after images/fonts load. Output: public/marketing/wedding-website/previews/
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");
const outDir = path.join(root, "public/marketing/wedding-website/previews");
const baseUrl = process.env.WW_DEMO_BASE || "http://localhost:3000";

const TEMPLATES = [
  "eternal-gold",
  "garden-bloom",
  "minimal-noir",
  "midnight-velvet",
];

fs.mkdirSync(outDir, { recursive: true });

async function stripDevOverlay(page) {
  await page.evaluate(() => {
    document.querySelectorAll("nextjs-portal").forEach((el) => el.remove());
    const style = document.createElement("style");
    style.textContent =
      "nextjs-portal{display:none!important;visibility:hidden!important}";
    document.documentElement.appendChild(style);
    const mo = new MutationObserver(() => {
      document.querySelectorAll("nextjs-portal").forEach((el) => el.remove());
    });
    mo.observe(document.documentElement, { childList: true, subtree: true });
    setTimeout(() => mo.disconnect(), 20000);
  });
}

async function waitForImages(page) {
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
  });
  // fonts
  await page.evaluate(async () => {
    if (document.fonts?.ready) await document.fonts.ready;
  });
  await page.waitForTimeout(800);
}

async function captureVariant(browser, templateId, variant) {
  const isMobile = variant === "mobile";
  const viewport = isMobile
    ? { width: 390, height: 844 }
    : { width: 1440, height: 900 };

  const page = await browser.newPage({
    viewport,
    deviceScaleFactor: isMobile ? 2 : 1,
  });

  await page.goto(`${baseUrl}/wedding-website/${templateId}`, {
    waitUntil: "domcontentloaded",
    timeout: 90_000,
  });
  await page.waitForSelector("body", { timeout: 60_000 });
  await stripDevOverlay(page);
  await waitForImages(page);

  // Prefer the most impressive framed viewport for marketing:
  // - most templates: hero at top
  // - garden-bloom desktop: gallery (hero is a cream split that reads as "empty")
  // - minimal-noir: gallery (hero is typography-only)
  const outPath = path.join(outDir, `${templateId}-${variant}.jpg`);
  // garden-bloom hero is a real split layout (photo + cream text) — keep it.
  // minimal-noir hero is typography-only; gallery is the impressive frame.
  const preferGallery =
    (templateId === "minimal-noir" && !isMobile) ||
    (templateId === "minimal-noir" && isMobile);

  if (preferGallery && (await page.locator("#gallery").count())) {
    await page.locator("#gallery").scrollIntoViewIfNeeded();
    await page.waitForTimeout(700);
    await waitForImages(page);
    await page.evaluate(() => window.scrollBy(0, -50));
  } else {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(400);
  }

  await page.screenshot({
    path: outPath,
    type: "jpeg",
    quality: 90,
    fullPage: false,
  });

  // Sanity: reject nearly-blank frames (too much uniform color)
  const stats = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 40;
    canvas.height = 40;
    // Can't sample page pixels from canvas easily without draw — use DOM heuristic
    const hero = document.querySelector("#hero, [id='hero'], section");
    const imgs = [...document.querySelectorAll("#hero img, section img")].slice(0, 6);
    return {
      heroText: (hero?.textContent || "").trim().slice(0, 80),
      loadedImages: imgs.filter((i) => i.complete && i.naturalWidth > 40).length,
      totalImages: imgs.length,
    };
  });

  await page.close();
  const size = fs.statSync(outPath).size;
  console.log(
    `OK ${templateId} ${variant} bytes=${size} images=${stats.loadedImages}/${stats.totalImages}`
  );
  if (size < 25_000) {
    throw new Error(`Screenshot too small for ${templateId} ${variant}: ${size}`);
  }
  return outPath;
}

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || "/usr/bin/google-chrome",
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

try {
  for (const id of TEMPLATES) {
    await captureVariant(browser, id, "desktop");
    await captureVariant(browser, id, "mobile");
  }
} finally {
  await browser.close();
}

console.log("Wrote previews to", outDir);
console.log(fs.readdirSync(outDir).join("\n"));
