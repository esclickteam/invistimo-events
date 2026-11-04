/**
 * Records desktop + mobile luxury homepage interactions for QA review.
 * Usage: PREVIEW_URL=https://... node scripts/lux-interactive-record.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { chromium, devices } from "playwright";

const BASE = process.env.PREVIEW_URL;
if (!BASE) {
  console.error("PREVIEW_URL required");
  process.exit(1);
}

const outDir = path.join(
  process.env.USERPROFILE || process.env.HOME || ".",
  "Downloads",
  "invistimo-lux-interactive-qa",
);
fs.mkdirSync(outDir, { recursive: true });

async function run(label, contextOptions, viewport) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    ...contextOptions,
    viewport,
    recordVideo: { dir: outDir, size: viewport },
    locale: "he-IL",
  });
  const page = await context.newPage();
  await page.goto(BASE, { waitUntil: "networkidle", timeout: 90_000 });
  await page.waitForTimeout(800);

  // Full scroll
  const height = await page.evaluate(() => document.body.scrollHeight);
  const steps = Math.max(8, Math.ceil(height / viewport.height));
  for (let i = 0; i <= steps; i++) {
    await page.evaluate(
      ({ i, steps, vh }) => window.scrollTo(0, (i / steps) * (document.body.scrollHeight - vh)),
      { i, steps, vh: viewport.height },
    );
    await page.waitForTimeout(280);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(400);

  // Envelope
  const openEnv = page.getByRole("button", { name: "לפתוח את המעטפה" }).first();
  if (await openEnv.count()) {
    await openEnv.scrollIntoViewIfNeeded();
    await openEnv.click({ force: true });
    await page.waitForTimeout(900);
    await page.getByRole("button", { name: "הזמנה דיגיטלית" }).first().click({ force: true }).catch(() => {});
    await page.waitForTimeout(700);
  }

  // RSVP
  const linkBtn = page.getByRole("button", { name: "לפתוח קישור אישי" }).first();
  if (await linkBtn.count()) {
    await linkBtn.scrollIntoViewIfNeeded();
    await linkBtn.click({ force: true });
    await page.waitForTimeout(500);
    const rsvp = page.getByRole("button", { name: "לאישור הגעה" }).first();
    if (await rsvp.count()) await rsvp.click({ force: true });
    await page.waitForTimeout(400);
    const yes = page.getByRole("button", { name: "מגיעים" }).first();
    if (await yes.count()) await yes.click({ force: true });
    await page.waitForTimeout(800);
  }

  // Seating tap-assign
  const guest = page.getByRole("button", { name: /מיכל אברהם/ }).first();
  if (await guest.count()) {
    await guest.scrollIntoViewIfNeeded();
    await guest.click({ force: true });
    await page.waitForTimeout(350);
    const table = page.getByRole("button", { name: /שולחן 3/ }).first();
    if (await table.count()) await table.click({ force: true });
    await page.waitForTimeout(900);
  }

  // Gallery lightbox
  const gallery = page.getByRole("button", { name: /Eternal Gold/ }).first();
  if (await gallery.count()) {
    await gallery.scrollIntoViewIfNeeded();
    await gallery.click({ force: true });
    await page.waitForTimeout(700);
    await page.keyboard.press("ArrowLeft");
    await page.waitForTimeout(500);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);
  }

  await page.screenshot({
    path: path.join(outDir, `${label}-final.png`),
    fullPage: false,
  });

  await context.close();
  await browser.close();

  // Rename newest webm in outDir
  const videos = fs
    .readdirSync(outDir)
    .filter((f) => f.endsWith(".webm"))
    .map((f) => ({ f, m: fs.statSync(path.join(outDir, f)).mtimeMs }))
    .sort((a, b) => b.m - a.m);
  if (videos[0]) {
    const dest = path.join(outDir, `${label}-interactions.webm`);
    fs.renameSync(path.join(outDir, videos[0].f), dest);
    console.log("saved", dest);
  }
}

await run("desktop-1440", {}, { width: 1440, height: 900 });
await run("mobile-390", devices["iPhone 12"], { width: 390, height: 844 });
console.log("done", outDir);
