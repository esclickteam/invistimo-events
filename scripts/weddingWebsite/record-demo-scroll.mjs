/**
 * Records a real screen scroll of /wedding-website/eternal-gold into
 * public/marketing/videos/wedding-website-scroll.webm (+ poster jpg).
 */
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");
const outDir = path.join(root, "public/marketing/videos");
const framesDir = path.join(root, "/tmp/ww-scroll-frames");
const webmOut = path.join(outDir, "wedding-website-scroll.webm");
const posterOut = path.join(outDir, "wedding-website-scroll-poster.jpg");
const baseUrl = process.env.WW_DEMO_BASE || "http://localhost:3000";

fs.mkdirSync(outDir, { recursive: true });
fs.rmSync(framesDir, { recursive: true, force: true });
fs.mkdirSync(framesDir, { recursive: true });

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: "inherit" });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} exited ${code}`));
    });
  });
}

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || "/usr/bin/google-chrome",
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

const page = await browser.newPage({
  viewport: { width: 1280, height: 720 },
  deviceScaleFactor: 1,
});

await page.goto(`${baseUrl}/wedding-website/eternal-gold`, {
  waitUntil: "domcontentloaded",
  timeout: 90_000,
});
await page.waitForSelector(".wedding-website-root, .ww-site, main, body", {
  timeout: 60_000,
});
await page.waitForTimeout(2500);

// Poster from top of page
await page.screenshot({ path: posterOut, type: "jpeg", quality: 88 });

const totalHeight = await page.evaluate(() => {
  const el = document.scrollingElement || document.documentElement;
  return Math.max(el.scrollHeight, document.body.scrollHeight);
});

const viewH = 720;
const maxScroll = Math.max(0, totalHeight - viewH);
const durationSec = 18;
const fps = 12;
const frames = durationSec * fps;

for (let i = 0; i < frames; i++) {
  const t = i / (frames - 1);
  // ease-in-out
  const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  const y = Math.round(eased * maxScroll);
  await page.evaluate((yy) => window.scrollTo(0, yy), y);
  await page.waitForTimeout(20);
  const framePath = path.join(framesDir, `frame-${String(i).padStart(4, "0")}.jpg`);
  await page.screenshot({ path: framePath, type: "jpeg", quality: 78 });
}

await browser.close();

await run("ffmpeg", [
  "-y",
  "-framerate",
  String(fps),
  "-i",
  path.join(framesDir, "frame-%04d.jpg"),
  "-c:v",
  "libvpx-vp9",
  "-b:v",
  "1.6M",
  "-an",
  webmOut,
]);

fs.rmSync(framesDir, { recursive: true, force: true });
console.log("Wrote", webmOut);
console.log("Wrote", posterOut);
