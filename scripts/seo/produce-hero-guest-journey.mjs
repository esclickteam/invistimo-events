/**
 * Hero guest-journey video (homepage phone only) — re-recorded from scratch.
 *
 * Flow: WhatsApp → tap personal link → real invite → scroll RSVP into view →
 * tap "מגיע/ה" → tap submit (fully visible) → real success.
 *
 * Touch: soft translucent finger-circle synced to every tap (no mouse cursor).
 * Scroll: pause when RSVP options are centered — never tap off-screen controls.
 * Dev chrome: stripped from capture (Next overlays, accessibility widget, etc.).
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";

const BASE = process.env.SEO_BASE || "http://127.0.0.1:3010";
const OUT = path.resolve("public/marketing/videos/hero-guest-journey.webm");
const POSTER = path.resolve("public/marketing/videos/hero-guest-journey-poster.jpg");
const ART = "/opt/cursor/artifacts/screenshots";
const RAW = "/tmp/invistimo-hero-guest-touch";
const TOKEN = "dmo_noa";
const W = 390;
const H = 844;

fs.rmSync(RAW, { recursive: true, force: true });
fs.mkdirSync(RAW, { recursive: true });
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.mkdirSync(ART, { recursive: true });

const TOUCH_CSS = `
  #inv-finger-layer {
    position: fixed; inset: 0; z-index: 2147483646;
    pointer-events: none; overflow: hidden;
  }
  #inv-finger-ring {
    position: absolute; width: 54px; height: 54px;
    margin-left: -27px; margin-top: -27px;
    border-radius: 50%;
    border: 2.5px solid rgba(255,255,255,0.88);
    background: radial-gradient(circle, rgba(255,255,255,0.38) 0%, rgba(255,255,255,0.12) 55%, rgba(255,255,255,0) 72%);
    box-shadow: 0 0 0 6px rgba(0,0,0,0.08), 0 2px 10px rgba(0,0,0,0.18);
    opacity: 0; transform: scale(0.55);
    transition: opacity .12s ease, transform .18s ease;
  }
  #inv-finger-ring.inv-show {
    opacity: 1; transform: scale(1);
  }
  #inv-finger-ring.inv-press {
    transform: scale(0.86);
    background: radial-gradient(circle, rgba(255,255,255,0.5) 0%, rgba(200,170,120,0.22) 50%, rgba(255,255,255,0) 70%);
  }
  #inv-finger-drag {
    position: absolute; width: 36px; height: 36px;
    margin-left: -18px; margin-top: -18px;
    border-radius: 50%;
    background: rgba(255,255,255,0.28);
    border: 2px solid rgba(255,255,255,0.7);
    box-shadow: 0 1px 6px rgba(0,0,0,0.2);
    opacity: 0; pointer-events: none;
  }
  #inv-finger-drag.inv-show { opacity: 0.95; }
`;

async function installTouchLayer(page) {
  await page.addStyleTag({ content: TOUCH_CSS }).catch(() => {});
  await page.evaluate(() => {
    if (document.getElementById("inv-finger-layer")) return;
    const layer = document.createElement("div");
    layer.id = "inv-finger-layer";
    const ring = document.createElement("div");
    ring.id = "inv-finger-ring";
    const drag = document.createElement("div");
    drag.id = "inv-finger-drag";
    layer.appendChild(ring);
    layer.appendChild(drag);
    document.documentElement.appendChild(layer);
    window.__invTouch = {
      show(x, y, press) {
        ring.style.left = `${x}px`;
        ring.style.top = `${y}px`;
        ring.classList.add("inv-show");
        if (press) ring.classList.add("inv-press");
        else ring.classList.remove("inv-press");
      },
      hide() {
        ring.classList.remove("inv-show", "inv-press");
      },
      dragShow(x, y) {
        drag.style.left = `${x}px`;
        drag.style.top = `${y}px`;
        drag.classList.add("inv-show");
      },
      dragHide() {
        drag.classList.remove("inv-show");
      },
    };
  });
}

async function hideDevChrome(page) {
  await page.addStyleTag({
    content: `
      #accessibilityWidget, .whatsapp-float, .userway_p1, .uwy, .uw-s10-right,
      [data-nextjs-toast], [data-nextjs-dialog], [data-nextjs-dialog-overlay],
      nextjs-portal, [data-nextjs-dev-overlay], [data-nextjs-errors-dialog],
      #__next-build-watcher, [id*="userway"], iframe[src*="userway"] {
        display: none !important; visibility: hidden !important; opacity: 0 !important;
        pointer-events: none !important; width: 0 !important; height: 0 !important;
      }
    `,
  }).catch(() => {});
  await page.evaluate(() => {
    document
      .querySelectorAll(
        "nextjs-portal, [data-nextjs-toast], [data-nextjs-dialog], [data-nextjs-dev-overlay], #accessibilityWidget, .whatsapp-float"
      )
      .forEach((el) => {
        el.remove();
      });
    document.querySelectorAll("body *").forEach((el) => {
      const t = (el.textContent || "").trim();
      if (!t || t.length > 100) return;
      if (
        /דמו מבודד|בלי שליחה אמיתית|התחל סיור|סיום והשארת|סביבת בדיקה|לא נשלח בפועל|הדמיה|מצב דמו|איפוס הדמו|Preview|Demo Tour|Issue/.test(
          t
        )
      ) {
        if (el.children.length <= 6) {
          el.style.setProperty("display", "none", "important");
        }
      }
    });
  });
}

/** Soft finger tap on a locator: show ring, press, click, release, hide. */
async function fingerTap(page, locator, { holdMs = 280, afterMs = 520 } = {}) {
  await locator.waitFor({ state: "visible", timeout: 12000 });
  const box = await locator.boundingBox();
  if (!box) throw new Error("tap target has no box");
  // Ensure fully in viewport with margin
  const inView = await page.evaluate(
    ({ top, height }) => {
      const vh = window.innerHeight;
      return top >= 8 && top + height <= vh - 8;
    },
    { top: box.y, height: box.height }
  );
  if (!inView) {
    await locator.scrollIntoViewIfNeeded();
    await page.waitForTimeout(350);
  }
  const b2 = (await locator.boundingBox()) || box;
  const x = b2.x + b2.width / 2;
  const y = b2.y + b2.height / 2;

  await installTouchLayer(page);
  await page.evaluate(
    ({ x, y }) => window.__invTouch?.show(x, y, false),
    { x, y }
  );
  await page.waitForTimeout(180);
  await page.evaluate(
    ({ x, y }) => window.__invTouch?.show(x, y, true),
    { x, y }
  );
  await page.waitForTimeout(holdMs);
  await locator.click({ force: false, timeout: 8000 });
  await page.waitForTimeout(120);
  await page.evaluate(() => window.__invTouch?.show(
    Number(document.getElementById("inv-finger-ring")?.style.left) || 0,
    Number(document.getElementById("inv-finger-ring")?.style.top) || 0,
    false
  ));
  // keep ring briefly after click so press feedback is readable
  await page.waitForTimeout(220);
  await page.evaluate(() => window.__invTouch?.hide());
  await page.waitForTimeout(afterMs);
}

