/**
 * Record real product demos (fictitious try data) for the seating-cards-vs-qr guide.
 * Output: public/marketing/videos/guides/*.webm (+ posters as jpg frames)
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";

const BASE = process.env.PUBLIC_BASE_URL || "http://localhost:3000";
const OUT = path.resolve("public/marketing/videos/guides");
fs.mkdirSync(OUT, { recursive: true });

async function preparePage(page) {
  await page.addInitScript(() => {
    try {
      localStorage.removeItem("invistimo.demo.checkin.v1");
      // Prefer free exploration over guided tour overlays when possible
      localStorage.setItem("invistimo.demo.mode", "free");
    } catch {
      /* ignore */
    }
  });
}

async function dismissOverlays(page) {
  for (const label of ["התנסות חופשית", "סיום והשארת פרטים", "דלג", "סגור", "איפוס"]) {
    const btn = page.getByRole("button", { name: label });
    if (await btn.count()) {
      try {
        await btn.first().click({ timeout: 1500, force: true });
        await page.waitForTimeout(400);
      } catch {
        /* ignore */
      }
    }
  }
  const free = page.getByText("התנסות חופשית", { exact: true });
  if (await free.count()) {
    try {
      await free.first().click({ timeout: 1500, force: true });
      await page.waitForTimeout(500);
    } catch {
      /* ignore */
    }
  }
  // Hard-remove demo tour / mode chooser overlays if they still block clicks
  await page.evaluate(() => {
    document.querySelectorAll(".fixed.inset-0").forEach((el) => {
      const z = window.getComputedStyle(el).zIndex;
      if (Number(z) >= 90) el.remove();
    });
  });
}

async function recordClip({ name, url, run, width = 1280, height = 720 }) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width, height },
    locale: "he-IL",
    recordVideo: { dir: OUT, size: { width, height } },
  });
  const page = await context.newPage();
  await preparePage(page);
  await page.goto(url, { waitUntil: "commit", timeout: 90000 });
  await page.waitForTimeout(2000);
  await dismissOverlays(page);
  await run(page);
  await page.waitForTimeout(800);
  await context.close();
  await browser.close();

  const files = fs
    .readdirSync(OUT)
    .filter((f) => f.endsWith(".webm") && !f.includes(name) && !/reception-|seating-|qr-/.test(f))
    .map((f) => ({ f, m: fs.statSync(path.join(OUT, f)).mtimeMs }))
    .sort((a, b) => b.m - a.m);

  // Prefer newest file that isn't one of our named outputs
  const named = new Set([
    "reception-guest-search.webm",
    "reception-mark-arrival.webm",
    "seating-reassign.webm",
    "qr-checkin-table.webm",
  ]);
  const candidates = fs
    .readdirSync(OUT)
    .filter((f) => f.endsWith(".webm"))
    .map((f) => ({ f, m: fs.statSync(path.join(OUT, f)).mtimeMs }))
    .filter((x) => !named.has(x.f) || x.f === `${name}.webm`)
    .sort((a, b) => b.m - a.m);

  const newest = candidates.find((x) => !named.has(x.f)) || candidates[0];
  if (!newest) throw new Error(`No video for ${name}`);
  const src = path.join(OUT, newest.f);
  const dest = path.join(OUT, `${name}.webm`);
  if (src !== dest) {
    if (fs.existsSync(dest)) fs.unlinkSync(dest);
    fs.renameSync(src, dest);
  }

  const poster = path.join(OUT, `${name}-poster.jpg`);
  spawnSync("ffmpeg", ["-y", "-i", dest, "-ss", "0.5", "-frames:v", "1", "-q:v", "2", poster], {
    stdio: "ignore",
  });
  console.log("OK", name, dest, `${(fs.statSync(dest).size / 1024).toFixed(0)}KB`);
  return dest;
}

