import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const BASE = "http://127.0.0.1:3010";
const OUT = path.resolve("public/marketing/product");
const WEBP = path.join(OUT, "webp");

async function hide(page) {
  await page.addStyleTag({
    content: `[data-nextjs-toast],[data-nextjs-dialog],nextjs-portal,#accessibilityWidget,.whatsapp-float,[aria-label*="Next.js"],button:has-text("Issues"){display:none!important}`,
  }).catch(() => {});
}

async function shot(page, name) {
  await hide(page);
  const png = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: png, type: "png" });
  const sharp = (await import("sharp")).default;
  await sharp(png).webp({ quality: 82 }).toFile(path.join(WEBP, `${name}.webp`));
  console.log("SHOT", name);
}

async function main() {
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1.5,
    locale: "he-IL",
  });
  const page = await context.newPage();

  await page.goto(`${BASE}/try/dashboard`, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForTimeout(1500);
  const free = page.getByText("התנסות חופשית").first();
  if (await free.count()) await free.click().catch(() => {});
  await page.waitForTimeout(800);

  await page.goto(`${BASE}/try/dashboard/messages/new`, {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  await page.waitForTimeout(2000);
  await page.getByText("התנסות חופשית").first().click().catch(() => {});
  await page.waitForTimeout(600);

  // ---- RSVP + SMS channel ----
  // Tab grid is section with 4 TabButtons — click by description unique text
  await page.locator("button, [role='button']").filter({ hasText: "שליחת סבבי RSVP" }).first().click();
  await page.waitForTimeout(1200);

  const smsTour = page.locator("[data-tour='message-channel-sms']");
  if (await smsTour.count()) {
    await smsTour.click();
  } else {
    await page.locator("button, [role='button'], div").filter({ hasText: "📩" }).filter({ hasText: "SMS" }).first().click();
  }
  await page.waitForTimeout(1000);

  // Scroll so SMS preview / channel section is visible
  const smsPreview = page.getByText(/כך תיראה הודעת ה-SMS|ערוץ שליחה|INVISTIMO · SMS/).first();
  if (await smsPreview.count()) {
    await smsPreview.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
  } else {
    await page.evaluate(() => window.scrollTo(0, 500));
  }
  await shot(page, "desktop-messages-sms");

  // Also full-page crop of SMS preview area if present
  const previewBox = page.locator("text=INVISTIMO · SMS").first();
  if (await previewBox.count()) {
    const card = previewBox.locator("xpath=ancestor::div[contains(@class,'rounded')][1]");
    if (await card.count()) {
      await card.screenshot({ path: path.join(OUT, "desktop-messages-sms-preview.png") }).catch(() => {});
      console.log("SHOT desktop-messages-sms-preview");
    }
  }

  // ---- Reminder (SMS only) — scroll to message body ----
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.locator("button, [role='button']").filter({ hasText: "תזכורת לפני האירוע" }).first().click();
  await page.waitForTimeout(1200);
  const rem = page.getByText(/שליחת תזכורת|SMS|תצוגה מקדימה/).first();
  if (await rem.count()) await rem.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  // scroll a bit more to show SMS composer
  await page.evaluate(() => window.scrollBy(0, 280));
  await page.waitForTimeout(400);
  await shot(page, "desktop-messages-sms-reminder");

  // ---- Save the Date ----
  await page.evaluate(() => window.scrollTo(0, 0));
  await page
    .locator("button, [role='button']")
    .filter({ hasText: "Save The Date והזמנות" })
    .first()
    .click();
  await page.waitForTimeout(1500);

  // Mode toggle Save the Date if present
  const stdMode = page.getByText(/^Save The Date$/).first();
  if (await stdMode.count()) {
    await stdMode.click().catch(() => {});
    await page.waitForTimeout(800);
  }

  const stdHeading = page.getByText(/Save The Date|טרום|תבנית|ערוץ שליחה/).first();
  if (await stdHeading.count()) await stdHeading.scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollBy(0, 200));
  await page.waitForTimeout(500);
  await shot(page, "desktop-messages-save-the-date");

  // Verify uniqueness by file hashes
  const crypto = await import("crypto");
  for (const n of [
    "desktop-messages-sms",
    "desktop-messages-sms-reminder",
    "desktop-messages-save-the-date",
  ]) {
    const buf = fs.readFileSync(path.join(OUT, `${n}.png`));
    console.log(n, "md5", crypto.createHash("md5").update(buf).digest("hex").slice(0, 10), "bytes", buf.length);
  }

  // Mobile scrolled composers
  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    locale: "he-IL",
  });
  const mp = await mobile.newPage();
  await mp.goto(`${BASE}/try/dashboard`, { waitUntil: "domcontentloaded", timeout: 90000 });
  await mp.waitForTimeout(1200);
  await mp.getByText("התנסות חופשית").first().click().catch(() => {});
  await mp.goto(`${BASE}/try/dashboard/messages/new`, {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  await mp.waitForTimeout(1500);

  await mp.locator("button, [role='button']").filter({ hasText: "שליחת סבבי RSVP" }).first().click();
  await mp.waitForTimeout(1000);
  const mSms = mp.locator("[data-tour='message-channel-sms']");
  if (await mSms.count()) await mSms.click();
  else await mp.getByText("SMS").first().click().catch(() => {});
  await mp.waitForTimeout(800);
  await mp.evaluate(() => window.scrollTo(0, 600));
  await hide(mp);
  await mp.screenshot({ path: path.join(OUT, "mobile-messages-sms.png") });
  const sharp = (await import("sharp")).default;
  await sharp(path.join(OUT, "mobile-messages-sms.png"))
    .webp({ quality: 82 })
    .toFile(path.join(WEBP, "mobile-messages-sms.webp"));
  console.log("SHOT mobile-messages-sms");

  await mp.evaluate(() => window.scrollTo(0, 0));
  await mp
    .locator("button, [role='button']")
    .filter({ hasText: "Save The Date והזמנות" })
    .first()
    .click();
  await mp.waitForTimeout(1200);
  await mp.evaluate(() => window.scrollTo(0, 600));
  await hide(mp);
  await mp.screenshot({ path: path.join(OUT, "mobile-messages-save-the-date.png") });
  await sharp(path.join(OUT, "mobile-messages-save-the-date.png"))
    .webp({ quality: 82 })
    .toFile(path.join(WEBP, "mobile-messages-save-the-date.webp"));
  console.log("SHOT mobile-messages-save-the-date");

  await browser.close();
  console.log("sms-std done");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
