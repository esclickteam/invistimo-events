/**
 * Venue Suite responsive browser QA — Staging only.
 * Screenshots + layout probes across breakpoints and roles.
 */
import fs from "node:fs";
import http from "node:http";
import https from "node:https";
import { URL } from "node:url";
import puppeteer from "puppeteer";

const BASE = "https://staging.invistimo.com";
const BYPASS = fs.existsSync("/tmp/staging-bypass.txt")
  ? fs.readFileSync("/tmp/staging-bypass.txt", "utf8").trim()
  : process.env.VERCEL_AUTOMATION_BYPASS_SECRET || "";
const PASS = "StagingTest123!";
const OUT = "/opt/cursor/artifacts";
const LAB =
  "/opt/cursor/artifacts/STAGING-FULL-SCALE-VENUE-LAB-REPORT.json";

const jar = new Map();
function store(setCookie) {
  for (const line of setCookie || []) {
    const part = String(line).split(";")[0];
    const eq = part.indexOf("=");
    if (eq <= 0) continue;
    const name = part.slice(0, eq).trim();
    const value = part.slice(eq + 1).trim();
    if (!value || /Max-Age=0/i.test(line)) jar.delete(name);
    else jar.set(name, value);
  }
}
function cookies() {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}
function requestOnce(method, path, { body, redirectCount = 0 } = {}) {
  const url = new URL(path.startsWith("http") ? path : `${BASE}${path}`);
  const lib = url.protocol === "https:" ? https : http;
  const headers = {
    "x-vercel-protection-bypass": BYPASS,
    "x-vercel-set-bypass-cookie": "true",
    Cookie: cookies(),
  };
  let payload;
  if (body) {
    payload = Buffer.from(JSON.stringify(body));
    headers["Content-Type"] = "application/json";
    headers["Content-Length"] = String(payload.length);
  }
  return new Promise((resolve) => {
    const req = lib.request(url, { method, headers, timeout: 60000 }, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", async () => {
        store(res.headers["set-cookie"]);
        if (
          res.headers.location &&
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          redirectCount < 6
        ) {
          const next = new URL(res.headers.location, url);
          if (next.origin !== new URL(BASE).origin) {
            resolve({ status: res.statusCode });
            return;
          }
          resolve(
            await requestOnce(
              res.statusCode === 307 || res.statusCode === 308 ? method : "GET",
              next.toString(),
              {
                body:
                  res.statusCode === 307 || res.statusCode === 308
                    ? body
                    : undefined,
                redirectCount: redirectCount + 1,
              }
            )
          );
          return;
        }
        resolve({ status: res.statusCode || 0 });
      });
    });
    req.on("error", () => resolve({ status: 0 }));
    if (payload) req.write(payload);
    req.end();
  });
}
async function login(email) {
  for (const k of ["authToken", "token"]) jar.delete(k);
  await requestOnce("GET", "/");
  await requestOnce("POST", "/api/login", {
    body: { email, password: PASS },
  });
  return jar.get("authToken") || jar.get("token") || null;
}

const VIEWPORTS = [
  { name: "320", width: 320, height: 720, isMobile: true, hasTouch: true },
  { name: "375", width: 375, height: 812, isMobile: true, hasTouch: true },
  { name: "390", width: 390, height: 844, isMobile: true, hasTouch: true },
  { name: "430", width: 430, height: 932, isMobile: true, hasTouch: true },
  { name: "768", width: 768, height: 1024, isMobile: true, hasTouch: true },
  { name: "1024", width: 1024, height: 768 },
  { name: "1280", width: 1280, height: 800 },
  { name: "1440", width: 1440, height: 900 },
  { name: "1920", width: 1920, height: 1080 },
];

const lab = fs.existsSync(LAB)
  ? JSON.parse(fs.readFileSync(LAB, "utf8"))
  : null;
