/**
 * Capture real demo UI: guest RSVP, SMS reminder, Save the Date, seating.
 * Also records guest + seating webm clips for marketing.
 * Run: node scripts/seo/capture-demo-media.mjs
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";

const BASE = process.env.SEO_BASE || "http://127.0.0.1:3010";
const OUT = path.resolve("public/marketing/product");
const WEBP = path.join(OUT, "webp");
const VID = path.resolve("public/marketing/videos");
const RAW = path.resolve("/tmp/invistimo-demo-capture");

fs.mkdirSync(WEBP, { recursive: true });
fs.mkdirSync(VID, { recursive: true });
fs.mkdirSync(RAW, { recursive: true });

async function dismissOverlays(page) {
  await page
    .addStyleTag({
      content:
        "[data-nextjs-toast],[data-nextjs-dialog],#accessibilityWidget,.whatsapp-float{display:none!important}",
    })
    .catch(() => {});
  const labels = [
    /התנסות חופשית/,
    /סיור מודרך/,
    /סגור/,
    /Close/,
    /הבנתי/,
    /קבל/,
    /אישור/,
  ];
  for (const name of labels) {
    const btn = page.getByRole("button", { name }).first();
    if (await btn.count()) {
      const visible = await btn.isVisible().catch(() => false);
      if (visible) {
        await btn.click({ timeout: 2000 }).catch(() => {});
        await page.waitForTimeout(400);
      }
    }
  }
}

async function goto(page, url) {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForTimeout(1800);
  await dismissOverlays(page);
  await page.waitForTimeout(600);
}

async function shot(page, name, { fullPage = false } = {}) {
  const png = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: png, fullPage, type: "png" });
  try {
    execFileSync(
      "npx",
      ["--yes", "sharp-cli", "--input", png, "--output", path.join(WEBP, `${name}.webp`), "--format", "webp", "--quality", "82"],
      { stdio: "ignore" }
    );
  } catch {
    // fallback via sharp if installed
    try {
      const sharp = (await import("sharp")).default;
      await sharp(png).webp({ quality: 82 }).toFile(path.join(WEBP, `${name}.webp`));
    } catch (e) {
      console.warn("webp fail", name, e.message);
    }
  }
  console.log("SHOT", name);
  return png;
}

async function ensureDemoSession(context) {
  const page = await context.newPage();
  await goto(page, `${BASE}/try/dashboard`);
  await page.waitForTimeout(1000);
  await page.close();
}

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  // --- Screenshots context ---
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1.5,
    locale: "he-IL",
  });
  await ensureDemoSession(context);
  const page = await context.newPage();

  // Guest RSVP (pending guest)
  await goto(page, `${BASE}/invite/demo-share?token=dmo_noa`);
  await page.waitForTimeout(1500);
  await shot(page, "desktop-guest-rsvp");
  // Try click "מגיע" if visible for a second state
  const yesBtn = page.getByRole("button", { name: /מגיע|אאשר|מאשר/ }).first();
  if (await yesBtn.count()) {
    await yesBtn.click().catch(() => {});
    await page.waitForTimeout(800);
    await shot(page, "desktop-guest-rsvp-confirm");
  }

  // Messages: ensure session then open
  await goto(page, `${BASE}/try/dashboard/messages/new`);
  await page.waitForTimeout(1200);
  await shot(page, "desktop-messages-hub");

  // RSVP tab → switch channel to SMS for real SMS composer UI
  const rsvpTab = page.getByRole("button", { name: /אישור הגעה/ }).first();
  if (await rsvpTab.count()) {
    await rsvpTab.click();
    await page.waitForTimeout(1000);
    const smsChannel = page.locator("[data-tour='message-channel-sms']").first();
    if (await smsChannel.count()) {
      await smsChannel.click();
      await page.waitForTimeout(1000);
    } else {
      const smsBtn = page.getByRole("button", { name: /^SMS$/ }).first();
      if (await smsBtn.count()) await smsBtn.click().catch(() => {});
      await page.waitForTimeout(800);
    }
    await shot(page, "desktop-messages-sms");
  }

  // Reminder tab is also SMS-only — secondary shot
  const reminderTab = page.getByRole("button", { name: /תזכורת/ }).first();
  if (await reminderTab.count()) {
    await reminderTab.click();
    await page.waitForTimeout(1200);
    await shot(page, "desktop-messages-sms-reminder");
  }

  // Save the Date / pre_rsvp
  const preTab = page.getByRole("button", { name: /טרום|Save The Date|Save the Date/i }).first();
  if (await preTab.count()) {
    await preTab.click();
    await page.waitForTimeout(1400);
    await shot(page, "desktop-messages-save-the-date");
  }

  // Seating
  await goto(page, `${BASE}/try/dashboard/seating`);
  await page.waitForTimeout(1500);
  await shot(page, "desktop-try-seating");

  // Mobile guest + SMS + STD
  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    locale: "he-IL",
  });
  await ensureDemoSession(mobile);
  const mpage = await mobile.newPage();
  await goto(mpage, `${BASE}/invite/demo-share?token=dmo_shira`);
  await shot(mpage, "mobile-guest-rsvp");
  await goto(mpage, `${BASE}/try/dashboard/messages/new`);
  const mReminder = mpage.getByRole("button", { name: /תזכורת/ }).first();
  if (await mReminder.count()) {
    await mReminder.click();
    await mpage.waitForTimeout(1000);
    await shot(mpage, "mobile-messages-sms");
  }
  const mPre = mpage.getByRole("button", { name: /טרום|Save/i }).first();
  if (await mPre.count()) {
    await mPre.click();
    await mpage.waitForTimeout(1000);
    await shot(mpage, "mobile-messages-save-the-date");
  }
  await goto(mpage, `${BASE}/try/dashboard/seating`);
  await shot(mpage, "mobile-try-seating");
  await mobile.close();
  await context.close();

  // --- Guest RSVP video recording ---
  const guestCtx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    locale: "he-IL",
    recordVideo: { dir: RAW, size: { width: 390, height: 844 } },
  });
  await ensureDemoSession(guestCtx);
  const gpage = await guestCtx.newPage();
  await goto(gpage, `${BASE}/invite/demo-share?token=dmo_itai`);
  await gpage.waitForTimeout(2000);
  // interact
  const maybeYes = gpage.getByRole("button", { name: /מגיע|כן|אאשר|מאשר/ }).first();
  if (await maybeYes.count()) {
    await maybeYes.click().catch(() => {});
    await gpage.waitForTimeout(1000);
  }
  // try count stepper
  const plus = gpage.getByRole("button", { name: /\+|עוד|הוסף/ }).first();
  if (await plus.count()) await plus.click().catch(() => {});
  await gpage.waitForTimeout(1500);
  const submit = gpage.getByRole("button", { name: /שלח|אישור|שמור|מאשר/ }).first();
  if (await submit.count()) await submit.click().catch(() => {});
  await gpage.waitForTimeout(2500);
  const guestVideoPath = await gpage.video()?.path();
  await guestCtx.close();
  if (guestVideoPath) {
    const outGuest = path.join(VID, "demo-guest-rsvp.webm");
    fs.copyFileSync(guestVideoPath, outGuest);
    console.log("VIDEO guest ->", outGuest);
  }

  // --- Seating video recording ---
  const seatCtx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    locale: "he-IL",
    recordVideo: { dir: RAW, size: { width: 1280, height: 720 } },
  });
  await ensureDemoSession(seatCtx);
  const spage = await seatCtx.newPage();
  await goto(spage, `${BASE}/try/dashboard/seating`);
  await spage.waitForTimeout(2000);
  // pan / click around seating UI
  await spage.mouse.move(700, 400);
  await spage.mouse.wheel(0, 200);
  await spage.waitForTimeout(800);
  await spage.mouse.wheel(0, -100);
  await spage.waitForTimeout(800);
  // try drag a guest or click table
  const table = spage.locator('[data-table], [data-tour*="table"], text=/שולחן/').first();
  if (await table.count()) {
    await table.click().catch(() => {});
    await spage.waitForTimeout(1000);
  }
  await spage.waitForTimeout(2500);
  const seatingVideoPath = await spage.video()?.path();
  await seatCtx.close();
  if (seatingVideoPath) {
    fs.copyFileSync(seatingVideoPath, path.join(VID, "demo-try-seating-raw.webm"));
    console.log("VIDEO seating raw saved");
  }

  await browser.close();
  console.log("capture-demo-media done");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
