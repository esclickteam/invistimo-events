/**
 * REAL product recording for the Hero phone:
 * /invite/demo-share → RSVP on that page → /thank-you
 * Invitation image is the approved artwork via network rewrite of /homep1.png
 * (no invented HTML pages).
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
const INVITE_IMG = join(ROOT, "public/images/rsvp/invite-frame.jpg");
const FINAL_MP4 = join(OUT_DIR, "rsvp-hero-live.mp4");
const POSTER = join(POSTER_DIR, "rsvp-hero-live-poster.jpg");
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

async function hideChrome(page) {
  await page.addStyleTag({
    content: `
      nextjs-portal, [data-nextjs-dialog-overlay], #__next-build-watcher,
      iframe[src*="userway"], .userway, .uwy, #userwayAccessibilityIcon, [class*="userway"],
      header, footer, a[href*="wa.me"] {
        display: none !important; visibility: hidden !important; opacity: 0 !important;
      }
    `,
  }).catch(() => {});
  await page.evaluate(() => {
    const kill = (el) => el && el.style.setProperty("display", "none", "important");
    document.querySelectorAll("body *").forEach((el) => {
      const t = (el.textContent || "").replace(/\s+/g, " ").trim();
      if (!t || t.length > 140) return;
      if (
        t.includes("דמו מבודד") ||
        t.includes("אירוע הדוגמה") ||
        t === "התחל שלור מחדש" ||
        t === "התחל סיור מחדש" ||
        t === "סיום והשארת פרטים" ||
        /^\d+\s*Issues$/i.test(t)
      ) {
        let cur = el;
        for (let i = 0; i < 6 && cur; i++) {
          const style = window.getComputedStyle(cur);
          if (style.position === "fixed" || style.position === "sticky") {
            kill(cur);
            return;
          }
          cur = cur.parentElement;
        }
        if (t.includes("אירוע הדוגמה") || t.includes("דמו מבודד")) {
          const r = el.getBoundingClientRect();
          if (r.height > 20 && r.height < 120) kill(el);
        }
      }
    });
  });
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: SCREEN_W, height: SCREEN_H },
  deviceScaleFactor: 2,
  locale: "he-IL",
  recordVideo: { dir: RAW_DIR, size: { width: SCREEN_W, height: SCREEN_H } },
});

// Serve the approved invitation as the product invite image — no DOM inventing
await context.route("**/homep1.png", async (route) => {
  await route.fulfill({ path: INVITE_IMG, contentType: "image/jpeg" });
});

await context.request.post(`${BASE}/api/demo/interactive`, {
  data: { mode: "free", restart: true },
});

const page = await context.newPage();
const t0 = Date.now();
const holdUntil = async (ms) => {
  const left = ms - (Date.now() - t0);
  if (left > 0) await wait(left);
};

console.log("hero: real personal invite");
await page.goto(`${BASE}/invite/demo-share?token=dmo_noa`, {
  waitUntil: "domcontentloaded",
  timeout: 60000,
});
await page.waitForSelector('img[alt="תמונת ההזמנה"]', { timeout: 20000 });
await hideChrome(page);
await page.evaluate(() => window.scrollTo(0, 0));
await holdUntil(8000);

console.log("hero: scroll to RSVP on same invite page");
await page.evaluate(async () => {
  const btn = [...document.querySelectorAll("button")].find((b) => /^מגיע/.test((b.textContent || "").trim()));
  const top = btn ? btn.getBoundingClientRect().top + window.scrollY - 180 : 520;
  const startY = window.scrollY;
  const start = performance.now();
  await new Promise((resolve) => {
    const tick = (now) => {
      const t = Math.min(1, (now - start) / 2400);
      window.scrollTo(0, startY + (top - startY) * (0.5 - 0.5 * Math.cos(Math.PI * t)));
      if (t < 1) requestAnimationFrame(tick);
      else resolve();
    };
    requestAnimationFrame(tick);
  });
});
await holdUntil(13000);

console.log("hero: choose + submit on real form");
const yes = page.locator("button").filter({ hasText: /^מגיע/ }).first();
await yes.click();
await wait(500);
const plus = page.locator("button").filter({ hasText: /^\+$/ }).first();
if (await plus.count()) await plus.click().catch(() => {});
await holdUntil(18000);
const submit = page.locator("button").filter({ hasText: /שליחת אישור הגעה/ }).first();
await submit.click();
await page.waitForURL(/thank-you/, { timeout: 20000 });
await page.locator("text=תודה").first().waitFor({ state: "visible", timeout: 15000 });
await hideChrome(page);
await holdUntil(DURATION * 1000);

await context.close();
await browser.close();

const webm = spawnSync("bash", ["-lc", `ls -1t '${RAW_DIR}'/*.webm | head -1`], { encoding: "utf8" }).stdout.trim();
if (!webm || !existsSync(webm)) throw new Error("No hero webm");

const rawMp4 = join(RAW_DIR, "screen-raw.mp4");
let enc = spawnSync(
  "ffmpeg",
  ["-y", "-i", webm, "-an", "-t", String(DURATION), "-vf", `fps=30,scale=${SCREEN_W * 2}:${SCREEN_H * 2}:flags=lanczos`, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "20", rawMp4],
  { encoding: "utf8" }
);
if (enc.status !== 0) {
  console.error(enc.stderr.slice(-1500));
  process.exit(1);
}

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

enc = spawnSync(
  "ffmpeg",
  ["-y", "-i", rawMp4, "-filter_complex", filter, "-map", "[out]", "-an", "-t", String(DURATION), "-c:v", "libx264", "-pix_fmt", "yuv420p", "-profile:v", "high", "-crf", "23", "-movflags", "+faststart", composed],
  { encoding: "utf8" }
);
if (enc.status !== 0) {
  console.error(enc.stderr.slice(-2000));
  process.exit(1);
}

copyFileSync(composed, FINAL_MP4);
spawnSync("ffmpeg", ["-y", "-ss", "3", "-i", FINAL_MP4, "-update", "1", "-frames:v", "1", "-q:v", "3", POSTER], { encoding: "utf8" });
console.log(JSON.stringify({ mp4: FINAL_MP4, poster: POSTER, bytes: statSync(FINAL_MP4).size }, null, 2));
