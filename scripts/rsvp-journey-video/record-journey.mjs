/**
 * Steps video from REAL product pages (synced to JOURNEY_STEPS):
 * WhatsApp → click personal link → invite → RSVP → /thank-you → dashboard
 */
import { chromium } from "playwright";
import { copyFileSync, existsSync, mkdirSync, readdirSync, unlinkSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import {
  hideChrome,
  showRealWhatsApp,
  pulsePersonalLinkCta,
  clickPersonalLinkCta,
  phoneCompositeFilter,
} from "./lib-real.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const OUT_DIR = join(ROOT, "public/videos");
const POSTER_DIR = join(ROOT, "public/images/rsvp");
const RAW_DIR = join(__dirname, ".record-journey");
const INVITE_IMG = join(ROOT, "public/images/rsvp/invite-frame.jpg");
const FINAL_MP4 = join(OUT_DIR, "rsvp-steps-wa.mp4");
const POSTER = join(POSTER_DIR, "rsvp-steps-wa-poster.jpg");
const BASE = process.env.RSVP_RECORD_BASE || "http://127.0.0.1:3000";

const SCREEN_W = 390;
const SCREEN_H = 844;
const STAGE_W = 420;
const STAGE_H = 760;
const PHONE_W = 372;
const PHONE_H = 732;
const DURATION = 42;

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
await context.route("**/homep1.png", async (route) => {
  await route.fulfill({ path: INVITE_IMG, contentType: "image/jpeg" });
});
await context.request.post(`${BASE}/api/demo/interactive`, { data: { mode: "free", restart: true } });

const page = await context.newPage();
const t0 = Date.now();
const mark = (label) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1)}s] ${label}`);
const holdUntil = async (ms) => {
  const left = ms - (Date.now() - t0);
  if (left > 0) await wait(left);
};

// 01 WhatsApp 0–7s
mark("01 whatsapp");
await showRealWhatsApp(page, BASE);
await hideChrome(page);
await holdUntil(7000);

// 02 Click personal link 7–10s then open invite
mark("02 personal link click");
await pulsePersonalLinkCta(page);
await holdUntil(9000);
await clickPersonalLinkCta(page);
await wait(200);
await page.goto(`${BASE}/invite/demo-share?token=dmo_noa`, {
  waitUntil: "domcontentloaded",
  timeout: 60000,
});
await page.waitForSelector('img[alt="תמונת ההזמנה"]', { timeout: 20000 });
await hideChrome(page);
await page.evaluate(() => window.scrollTo(0, 0));
await holdUntil(10000);

// 03 Invite details 10–18.5s
mark("03 invite details");
await page.evaluate(async () => {
  const start = performance.now();
  const max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  const target = Math.min(280, max);
  await new Promise((resolve) => {
    const tick = (now) => {
      const t = Math.min(1, (now - start) / 3000);
      window.scrollTo(0, target * (0.5 - 0.5 * Math.cos(Math.PI * t)));
      if (t < 1) requestAnimationFrame(tick);
      else resolve();
    };
    requestAnimationFrame(tick);
  });
});
await holdUntil(18500);

// 04 Choose 18.5–25.5s
mark("04 choose");
const yes = page.locator("button").filter({ hasText: /^מגיע/ }).first();
await yes.scrollIntoViewIfNeeded();
await wait(400);
await yes.click();
await wait(500);
const plus = page.locator("button").filter({ hasText: /^\+$/ }).first();
if (await plus.count()) await plus.click().catch(() => {});
await holdUntil(25500);

// 05 Thanks 25.5–34s
mark("05 thanks");
await page.locator("button").filter({ hasText: /שליחת אישור הגעה/ }).first().click();
await page.waitForURL(/thank-you/, { timeout: 20000 });
await page.locator("text=תודה").first().waitFor({ state: "visible", timeout: 15000 });
await hideChrome(page);
await holdUntil(34000);

// 06 Dashboard 34–42s
mark("06 dashboard");
await page.goto(`${BASE}/try/dashboard`, { waitUntil: "domcontentloaded", timeout: 60000 });
await wait(1200);
await hideChrome(page);
await page.evaluate(() => {
  document.querySelectorAll("body *").forEach((el) => {
    const t = (el.textContent || "").replace(/\s+/g, " ").trim();
    if (!t) return;
    const r = el.getBoundingClientRect();
    if (!(r.height > 0 && r.height < 100)) return;
    if (
      t.includes("דמו מבודד") ||
      t.includes("אירוע הדוגמה") ||
      t.includes("בלי הודעות, שיחות או חיובים") ||
      t.includes("התחל סיור מחדש") ||
      t.includes("סיום והשארת פרטים") ||
      /Issues/i.test(t)
    ) {
      el.style.setProperty("opacity", "0", "important");
      el.style.setProperty("pointer-events", "none", "important");
    }
  });
  const el = [...document.querySelectorAll("*")].find((n) => {
    const t = (n.textContent || "").trim();
    return t === "סה״כ מוזמנים" || t === "מגיעים" || t === "טרם אישרו";
  });
  el?.scrollIntoView({ block: "center" });
});
await holdUntil(DURATION * 1000);

await context.close();
await browser.close();

const webm = spawnSync("bash", ["-lc", `ls -1t '${RAW_DIR}'/*.webm | head -1`], { encoding: "utf8" }).stdout.trim();
if (!webm || !existsSync(webm)) throw new Error("No journey webm");
const rawMp4 = join(RAW_DIR, "screen-raw.mp4");
let enc = spawnSync("ffmpeg", ["-y","-i",webm,"-an","-t",String(DURATION),"-vf",`fps=30,scale=${SCREEN_W*2}:${SCREEN_H*2}:flags=lanczos`,"-c:v","libx264","-pix_fmt","yuv420p","-crf","20",rawMp4], { encoding: "utf8" });
if (enc.status !== 0) { console.error(enc.stderr.slice(-1500)); process.exit(1); }

const { filter } = phoneCompositeFilter({ stageW: STAGE_W, stageH: STAGE_H, phoneW: PHONE_W, phoneH: PHONE_H, duration: DURATION });
const composed = join(RAW_DIR, "composed.mp4");
enc = spawnSync("ffmpeg", ["-y","-i",rawMp4,"-filter_complex",filter,"-map","[out]","-an","-t",String(DURATION),"-c:v","libx264","-pix_fmt","yuv420p","-profile:v","high","-crf","23","-movflags","+faststart",composed], { encoding: "utf8" });
if (enc.status !== 0) { console.error(enc.stderr.slice(-2000)); process.exit(1); }

copyFileSync(composed, FINAL_MP4);
spawnSync("ffmpeg", ["-y","-ss","2","-i",FINAL_MP4,"-update","1","-frames:v","1","-q:v","3",POSTER], { encoding: "utf8" });
console.log(JSON.stringify({ mp4: FINAL_MP4, poster: POSTER, bytes: statSync(FINAL_MP4).size }, null, 2));
