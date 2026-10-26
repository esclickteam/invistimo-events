/**
 * Record a real scroll through a wedding-website demo template
 * and capture marketing-page screenshots for QA delivery.
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { spawn } from "child_process";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const OUT_DIR = path.resolve("public/marketing/videos");
const ARTIFACTS = path.resolve("/opt/cursor/artifacts/screenshots");
const RAW_DIR = path.resolve("/tmp/ww-capture");

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.mkdirSync(ARTIFACTS, { recursive: true });
fs.mkdirSync(RAW_DIR, { recursive: true });

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: "inherit" });
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exit ${code}`))));
  });
}

async function waitForServer() {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`${BASE}/wedding-website`);
      if (res.ok || res.status === 200) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error("Server not ready");
}

async function main() {
  await waitForServer();

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    locale: "he-IL",
    recordVideo: {
      dir: RAW_DIR,
      size: { width: 1280, height: 720 },
    },
  });

  // --- Scroll recording on real demo ---
  const demo = await context.newPage();
  await demo.goto(`${BASE}/wedding-website/eternal-gold?embed=1`, {
    waitUntil: "domcontentloaded",
    timeout: 120000,
  });
  await demo.waitForSelector("#hero, .wedding-website-root, body", { timeout: 60000 });
  await demo.waitForTimeout(2500);

  const scrollHeight = await demo.evaluate(() => document.documentElement.scrollHeight);
  const viewport = 720;
  let y = 0;
  while (y < scrollHeight - viewport) {
    y = Math.min(y + 90, scrollHeight - viewport);
    await demo.evaluate((top) => window.scrollTo({ top, behavior: "instant" }), y);
    await demo.waitForTimeout(110);
  }
  await demo.waitForTimeout(800);
  await demo.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await demo.waitForTimeout(600);

  const videoPath = await demo.video()?.path();
  await demo.close();

  // Convert playwright webm to optimized public asset
  const targetWebm = path.join(OUT_DIR, "wedding-website-scroll.webm");
  if (videoPath && fs.existsSync(videoPath)) {
    await run("ffmpeg", [
      "-y",
      "-i",
      videoPath,
      "-an",
      "-c:v",
      "libvpx-vp9",
      "-b:v",
      "1.2M",
      "-vf",
      "scale=1280:-2",
      targetWebm,
    ]);
    console.log("Wrote", targetWebm);
  } else {
    console.warn("No video path from playwright");
  }

  // Poster from first frame
  const posterPath = path.join(OUT_DIR, "wedding-website-scroll-poster.jpg");
  if (fs.existsSync(targetWebm)) {
    await run("ffmpeg", [
      "-y",
      "-ss",
      "0.8",
      "-i",
      targetWebm,
      "-frames:v",
      "1",
      "-q:v",
      "3",
      posterPath,
    ]);
    console.log("Wrote", posterPath);
  }

  // --- Marketing page screenshots ---
  const page = await context.newPage();
  await page.goto(`${BASE}/wedding-website`, { waitUntil: "domcontentloaded", timeout: 180000 });
  await page.waitForSelector("h1", { timeout: 60000 });
  await page.waitForTimeout(3500);

  await page.screenshot({
    path: path.join(ARTIFACTS, "wedding-website-full.png"),
    fullPage: true,
  });
  await page.screenshot({
    path: path.join(ARTIFACTS, "wedding-website-hero.png"),
    clip: { x: 0, y: 0, width: 1440, height: 900 },
  });

  const gallery = page.locator("#gallery");
  await gallery.scrollIntoViewIfNeeded();
  await page.waitForTimeout(800);
  const box = await gallery.boundingBox();
  if (box) {
    await page.screenshot({
      path: path.join(ARTIFACTS, "wedding-website-gallery.png"),
      clip: {
        x: Math.max(0, box.x),
        y: Math.max(0, box.y),
        width: Math.min(1440, box.width),
        height: Math.min(1200, box.height),
      },
    });
  }

  const mobileSec = page.locator("#mobile");
  await mobileSec.scrollIntoViewIfNeeded();
  await page.waitForTimeout(800);
  const mbox = await mobileSec.boundingBox();
  if (mbox) {
    await page.screenshot({
      path: path.join(ARTIFACTS, "wedding-website-mobile-section.png"),
      clip: {
        x: Math.max(0, mbox.x),
        y: Math.max(0, mbox.y),
        width: Math.min(1440, mbox.width),
        height: Math.min(1000, mbox.height),
      },
    });
  }

  // Mobile viewport shot of marketing page
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE}/wedding-website`, { waitUntil: "domcontentloaded", timeout: 180000 });
  await page.waitForSelector("h1", { timeout: 60000 });
  await page.waitForTimeout(2500);
  await page.screenshot({
    path: path.join(ARTIFACTS, "wedding-website-mobile-viewport.png"),
    fullPage: false,
  });

  // Verify demo template links
  const demos = [
    "eternal-gold",
    "garden-bloom",
    "minimal-noir",
    "midnight-velvet",
  ];
  for (const id of demos) {
    const res = await page.request.get(`${BASE}/wedding-website/${id}`);
    console.log(`demo ${id}: ${res.status()}`);
  }

  await page.close();
  await context.close();
  await browser.close();
  console.log("Capture complete");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
