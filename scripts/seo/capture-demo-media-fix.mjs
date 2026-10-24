/**
 * Finish missing captures: desktop SMS, Save the Date, seating video.
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const BASE = process.env.SEO_BASE || "http://127.0.0.1:3010";
const OUT = path.resolve("public/marketing/product");
const WEBP = path.join(OUT, "webp");
const VID = path.resolve("public/marketing/videos");
const RAW = path.resolve("/tmp/invistimo-demo-capture");
fs.mkdirSync(WEBP, { recursive: true });
fs.mkdirSync(VID, { recursive: true });
fs.mkdirSync(RAW, { recursive: true });

async function hideChrome(page) {
  await page.addStyleTag({
    content: `
      [data-nextjs-toast], [data-nextjs-dialog], nextjs-portal,
      #accessibilityWidget, .whatsapp-float,
      [aria-label="Open Next.js Dev Tools"],
      button[aria-label*="Next.js"],
      #__next-build-watcher { display:none!important; visibility:hidden!important; }
    `,
  }).catch(() => {});
}

async function dismiss(page) {
  await hideChrome(page);
  for (const name of [/התנסות חופשית/, /סיור מודרך/, /סגור/, /הבנתי/, /קבל/]) {
    const btn = page.getByRole("button", { name }).first();
    if ((await btn.count()) && (await btn.isVisible().catch(() => false))) {
      await btn.click({ timeout: 2000 }).catch(() => {});
      await page.waitForTimeout(400);
    }
  }
  // click free experience text anywhere
  const free = page.locator("text=התנסות חופשית").first();
  if ((await free.count()) && (await free.isVisible().catch(() => false))) {
    await free.click({ timeout: 2000 }).catch(() => {});
  }
}

async function goto(page, url) {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForTimeout(2000);
  await dismiss(page);
  await page.waitForTimeout(800);
}

async function shot(page, name) {
  await hideChrome(page);
  const png = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: png, fullPage: false, type: "png" });
  try {
    const sharp = (await import("sharp")).default;
    await sharp(png).webp({ quality: 82 }).toFile(path.join(WEBP, `${name}.webp`));
  } catch (e) {
    console.warn("webp", name, e.message);
  }
  console.log("SHOT", name, "url=", page.url());
}

async function ensureSession(context) {
  const p = await context.newPage();
  await goto(p, `${BASE}/try/dashboard`);
  await p.close();
}

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1.5,
    locale: "he-IL",
  });
  await ensureSession(context);
  const page = await context.newPage();

  await goto(page, `${BASE}/try/dashboard/messages/new`);
  // dump tab labels
  const labels = await page.evaluate(() =>
    Array.from(document.querySelectorAll("button, [role='button'], [role='tab']"))
      .map((el) => (el.textContent || "").replace(/\s+/g, " ").trim())
      .filter(Boolean)
      .slice(0, 40)
  );
  console.log("CLICKABLES", labels);

  // Click by text content
  async function clickText(re) {
    const el = page.locator("button, [role='button'], div").filter({ hasText: re }).first();
    if (await el.count()) {
      await el.click({ timeout: 4000 }).catch(async () => {
        await page.getByText(re).first().click({ timeout: 4000 }).catch(() => {});
      });
      await page.waitForTimeout(1400);
      return true;
    }
    return false;
  }

  async function scrollComposer() {
    // Scroll main panel into view — past the tab strip
    await page.evaluate(() => {
      const main = document.querySelector("main") || document.body;
      const y = Math.min(420, main.scrollHeight);
      window.scrollTo(0, y);
    });
    await page.waitForTimeout(700);
  }

  await clickText(/אישור הגעה/);
  await page.waitForTimeout(1000);
  // SMS channel
  const sms = page.locator("[data-tour='message-channel-sms']");
  if (await sms.count()) {
    await sms.click();
    await page.waitForTimeout(1000);
  } else {
    await clickText(/^SMS$/);
  }
  await scrollComposer();
  await shot(page, "desktop-messages-sms");

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(400);
  await clickText(/תזכורת/);
  await page.waitForTimeout(1200);
  await scrollComposer();
  await shot(page, "desktop-messages-sms-reminder");

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(400);
  await clickText(/טרום אישורי הגעה|Save The Date|Save the Date/);
  await page.waitForTimeout(1400);
  await clickText(/Save The Date|Save the Date/);
  await page.waitForTimeout(800);
  await scrollComposer();
  await shot(page, "desktop-messages-save-the-date");

  // Mobile composers with scroll
  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    locale: "he-IL",
  });
  await ensureSession(mobile);
  const mp = await mobile.newPage();
  await goto(mp, `${BASE}/try/dashboard/messages/new`);
  await mp.getByText(/תזכורת/).first().click().catch(() => {});
  await mp.waitForTimeout(1000);
  await mp.evaluate(() => window.scrollTo(0, 520));
  await mp.waitForTimeout(700);
  await hideChrome(mp);
  await mp.screenshot({ path: path.join(OUT, "mobile-messages-sms.png"), type: "png" });
  try {
    const sharp = (await import("sharp")).default;
    await sharp(path.join(OUT, "mobile-messages-sms.png"))
      .webp({ quality: 82 })
      .toFile(path.join(WEBP, "mobile-messages-sms.webp"));
  } catch {}
  console.log("SHOT mobile-messages-sms (scrolled)");

  await mp.evaluate(() => window.scrollTo(0, 0));
  await mp.getByText(/טרום אישורי הגעה/).first().click().catch(() => {});
  await mp.waitForTimeout(1200);
  await mp.evaluate(() => window.scrollTo(0, 520));
  await mp.waitForTimeout(700);
  await hideChrome(mp);
  await mp.screenshot({
    path: path.join(OUT, "mobile-messages-save-the-date.png"),
    type: "png",
  });
  try {
    const sharp = (await import("sharp")).default;
    await sharp(path.join(OUT, "mobile-messages-save-the-date.png"))
      .webp({ quality: 82 })
      .toFile(path.join(WEBP, "mobile-messages-save-the-date.webp"));
  } catch {}
  console.log("SHOT mobile-messages-save-the-date (scrolled)");
  await mobile.close();

  // Re-capture clean guest (no next badge)
  await goto(page, `${BASE}/invite/demo-share?token=dmo_noa`);
  await shot(page, "desktop-guest-rsvp");
  await page.getByRole("button", { name: /מגיע/ }).first().click().catch(() => {});
  await page.waitForTimeout(600);
  await shot(page, "desktop-guest-rsvp-confirm");

  await context.close();

  // Seating video
  const seatCtx = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
    locale: "he-IL",
    recordVideo: { dir: RAW, size: { width: 1280, height: 720 } },
  });
  await ensureSession(seatCtx);
  const sp = await seatCtx.newPage();
  await goto(sp, `${BASE}/try/dashboard/seating`);
  await sp.waitForTimeout(2500);
  await sp.mouse.move(640, 360);
  for (let i = 0; i < 4; i++) {
    await sp.mouse.wheel(0, 120);
    await sp.waitForTimeout(500);
  }
  await sp.mouse.wheel(0, -300);
  await sp.waitForTimeout(800);
  // click any table-like text safely
  const tableLabel = sp.getByText(/שולחן\s*\d/).first();
  if (await tableLabel.count()) {
    await tableLabel.click({ timeout: 3000 }).catch(() => {});
    await sp.waitForTimeout(1200);
  }
  const guestLabel = sp.getByText(/נועה|אורן|דניאל/).first();
  if (await guestLabel.count()) {
    await guestLabel.click({ timeout: 3000 }).catch(() => {});
    await sp.waitForTimeout(1200);
  }
  await sp.waitForTimeout(2000);
  const vpath = await sp.video()?.path();
  await seatCtx.close();
  if (vpath) {
    fs.copyFileSync(vpath, path.join(VID, "demo-try-seating-raw.webm"));
    console.log("VIDEO seating raw ok");
  }

  await browser.close();
  console.log("fix done");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
