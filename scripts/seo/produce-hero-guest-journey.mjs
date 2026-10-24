/**
 * Homepage hero phone video — REAL Invistimo surfaces only:
 * 1) /try/dashboard/messages/new → Pre-RSVP → invitation WhatsApp preview
 *    (approved Meta template body from lib/whatsapp/approvedTemplates.ts)
 *    Badge: labeled simulation / not actually sent
 * 2) /invite/demo-share?token=dmo_noa — real personal invite + Mia&Alon image
 * 3) Real RSVP yes → submit → real thank-you result
 *
 * No marketing/mocks HTML for invite/RSVP.
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";

const BASE = process.env.SEO_BASE || "http://127.0.0.1:3010";
const OUT = path.resolve("public/marketing/videos/hero-guest-journey.webm");
const RAW = "/tmp/invistimo-hero-real";
const GUEST_TOKEN = "dmo_noa";
const W = 390;
const H = 844;

fs.rmSync(RAW, { recursive: true, force: true });
fs.mkdirSync(RAW, { recursive: true });
fs.mkdirSync(path.dirname(OUT), { recursive: true });

async function dismiss(page) {
  await page
    .addStyleTag({
      content:
        "[data-nextjs-toast],[data-nextjs-dialog],#accessibilityWidget,.whatsapp-float,[class*='DemoTour'],[data-demo-tour],.userway_p1,.uwy{display:none!important}",
    })
    .catch(() => {});
  for (const name of [/התנסות חופשית/, /סיור מודרך/, /סגור/, /הבנתי/, /דלג/, /המשך/]) {
    const btn = page.getByRole("button", { name }).first();
    if ((await btn.count()) && (await btn.isVisible().catch(() => false))) {
      await btn.click({ timeout: 2000 }).catch(() => {});
      await page.waitForTimeout(250);
    }
  }
}

async function addSimBadge(page) {
  await page.evaluate(() => {
    document.getElementById("invistimo-sim-badge")?.remove();
    const badge = document.createElement("div");
    badge.id = "invistimo-sim-badge";
    badge.textContent =
      "הדמיית תצוגה מקדימה מהמערכת · תבנית WhatsApp מאושרת · לא נשלח בפועל";
    badge.setAttribute(
      "style",
      "position:fixed;top:8px;left:8px;right:8px;z-index:99999;background:#1C1612;color:#F7F1E8;font:700 11px/1.35 Heebo,Arial,sans-serif;padding:8px 10px;border-radius:10px;text-align:center;pointer-events:none"
    );
    document.body.appendChild(badge);
  });
}

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  {
    const warm = await browser.newContext({ locale: "he-IL" });
    const p = await warm.newPage();
    await p.goto(`${BASE}/try/dashboard`, {
      waitUntil: "domcontentloaded",
      timeout: 90000,
    });
    await p.waitForTimeout(1000);
    await dismiss(p);
    await p.request.post(`${BASE}/api/demo/interactive/reset`).catch(() => {});
    await p.waitForTimeout(500);
    await warm.close();
  }

  const context = await browser.newContext({
    viewport: { width: W, height: H },
    deviceScaleFactor: 2,
    locale: "he-IL",
    isMobile: true,
    hasTouch: true,
    recordVideo: { dir: RAW, size: { width: W, height: H } },
  });
  const page = await context.newPage();

  // --- 1) Real dashboard WhatsApp invitation preview ---
  await page.goto(`${BASE}/try/dashboard/messages/new`, {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  await page.waitForTimeout(1400);
  await dismiss(page);

  await page.getByText(/טרום אישורי הגעה/).first().click();
  await page.waitForTimeout(900);
  await page.getByText(/שליחת הזמנות|הזמנה כללית/).first().click();
  await page.waitForTimeout(1200);
  await dismiss(page);
  await addSimBadge(page);

  const previewHeading = page.getByText(/כך תיראה הודעת הוואטסאפ/).first();
  if (await previewHeading.count()) {
    await previewHeading.scrollIntoViewIfNeeded().catch(() => {});
  }
  await page.waitForTimeout(900);
  // Ensure approved body is in view
  const approved = page.getByText(/משפחה וחברים יקרים/).first();
  if (await approved.count()) {
    await approved.scrollIntoViewIfNeeded().catch(() => {});
  }
  await page.waitForTimeout(3200);

  // --- 2) Real personal link ---
  await page.goto(`${BASE}/invite/demo-share?token=${GUEST_TOKEN}`, {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  await page.waitForTimeout(2200);
  await dismiss(page);

  await page
    .waitForSelector(
      'img[alt*="הזמנה"], img[src*="invite-wedding-mia-alon"], img[src*="marketing/invites"]',
      { timeout: 15000 }
    )
    .catch(() => {});
  await page.waitForTimeout(1000);

  for (const y of [0, 140, 280, 420, 580, 740]) {
    await page.evaluate((top) => window.scrollTo({ top, behavior: "smooth" }), y);
    await page.waitForTimeout(650);
  }
  await page.waitForTimeout(500);

  // --- 3) Real RSVP ---
  const yes = page.getByRole("button", { name: /מגיע/ }).first();
  await yes.waitFor({ state: "visible", timeout: 10000 }).catch(() => {});
  if (await yes.count()) {
    await yes.scrollIntoViewIfNeeded().catch(() => {});
    await yes.click();
    await page.waitForTimeout(900);
  }

  const submit = page
    .getByRole("button", { name: /שליחת אישור|שלח|שמור|אישור הגעה/ })
    .first();
  if (await submit.count()) {
    await submit.scrollIntoViewIfNeeded().catch(() => {});
    await submit.click();
    await page.waitForTimeout(3000);
  }

  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  await page.waitForTimeout(2400);

  await page.close();
  await context.close();
  await browser.close();

  const files = fs.readdirSync(RAW).filter((f) => f.endsWith(".webm"));
  if (!files.length) throw new Error("no recorded video");
  const src = path.join(RAW, files[0]);
  execFileSync(
    "ffmpeg",
    ["-y", "-i", src, "-c:v", "libvpx-vp9", "-b:v", "1600k", "-an", OUT],
    { stdio: "inherit" }
  );
  // Poster from invite mid-frame for reduced-motion / first paint
  const poster = path.resolve(
    "public/marketing/product/webp/mobile-guest-invite-hero.webp"
  );
  try {
    execFileSync(
      "ffmpeg",
      [
        "-y",
        "-ss",
        "8",
        "-i",
        OUT,
        "-frames:v",
        "1",
        "/tmp/hero-poster.png",
      ],
      { stdio: "inherit" }
    );
    const sharp = (await import("sharp")).default;
    await sharp("/tmp/hero-poster.png").webp({ quality: 84 }).toFile(poster);
    console.log("POSTER", poster);
  } catch (e) {
    console.warn("poster skip", e.message);
  }
  console.log("WROTE", OUT, `${(fs.statSync(OUT).size / 1024 / 1024).toFixed(2)}MB`);
  console.log("GUEST_LINK", `${BASE}/invite/demo-share?token=${GUEST_TOKEN}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
