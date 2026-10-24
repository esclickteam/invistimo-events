/**
 * Vertical marketing video for homepage hero phone:
 * WhatsApp mock (labeled) → invite (user-provided) → RSVP → saved.
 * No external sends. Output: public/marketing/videos/hero-guest-journey.webm
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";

const BASE = process.env.SEO_BASE || "http://127.0.0.1:3010";
const OUT = path.resolve("public/marketing/videos/hero-guest-journey.webm");
const RAW = "/tmp/invistimo-hero-journey";
const TITLE = "החתונה של מיה ואלון";
const W = 390;
const H = 844;

fs.rmSync(RAW, { recursive: true, force: true });
fs.mkdirSync(RAW, { recursive: true });
fs.mkdirSync(path.dirname(OUT), { recursive: true });

async function main() {
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
  const context = await browser.newContext({
    viewport: { width: W, height: H },
    deviceScaleFactor: 2,
    locale: "he-IL",
    isMobile: true,
    hasTouch: true,
    recordVideo: { dir: RAW, size: { width: W, height: H } },
  });
  const page = await context.newPage();

  await page.goto(
    `${BASE}/marketing/mocks/whatsapp-rsvp.html?mode=rsvp&title=${encodeURIComponent(TITLE)}&date=24.06.2027&location=${encodeURIComponent("אולמי אלכסנדר")}&media=${encodeURIComponent("/marketing/invites/invite-wedding-mia-alon.webp")}`,
    { waitUntil: "domcontentloaded", timeout: 60000 }
  );
  await page.waitForTimeout(3200);
  await page.locator("#cta").click().catch(() => {});
  await page.waitForTimeout(500);

  await page.goto(`${BASE}/marketing/mocks/invite-viewer.html`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await page.waitForTimeout(1400);
  for (const y of [0, 140, 280, 420, 580, 740, 920, 1100]) {
    await page.evaluate((top) => {
      document.getElementById("scroller")?.scrollTo({ top, behavior: "smooth" });
    }, y);
    await page.waitForTimeout(850);
  }
  await page.waitForTimeout(900);
  await page.click("#rsvp").catch(() => {});
  await page.waitForTimeout(800);
  if (!page.url().includes("rsvp-confirm")) {
    await page.goto(`${BASE}/marketing/mocks/rsvp-confirm.html`, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
  }
  await page.waitForTimeout(1400);
  await page.click('button[data-status="yes"]');
  await page.waitForTimeout(900);
  await page.click("#submit");
  await page.waitForTimeout(3200);

  await page.close();
  await context.close();
  await browser.close();

  const files = fs.readdirSync(RAW).filter((f) => f.endsWith(".webm"));
  if (!files.length) throw new Error("no recorded video");
  const src = path.join(RAW, files[0]);
  execFileSync(
    "ffmpeg",
    ["-y", "-i", src, "-c:v", "libvpx-vp9", "-b:v", "1400k", "-an", OUT],
    { stdio: "inherit" }
  );
  console.log("WROTE", OUT, `${(fs.statSync(OUT).size / 1024 / 1024).toFixed(2)}MB`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
