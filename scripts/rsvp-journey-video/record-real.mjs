/**
 * Fresh recording of the /rsvp guest journey.
 * WhatsApp + personal-link are filmed from dedicated pages under /rsvp-journey/
 * that already contain the approved Mia & Alon invitation (no demo image swap).
 */
import { chromium } from "playwright";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const OUT_DIR = join(ROOT, "public/videos");
const POSTER_DIR = join(ROOT, "public/images/rsvp");
const RAW_DIR = join(__dirname, ".record");
const FINAL_MP4 = join(OUT_DIR, "rsvp-mia-alon-journey.mp4");
const POSTER = join(POSTER_DIR, "rsvp-mia-alon-journey-poster.jpg");
const BASE = process.env.RSVP_RECORD_BASE || "http://127.0.0.1:3000";

const SCREEN_W = 390;
const SCREEN_H = 844;
const STAGE_W = 420;
const STAGE_H = 760;
const PHONE_W = 372;
const PHONE_H = 732;

mkdirSync(RAW_DIR, { recursive: true });
mkdirSync(OUT_DIR, { recursive: true });
mkdirSync(POSTER_DIR, { recursive: true });
for (const f of readdirSync(RAW_DIR)) {
  try {
    unlinkSync(join(RAW_DIR, f));
  } catch {}
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// Mint demo session for RSVP form / thanks / dashboard
{
  const b = await chromium.launch({ headless: true });
  const c = await b.newContext({ locale: "he-IL" });
  await c.request.post(`${BASE}/api/demo/interactive`, {
    data: { mode: "free", restart: true },
  });
  const p = await c.newPage();
  await p.goto(`${BASE}/try/dashboard`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await wait(600);
  writeFileSync(join(RAW_DIR, "storage.json"), JSON.stringify(await c.storageState()));
  await b.close();
}

async function hideNoise(page) {
  await page
    .addStyleTag({
      content: `
      nextjs-portal, [data-nextjs-dialog-overlay], #__next-build-watcher,
      iframe[src*="userway"], .userway, .uwy, #userwayAccessibilityIcon, [class*="userway"],
      header, footer, a[href*="wa.me"] {
        display: none !important; visibility: hidden !important; opacity: 0 !important;
      }
    `,
    })
    .catch(() => {});
  await page.evaluate(() => {
    const kill = (el) => el && el.style.setProperty("display", "none", "important");
    document.querySelectorAll("body *").forEach((el) => {
      const t = (el.textContent || "").replace(/\s+/g, " ").trim();
      if (!t || t.length > 120) return;
      if (
        t.includes("דמו מבודד") ||
        t === "התחל סיור מחדש" ||
        t === "איפוס" ||
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
      }
    });
  });
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: SCREEN_W, height: SCREEN_H },
  deviceScaleFactor: 2,
  locale: "he-IL",
  storageState: join(RAW_DIR, "storage.json"),
  recordVideo: { dir: RAW_DIR, size: { width: SCREEN_W, height: SCREEN_H } },
});

await context.route("**/*homep1*", (route) =>
  route.fulfill({ status: 204, body: "", headers: { "content-type": "image/png" } })
);