async function main() {
  await recordClip({
    name: "reception-guest-search",
    url: `${BASE}/try/dashboard/check-in`,
    run: async (page) => {
      await dismissOverlays(page);
      const search = page.locator('[data-tour="checkin-search"]');
      await search.waitFor({ timeout: 30000 });
      await search.click();
      await search.fill("כהן");
      await page.waitForTimeout(900);
      const result = page.locator('[data-tour="checkin-result"]');
      if (await result.count()) {
        await result.first().click();
      } else {
        const mark = page.getByRole("button", { name: "סימון כניסה" }).first();
        if (await mark.count()) await mark.click();
      }
      await page.waitForTimeout(1800);
    },
  });

  await recordClip({
    name: "reception-mark-arrival",
    url: `${BASE}/try/dashboard/check-in`,
    run: async (page) => {
      await dismissOverlays(page);
      const mark = page.getByRole("button", { name: "סימון כניסה" }).first();
      await mark.waitFor({ timeout: 30000 });
      await mark.click();
      await page.waitForTimeout(700);
      const qty = page.locator('[data-tour="checkin-mark"]');
      await qty.waitFor({ timeout: 10000 });
      await qty.click();
      await page.waitForTimeout(2500);
    },
  });

  await recordClip({
    name: "seating-reassign",
    url: `${BASE}/try/dashboard/seating`,
    width: 1440,
    height: 900,
    run: async (page) => {
      await dismissOverlays(page);
      await page.waitForTimeout(2000);
      // Prefer tour targets if present
      const unassigned = page.locator("text=/לא שובץ|ללא שולחן|unassigned/i").first();
      if (await unassigned.count()) {
        await unassigned.click({ timeout: 3000 }).catch(() => {});
      }
      const guest = page.locator("text=/אורן|כהן|לוי|נועה|דניאל/").first();
      if (await guest.count()) {
        await guest.click({ timeout: 4000 }).catch(() => {});
      }
      await page.waitForTimeout(900);
      const table = page.getByRole("button", { name: /שולחן/ }).first();
      if (await table.count()) {
        await table.click({ timeout: 3000 }).catch(() => {});
      }
      // scroll map a bit for motion
      await page.mouse.wheel(0, 200);
      await page.waitForTimeout(1600);
    },
  });

  await recordClip({
    name: "qr-checkin-table",
    url: `${BASE}/try/check-in/pass/demoCheckInCohenFour1`,
    width: 420,
    height: 860,
    run: async (page) => {
      await page.waitForTimeout(1800);
      const host = await page.context().newPage();
      await preparePage(host);
      // Keep same storage as guest page — do NOT clear again after guest loaded.
      await host.goto(`${BASE}/try/dashboard/check-in`, { waitUntil: "commit" });
      await host.waitForTimeout(2000);
      await dismissOverlays(host);

      // Ensure default demo guests (not interactive seed) for token sync
      await host.evaluate(() => {
        localStorage.removeItem("invistimo.demo.checkin.v1");
        location.reload();
      });
      await host.waitForTimeout(2500);
      await dismissOverlays(host);

      // Reload guest so it reads fresh default state
      await page.reload({ waitUntil: "commit" });
      await page.waitForTimeout(1500);

      const mark = host.getByRole("button", { name: "סימון כניסה" }).filter({
        has: host.locator("xpath=ancestor::li[.//text()[contains(., 'כהן') or contains(., 'משפחת')]]"),
      });
      // Simpler: click סימון כניסה next to משפחת כהן / first matching
      const rowBtn = host.locator("li").filter({ hasText: /כהן|הדר|לוי/ }).getByRole("button", { name: "סימון כניסה" }).first();
      if (await rowBtn.count()) {
        await rowBtn.click();
      } else {
        await host.getByRole("button", { name: "סימון כניסה" }).first().click();
      }
      await host.waitForTimeout(600);
      const qty4 = host.getByRole("button", { name: "4", exact: true });
      if (await qty4.count()) await qty4.click();
      else await host.locator('[data-tour="checkin-mark"]').click();
      await host.waitForTimeout(1200);
      await page.bringToFront();
      await page.waitForTimeout(4000);
      await host.close();
    },
  });

  // Cleanup random leftover webms
  for (const f of fs.readdirSync(OUT)) {
    if (
      f.endsWith(".webm") &&
      ![
        "reception-guest-search.webm",
        "reception-mark-arrival.webm",
        "seating-reassign.webm",
        "qr-checkin-table.webm",
      ].includes(f)
    ) {
      fs.unlinkSync(path.join(OUT, f));
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