/** Finger-drag scroll: move content so `locator` is vertically centered. */
async function fingerScrollToCenter(page, locator, { steps = 10 } = {}) {
  await locator.waitFor({ state: "attached", timeout: 12000 });
  await installTouchLayer(page);

  for (let i = 0; i < 14; i++) {
    const state = await page.evaluate((sel) => {
      const el =
        typeof sel === "string"
          ? document.querySelector(sel)
          : null;
      // locator handled outside — we pass box via next call
      return null;
    }, null);

    const box = await locator.boundingBox();
    if (!box) {
      await locator.scrollIntoViewIfNeeded();
      await page.waitForTimeout(200);
      continue;
    }
    const vh = H;
    const center = box.y + box.height / 2;
    const target = vh * 0.42;
    const delta = center - target;
    if (Math.abs(delta) < 28) break;

    const startX = W * 0.55;
    const startY = vh * 0.62;
    const endY = Math.max(80, Math.min(vh - 80, startY - Math.sign(delta) * Math.min(Math.abs(delta), 160)));

    await page.evaluate(
      ({ x, y }) => window.__invTouch?.dragShow(x, y),
      { x: startX, y: startY }
    );
    await page.waitForTimeout(80);

    const n = steps;
    for (let s = 1; s <= n; s++) {
      const y = startY + ((endY - startY) * s) / n;
      const scrollBy = ((delta / n) * 0.95);
      await page.evaluate((by) => window.scrollBy(0, by), scrollBy);
      await page.evaluate(
        ({ x, y }) => window.__invTouch?.dragShow(x, y),
        { x: startX, y }
      );
      await page.waitForTimeout(42);
    }
    await page.evaluate(() => window.__invTouch?.dragHide());
    await page.waitForTimeout(220);
  }

  // Final snap: center without overshooting past RSVP into footer-only view
  await page.evaluate(async (label) => {
    const buttons = [...document.querySelectorAll("button")];
    const el = buttons.find((b) => /מגיע/.test(b.textContent || ""));
    if (!el) return;
    const r = el.getBoundingClientRect();
    const vh = window.innerHeight;
    const ideal = vh * 0.4 - r.height / 2;
    const dy = r.top - ideal;
    if (Math.abs(dy) > 12) {
      window.scrollBy({ top: dy, behavior: "smooth" });
    }
  });
  await page.waitForTimeout(500);
  await page.evaluate(() => window.__invTouch?.dragHide());
}