const page = await context.newPage();
const t0 = Date.now();
const mark = (label) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1)}s] ${label}`);
const holdUntil = async (ms) => {
  const left = ms - (Date.now() - t0);
  if (left > 0) await wait(left);
};

const hideDemoInviteHero = async () => {
  await page
    .addStyleTag({
      content: `
      img[alt="תמונת ההזמנה"], img[src*="homep1"],
      .relative:has(> img[alt="תמונת ההזמנה"]) { display: none !important; }
    `,
    })
    .catch(() => {});
  await page.evaluate(() => {
    document.querySelectorAll('img[alt="תמונת ההזמנה"], img[src*="homep1"]').forEach((img) => {
      let cur = img;
      for (let i = 0; i < 3 && cur; i++) {
        cur.style.setProperty("display", "none", "important");
        cur = cur.parentElement;
      }
    });
    document.querySelectorAll("h1, p").forEach((el) => {
      const t = (el.textContent || "").trim();
      if (t === "הזמנה לאירוע" || t.includes("החתונה של")) {
        el.style.setProperty("display", "none", "important");
      }
    });
  });
};

// 01 WhatsApp 0–7s
mark("01 whatsapp");
await page.goto(`${BASE}/rsvp-journey/whatsapp.html`, { waitUntil: "networkidle", timeout: 60000 });
await page.waitForSelector('img[alt="הזמנה"]');
await holdUntil(6500);
await page.evaluate(() => document.getElementById("wa-btn")?.classList.add("pulse"));
await holdUntil(7000);

// 02 Personal link 7–10s — filmed page with Mia & Alon invite
mark("02 personal link");
await page.goto(`${BASE}/rsvp-journey/personal-link.html`, {
  waitUntil: "networkidle",
  timeout: 60000,
});
await page.waitForSelector('img[alt="הזמנה"]');
await page.evaluate(() => window.scrollTo(0, 0));
await holdUntil(10000);

// 03 Same personal-link invite 10–18.5s
mark("03 invite details");
await page.evaluate(async () => {
  window.scrollTo(0, 0);
  await new Promise((r) => setTimeout(r, 2200));
  const start = performance.now();
  const max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  const target = Math.min(240, max);
  await new Promise((resolve) => {
    const tick = (now) => {
      const t = Math.min(1, (now - start) / 3200);
      window.scrollTo(0, target * (0.5 - 0.5 * Math.cos(Math.PI * t)));
      if (t < 1) requestAnimationFrame(tick);
      else resolve();
    };
    requestAnimationFrame(tick);
  });
});
await holdUntil(18500);

// 04 Choose RSVP form
mark("04 choose");
await page.goto(`${BASE}/invite/demo-share?token=dmo_noa`, {
  waitUntil: "domcontentloaded",
  timeout: 60000,
});
await hideDemoInviteHero();
await hideNoise(page);
await wait(200);
await hideDemoInviteHero();
const yes = page.locator("button").filter({ hasText: /^מגיע/ }).first();
await yes.waitFor({ state: "visible", timeout: 20000 });
await yes.scrollIntoViewIfNeeded();
await wait(500);
await yes.click();
await wait(600);
const plus = page.locator("button").filter({ hasText: /^\+$/ }).first();
if (await plus.count()) await plus.click().catch(() => {});
await holdUntil(25500);

// 05 Submit + thanks
mark("05 submit");
const submit = page.locator("button").filter({ hasText: /שליחת אישור הגעה/ }).first();
await submit.waitFor({ state: "visible", timeout: 15000 });
await submit.scrollIntoViewIfNeeded();
await submit.click();
await page.locator("text=תודה").first().waitFor({ state: "visible", timeout: 20000 });
await hideNoise(page);
await holdUntil(34000);

// 06 Dashboard
mark("06 dashboard");
await page.goto(`${BASE}/try/dashboard`, {
  waitUntil: "domcontentloaded",
  timeout: 60000,
});
await wait(1200);
await page
  .addStyleTag({
    content: `
    nextjs-portal, [data-nextjs-dialog-overlay], iframe[src*="userway"],
    .userway, .uwy, #userwayAccessibilityIcon, header, footer, a[href*="wa.me"] {
      display: none !important;
    }
  `,
  })
  .catch(() => {});
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
await holdUntil(42000);

await context.close();
await browser.close();

const webm = spawnSync("bash", ["-lc", `ls -1t '${RAW_DIR}'/*.webm | head -1`], {
  encoding: "utf8",
}).stdout.trim();
if (!webm || !existsSync(webm)) {
  console.error("No webm recorded");
  process.exit(1);
}

const rawMp4 = join(RAW_DIR, "screen-raw.mp4");
let enc = spawnSync(
  "ffmpeg",
  [
    "-y",
    "-i",
    webm,
    "-an",
    "-t",
    "42",
    "-vf",
    `fps=30,scale=${SCREEN_W * 2}:${SCREEN_H * 2}:flags=lanczos`,
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-crf",
    "20",
    rawMp4,
  ],
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
  `color=c=0xF7EDDF:s=${STAGE_W * 2}x${STAGE_H * 2}:d=42,format=rgba[bg]`,
  `color=c=0x1C1612:s=${PHONE_W * 2}x${PHONE_H * 2}:d=42,format=rgba[phone]`,
  `[0:v]fps=30,scale=${screenDrawW}:${screenDrawH}:force_original_aspect_ratio=increase,crop=${screenDrawW}:${screenDrawH},format=rgba,setpts=PTS-STARTPTS[screen]`,
  `[bg][phone]overlay=${phoneX}:${phoneY}[withphone]`,
  `[withphone][screen]overlay=${screenX}:${screenY}:eof_action=repeat,trim=duration=42,setpts=PTS-STARTPTS[out]`,
].join(";");

enc = spawnSync(
  "ffmpeg",
  [
    "-y",
    "-i",
    rawMp4,
    "-filter_complex",
    filter,
    "-map",
    "[out]",
    "-an",
    "-t",
    "42",
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-profile:v",
    "high",
    "-crf",
    "23",
    "-movflags",
    "+faststart",
    composed,
  ],
  { encoding: "utf8" }
);
if (enc.status !== 0) {
  console.error(enc.stderr.slice(-2000));
  process.exit(1);
}

copyFileSync(composed, FINAL_MP4);
// Poster from personal-link step so the new invite is obvious before play
spawnSync(
  "ffmpeg",
  ["-y", "-ss", "8", "-i", FINAL_MP4, "-update", "1", "-frames:v", "1", "-q:v", "3", POSTER],
  { encoding: "utf8" }
);
console.log(JSON.stringify({ mp4: FINAL_MP4, poster: POSTER, bytes: statSync(FINAL_MP4).size }, null, 2));
