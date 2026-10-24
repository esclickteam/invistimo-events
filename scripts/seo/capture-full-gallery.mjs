/**
 * Full desktop+mobile screenshot gallery of all marketing pages.
 * Output: /opt/cursor/artifacts/screenshots/gallery/
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const BASE = process.env.SEO_BASE || "http://127.0.0.1:3010";
const OUT = "/opt/cursor/artifacts/screenshots/gallery";
fs.mkdirSync(OUT, { recursive: true });

const PATHS = [
  "/",
  "/rsvp",
  "/rsvp/chatuna",
  "/rsvp/whatsapp",
  "/rsvp/sms",
  "/rsvp/calls",
  "/rsvp/reminders",
  "/rsvp/thank-you-messages",
  "/rsvp/guest-list",
  "/rsvp/save-the-date",
  "/invitations/chatuna",
  "/seating-explained",
  "/wedding-website",
  "/wedding-website/eternal-gold",
  "/wedding-website/midnight-velvet",
  "/wedding-website/garden-bloom",
  "/event-management",
  "/info/demo",
  "/info/guides",
  "/info/guides/when-to-send-rsvp",
  "/info/guides/seating-plan",
  "/info/guides/save-the-date-vs-invitation",
  "/info/guides/guests-who-dont-reply",
  "/info/guides/how-many-rsvp-rounds",
  "/info/guides/guest-list",
  "/info/guides/send-digital-invitation",
  "/info/guides/when-to-send-save-the-date",
  "/info/guides/when-to-send-invitation",
  "/info/guides/build-wedding-website",
  "/info/guides/table-number-message",
  "/info/guides/send-reminder-messages",
  "/info/guides/event-day-checklist",
  "/info/guides/bar-mitzvah-rsvp-plan",
  "/info/guides/manage-corporate-event",
  "/info/guides/cost-rsvp-wedding",
  "/info/guides/reduce-meal-waste",
  "/for/bar-mitzvah",
  "/for/bat-mitzvah",
  "/for/brit",
  "/for/henna",
  "/for/birthday",
  "/for/private-party",
  "/for/corporate",
  "/pricing",
  "/info/about",
];

function slugify(p) {
  return p === "/" ? "home" : p.replace(/^\//, "").replace(/\//g, "__");
}

async function hide(page) {
  await page
    .addStyleTag({
      content: `[data-nextjs-toast],[data-nextjs-dialog],nextjs-portal,#accessibilityWidget,.whatsapp-float,[aria-label*="Next.js"]{display:none!important}`,
    })
    .catch(() => {});
}

async function capture(browser, viewport, device) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: device === "mobile" ? 2 : 1.25,
    isMobile: device === "mobile",
    hasTouch: device === "mobile",
    locale: "he-IL",
  });
  const page = await context.newPage();
  const results = [];
  for (const p of PATHS) {
    const name = `${device}__${slugify(p)}`;
    const file = path.join(OUT, `${name}.png`);
    try {
      await page.goto(`${BASE}${p}`, { waitUntil: "domcontentloaded", timeout: 60000 });
      await page.waitForTimeout(1200);
      await hide(page);
      // dismiss cookies
      for (const t of [/קבל/, /אישור/, /הבנתי/]) {
        const b = page.getByRole("button", { name: t }).first();
        if ((await b.count()) && (await b.isVisible().catch(() => false))) {
          await b.click().catch(() => {});
        }
      }
      await page.screenshot({ path: file, fullPage: false, type: "png" });
      // also mid-page scroll for content-heavy pages
      await page.evaluate(() => window.scrollTo(0, Math.min(900, document.body.scrollHeight * 0.35)));
      await page.waitForTimeout(400);
      await hide(page);
      await page.screenshot({
        path: path.join(OUT, `${name}__mid.png`),
        fullPage: false,
        type: "png",
      });
      console.log("OK", name);
      results.push({ path: p, device, ok: true, file });
    } catch (e) {
      console.error("FAIL", name, e.message);
      results.push({ path: p, device, ok: false, error: e.message });
    }
  }
  await context.close();
  return results;
}

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const desktop = await capture(browser, { width: 1440, height: 900 }, "desktop");
  const mobile = await capture(browser, { width: 390, height: 844 }, "mobile");
  await browser.close();
  const report = { generatedAt: new Date().toISOString(), desktop, mobile, out: OUT };
  fs.writeFileSync(path.join(OUT, "index.json"), JSON.stringify(report, null, 2));
  // markdown index
  const lines = [
    "# גלריית צילומי מסך — כל עמודי השיווק",
    "",
    `נוצר: ${new Date().toISOString()} (UTC) / Asia/Jerusalem`,
    "",
    `| עמוד | דסקטופ | מובייל |`,
    `| --- | --- | --- |`,
  ];
  for (const p of PATHS) {
    const s = slugify(p);
    lines.push(
      `| \`${p}\` | ![d](${OUT}/desktop__${s}.png) | ![m](${OUT}/mobile__${s}.png) |`
    );
  }
  fs.writeFileSync(path.join(OUT, "README.md"), lines.join("\n"));
  // also copy key shots to artifacts root for walkthrough
  console.log("gallery done", OUT, "pages", PATHS.length * 2);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
