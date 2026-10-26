import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const OUT = "/workspace/public/videos/event-management";
const ART = "/opt/cursor/artifacts/event-mgmt-videos";
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(ART, { recursive: true });

const videos = [
  {
    name: "system-overview",
    tabs: ["overview", "planning", "suppliers", "calendar", "logistics"],
    dwellMs: 2200,
  },
  {
    name: "tasks-flow",
    tabs: ["overview"],
    dwellMs: 3500,
    interact: async (page) => {
      const input = page.locator('input[placeholder*="משימה"], input[placeholder*="הוסף"]').first();
      if (await input.count()) {
        await input.click({ timeout: 2000 }).catch(() => {});
        await page.waitForTimeout(800);
        await input.fill("תיאום סופי עם הצלם").catch(() => {});
        await page.waitForTimeout(1000);
        const add = page.locator('button:has-text("הוסף")').first();
        if (await add.count()) await add.click().catch(() => {});
        await page.waitForTimeout(1500);
      }
      const status = page.locator("select, [role='combobox']").first();
      if (await status.count()) {
        await status.click({ timeout: 1500 }).catch(() => {});
        await page.waitForTimeout(1200);
      }
    },
  },
  {
    name: "budget-flow",
    tabs: ["suppliers"],
    dwellMs: 4500,
    interact: async (page) => {
      await page.mouse.wheel(0, 400);
      await page.waitForTimeout(1500);
      await page.mouse.wheel(0, 500);
      await page.waitForTimeout(1800);
    },
  },
  {
    name: "event-day",
    tabs: ["logistics", "overview"],
    dwellMs: 3200,
    interact: async (page) => {
      await page.mouse.wheel(0, 350);
      await page.waitForTimeout(1600);
    },
  },
];

const browser = await chromium.launch({
  headless: true,
  executablePath: "/usr/local/bin/google-chrome",
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

for (const clip of videos) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
    locale: "he-IL",
    recordVideo: { dir: ART, size: { width: 1280, height: 800 } },
  });
  const page = await context.newPage();
  page.setDefaultNavigationTimeout(45000);

  for (const tab of clip.tabs) {
    await page.goto(`http://127.0.0.1:3000/try/event-management?tab=${tab}`, {
      waitUntil: "commit",
    });
    await page.waitForSelector("main", { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(clip.dwellMs);
    if (clip.interact) await clip.interact(page);
  }

  const video = page.video();
  await context.close();
  const rawPath = await video.path();
  const destWebm = path.join(OUT, `${clip.name}.webm`);
  fs.copyFileSync(rawPath, destWebm);
  console.log("recorded", destWebm, fs.statSync(destWebm).size);

  // poster from middle of video via ffmpeg if available
  const poster = path.join(OUT, `${clip.name}-poster.jpg`);
  const ff = spawnSync(
    "ffmpeg",
    ["-y", "-ss", "00:00:02", "-i", destWebm, "-frames:v", "1", "-q:v", "3", poster],
    { encoding: "utf8" }
  );
  if (ff.status === 0) console.log("poster", poster);
  else console.warn("poster skipped", ff.stderr?.slice?.(0, 200) || ff.error);
}

await browser.close();
console.log("done videos");
