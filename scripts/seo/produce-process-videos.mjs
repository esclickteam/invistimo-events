/**
 * Produce marketing process videos from the real /try demo (Maya & Itai).
 * No external WhatsApp/SMS/calls. Uses approved template wording for WA mock.
 *
 * Run with server on SEO_BASE (default http://127.0.0.1:3010):
 *   node scripts/seo/produce-process-videos.mjs
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { execFileSync, spawnSync } from "child_process";

const BASE = process.env.SEO_BASE || "http://127.0.0.1:3010";
const OUT_VID = path.resolve("public/marketing/videos");
const OUT_WEBP = path.resolve("public/marketing/product/webp");
const OUT_PNG = path.resolve("public/marketing/product");
const RAW = path.resolve("/tmp/invistimo-process-capture");
const TITLE = "החתונה של מאיה ואיתי";

fs.mkdirSync(OUT_VID, { recursive: true });
fs.mkdirSync(OUT_WEBP, { recursive: true });
fs.mkdirSync(OUT_PNG, { recursive: true });
fs.mkdirSync(RAW, { recursive: true });

function log(...args) {
  console.log(...args);
}

async function dismiss(page) {
  await page
    .addStyleTag({
      content:
        "[data-nextjs-toast],[data-nextjs-dialog],#accessibilityWidget,.whatsapp-float,[class*='DemoTour'],[data-demo-tour]{display:none!important}",
    })
    .catch(() => {});
  for (const name of [/התנסות חופשית/, /סיור מודרך/, /סגור/, /הבנתי/, /דלג/, /המשך/]) {
    const btn = page.getByRole("button", { name }).first();
    if ((await btn.count()) && (await btn.isVisible().catch(() => false))) {
      await btn.click({ timeout: 2000 }).catch(() => {});
      await page.waitForTimeout(350);
    }
  }
}

async function goto(page, url, wait = 1200) {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForTimeout(wait);
  await dismiss(page);
}

async function ensureDemo(context) {
  const page = await context.newPage();
  await goto(page, `${BASE}/try/dashboard`, 1500);
  const free = page.getByRole("button", { name: /התנסות חופשית/ }).first();
  if (await free.count()) await free.click().catch(() => {});
  await page.waitForTimeout(1200);
  await dismiss(page);
  await page.request.post(`${BASE}/api/demo/interactive/reset`).catch(() => {});
  await goto(page, `${BASE}/try/dashboard`, 1500);
  await dismiss(page);
  await page.close();
}

async function toWebp(png, name) {
  const out = path.join(OUT_WEBP, `${name}.webp`);
  try {
    const sharp = (await import("sharp")).default;
    await sharp(png).webp({ quality: 84 }).toFile(out);
    fs.copyFileSync(png, path.join(OUT_PNG, `${name}.png`));
    log("WEBP", name);
  } catch (e) {
    log("webp fail", name, e.message);
  }
  return out;
}

function ffmpegWebm(inputPatternOrFile, output, opts = {}) {
  const args = [
    "-y",
    ...(Array.isArray(inputPatternOrFile) ? inputPatternOrFile : ["-i", inputPatternOrFile]),
    "-vf",
    opts.vf || "scale=trunc(iw/2)*2:trunc(ih/2)*2,fps=30",
    "-c:v",
    "libvpx-vp9",
    "-b:v",
    opts.bitrate || "2M",
    "-row-mt",
    "1",
    "-an",
    output,
  ];
  const r = spawnSync("ffmpeg", args, { encoding: "utf8" });
  if (r.status !== 0) {
    console.error(r.stderr?.slice(-800));
    throw new Error(`ffmpeg failed for ${output}`);
  }
  log("VIDEO", path.basename(output));
}

async function recordPage(context, { name, width = 390, height = 844, mobile = true, run }) {
  const page = await context.newPage();
  if (mobile) {
    await page.setViewportSize({ width, height });
  } else {
    await page.setViewportSize({ width, height });
  }
  const videoDir = path.join(RAW, name);
  fs.mkdirSync(videoDir, { recursive: true });
  // Use context with recordVideo instead — recreate
  await page.close();
  const recContext = await context.browser().newContext({
    viewport: { width, height },
    deviceScaleFactor: mobile ? 2 : 1.5,
    locale: "he-IL",
    isMobile: mobile,
    hasTouch: mobile,
    recordVideo: { dir: videoDir, size: { width, height } },
  });
  // copy cookies from main context
  const cookies = await context.cookies();
  await recContext.addCookies(cookies);
  const recPage = await recContext.newPage();
  await run(recPage);
  await recPage.close();
  await recContext.close();
  const files = fs.readdirSync(videoDir).filter((f) => f.endsWith(".webm"));
  if (!files.length) throw new Error(`no video for ${name}`);
  const src = path.join(videoDir, files[0]);
  const dest = path.join(OUT_VID, `${name}.webm`);
  // recompress for consistency
  ffmpegWebm(src, dest);
  return dest;
}

async function approveGuest(page, token, { status = "yes", count = 1 } = {}) {
  await goto(page, `${BASE}/invite/demo-share?token=${token}`, 2000);
  // Wait for invitation image / form — skip long loaders by waiting for buttons
  const yes = page.getByRole("button", { name: /מגיע|אגיע|כן/ }).first();
  const no = page.getByRole("button", { name: /לא מגיע|לא אגיע/ }).first();
  const maybe = page.getByRole("button", { name: /עדיין לא בטוח|לא בטוח|אולי/ }).first();
  await page.waitForTimeout(1200);
  // Scroll past invite image if needed
  await page.evaluate(() => window.scrollBy(0, 280)).catch(() => {});
  await page.waitForTimeout(400);
  if (status === "yes") {
    if (await yes.count()) await yes.click();
    await page.waitForTimeout(400);
    // guests count controls
    const plus = page.locator('button:has-text("+"), [aria-label*="הוסף"], button:has-text("＋")').first();
    for (let i = 1; i < count; i++) {
      if (await plus.count()) await plus.click().catch(() => {});
      await page.waitForTimeout(200);
    }
    // number input fallback
    const num = page.locator('input[type="number"]').first();
    if (await num.count()) await num.fill(String(count)).catch(() => {});
  } else if (status === "no") {
    if (await no.count()) await no.click();
  } else if (status === "maybe" && (await maybe.count())) {
    await maybe.click();
  } else if (status === "maybe" && (await yes.count()) === 0) {
    // some UIs only yes/no — leave pending by not submitting
    return;
  }
  await page.waitForTimeout(500);
  const submit = page.getByRole("button", { name: /שלח|אישור|שמירה|שמור|סיום/ }).first();
  if (await submit.count()) {
    await submit.click();
    await page.waitForTimeout(1800);
  }
}

async function main() {
  log("BASE", BASE);
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1.5,
    locale: "he-IL",
  });
  await ensureDemo(context);

  // --- Still assets: WhatsApp mocks + calls comparison ---
  {
    const page = await context.newPage();
    await page.setViewportSize({ width: 430, height: 860 });
    await goto(
      page,
      `${BASE}/marketing/mocks/whatsapp-rsvp.html?mode=rsvp&title=${encodeURIComponent(TITLE)}&date=12.11.2026&location=${encodeURIComponent("גן ורדים")}`,
      800
    );
    const waPng = path.join(OUT_PNG, "mobile-whatsapp-rsvp.png");
    await page.locator("#phone").screenshot({ path: waPng });
    await toWebp(waPng, "mobile-whatsapp-rsvp");

    await goto(
      page,
      `${BASE}/marketing/mocks/whatsapp-rsvp.html?mode=std&title=${encodeURIComponent(TITLE)}&date=12.11.2026`,
      600
    );
    const stdPng = path.join(OUT_PNG, "mobile-whatsapp-std.png");
    await page.locator("#phone").screenshot({ path: stdPng });
    await toWebp(stdPng, "mobile-whatsapp-std");

    await page.setViewportSize({ width: 1440, height: 900 });
    await goto(page, `${BASE}/marketing/mocks/calls-comparison.html`, 600);
    const callsPng = path.join(OUT_PNG, "desktop-calls-comparison.png");
    await page.screenshot({ path: callsPng, fullPage: false });
    await toWebp(callsPng, "desktop-calls-comparison");
    await page.close();
  }

  // --- Guest invitation hero shot (loaded invite, not spinner) ---
  {
    const page = await context.newPage();
    await page.setViewportSize({ width: 390, height: 844 });
    await goto(page, `${BASE}/invite/demo-share?token=dmo_noa`, 2500);
    await page.waitForTimeout(1500);
    // hide loader overlays if any
    await page.addStyleTag({
      content: ".animate-spin,[aria-busy='true']{visibility:hidden!important}",
    }).catch(() => {});
    const png = path.join(OUT_PNG, "mobile-guest-invite-loaded.png");
    await page.screenshot({ path: png });
    await toWebp(png, "mobile-guest-invite-loaded");
    await page.close();
  }

  // --- Video 1: WhatsApp mock → invite → RSVP yes (full guest journey) ---
  await recordPage(context, {
    name: "process-rsvp-guest-journey",
    width: 390,
    height: 844,
    mobile: true,
    run: async (page) => {
      await goto(
        page,
        `${BASE}/marketing/mocks/whatsapp-rsvp.html?mode=rsvp&title=${encodeURIComponent(TITLE)}&date=12.11.2026&location=${encodeURIComponent("גן ורדים")}`,
        1500
      );
      await page.waitForTimeout(2200);
      // Click CTA area to "open link"
      await page.locator("#cta").click().catch(() => {});
      await goto(page, `${BASE}/invite/demo-share?token=dmo_noa`, 1800);
      await page.waitForTimeout(1600);
      await page.evaluate(() => window.scrollBy(0, 220));
      await page.waitForTimeout(800);
      await page.evaluate(() => window.scrollBy(0, 320));
      await page.waitForTimeout(600);
      const yes = page.getByRole("button", { name: /מגיע|אגיע/ }).first();
      if (await yes.count()) await yes.click();
      await page.waitForTimeout(700);
      const submit = page.getByRole("button", { name: /שלח|אישור|שמירה|שמור|סיום/ }).first();
      if (await submit.count()) await submit.click();
      await page.waitForTimeout(2200);
    },
  });

  // --- Video 2: Multi-guest RSVP → dashboard updates ---
  await recordPage(context, {
    name: "process-dashboard-live",
    width: 1440,
    height: 900,
    mobile: false,
    run: async (page) => {
      await goto(page, `${BASE}/try/dashboard`, 2000);
      await page.waitForTimeout(1500);
      // Capture baseline stats area
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(800);

      // Guest: noa yes 2
      await approveGuest(page, "dmo_noa", { status: "yes", count: 2 });
      await goto(page, `${BASE}/try/dashboard`, 1800);
      await page.waitForTimeout(1600);

      // Guest: itai no
      await approveGuest(page, "dmo_itai", { status: "no" });
      await goto(page, `${BASE}/try/dashboard`, 1800);
      await page.waitForTimeout(1600);

      // Guest: roni maybe if available else skip submit
      await approveGuest(page, "dmo_roni", { status: "maybe" });
      await goto(page, `${BASE}/try/dashboard`, 1800);
      await page.waitForTimeout(1600);

      // Guest: shira yes 2
      await approveGuest(page, "dmo_shira", { status: "yes", count: 2 });
      await goto(page, `${BASE}/try/dashboard`, 1800);
      await page.waitForTimeout(2200);
      await page.evaluate(() => window.scrollBy(0, 240));
      await page.waitForTimeout(1200);
    },
  });

  // --- Video 3: Invitation open ---
  await recordPage(context, {
    name: "process-invitation-open",
    width: 390,
    height: 844,
    mobile: true,
    run: async (page) => {
      await goto(
        page,
        `${BASE}/marketing/mocks/whatsapp-rsvp.html?mode=rsvp&title=${encodeURIComponent(TITLE)}`,
        1400
      );
      await page.waitForTimeout(1600);
      await goto(page, `${BASE}/invite/demo-share?token=dmo_tamar`, 1800);
      await page.waitForTimeout(2000);
      // slow scroll over invitation
      for (let i = 0; i < 6; i++) {
        await page.evaluate(() => window.scrollBy(0, 120));
        await page.waitForTimeout(450);
      }
      await page.waitForTimeout(1000);
    },
  });

  // --- Video 4: Save the Date ---
  await recordPage(context, {
    name: "process-save-the-date",
    width: 390,
    height: 844,
    mobile: true,
    run: async (page) => {
      // Organizer composer (desktop-ish in phone? use laptop size in second half)
      await page.setViewportSize({ width: 1280, height: 800 });
      await goto(page, `${BASE}/try/dashboard/messages/new`, 2000);
      // Try select Save the Date tab/mode
      const stdTab = page.getByRole("button", { name: /Save the Date|שמירת תאריך|Save The Date/i }).first();
      const stdText = page.getByText(/Save the Date|שמירת תאריך/i).first();
      if (await stdTab.count()) await stdTab.click().catch(() => {});
      else if (await stdText.count()) await stdText.click().catch(() => {});
      await page.waitForTimeout(1600);
      await page.evaluate(() => window.scrollBy(0, 200));
      await page.waitForTimeout(1200);
      // Guest receives STD mock
      await page.setViewportSize({ width: 390, height: 844 });
      await goto(
        page,
        `${BASE}/marketing/mocks/whatsapp-rsvp.html?mode=std&title=${encodeURIComponent(TITLE)}&date=12.11.2026`,
        1200
      );
      await page.waitForTimeout(2800);
    },
  });

  // --- Video 5: Seating from demo event ---
  await recordPage(context, {
    name: "process-seating",
    width: 1440,
    height: 900,
    mobile: false,
    run: async (page) => {
      await goto(page, `${BASE}/try/dashboard`, 1600);
      await page.waitForTimeout(1000);
      await goto(page, `${BASE}/try/dashboard/seating`, 2200);
      await page.waitForTimeout(1800);
      // Try interact: click a table / unassigned guest
      const table = page.locator('[data-table-id], .table, [class*="Table"]').first();
      if (await table.count()) await table.click().catch(() => {});
      await page.waitForTimeout(1000);
      // Drag-ish: click unassigned guest name if present
      const guestChip = page.getByText(/תמר כהן|נועה כהן|רוני אברהם|שירה לוי/).first();
      if (await guestChip.count()) {
        await guestChip.click().catch(() => {});
        await page.waitForTimeout(800);
      }
      await page.mouse.move(400, 300);
      await page.waitForTimeout(600);
      await page.mouse.move(520, 220);
      await page.waitForTimeout(1000);
      // open assign UI buttons
      for (const name of [/שבץ/, /הוסף לשולחן/, /שיבוץ/, /קבוצות/]) {
        const b = page.getByRole("button", { name }).first();
        if ((await b.count()) && (await b.isVisible().catch(() => false))) {
          await b.click().catch(() => {});
          await page.waitForTimeout(900);
          break;
        }
      }
      await page.waitForTimeout(1800);
      await page.evaluate(() => window.scrollBy(0, 160));
      await page.waitForTimeout(1200);
    },
  });

  // Fresh dashboard + invite stills after interactions
  {
    const page = await context.newPage();
    await goto(page, `${BASE}/try/dashboard`, 1800);
    const dash = path.join(OUT_PNG, "desktop-try-dashboard-live.png");
    await page.screenshot({ path: dash });
    await toWebp(dash, "desktop-try-dashboard-live");
    await goto(page, `${BASE}/try/dashboard/seating`, 1800);
    const seat = path.join(OUT_PNG, "desktop-try-seating-live.png");
    await page.screenshot({ path: seat });
    await toWebp(seat, "desktop-try-seating-live");
    await page.close();
  }

  await browser.close();
  log("DONE process videos");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
