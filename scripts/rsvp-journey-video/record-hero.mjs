/**
 * Hero video: ONE continuous personal-link session
 * invite (approved artwork) → scroll to RSVP → submit → thanks
 */
import { chromium } from "playwright";
import { copyFileSync, existsSync, mkdirSync, readdirSync, unlinkSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const OUT_DIR = join(ROOT, "public/videos");
const POSTER_DIR = join(ROOT, "public/images/rsvp");
const RAW_DIR = join(__dirname, ".record-hero");
const FINAL_MP4 = join(OUT_DIR, "rsvp-hero-personal-link.mp4");
const POSTER = join(POSTER_DIR, "rsvp-hero-personal-link-poster.jpg");
const BASE = process.env.RSVP_RECORD_BASE || "http://127.0.0.1:3000";

const SCREEN_W = 390;
const SCREEN_H = 844;
const STAGE_W = 420;
const STAGE_H = 760;
const PHONE_W = 372;
const PHONE_H = 732;
const DURATION = 28;

mkdirSync(RAW_DIR, { recursive: true });
mkdirSync(OUT_DIR, { recursive: true });
mkdirSync(POSTER_DIR, { recursive: true });
for (const f of readdirSync(RAW_DIR)) {
  try { unlinkSync(join(RAW_DIR, f)); } catch {}
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: SCREEN_W, height: SCREEN_H },
  deviceScaleFactor: 2,
  locale: "he-IL",
  recordVideo: { dir: RAW_DIR, size: { width: SCREEN_W, height: SCREEN_H } },
});
const page = await context.newPage();
const t0 = Date.now();
const holdUntil = async (ms) => {
  const left = ms - (Date.now() - t0);
  if (left > 0) await wait(left);
};

console.log("hero: open personal link");
await page.goto(`${BASE}/rsvp-journey/personal-link.html`, {
  waitUntil: "networkidle",
  timeout: 60000,
});
await page.waitForSelector('img[alt="הזמנה"]');
await page.evaluate(() => window.scrollTo(0, 0));
await holdUntil(7000);

console.log("hero: scroll to RSVP on same page");
await page.evaluate(async () => {
  const target = document.getElementById("rsvp");
  const top = target ? target.offsetTop - 70 : 480;
  const startY = window.scrollY;
  const start = performance.now();
  await new Promise((resolve) => {
    const tick = (now) => {
      const t = Math.min(1, (now - start) / 2200);
      window.scrollTo(0, startY + (top - startY) * (0.5 - 0.5 * Math.cos(Math.PI * t)));
      if (t < 1) requestAnimationFrame(tick);
      else resolve();
    };
    requestAnimationFrame(tick);
  });
});
await holdUntil(12000);

console.log("hero: choose + submit");
await page.click("#yes");
await wait(400);
await page.click("#plus");
await holdUntil(17000);
await page.click("#submit");
await page.waitForSelector("body.thanks-mode");
await holdUntil(DURATION * 1000);

await context.close();
await browser.close();

const webm = spawnSync("bash", ["-lc", `ls -1t '${RAW_DIR}'/*.webm | head -1`], { encoding: "utf8" }).stdout.trim();
if (!webm || !existsSync(webm)) throw new Error("No hero webm");

const rawMp4 = join(RAW_DIR, "screen-raw.mp4");
let enc = spawnSync("ffmpeg", ["-y","-i",webm,"-an","-t",String(DURATION),"-vf",`fps=30,scale=${SCREEN_W*2}:${SCREEN_H*2}:flags=lanczos`,"-c:v","libx264","-pix_fmt","yuv420p","-crf","20",rawMp4], { encoding: "utf8" });
if (enc.status !== 0) { console.error(enc.stderr.slice(-1500)); process.exit(1); }

const phoneX = Math.round((STAGE_W * 2 - PHONE_W * 2) / 2);
const phoneY = Math.round((STAGE_H * 2 - PHONE_H * 2) / 2);
const pad = 18;
const screenX = phoneX + pad;
const screenY = phoneY + pad;
const screenDrawW = PHONE_W * 2 - pad * 2;
const screenDrawH = PHONE_H * 2 - pad * 2;
const composed = join(RAW_DIR, "composed.mp4");
const filter = [
  `color=c=0xF7EDDF:s=${STAGE_W * 2}x${STAGE_H * 2}:d=${DURATION},format=rgba[bg]`,
  `color=c=0x1C1612:s=${PHONE_W * 2}x${PHONE_H * 2}:d=${DURATION},format=rgba[phone]`,
  `[0:v]fps=30,scale=${screenDrawW}:${screenDrawH}:force_original_aspect_ratio=increase,crop=${screenDrawW}:${screenDrawH},format=rgba,setpts=PTS-STARTPTS[screen]`,
  `[bg][phone]overlay=${phoneX}:${phoneY}[withphone]`,
  `[withphone][screen]overlay=${screenX}:${screenY}:eof_action=repeat,trim=duration=${DURATION},setpts=PTS-STARTPTS[out]`,
].join(";");

enc = spawnSync("ffmpeg", ["-y","-i",rawMp4,"-filter_complex",filter,"-map","[out]","-an","-t",String(DURATION),"-c:v","libx264","-pix_fmt","yuv420p","-profile:v","high","-crf","23","-movflags","+faststart",composed], { encoding: "utf8" });
if (enc.status !== 0) { console.error(enc.stderr.slice(-2000)); process.exit(1); }

copyFileSync(composed, FINAL_MP4);
spawnSync("ffmpeg", ["-y","-ss","3","-i",FINAL_MP4,"-update","1","-frames:v","1","-q:v","3",POSTER], { encoding: "utf8" });
console.log(JSON.stringify({ mp4: FINAL_MP4, poster: POSTER, bytes: statSync(FINAL_MP4).size }, null, 2));
