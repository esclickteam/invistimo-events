import { chromium, devices } from "playwright";
import fs from "fs";
import path from "path";

const BASE = process.env.LUX_QA_URL || "http://localhost:3017/preview/luxury-v2";
const OUT = path.join(process.env.USERPROFILE || process.env.HOME || ".", "Downloads");

async function capture(label, contextOptions, shotName, vidName, size) {
  const browser = await chromium.launch({ headless: true });
  const vidDir = path.join(OUT, `_lux-v2-${label}`);
  fs.mkdirSync(vidDir, { recursive: true });
  const context = await browser.newContext({
    ...contextOptions,
    locale: "he-IL",
    recordVideo: { dir: vidDir, size },
  });
  const page = await context.newPage();
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForTimeout(2000);
  await page.screenshot({
    path: path.join(OUT, shotName),
    fullPage: false,
  });

  const total = await page.evaluate(() => document.documentElement.scrollHeight);
  const step = Math.max(220, Math.floor(size.height * 0.28));
  for (let y = 0; y <= total; y += step) {
    await page.evaluate((yy) => window.scrollTo({ top: yy, behavior: "smooth" }), y);
    await page.waitForTimeout(480);
  }
  await page.waitForTimeout(900);
  await context.close();
  await browser.close();

  const vids = fs.readdirSync(vidDir).filter((f) => f.endsWith(".webm"));
  if (vids[0]) {
    fs.renameSync(path.join(vidDir, vids[0]), path.join(OUT, vidName));
    console.log("VID", vidName);
  }
  console.log("SHOT", shotName, "h=", total);
}

async function main() {
  await capture(
    "desk",
    { viewport: { width: 1440, height: 900 } },
    "invistimo-lux-v2-desktop.png",
    "invistimo-lux-v2-scroll-desktop.webm",
    { width: 1440, height: 900 }
  );
  await capture(
    "mob",
    { ...devices["iPhone 13"] },
    "invistimo-lux-v2-mobile.png",
    "invistimo-lux-v2-scroll-mobile.webm",
    { width: 390, height: 844 }
  );
  console.log("DONE", BASE);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
