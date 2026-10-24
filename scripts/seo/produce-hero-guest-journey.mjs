/**
 * Clean guest-journey hero video (~15–25s, vertical):
 * 1) Natural WhatsApp recreation (approved template, NO demo labels in-frame)
 * 2) Real personal invite /invite/demo-share?token=dmo_noa
 * 3) Real RSVP → thank-you
 *
 * Viewport-only capture (no browser URL chrome).
 * WA scene is a faithful recreation — disclosure belongs outside the phone.
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";

const BASE = process.env.SEO_BASE || "http://127.0.0.1:3010";
const OUT = path.resolve("public/marketing/videos/hero-guest-journey.webm");
const ART = "/opt/cursor/artifacts/screenshots";
const RAW = "/tmp/invistimo-hero-guest-clean";
const TOKEN = "dmo_noa";
const W = 390;
const H = 844;

fs.rmSync(RAW, { recursive: true, force: true });
fs.mkdirSync(RAW, { recursive: true });
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.mkdirSync(ART, { recursive: true });

async function hideDevChrome(page) {
  await page.addStyleTag({
    content: `
      #accessibilityWidget, .whatsapp-float, .userway_p1, .uwy,
      [data-nextjs-toast], [data-nextjs-dialog], [data-nextjs-dialog-overlay],
      nextjs-portal, [data-nextjs-dev-overlay] {
        display: none !important; visibility: hidden !important; opacity: 0 !important;
        pointer-events: none !important;
      }
    `,
  }).catch(() => {});
  await page.evaluate(() => {
    document
      .querySelectorAll(
        "nextjs-portal, [data-nextjs-toast], [data-nextjs-dialog], [data-nextjs-dev-overlay]"
      )
      .forEach((el) => {
        el.style.setProperty("display", "none", "important");
      });
  });
}

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  // Bootstrap demo session WITHOUT recording
  const warm = await browser.newContext({
    viewport: { width: W, height: H },
    locale: "he-IL",
    isMobile: true,
    hasTouch: true,
  });
  const warmPage = await warm.newPage();
  await warmPage.goto(`${BASE}/try/dashboard`, {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  await warmPage.waitForTimeout(1200);
  const free = warmPage.getByRole("button", { name: /התנסות חופשית/ });
  if (await free.count()) await free.click().catch(() => {});
  await warmPage.request.post(`${BASE}/api/demo/interactive/reset`).catch(() => {});
  await warmPage.waitForTimeout(400);
  const cookies = await warm.cookies();
  await warm.close();

  const context = await browser.newContext({
    viewport: { width: W, height: H },
    deviceScaleFactor: 2,
    locale: "he-IL",
    isMobile: true,
    hasTouch: true,
    recordVideo: { dir: RAW, size: { width: W, height: H } },
  });
  await context.addCookies(cookies);
  const page = await context.newPage();

  // --- Scene 1: clean WhatsApp recreation ---
  const wa = `${BASE}/marketing/mocks/whatsapp-guest-clean.html?title=${encodeURIComponent(
    "החתונה של מיה ואלון"
  )}&date=24.06.2027&location=${encodeURIComponent("אולמי אלכסנדר")}`;
  await page.goto(wa, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(2600);
  await page.screenshot({
    path: path.join(ART, "hero-scene-whatsapp.png"),
    type: "png",
  });
  await page.locator("#cta").click();
  await page.waitForTimeout(450);

  // --- Scene 2–5: real personal invite ---
  await page.goto(`${BASE}/invite/demo-share?token=${TOKEN}`, {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  await page.waitForTimeout(2200);
  await hideDevChrome(page);

  await page
    .waitForSelector('img[alt="תמונת ההזמנה"], img[src*="invite-wedding"]', {
      timeout: 15000,
    })
    .catch(() => {});
  await page.waitForTimeout(800);
  await page.screenshot({
    path: path.join(ART, "hero-scene-invite.png"),
    type: "png",
  });

  for (const y of [0, 140, 300, 460, 620, 780, 940]) {
    await page.evaluate((top) => window.scrollTo({ top, behavior: "smooth" }), y);
    await page.waitForTimeout(520);
  }
  await hideDevChrome(page);

  const yes = page.getByRole("button", { name: /מגיע/ }).first();
  await yes.waitFor({ state: "visible", timeout: 10000 });
  await yes.scrollIntoViewIfNeeded();
  await page.waitForTimeout(450);
  await yes.click();
  await page.waitForTimeout(800);
  await page.screenshot({
    path: path.join(ART, "hero-scene-rsvp-choice.png"),
    type: "png",
  });

  const submit = page.getByRole("button", { name: /שליחת אישור הגעה/ }).first();
  await submit.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await submit.click();
  await page.waitForTimeout(2800);
  await hideDevChrome(page);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  await page.waitForTimeout(1000);
  await page.screenshot({
    path: path.join(ART, "hero-scene-success.png"),
    type: "png",
  });
  await page.waitForTimeout(1800);

  await page.close();
  await context.close();
  await browser.close();

  const files = fs.readdirSync(RAW).filter((f) => f.endsWith(".webm"));
  if (!files.length) throw new Error("no video");
  const src = path.join(RAW, files[0]);
  execFileSync(
    "ffmpeg",
    ["-y", "-i", src, "-c:v", "libvpx-vp9", "-b:v", "1800k", "-an", OUT],
    { stdio: "inherit" }
  );
  const dur = execFileSync(
    "ffprobe",
    ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", OUT],
    { encoding: "utf8" }
  ).trim();
  console.log(
    "WROTE",
    OUT,
    `${(fs.statSync(OUT).size / 1024 / 1024).toFixed(2)}MB`,
    `dur=${dur}s`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
