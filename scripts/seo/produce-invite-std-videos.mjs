/**
 * Longer studio cuts:
 * - process-invitation-open.webm  (WA → full Mia&Alon invite scroll)
 * - process-save-the-date.webm    (composer → labeled WA STD mock)
 * No external sends. Requires SEO_BASE (default http://127.0.0.1:3010).
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";

const BASE = process.env.SEO_BASE || "http://127.0.0.1:3010";
const OUT_VID = path.resolve("public/marketing/videos");
const RAW = "/tmp/invistimo-invite-std";
const TITLE = "החתונה של מיה ואלון";
const DATE = "24.06.2027";
const LOC = "אולמי אלכסנדר";
const MEDIA = "/marketing/invites/invite-wedding-mia-alon.webp";

fs.rmSync(RAW, { recursive: true, force: true });
fs.mkdirSync(RAW, { recursive: true });
fs.mkdirSync(OUT_VID, { recursive: true });

function compress(src, dest, bitrate = "1600k") {
  execFileSync(
    "ffmpeg",
    ["-y", "-i", src, "-c:v", "libvpx-vp9", "-b:v", bitrate, "-an", dest],
    { stdio: "inherit" }
  );
  console.log("WROTE", dest, `${(fs.statSync(dest).size / 1024 / 1024).toFixed(2)}MB`);
}

async function record({ name, width, height, mobile, run }) {
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
  const dir = path.join(RAW, name);
  fs.mkdirSync(dir, { recursive: true });
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: mobile ? 2 : 1.5,
    locale: "he-IL",
    isMobile: mobile,
    hasTouch: mobile,
    recordVideo: { dir, size: { width, height } },
  });
  const page = await context.newPage();
  await run(page);
  await page.close();
  await context.close();
  await browser.close();
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".webm"));
  if (!files.length) throw new Error(`no video for ${name}`);
  compress(path.join(dir, files[0]), path.join(OUT_VID, `${name}.webm`));
}

async function main() {
  console.log("BASE", BASE);

  await record({
    name: "process-invitation-open",
    width: 390,
    height: 844,
    mobile: true,
    run: async (page) => {
      const wa = `${BASE}/marketing/mocks/whatsapp-rsvp.html?mode=rsvp&title=${encodeURIComponent(TITLE)}&date=${DATE}&location=${encodeURIComponent(LOC)}&media=${encodeURIComponent(MEDIA)}`;
      await page.goto(wa, { waitUntil: "domcontentloaded", timeout: 60000 });
      await page.waitForTimeout(3200);
      await page.locator("#cta").click().catch(() => {});
      await page.waitForTimeout(500);
      await page.goto(`${BASE}/marketing/mocks/invite-viewer.html`, {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      });
      await page.waitForTimeout(1600);
      for (const y of [0, 120, 260, 400, 560, 720, 900, 1080, 1260]) {
        await page.evaluate((top) => {
          document.getElementById("scroller")?.scrollTo({ top, behavior: "smooth" });
        }, y);
        await page.waitForTimeout(900);
      }
      await page.waitForTimeout(1800);
    },
  });

  await record({
    name: "process-save-the-date",
    width: 390,
    height: 844,
    mobile: true,
    run: async (page) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto(`${BASE}/try/dashboard/messages/new`, {
        waitUntil: "domcontentloaded",
        timeout: 90000,
      });
      await page.waitForTimeout(1800);
      for (const name of [/התנסות חופשית/, /סגור/, /הבנתי/, /דלג/]) {
        const btn = page.getByRole("button", { name }).first();
        if ((await btn.count()) && (await btn.isVisible().catch(() => false))) {
          await btn.click({ timeout: 2000 }).catch(() => {});
          await page.waitForTimeout(400);
        }
      }
      const stdTab = page.getByRole("button", { name: /Save the Date|שמירת תאריך/i }).first();
      const stdText = page.getByText(/Save the Date|שמירת תאריך/i).first();
      if (await stdTab.count()) await stdTab.click().catch(() => {});
      else if (await stdText.count()) await stdText.click().catch(() => {});
      await page.waitForTimeout(2000);
      await page.evaluate(() => window.scrollBy(0, 220));
      await page.waitForTimeout(1600);
      await page.setViewportSize({ width: 390, height: 844 });
      const std = `${BASE}/marketing/mocks/whatsapp-rsvp.html?mode=std&title=${encodeURIComponent(TITLE)}&date=${DATE}`;
      await page.goto(std, { waitUntil: "domcontentloaded", timeout: 60000 });
      await page.waitForTimeout(4200);
    },
  });

  console.log("DONE invite/std videos");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