async function fingerScrollElementIntoView(page, locator) {
  await installTouchLayer(page);
  for (let i = 0; i < 8; i++) {
    const box = await locator.boundingBox();
    if (!box) {
      await locator.scrollIntoViewIfNeeded();
      await page.waitForTimeout(200);
      continue;
    }
    const fullyVisible =
      box.y >= 12 && box.y + box.height <= H - 12;
    if (fullyVisible) break;

    const startX = W * 0.55;
    const startY = H * 0.7;
    const endY = H * 0.45;
    await page.evaluate(
      ({ x, y }) => window.__invTouch?.dragShow(x, y),
      { x: startX, y: startY }
    );
    for (let s = 1; s <= 8; s++) {
      const y = startY + ((endY - startY) * s) / 8;
      await page.evaluate(() => window.scrollBy(0, 36));
      await page.evaluate(
        ({ x, y }) => window.__invTouch?.dragShow(x, y),
        { x: startX, y }
      );
      await page.waitForTimeout(40);
    }
    await page.evaluate(() => window.__invTouch?.dragHide());
    await page.waitForTimeout(180);
  }
  // ensure fully visible
  const box = await locator.boundingBox();
  if (box && (box.y < 12 || box.y + box.height > H - 12)) {
    await page.evaluate(
      ({ top, height, vh }) => {
        const pad = 40;
        if (top < pad) window.scrollBy(0, top - pad);
        else if (top + height > vh - pad)
          window.scrollBy(0, top + height - (vh - pad));
      },
      { top: box.y, height: box.height, vh: H }
    );
    await page.waitForTimeout(350);
  }
}

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--hide-scrollbars"],
  });

  // Bootstrap demo session WITHOUT recording
  const warm = await browser.newContext({
    viewport: { width: W, height: H },
    locale: "he-IL",
    isMobile: true,
    hasTouch: true,
  });
  const warmPage = await warm.newPage();
  await warmPage.goto(`${BASE}/try/dashboard`, {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  await warmPage.waitForTimeout(1000);
  const free = warmPage.getByRole("button", { name: /התנסות חופשית/ });
  if (await free.count()) await free.click().catch(() => {});
  await warmPage.request.post(`${BASE}/api/demo/interactive/reset`).catch(() => {});
  await warmPage.waitForTimeout(400);
  const cookies = await warm.cookies();
  await warm.close();

  const context = await browser.newContext({
    viewport: { width: W, height: H },
    deviceScaleFactor: 2,
    locale: "he-IL",
    isMobile: true,
    hasTouch: true,
    recordVideo: { dir: RAW, size: { width: W, height: H } },
  });
  await context.addCookies(cookies);
  // Never show default cursor in capture
  await context.addInitScript(() => {
    const style = document.createElement("style");
    style.textContent = `*, *::before, *::after { cursor: none !important; }`;
    document.documentElement.appendChild(style);
  });
  const page = await context.newPage();

  // --- Scene 1: WhatsApp ---
  const wa = `${BASE}/marketing/mocks/whatsapp-guest-clean.html?title=${encodeURIComponent(
    "החתונה של מיה ואלון"
  )}&date=24.06.2027&location=${encodeURIComponent("אולמי אלכסנדר")}`;
  await page.goto(wa, { waitUntil: "domcontentloaded", timeout: 60000 });
  await installTouchLayer(page);
  await page.waitForTimeout(2400);
  await page.screenshot({
    path: path.join(ART, "hero-scene-whatsapp.png"),
    type: "png",
  });
  // Tap CTA link
  await fingerTap(page, page.locator("#cta"), { holdMs: 320, afterMs: 380 });

  // --- Scene 2: real personal invite ---
  await page.goto(`${BASE}/invite/demo-share?token=${TOKEN}`, {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  await page.waitForTimeout(2000);
  await hideDevChrome(page);
  await installTouchLayer(page);

  await page
    .waitForSelector('img[alt="תמונת ההזמנה"], img[src*="invite-wedding"]', {
      timeout: 15000,
    })
    .catch(() => {});
  await page.waitForTimeout(1100);
  await hideDevChrome(page);
  await page.screenshot({
    path: path.join(ART, "hero-scene-invite.png"),
    type: "png",
  });

  // Gentle invite scroll (look at invitation) — stop before RSVP
  await installTouchLayer(page);
  {
    const startX = W * 0.55;
    let y = H * 0.68;
    await page.evaluate(
      ({ x, y }) => window.__invTouch?.dragShow(x, y),
      { x: startX, y }
    );
    for (let i = 0; i < 7; i++) {
      y -= 28;
      await page.evaluate(() => window.scrollBy(0, 70));
      await page.evaluate(
        ({ x, y }) => window.__invTouch?.dragShow(x, y),
        { x: startX, y }
      );
      await page.waitForTimeout(90);
    }
    await page.evaluate(() => window.__invTouch?.dragHide());
    await page.waitForTimeout(700);
  }

  // --- Scene 3–4: scroll RSVP options into center, then tap ---
  const yes = page.getByRole("button", { name: /^מגיע\/ה$|מגיע\/ה/ }).first();
  // Prefer exact "מגיע/ה" over "לא מגיע/ה"
  const yesExact = page.getByRole("button", { name: "מגיע/ה", exact: true });
  const yesBtn = (await yesExact.count()) ? yesExact : yes;

  await fingerScrollToCenter(page, yesBtn);
  await hideDevChrome(page);
  await page.waitForTimeout(650);
  await page.screenshot({
    path: path.join(ART, "hero-scene-rsvp-choice.png"),
    type: "png",
  });

  await fingerTap(page, yesBtn, { holdMs: 340, afterMs: 900 });
  await page.screenshot({
    path: path.join(ART, "hero-scene-rsvp-selected.png"),
    type: "png",
  });

  // --- Scene 4b: submit fully visible, then tap ---
  const submit = page.getByRole("button", { name: /שליחת אישור הגעה/ }).first();
  await fingerScrollElementIntoView(page, submit);
  await hideDevChrome(page);
  await page.waitForTimeout(500);
  await page.screenshot({
    path: path.join(ART, "hero-scene-submit-visible.png"),
    type: "png",
  });
  await fingerTap(page, submit, { holdMs: 360, afterMs: 600 });

  // --- Scene 5: success ---
  await page.waitForTimeout(2200);
  await hideDevChrome(page);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  await page.waitForTimeout(900);
  await hideDevChrome(page);
  await page.screenshot({
    path: path.join(ART, "hero-scene-success.png"),
    type: "png",
  });
  await page.waitForTimeout(2200);

  await page.close();
  await context.close();
  await browser.close();

  const files = fs.readdirSync(RAW).filter((f) => f.endsWith(".webm"));
  if (!files.length) throw new Error("no video");
  const src = path.join(RAW, files[0]);
  execFileSync(
    "ffmpeg",
    ["-y", "-i", src, "-c:v", "libvpx-vp9", "-b:v", "1800k", "-an", OUT],
    { stdio: "inherit" }
  );
  // Poster from WhatsApp scene (~1.2s)
  execFileSync(
    "ffmpeg",
    ["-y", "-ss", "1.2", "-i", OUT, "-frames:v", "1", POSTER],
    { stdio: "inherit" }
  );
  fs.copyFileSync(OUT, path.join("/opt/cursor/artifacts", "hero-guest-journey.webm"));
  fs.copyFileSync(POSTER, path.join("/opt/cursor/artifacts", "hero-guest-journey-poster.jpg"));

  const dur = execFileSync(
    "ffprobe",
    ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", OUT],
    { encoding: "utf8" }
  ).trim();
  console.log(
    "WROTE",
    OUT,
    `${(fs.statSync(OUT).size / 1024 / 1024).toFixed(2)}MB`,
    `dur=${dur}s`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