const hallId = lab?.venues?.A?.hallId;
const ownerEmail = lab?.venues?.A?.ownerEmail;
const managerEmail = lab?.venues?.A?.employees?.MANAGER?.email;
const receptionEmail = lab?.venues?.A?.employees?.RECEPTION?.email;
const viewerEmail = lab?.venues?.A?.employees?.VIEWER?.email;

if (!hallId || !ownerEmail) {
  console.error("Missing full-scale lab fixtures — run full-scale lab first");
  process.exit(1);
}

const H = encodeURIComponent(hallId);
const MODULES = [
  { key: "dashboard", path: `/venues/dashboard/halls/${H}` },
  { key: "leads", path: `/venues/dashboard/halls/${H}/crm` },
  { key: "clients", path: `/venues/dashboard/halls/${H}/customers` },
  { key: "calendar", path: `/venues/dashboard/halls/${H}/calendar` },
  { key: "dayof", path: `/venues/dashboard/halls/${H}/day-of` },
  { key: "seating", path: `/venues/dashboard/halls/${H}/seating-templates` },
  { key: "employees", path: `/venues/dashboard/halls/${H}/employees` },
  { key: "menus", path: `/venues/dashboard/halls/${H}/menus` },
  { key: "files", path: `/venues/dashboard/halls/${H}/files` },
  { key: "shifts", path: `/venues/dashboard/halls/${H}/staff` },
  { key: "equipment", path: `/venues/dashboard/halls/${H}/equipment` },
  { key: "reports", path: `/venues/dashboard/halls/${H}/reports` },
  { key: "activity", path: `/venues/dashboard/halls/${H}/activity` },
  { key: "settings", path: `/venues/dashboard/halls/${H}/settings` },
];

fs.mkdirSync(OUT, { recursive: true });

async function probe(page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    const body = document.body;
    const scrollWidth = Math.max(doc.scrollWidth, body?.scrollWidth || 0);
    const clientWidth = doc.clientWidth;
    const horizontalOverflow = scrollWidth > clientWidth + 2;
    const aside = document.querySelector('aside[aria-label="תפריט ניהול אולם"]');
    const collapsed = aside?.getAttribute("data-collapsed") === "true";
    const asideWidth = aside ? Math.round(aside.getBoundingClientRect().width) : 0;
    const menuBtn = !!document.querySelector('button[aria-label="פתח תפריט ניהול"]');
    const collapseBtn = !!document.querySelector(
      'button[aria-label="כווץ תפריט צד לאייקונים"], button[aria-label="הרחב תפריט צד"]'
    );
    const venueSuite = /Venue Suite|INVISTIMO/i.test(body?.innerText || "");
    return {
      horizontalOverflow,
      scrollWidth,
      clientWidth,
      collapsed,
      asideWidth,
      menuBtn,
      collapseBtn,
      venueSuite,
    };
  });
}

async function shot(browser, { email, path, viewport, filename, actions }) {
  const token = await login(email);
  if (!token) return { email, path, ok: false, reason: "login" };
  const page = await browser.newPage();
  try {
    await page.setViewport(viewport);
    await page.setExtraHTTPHeaders({
      "x-vercel-protection-bypass": BYPASS,
      "x-vercel-set-bypass-cookie": "true",
    });
    await page.goto(
      `${BASE}/?x-vercel-protection-bypass=${encodeURIComponent(BYPASS)}`,
      { waitUntil: "domcontentloaded", timeout: 60000 }
    );
    await page.setCookie(
      ...[...jar.entries()].map(([name, value]) => ({
        name,
        value,
        domain: "staging.invistimo.com",
        path: "/",
        secure: true,
      }))
    );
    await page.goto(`${BASE}${path}`, {
      waitUntil: "networkidle2",
      timeout: 90000,
    });
    await new Promise((r) => setTimeout(r, 900));
    if (actions) await actions(page);
    const metrics = await probe(page);
    const file = `${OUT}/${filename}`;
    await page.screenshot({ path: file, fullPage: true });
    return { email, path, ok: true, file, metrics, viewport: viewport.name };
  } catch (e) {
    return { email, path, ok: false, reason: String(e?.message || e) };
  } finally {
    await page.close();
  }
}

