/**
 * REAL product recording for the steps section:
 * WhatsApp template preview (product) → personal invite → RSVP → /thank-you → dashboard
 * Invitation artwork via /homep1.png network rewrite — no invented pages.
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
const RAW_DIR = join(__dirname, ".record-journey");
const INVITE_IMG = join(ROOT, "public/images/rsvp/invite-frame.jpg");
const FINAL_MP4 = join(OUT_DIR, "rsvp-steps-live.mp4");
const POSTER = join(POSTER_DIR, "rsvp-steps-live-poster.jpg");
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
        const r = el.getBoundingClientRect();
        if ((t.includes("אירוע הדוגמה") || t.includes("דמו מבודד")) && r.height > 20 && r.height < 120) {
          kill(el);
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

await context.route("**/homep1.png", async (route) => {
  await route.fulfill({ path: INVITE_IMG, contentType: "image/jpeg" });
});

await context.request.post(`${BASE}/api/demo/interactive`, {
  data: { mode: "free", restart: true },
});
writeFileSync(join(RAW_DIR, "storage.json"), JSON.stringify(await context.storageState()));

const page = await context.newPage();
const t0 = Date.now();
const mark = (label) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1)}s] ${label}`);
const holdUntil = async (ms) => {
  const left = ms - (Date.now() - t0);
  if (left > 0) await wait(left);
};

// 01 WhatsApp — real product messages preview
mark("01 whatsapp");
await page.goto(`${BASE}/try/dashboard/messages/new`, {
  waitUntil: "domcontentloaded",
  timeout: 60000,
});
await wait(1500);
await hideChrome(page);
await page.addStyleTag({
  content: `
    aside, nav, [data-sidebar], .DashboardSidebar,
    [class*="Sidebar"], [class*="sidebar"] {
      display: none !important;
    }
    main, [role="main"] { max-width: 100% !important; margin: 0 !important; }
  `,
}).catch(() => {});
await page.evaluate((inviteUrl) => {
  const el = [...document.querySelectorAll("*")].find((n) =>
    ((n.textContent || "").includes("INVISTIMO · WhatsApp"))
  );
  el?.scrollIntoView({ block: "center" });
  // Use approved invite artwork inside the real WA preview images only
  document.querySelectorAll("img").forEach((img) => {
    const r = img.getBoundingClientRect();
    if (r.width < 80 || r.height < 60) return;
    img.src = inviteUrl;
    img.srcset = "";
    img.style.objectFit = "contain";
    img.style.background = "#F7F1E8";
  });
}, `${BASE}/images/rsvp/invite-frame.jpg`);
await holdUntil(7000);

// 02–03 Real personal invite with approved image
mark("02 personal link");
await page.goto(`${BASE}/invite/demo-share?token=dmo_noa`, {
  waitUntil: "domcontentloaded",
  timeout: 60000,
});
await page.waitForSelector('img[alt="תמונת ההזמנה"]', { timeout: 20000 });
await hideChrome(page);
await page.evaluate(() => window.scrollTo(0, 0));
await holdUntil(10000);

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

// 04 Choose on same real invite page
mark("04 choose");
const yes = page.locator("button").filter({ hasText: /^מגיע/ }).first();
await yes.scrollIntoViewIfNeeded();
await wait(400);
await yes.click();
await wait(500);
const plus = page.locator("button").filter({ hasText: /^\+$/ }).first();
if (await plus.count()) await plus.click().catch(() => {});
await holdUntil(25500);

// 05 Real thank-you page
mark("05 thanks");
const submit = page.locator("button").filter({ hasText: /שליחת אישור הגעה/ }).first();
await submit.click();
await page.waitForURL(/thank-you/, { timeout: 20000 });
await page.locator("text=תודה").first().waitFor({ state: "visible", timeout: 15000 });
await hideChrome(page);
await holdUntil(34000);

// 06 Real dashboard
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
