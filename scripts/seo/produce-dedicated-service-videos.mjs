/**
 * Dedicated marketing videos from real /try + /invite surfaces.
 * Hides demo chrome ("דמו מבודד", tour, Next overlays) during capture.
 * One distinct script per product surface — do not reuse hero-guest-journey.
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";

const BASE = process.env.SEO_BASE || "http://127.0.0.1:3010";
const OUT_DIR = path.resolve("public/marketing/videos");
const RAW = "/tmp/invistimo-dedicated-videos";
const TITLE = "החתונה של מיה ואלון";

fs.rmSync(RAW, { recursive: true, force: true });
fs.mkdirSync(RAW, { recursive: true });
fs.mkdirSync(OUT_DIR, { recursive: true });

async function hideDemoChrome(page) {
  await page.addStyleTag({
    content: `
      #accessibilityWidget, .whatsapp-float, .userway_p1, .uwy,
      [data-nextjs-toast], [data-nextjs-dialog], [data-nextjs-dialog-overlay],
      nextjs-portal, [data-nextjs-dev-overlay] {
        display: none !important; visibility: hidden !important; opacity: 0 !important;
        pointer-events: none !important;
      }
      /* DemoExperience bottom bar */
      .fixed.inset-x-0.bottom-3.z-\\[100\\],
      .fixed.bottom-3 { display: none !important; }
    `,
  }).catch(() => {});
  await page.evaluate(() => {
    document.querySelectorAll("body *").forEach((el) => {
      const t = (el.textContent || "").trim();
      if (!t || t.length > 140) return;
      if (
        /דמו מבודד|בלי שליחה אמיתית|התחל סיור|איפוס|סיום והשארת פרטים|סביבת בדיקה|לא נשלח בפועל/.test(
          t
        )
      ) {
        if (el.children.length <= 6) {
          el.style.setProperty("display", "none", "important");
        }
      }
    });
    document
      .querySelectorAll("nextjs-portal, [data-nextjs-toast]")
      .forEach((el) => el.style.setProperty("display", "none", "important"));
  });
}

async function dismissWelcome(page) {
  const free = page.getByRole("button", { name: /התנסות חופשית/ });
  if (await free.count()) await free.click().catch(() => {});
  await page.waitForTimeout(400);
}

async function encode(src, name) {
  const out = path.join(OUT_DIR, `${name}.webm`);
  execFileSync(
    "ffmpeg",
    ["-y", "-i", src, "-c:v", "libvpx-vp9", "-b:v", "1600k", "-an", out],
    { stdio: "inherit" }
  );
  console.log("WROTE", out, `${(fs.statSync(out).size / 1024 / 1024).toFixed(2)}MB`);
  return out;
}

async function record(browser, cookies, { name, width, height, mobile, run }) {
  const dir = path.join(RAW, name);
  fs.mkdirSync(dir, { recursive: true });
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: mobile ? 2 : 1,
    locale: "he-IL",
    isMobile: Boolean(mobile),
    hasTouch: Boolean(mobile),
    recordVideo: { dir, size: { width, height } },
  });
  await context.addCookies(cookies);
  const page = await context.newPage();
  try {
    await run(page);
  } finally {
    await page.close();
    await context.close();
  }
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".webm"));
  if (!files.length) throw new Error(`no video for ${name}`);
  await encode(path.join(dir, files[0]), name);
}

async function approveGuest(page, token, { status = "yes", count = 1 } = {}) {
  await page.goto(`${BASE}/invite/demo-share?token=${token}`, {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  await page.waitForTimeout(1600);
  await hideDemoChrome(page);
  if (status === "yes") {
    await page.getByRole("button", { name: /מגיע/ }).first().click().catch(() => {});
  } else if (status === "no") {
    await page.getByRole("button", { name: /לא מגיע/ }).first().click().catch(() => {});
  } else {
    await page.getByRole("button", { name: /לא בטוח|מתלבט/ }).first().click().catch(() => {});
  }
  await page.waitForTimeout(500);
  if (status === "yes" && count > 1) {
    const plus = page.getByRole("button", { name: "+" }).first();
    for (let i = 1; i < count; i++) {
      if (await plus.count()) await plus.click().catch(() => {});
    }
  }
  await page
    .getByRole("button", { name: /שליחת אישור הגעה|שלח|שמור/ })
    .first()
    .click()
    .catch(() => {});
  await page.waitForTimeout(1200);
}

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const warm = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    locale: "he-IL",
  });
  const wp = await warm.newPage();
  await wp.goto(`${BASE}/try/dashboard`, {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  await wp.waitForTimeout(1200);
  await dismissWelcome(wp);
  await wp.request.post(`${BASE}/api/demo/interactive/reset`).catch(() => {});
  await wp.waitForTimeout(400);
  const cookies = await warm.cookies();
  await warm.close();

  // 1) RSVP multi-status → dashboard (for /rsvp)
  await record(browser, cookies, {
    name: "process-rsvp-statuses",
    width: 1440,
    height: 900,
    mobile: false,
    run: async (page) => {
      await page.request.post(`${BASE}/api/demo/interactive/reset`).catch(() => {});
      await page.goto(`${BASE}/try/dashboard`, {
        waitUntil: "domcontentloaded",
        timeout: 90000,
      });
      await dismissWelcome(page);
      await hideDemoChrome(page);
      await page.waitForTimeout(1200);
      await approveGuest(page, "dmo_noa", { status: "yes", count: 2 });
      await page.goto(`${BASE}/try/dashboard`, {
        waitUntil: "domcontentloaded",
        timeout: 90000,
      });
      await hideDemoChrome(page);
      await page.waitForTimeout(1400);
      await approveGuest(page, "dmo_itai", { status: "no" });
      await page.goto(`${BASE}/try/dashboard`, {
        waitUntil: "domcontentloaded",
        timeout: 90000,
      });
      await hideDemoChrome(page);
      await page.waitForTimeout(1400);
      await approveGuest(page, "dmo_roni", { status: "maybe" });
      await page.goto(`${BASE}/try/dashboard`, {
        waitUntil: "domcontentloaded",
        timeout: 90000,
      });
      await hideDemoChrome(page);
      await page.waitForTimeout(1800);
      await page.evaluate(() => window.scrollBy(0, 200));
      await page.waitForTimeout(1200);
    },
  });

  // 2) WhatsApp channel — clean WA → invite open (no RSVP submit)
  await record(browser, cookies, {
    name: "process-whatsapp-channel",
    width: 390,
    height: 844,
    mobile: true,
    run: async (page) => {
      await page.goto(
        `${BASE}/marketing/mocks/whatsapp-guest-clean.html?title=${encodeURIComponent(
          TITLE
        )}&date=24.06.2027&location=${encodeURIComponent("אולמי אלכסנדר")}`,
        { waitUntil: "domcontentloaded", timeout: 60000 }
      );
      await page.waitForTimeout(2200);
      await page.locator("#cta").click();
      await page.waitForTimeout(400);
      await page.goto(`${BASE}/invite/demo-share?token=dmo_tamar`, {
        waitUntil: "domcontentloaded",
        timeout: 90000,
      });
      await page.waitForTimeout(1800);
      await hideDemoChrome(page);
      for (let i = 0; i < 5; i++) {
        await page.evaluate(() => window.scrollBy(0, 140));
        await page.waitForTimeout(450);
      }
      await page.waitForTimeout(1000);
    },
  });

  // 3) Digital invitation open (scroll full invite)
  await record(browser, cookies, {
    name: "process-invitation-open",
    width: 390,
    height: 844,
    mobile: true,
    run: async (page) => {
      await page.goto(
        `${BASE}/marketing/mocks/whatsapp-guest-clean.html?title=${encodeURIComponent(
          TITLE
        )}&date=24.06.2027&location=${encodeURIComponent("אולמי אלכסנדר")}`,
        { waitUntil: "domcontentloaded", timeout: 60000 }
      );
      await page.waitForTimeout(1600);
      await page.goto(`${BASE}/invite/demo-share?token=dmo_noa`, {
        waitUntil: "domcontentloaded",
        timeout: 90000,
      });
      await page.waitForTimeout(2000);
      await hideDemoChrome(page);
      for (const y of [0, 180, 360, 540, 720, 900]) {
        await page.evaluate((t) => window.scrollTo({ top: t, behavior: "smooth" }), y);
        await page.waitForTimeout(550);
      }
      await page.waitForTimeout(1000);
    },
  });

  // 4) Save the Date — composer + STD mock
  await record(browser, cookies, {
    name: "process-save-the-date",
    width: 390,
    height: 844,
    mobile: true,
    run: async (page) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto(`${BASE}/try/dashboard/messages/new`, {
        waitUntil: "domcontentloaded",
        timeout: 90000,
      });
      await dismissWelcome(page);
      await hideDemoChrome(page);
      const std = page.getByText(/Save the Date|שמירת תאריך/i).first();
      if (await std.count()) await std.click().catch(() => {});
      await page.waitForTimeout(1800);
      await page.evaluate(() => window.scrollBy(0, 180));
      await page.waitForTimeout(1200);
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(
        `${BASE}/marketing/mocks/whatsapp-guest-clean.html?title=${encodeURIComponent(
          TITLE
        )}&date=24.06.2027&location=${encodeURIComponent("אולמי אלכסנדר")}`,
        { waitUntil: "domcontentloaded", timeout: 60000 }
      );
      // Override body to STD-style via evaluate for STD scene
      await page.evaluate(() => {
        document.getElementById("body").textContent =
          "Save The Date\nהחתונה של מיה ואלון\n\nאנחנו מתרגשים לשמור לכם את התאריך!\n24.06.2027\n\nההזמנה המלאה ואישורי ההגעה יישלחו בהמשך.";
        document.getElementById("cta").style.display = "none";
        document.getElementById("media").src =
          "/marketing/invites/invite-save-the-date-maya-itai.webp";
      });
      await page.waitForTimeout(2800);
    },
  });

  // 5) SMS composer
  await record(browser, cookies, {
    name: "process-sms",
    width: 1280,
    height: 800,
    mobile: false,
    run: async (page) => {
      await page.goto(`${BASE}/try/dashboard/messages/new`, {
        waitUntil: "domcontentloaded",
        timeout: 90000,
      });
      await dismissWelcome(page);
      await hideDemoChrome(page);
      const sms = page.getByText(/SMS|סמס/i).first();
      if (await sms.count()) await sms.click().catch(() => {});
      await page.waitForTimeout(1600);
      await page.evaluate(() => window.scrollBy(0, 160));
      await page.waitForTimeout(1400);
      await page.evaluate(() => window.scrollBy(0, 220));
      await page.waitForTimeout(1600);
    },
  });

  // 6) Recorded calls / IVR
  await record(browser, cookies, {
    name: "process-ivr-calls",
    width: 1280,
    height: 800,
    mobile: false,
    run: async (page) => {
      await page.goto(`${BASE}/try/dashboard/recorded-calls`, {
        waitUntil: "domcontentloaded",
        timeout: 90000,
      });
      await dismissWelcome(page);
      await hideDemoChrome(page);
      await page.waitForTimeout(2000);
      await page.evaluate(() => window.scrollBy(0, 180));
      await page.waitForTimeout(1400);
      const btn = page.getByRole("button", { name: /תזמן|שמור|הגדר|הפעל/ }).first();
      if (await btn.count()) await btn.click().catch(() => {});
      await page.waitForTimeout(1600);
    },
  });

  // 7) Reminders (SMS reminder in composer)
  await record(browser, cookies, {
    name: "process-reminders",
    width: 1280,
    height: 800,
    mobile: false,
    run: async (page) => {
      await page.goto(`${BASE}/try/dashboard/messages/new`, {
        waitUntil: "domcontentloaded",
        timeout: 90000,
      });
      await dismissWelcome(page);
      await hideDemoChrome(page);
      const rem = page.getByText(/תזכורת|reminder/i).first();
      if (await rem.count()) await rem.click().catch(() => {});
      await page.waitForTimeout(1800);
      await page.evaluate(() => window.scrollBy(0, 200));
      await page.waitForTimeout(1600);
    },
  });

  // 8) Thank-you messages
  await record(browser, cookies, {
    name: "process-thank-you",
    width: 1280,
    height: 800,
    mobile: false,
    run: async (page) => {
      await page.goto(`${BASE}/try/dashboard/messages/new`, {
        waitUntil: "domcontentloaded",
        timeout: 90000,
      });
      await dismissWelcome(page);
      await hideDemoChrome(page);
      const ty = page.getByText(/תודה|thank/i).first();
      if (await ty.count()) await ty.click().catch(() => {});
      await page.waitForTimeout(1800);
      await page.evaluate(() => window.scrollBy(0, 180));
      await page.waitForTimeout(1600);
    },
  });

  // 9) Guest list management
  await record(browser, cookies, {
    name: "process-guest-list",
    width: 1440,
    height: 900,
    mobile: false,
    run: async (page) => {
      await page.goto(`${BASE}/try/dashboard`, {
        waitUntil: "domcontentloaded",
        timeout: 90000,
      });
      await dismissWelcome(page);
      await hideDemoChrome(page);
      await page.waitForTimeout(1200);
      // Focus guest table / search
      const search = page.getByPlaceholder(/חיפוש|שם|טלפון/).first();
      if (await search.count()) {
        await search.click();
        await search.fill("נועה");
        await page.waitForTimeout(1200);
        await search.fill("");
        await page.waitForTimeout(800);
      }
      await page.evaluate(() => window.scrollBy(0, 280));
      await page.waitForTimeout(1400);
      const row = page.getByText(/נועה|תמר|רוני|שירה/).first();
      if (await row.count()) await row.click().catch(() => {});
      await page.waitForTimeout(1600);
    },
  });

  // 10) Day-of check-in
  await record(browser, cookies, {
    name: "process-check-in",
    width: 1280,
    height: 800,
    mobile: false,
    run: async (page) => {
      await page.goto(`${BASE}/try/dashboard/check-in`, {
        waitUntil: "domcontentloaded",
        timeout: 90000,
      });
      await dismissWelcome(page);
      await hideDemoChrome(page);
      await page.waitForTimeout(2000);
      const num = page.getByRole("button", { name: /^[0-9]$/ }).first();
      if (await num.count()) {
        // tap a few keypad digits if present
        for (const d of ["0", "5", "2"]) {
          const b = page.getByRole("button", { name: d }).first();
          if (await b.count()) await b.click().catch(() => {});
          await page.waitForTimeout(250);
        }
      }
      await page.evaluate(() => window.scrollBy(0, 160));
      await page.waitForTimeout(1600);
    },
  });

  // 11) Seating (dedicated, hide demo chrome)
  await record(browser, cookies, {
    name: "process-seating",
    width: 1440,
    height: 900,
    mobile: false,
    run: async (page) => {
      await page.goto(`${BASE}/try/dashboard/seating`, {
        waitUntil: "domcontentloaded",
        timeout: 90000,
      });
      await dismissWelcome(page);
      await hideDemoChrome(page);
      await page.waitForTimeout(2000);
      const guest = page.getByText(/תמר|נועה|רוני|שירה/).first();
      if (await guest.count()) await guest.click().catch(() => {});
      await page.waitForTimeout(900);
      for (const name of [/שבץ/, /הוסף לשולחן/, /שיבוץ/]) {
        const b = page.getByRole("button", { name }).first();
        if ((await b.count()) && (await b.isVisible().catch(() => false))) {
          await b.click().catch(() => {});
          await page.waitForTimeout(1000);
          break;
        }
      }
      await page.mouse.move(420, 280);
      await page.waitForTimeout(500);
      await page.mouse.move(620, 240);
      await page.waitForTimeout(1400);
    },
  });

  // 12) Dashboard live updates (refresh dedicated)
  await record(browser, cookies, {
    name: "process-dashboard-live",
    width: 1440,
    height: 900,
    mobile: false,
    run: async (page) => {
      await page.request.post(`${BASE}/api/demo/interactive/reset`).catch(() => {});
      await page.goto(`${BASE}/try/dashboard`, {
        waitUntil: "domcontentloaded",
        timeout: 90000,
      });
      await dismissWelcome(page);
      await hideDemoChrome(page);
      await page.waitForTimeout(1200);
      await approveGuest(page, "dmo_noa", { status: "yes", count: 2 });
      await page.goto(`${BASE}/try/dashboard`, {
        waitUntil: "domcontentloaded",
        timeout: 90000,
      });
      await hideDemoChrome(page);
      await page.waitForTimeout(1400);
      await approveGuest(page, "dmo_shira", { status: "yes", count: 2 });
      await page.goto(`${BASE}/try/dashboard`, {
        waitUntil: "domcontentloaded",
        timeout: 90000,
      });
      await hideDemoChrome(page);
      await page.waitForTimeout(2000);
      await page.evaluate(() => window.scrollBy(0, 220));
      await page.waitForTimeout(1200);
    },
  });

  // 13) Wedding website walkthrough
  await record(browser, cookies, {
    name: "reel-wedding-website",
    width: 1280,
    height: 800,
    mobile: false,
    run: async (page) => {
      // Prefer public wedding template pages if present
      const candidates = [
        `${BASE}/wedding/eternal-gold`,
        `${BASE}/sites/eternal-gold`,
        `${BASE}/templates/wedding/eternal-gold`,
        `${BASE}/try/dashboard`,
      ];
      let opened = false;
      for (const url of candidates) {
        const res = await page.goto(url, {
          waitUntil: "domcontentloaded",
          timeout: 45000,
        }).catch(() => null);
        if (res && res.status() < 400 && !page.url().includes("404")) {
          opened = true;
          break;
        }
      }
      await dismissWelcome(page);
      await hideDemoChrome(page);
      await page.waitForTimeout(1600);
      for (let i = 0; i < 6; i++) {
        await page.evaluate(() => window.scrollBy(0, 280));
        await page.waitForTimeout(700);
      }
      await page.waitForTimeout(1000);
      if (!opened) console.warn("wedding website fallback used");
    },
  });

  await browser.close();
  console.log("DONE dedicated service videos");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