const browser = await puppeteer.launch({
  headless: "new",
  executablePath: "/usr/local/bin/google-chrome",
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});

const results = [];
const checks = [];

function check(name, pass, detail) {
  checks.push({ name, pass: Boolean(pass), detail: detail ?? null });
}

try {
  // OWNER desktop 1440 — expanded + collapsed
  results.push(
    await shot(browser, {
      email: ownerEmail,
      path: MODULES[0].path,
      viewport: VIEWPORTS.find((v) => v.name === "1440"),
      filename: "venue-resp-owner-1440-expanded.png",
      actions: async (page) => {
        await page.evaluate(() => {
          try {
            localStorage.setItem("venue.sidebarCollapsed", "0");
          } catch {}
        });
        await page.reload({ waitUntil: "networkidle2" });
        await new Promise((r) => setTimeout(r, 700));
      },
    })
  );
  results.push(
    await shot(browser, {
      email: ownerEmail,
      path: MODULES[0].path,
      viewport: VIEWPORTS.find((v) => v.name === "1440"),
      filename: "venue-resp-owner-1440-collapsed.png",
      actions: async (page) => {
        await page.evaluate(() => {
          try {
            localStorage.setItem("venue.sidebarCollapsed", "1");
          } catch {}
        });
        await page.reload({ waitUntil: "networkidle2" });
        await new Promise((r) => setTimeout(r, 700));
        const btn = await page.$(
          'button[aria-label="הרחב תפריט צד"], button[aria-label="כווץ תפריט צד לאייקונים"]'
        );
        if (btn) {
          // ensure collapsed
          const pressed = await page.evaluate(
            (el) => el.getAttribute("aria-pressed"),
            btn
          );
          if (pressed !== "true") await btn.click();
          await new Promise((r) => setTimeout(r, 400));
        }
      },
    })
  );

  // OWNER mobile 390 — drawer
  results.push(
    await shot(browser, {
      email: ownerEmail,
      path: MODULES[1].path,
      viewport: VIEWPORTS.find((v) => v.name === "390"),
      filename: "venue-resp-owner-390-leads.png",
      actions: async (page) => {
        const open = await page.$('button[aria-label="פתח תפריט ניהול"]');
        if (open) {
          await open.click();
          await new Promise((r) => setTimeout(r, 500));
        }
      },
    })
  );

  // MANAGER tablet 768
  if (managerEmail) {
    results.push(
      await shot(browser, {
        email: managerEmail,
        path: MODULES[3].path,
        viewport: VIEWPORTS.find((v) => v.name === "768"),
        filename: "venue-resp-manager-768-calendar.png",
      })
    );
  }

  // RECEPTION mobile day-of
  if (receptionEmail) {
    results.push(
      await shot(browser, {
        email: receptionEmail,
        path: MODULES[4].path,
        viewport: VIEWPORTS.find((v) => v.name === "390"),
        filename: "venue-resp-reception-390-dayof.png",
      })
    );
  }

  // VIEWER desktop
  if (viewerEmail) {
    results.push(
      await shot(browser, {
        email: viewerEmail,
        path: MODULES[0].path,
        viewport: VIEWPORTS.find((v) => v.name === "1280"),
        filename: "venue-resp-viewer-1280.png",
      })
    );
  }

  // Sweep modules across key breakpoints for overflow / render
  const sweepVps = ["320", "390", "768", "1024", "1440", "1920"];
  for (const mod of MODULES) {
    for (const vpName of sweepVps) {
      const vp = VIEWPORTS.find((v) => v.name === vpName);
      const r = await shot(browser, {
        email: ownerEmail,
        path: mod.path,
        viewport: vp,
        filename: `venue-resp-${mod.key}-${vpName}.png`,
      });
      results.push(r);
      if (r.ok) {
        check(
          `no_hscroll_${mod.key}_${vpName}`,
          !r.metrics.horizontalOverflow,
          r.metrics
        );
        check(`renders_${mod.key}_${vpName}`, r.metrics.venueSuite, r.metrics);
        if (vpName === "390") {
          check(
            `mobile_no_sticky_rail_${mod.key}`,
            !r.metrics.collapseBtn || r.metrics.menuBtn,
            r.metrics
          );
        }
      } else {
        check(`shot_${mod.key}_${vpName}`, false, r.reason);
      }
    }
  }

  // Sidebar specific
  const collapsedShot = results.find((r) =>
    String(r.file || "").includes("1440-collapsed")
  );
  const expandedShot = results.find((r) =>
    String(r.file || "").includes("1440-expanded")
  );
  check(
    "sidebar_collapsed_narrow",
    collapsedShot?.metrics?.collapsed === true &&
      (collapsedShot?.metrics?.asideWidth || 99) <= 90,
    collapsedShot?.metrics
  );
  check(
    "sidebar_expanded_wide",
    expandedShot?.metrics?.collapsed === false &&
      (expandedShot?.metrics?.asideWidth || 0) >= 200,
    expandedShot?.metrics
  );
  check(
    "mobile_menu_button",
    results.some((r) => r.viewport === "390" && r.metrics?.menuBtn),
    null
  );
} finally {
  await browser.close();
}

