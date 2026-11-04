import { chromium, devices } from "playwright";
import fs from "fs";
import path from "path";

const BASE = process.env.LUX_QA_URL || "http://localhost:3017/";
const OUT = path.join(process.env.USERPROFILE || process.env.HOME || ".", "Downloads");

function assertMonotonic(samples, label, direction = "down") {
  let bad = 0;
  for (let i = 1; i < samples.length; i++) {
    const d = samples[i] - samples[i - 1];
    if (direction === "down" && d < -2) bad++;
    if (direction === "up" && d > 2) bad++;
  }
  console.log(`CHECK ${label}: samples=${samples.length} jumps=${bad}`);
  if (bad > 2) throw new Error(`${label} had ${bad} reverse jumps`);
}

async function runPass(page, { step, pause, direction }) {
  const samples = [];
  if (direction === "down") {
    const total = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y <= total; y += step) {
      await page.evaluate((yy) => window.scrollTo({ top: yy, behavior: "instant" }), y);
      await page.waitForTimeout(pause);
      const actual = await page.evaluate(() => window.scrollY || document.documentElement.scrollTop);
      samples.push(actual);
      // Detect unexpected auto-scroll away from intended position
      if (Math.abs(actual - y) > 80 && y < total - 200) {
        console.log(`WARN drift at target=${y} actual=${actual}`);
      }
    }
  } else {
    const start = await page.evaluate(() => window.scrollY || document.documentElement.scrollTop);
    for (let y = start; y >= 0; y -= step) {
      await page.evaluate((yy) => window.scrollTo({ top: yy, behavior: "instant" }), Math.max(0, y));
      await page.waitForTimeout(pause);
      samples.push(await page.evaluate(() => window.scrollY || document.documentElement.scrollTop));
    }
  }
  return samples;
}

async function capture(label, contextOptions, size) {
  const browser = await chromium.launch({ headless: true });
  const vidDir = path.join(OUT, `_lux-scroll-fix-${label}`);
  fs.mkdirSync(vidDir, { recursive: true });
  const context = await browser.newContext({
    ...contextOptions,
    locale: "he-IL",
    recordVideo: { dir: vidDir, size },
  });
  const page = await context.newPage();

  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForTimeout(1500);

  const startY = await page.evaluate(() => window.scrollY || document.documentElement.scrollTop);
  console.log(`START ${label} y=${startY}`);
  if (startY > 5) throw new Error(`${label} did not start at top (y=${startY})`);

  // Slow continuous downward scroll
  const slow = await runPass(page, { step: 180, pause: 120, direction: "down" });
  assertMonotonic(slow, `${label}-slow-down`, "down");

  // Fast downward from top
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
  const fast = await runPass(page, { step: 520, pause: 40, direction: "down" });
  assertMonotonic(fast, `${label}-fast-down`, "down");

  // Upward
  const up = await runPass(page, { step: 320, pause: 60, direction: "up" });
  assertMonotonic(up, `${label}-up`, "up");

  // Continuous smooth record pass top → footer
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);
  const total = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y <= total; y += Math.max(160, Math.floor(size.height * 0.22))) {
    await page.evaluate((yy) => window.scrollTo({ top: yy, behavior: "smooth" }), y);
    await page.waitForTimeout(380);
  }
  await page.waitForTimeout(800);

  await context.close();
  await browser.close();

  const vids = fs.readdirSync(vidDir).filter((f) => f.endsWith(".webm"));
  if (vids[0]) {
    const dest = path.join(OUT, `invistimo-lux-scroll-fix-${label}.webm`);
    fs.renameSync(path.join(vidDir, vids[0]), dest);
    console.log("VID", dest);
  }
}

async function main() {
  await capture("desktop", { viewport: { width: 1440, height: 900 } }, { width: 1440, height: 900 });
  await capture("mobile", { ...devices["iPhone 13"] }, { width: 390, height: 844 });
  console.log("SCROLL_CONTINUITY_PASS");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
