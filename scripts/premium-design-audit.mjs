/**
 * Full-page desktop + mobile screenshots and content inventory for marketing pages.
 * Requires: next dev on BASE (default http://localhost:3010) and playwright installed.
 */
import fs from "node:fs";
import path from "node:path";
import { chromium, devices } from "playwright";

const BASE = process.env.SEO_BASE || "http://localhost:3010";
const OUT_DIR = process.env.AUDIT_OUT || "/opt/cursor/artifacts/screenshots/premium-audit";
const INVENTORY = path.join(process.cwd(), "docs/seo/premium-design-inventory.json");

const PATHS = [
  "/",
  "/rsvp",
  "/rsvp/chatuna",
  "/rsvp/whatsapp",
  "/rsvp/save-the-date",
  "/invitations/chatuna",
  "/seating-explained",
  "/event-management",
  "/pricing",
  "/faq",
  "/info/about",
  "/info/guides",
  "/info/guides/cost-rsvp-wedding",
  "/info/guides/when-to-send-rsvp",
  "/info/guides/send-digital-invitation",
  "/info/guides/seating-plan",
  "/info/guides/save-the-date-vs-invitation",
  "/info/guides/guests-who-dont-reply",
  "/info/guides/table-number-message",
  "/info/guides/event-day-checklist",
  "/info/guides/guest-list",
  "/info/guides/wedding-venue-guest-guarantee",
];

function slug(p) {
  return p === "/" ? "home" : p.replace(/^\//, "").replace(/\//g, "_");
}

function hebrewWordCount(text) {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return 0;
  return cleaned.split(" ").filter(Boolean).length;
}

async function measure(page, pathName) {
  const res = await page.goto(`${BASE}${pathName}`, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForTimeout(800);
  const data = await page.evaluate(() => {
    const main = document.querySelector("main") || document.body;
    const text = (main?.innerText || "").replace(/\s+/g, " ").trim();
    const h1 = document.querySelector("h1")?.innerText?.replace(/\s+/g, " ").trim() || "";
    const title = document.title || "";
    const dir = document.documentElement.getAttribute("dir") || document.body.getAttribute("dir") || "";
    const html = document.documentElement.outerHTML;
    const sections = {
      answer: false, // dedicated short-answer SEO chrome removed site-wide
      benefits: /למה זה עובד|יתרונות|למה זה עובד בפועל|למה זה עובד באמת/.test(text),
      steps: /איך זה עובד|השלבים|איך זה עובד/.test(text) || document.querySelectorAll("ol li").length >= 3,
      eventTypes: /מתאים לסוגי אירועים|בר\/בת מצווה|אירוע חברה/.test(text),
      faq: /שאלות נפוצות|מה חשוב לדעת/.test(text) && document.querySelectorAll("details, [aria-expanded]").length > 0,
      cta: /לצפייה בחבילות|התחילו|יצירת קשר|למחשבון|הצטרפות/.test(text),
      media: !!document.querySelector("main video, main img, video, img[src*='home'], img[src*='homep']"),
    };
    const overflowX = document.documentElement.scrollWidth > document.documentElement.clientWidth + 2;
    return {
      title,
      h1,
      text,
      dir,
      sections,
      headingCount: document.querySelectorAll("h1,h2,h3").length,
      overflowX,
    };
  });
  return {
    http: res?.status() || 0,
    title: data.title,
    h1: data.h1,
    wordCountApprox: hebrewWordCount(data.text),
    dir: data.dir,
    overflowX: data.overflowX,
    sections: data.sections,
    headingCount: data.headingCount,
  };
}

async function runDevice(browser, deviceLabel, contextOptions) {
  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();
  const rows = [];
  for (const p of PATHS) {
    try {
      const metrics = await measure(page, p);
      const file = `${deviceLabel}-${slug(p)}.png`;
      const full = path.join(OUT_DIR, file);
      await page.screenshot({ path: full, fullPage: true });
      const status =
        metrics.http === 200 && !metrics.overflowX && metrics.dir === "rtl" ? "PASS" : "WARN";
      rows.push({
        device: deviceLabel,
        path: p,
        ...metrics,
        screenshot: `premium-audit/${file}`,
        status,
      });
      console.log(deviceLabel, p, metrics.http, metrics.wordCountApprox, "words", status);
    } catch (err) {
      rows.push({
        device: deviceLabel,
        path: p,
        http: 0,
        error: String(err?.message || err),
        status: "FAIL",
      });
      console.error(deviceLabel, p, err);
    }
  }
  await context.close();
  return rows;
}

fs.mkdirSync(OUT_DIR, { recursive: true });
const browser = await chromium.launch({ headless: true });
const desktop = await runDevice(browser, "desktop", {
  viewport: { width: 1440, height: 900 },
  locale: "he-IL",
});
const mobile = await runDevice(browser, "mobile", {
  ...devices["iPhone 13"],
  locale: "he-IL",
});
await browser.close();

const byPath = new Map();
for (const row of desktop) {
  byPath.set(row.path, {
    path: row.path,
    title: row.title,
    h1: row.h1,
    wordCountApprox: row.wordCountApprox,
    sections: row.sections,
    desktopScreenshot: row.screenshot,
    mobileScreenshot: null,
    desktopStatus: row.status,
    mobileStatus: null,
  });
}
for (const row of mobile) {
  const cur = byPath.get(row.path) || { path: row.path };
  cur.mobileScreenshot = row.screenshot;
  cur.mobileStatus = row.status;
  if (!cur.wordCountApprox) cur.wordCountApprox = row.wordCountApprox;
  if (!cur.sections) cur.sections = row.sections;
  if (!cur.title) cur.title = row.title;
  if (!cur.h1) cur.h1 = row.h1;
  byPath.set(row.path, cur);
}

const inventory = {
  generatedAt: new Date().toISOString(),
  base: BASE,
  pages: [...byPath.values()],
  raw: [...desktop, ...mobile],
};
fs.writeFileSync(INVENTORY, JSON.stringify(inventory, null, 2) + "\n");
console.log("Wrote", INVENTORY);
console.log(
  "Summary:",
  inventory.pages.map((p) => `${p.path}: ${p.wordCountApprox}w D=${p.desktopStatus} M=${p.mobileStatus}`).join("\n")
);