const failed = checks.filter((c) => !c.pass);
const overflowFails = failed.filter((f) => f.name.startsWith("no_hscroll_"));
const report = {
  at: new Date().toISOString(),
  hallId,
  ownerEmail,
  checks,
  failed: failed.map((f) => f.name),
  results: results.map((r) => ({
    email: r.email,
    path: r.path,
    ok: r.ok,
    file: r.file,
    viewport: r.viewport,
    metrics: r.metrics,
    reason: r.reason,
  })),
  FINAL: {
    DESKTOP: checks
      .filter((c) => c.name.includes("_1440") || c.name.includes("_1280") || c.name.includes("_1920"))
      .every((c) => c.pass)
      ? "PASS"
      : "FAIL",
    TABLET: checks
      .filter((c) => c.name.includes("_768") || c.name.includes("_1024"))
      .every((c) => c.pass)
      ? "PASS"
      : "FAIL",
    MOBILE: checks
      .filter((c) => /_(320|375|390|430)_/.test(c.name) || c.name.includes("_390"))
      .every((c) => c.pass)
      ? "PASS"
      : "FAIL",
    PX_320: checks.filter((c) => c.name.includes("_320")).every((c) => c.pass)
      ? "PASS"
      : "FAIL",
    PX_1920: checks.filter((c) => c.name.includes("_1920")).every((c) => c.pass)
      ? "PASS"
      : "FAIL",
    SIDEBAR_COLLAPSED: checks.find((c) => c.name === "sidebar_collapsed_narrow")
      ?.pass
      ? "PASS"
      : "FAIL",
    SIDEBAR_EXPANDED: checks.find((c) => c.name === "sidebar_expanded_wide")
      ?.pass
      ? "PASS"
      : "FAIL",
    MOBILE_DRAWER: checks.find((c) => c.name === "mobile_menu_button")?.pass
      ? "PASS"
      : "FAIL",
    HORIZONTAL_PAGE_SCROLL: overflowFails.length,
    BROKEN_LAYOUTS: failed.filter((f) => f.name.startsWith("renders_")).length,
    OVERALL: failed.length === 0 ? "PASS" : "FAIL",
  },
};

fs.writeFileSync(
  `${OUT}/VENUE-RESPONSIVE-BROWSER-QA.json`,
  JSON.stringify(report, null, 2)
);
console.log(
  JSON.stringify(
    {
      report: `${OUT}/VENUE-RESPONSIVE-BROWSER-QA.json`,
      FINAL: report.FINAL,
      failed: report.failed.slice(0, 40),
      failedCount: failed.length,
      total: checks.length,
    },
    null,
    2
  )
);
process.exit(failed.length ? 1 : 0);
