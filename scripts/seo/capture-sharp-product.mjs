/**
 * Sharp mobile guest RSVP + dashboard/seating/messages for marketing frames.
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const BASE = "http://127.0.0.1:3010";
const OUT = path.resolve("public/marketing/product");
const WEBP = path.join(OUT, "webp");
fs.mkdirSync(WEBP, { recursive: true });

async function hide(page) {
  await page.addStyleTag({
    content: `[data-nextjs-toast],[data-nextjs-dialog],nextjs-portal,#accessibilityWidget,.whatsapp-float,[aria-label*="Next.js"],[aria-label*="Issues"]{display:none!important;visibility:hidden!important}`,
  }).catch(() => {});
}

async function dismiss(page) {
  await hide(page);
  for (const t of ["התנסות חופשית", "סגור", "הבנתי"]) {
    await page.getByText(t).first().click({ timeout: 1500 }).catch(() => {});
  }
}

async function shot(page, name) {
  await hide(page);
  const png = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: png, type: "png", fullPage: false });
  const sharp = (await import("sharp")).default;
  await sharp(png).webp({ quality: 88 }).toFile(path.join(WEBP, `${name}.webp`));
  console.log("OK", name);
}

async function main() {
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });

  // Mobile guest — full screen invite UI (no desktop letterboxing)
  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    locale: "he-IL",
  });
  let page = await mobile.newPage();
  await page.goto(`${BASE}/try/dashboard`, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForTimeout(1500);
  await dismiss(page);
  await page.goto(`${BASE}/invite/demo-share?token=dmo_noa`, {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  await page.waitForTimeout(2500);
  await dismiss(page);
  // scroll to RSVP form if needed
  const rsvp = page.getByText(/נשמח לדעת|מגיע/).first();
  if (await rsvp.count()) await rsvp.scrollIntoViewIfNeeded().catch(() => {});
  await page.waitForTimeout(500);
  await shot(page, "mobile-guest-rsvp");
  // select coming
  await page.getByRole("button", { name: /מגיע/ }).first().click().catch(() => {});
  await page.waitForTimeout(600);
  await shot(page, "mobile-guest-rsvp-confirm");
  // also use as desktop-guest for phone frames (same asset)
  fs.copyFileSync(path.join(OUT, "mobile-guest-rsvp.png"), path.join(OUT, "desktop-guest-rsvp.png"));
  fs.copyFileSync(path.join(WEBP, "mobile-guest-rsvp.webp"), path.join(WEBP, "desktop-guest-rsvp.webp"));
  fs.copyFileSync(path.join(OUT, "mobile-guest-rsvp-confirm.png"), path.join(OUT, "desktop-guest-rsvp-confirm.png"));
  fs.copyFileSync(
    path.join(WEBP, "mobile-guest-rsvp-confirm.webp"),
    path.join(WEBP, "desktop-guest-rsvp-confirm.webp")
  );

  await mobile.close();

  // Desktop product shots at high DPI
  const desk = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    locale: "he-IL",
  });
  page = await desk.newPage();
  await page.goto(`${BASE}/try/dashboard`, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForTimeout(1500);
  await dismiss(page);
  await shot(page, "desktop-try-dashboard");

  await page.goto(`${BASE}/try/dashboard/seating`, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForTimeout(2000);
  await dismiss(page);
  await shot(page, "desktop-try-seating");

  await page.goto(`${BASE}/try/dashboard/messages/new`, {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  await page.waitForTimeout(1500);
  await dismiss(page);
  await page.locator("button, [role='button']").filter({ hasText: "שליחת סבבי RSVP" }).first().click();
  await page.waitForTimeout(800);
  await page.locator("[data-tour='message-channel-sms']").click().catch(() => {});
  await page.waitForTimeout(800);
  await page.evaluate(() => window.scrollTo(0, 380));
  await page.waitForTimeout(500);
  await shot(page, "desktop-messages-sms");

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.locator("button, [role='button']").filter({ hasText: "Save The Date והזמנות" }).first().click();
  await page.waitForTimeout(1200);
  await page.evaluate(() => window.scrollTo(0, 320));
  await page.waitForTimeout(500);
  await shot(page, "desktop-messages-save-the-date");

  await desk.close();
  await browser.close();
  console.log("sharp product capture done");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
