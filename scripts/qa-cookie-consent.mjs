/**
 * Browser checks for the marketing consent gate.
 * Usage: node scripts/qa-cookie-consent.mjs
 * Expects the dev server on http://127.0.0.1:3210
 */
import { chromium, devices } from "playwright";
import fs from "node:fs";
import path from "node:path";

const base = process.env.QA_BASE_URL || "http://127.0.0.1:3210";
const axeSource = fs.readFileSync(
  path.resolve("node_modules/axe-core/axe.min.js"),
  "utf8"
);

const report = {
  blockedBeforeChoice: false,
  staysBlockedAfterReject: false,
  loadsAfterAccept: false,
  measurementOnlySkipsUserWay: false,
  preferencePersists: false,
  revokeStopsFuture: false,
  singleScriptAfterNavigation: false,
  noBannerOnGuestLink: false,
  legalLinks: false,
  contactNotice: false,
  galleryKeyboard: false,
  securityHeaders: false,
  consoleErrors: [],
  failedRequests: [],
  axe: {},
};

function track(page, bucket) {
  page.on("console", (message) => {
    if (message.type() === "error") bucket.push(message.text());
  });
  page.on("requestfailed", (request) => {
    const url = request.url();
    if (url.includes("google-analytics") || url.includes("googletagmanager") || url.includes("userway")) {
      report.failedRequests.push(`${request.failure()?.errorText || "failed"} ${url}`);
    }
  });
}

function isMeasurement(url) {
  return url.includes("googletagmanager.com") || url.includes("google-analytics.com") || url.includes("analytics.google.com");
}

async function runAxe(page, label) {
  await page.addScriptTag({ content: axeSource });
  const result = await page.evaluate(async () => {
    const outcome = await window.axe.run(document, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag22aa"] },
    });
    return outcome.violations.map((item) => ({
      id: item.id,
      impact: item.impact,
      nodes: item.nodes.length,
      target: item.nodes[0]?.target?.join(" ") || "",
    }));
  });
  report.axe[label] = result;
}

async function desktop() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  track(page, errors);
  const measurement = [];
  page.on("request", (request) => {
    if (isMeasurement(request.url())) measurement.push(request.url());
  });

  const home = await page.goto(base + "/", { waitUntil: "domcontentloaded" });
  report.securityHeaders = {
    nosniff: home.headers()["x-content-type-options"] || "",
    referrer: home.headers()["referrer-policy"] || "",
    frame: home.headers()["x-frame-options"] || "",
    csp: (home.headers()["content-security-policy"] || "").includes("frame-ancestors 'self'"),
  };
  await page.getByRole("dialog", { name: "עוגיות באתר Invistimo" }).waitFor();
  report.blockedBeforeChoice = measurement.length === 0;

  await page.getByRole("button", { name: "דחיית עוגיות לא חיוניות" }).click();
  await page.waitForTimeout(400);
  await page.reload({ waitUntil: "domcontentloaded" });
  report.staysBlockedAfterReject =
    measurement.length === 0 &&
    (await page.getByRole("dialog", { name: "עוגיות באתר Invistimo" }).count()) === 0;

  await page.evaluate(() => {
    localStorage.clear();
    document.cookie = "invistimo_consent=; path=/; max-age=0";
  });
  measurement.length = 0;
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "התאמה אישית" }).click();
  await page.getByRole("checkbox", { name: /מדידה וניתוח/ }).check();
  await page.getByRole("button", { name: "שמירת הבחירה" }).click();
  await page.waitForTimeout(1200);
  report.measurementOnlySkipsUserWay =
    measurement.some((url) => url.includes("googletagmanager.com")) &&
    (await page.locator("script[src*='userway']").count()) === 0;
  report.loadsAfterAccept = report.measurementOnlySkipsUserWay;

  await page.locator("#invistimo-ga4").waitFor({ state: "attached" });
  const tagRequestsBefore = measurement.filter((url) => url.includes("/gtag/js")).length;
  await page.getByRole("link", { name: "עוגיות", exact: true }).first().click();
  await page.waitForURL("**/cookies");
  await page.waitForTimeout(800);
  report.singleScriptAfterNavigation =
    tagRequestsBefore === 1 &&
    measurement.filter((url) => url.includes("/gtag/js")).length === 1 &&
    (await page.locator("#invistimo-ga4").count()) === 1;
  report.legalLinks =
    (await page.getByRole("link", { name: "מדיניות הפרטיות" }).count()) > 0;

  await page.waitForFunction(() => window.__invistimoConsentReady === true);
  await page.getByRole("button", { name: "הגדרות עוגיות" }).click();
  await page.getByRole("checkbox", { name: /מדידה וניתוח/ }).uncheck();
  const hitsBefore = measurement.length;
  await page.getByRole("button", { name: "שמירת הבחירה" }).click();
  await page.waitForTimeout(500);
  await page.goto(base + "/pricing", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800);
  report.revokeStopsFuture =
    measurement.length === hitsBefore && (await page.locator("#invistimo-ga4").count()) === 0;
  report.preferencePersists = (await page.getByRole("dialog", { name: "עוגיות באתר Invistimo" }).count()) === 0;

  await page.goto(base + "/invite/qa-guest", { waitUntil: "domcontentloaded" });
  report.noBannerOnGuestLink =
    (await page.getByRole("dialog", { name: "עוגיות באתר Invistimo" }).count()) === 0;

  await page.goto(base + "/contact", { waitUntil: "domcontentloaded" });
  report.contactNotice = (await page.getByRole("link", { name: "מדיניות הפרטיות" }).count()) > 0;
  await runAxe(page, "contact");

  await page.goto(base + "/", { waitUntil: "domcontentloaded" });
  await runAxe(page, "home-after-choice");
  report.consoleErrors = errors.filter((item) => !item.includes("favicon") && !item.includes("Download the React DevTools"));
  await browser.close();
}

async function mobile() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ ...devices["Pixel 7"] });
  await page.goto(base + "/", { waitUntil: "domcontentloaded" });
  const region = page.getByRole("region", { name: "הזמנות וכרטיסי שמירת תאריך" });
  await region.scrollIntoViewIfNeeded();
  await region.focus();
  const before = await region.evaluate((node) => node.scrollLeft);
  await page.keyboard.press("ArrowLeft");
  await page.waitForTimeout(700);
  const after = await region.evaluate((node) => node.scrollLeft);
  report.galleryKeyboard = before !== after;
  const tabIndex = await region.getAttribute("tabindex");
  report.galleryKeyboard = report.galleryKeyboard && tabIndex === "0";
  await browser.close();
}

const browserCheck = await chromium.launch();
await browserCheck.close();
await desktop();
await mobile();
console.log(JSON.stringify(report, null, 2));
const failed = Object.entries(report).filter(([key, value]) => {
  if (key === "consoleErrors" || key === "failedRequests" || key === "axe" || key === "securityHeaders") return false;
  return value !== true;
});
if (failed.length || !report.securityHeaders?.csp) {
  process.exitCode = 1;
}
