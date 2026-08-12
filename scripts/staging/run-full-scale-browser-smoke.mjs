/**
 * Browser E2E smoke for full-scale lab fixtures (desktop + mobile).
 * Reads STAGING-FULL-SCALE-VENUE-LAB-REPORT.json for emails/hall ids.
 */
import fs from "node:fs";
import puppeteer from "puppeteer";
import http from "node:http";
import https from "node:https";
import { URL } from "node:url";

const BASE = "https://staging.invistimo.com";
const BYPASS = fs.readFileSync("/tmp/staging-bypass.txt", "utf8").trim();
const PASS = "StagingTest123!";
const REPORT_IN =
  "/opt/cursor/artifacts/STAGING-FULL-SCALE-VENUE-LAB-REPORT.json";
const OUT = "/opt/cursor/artifacts";
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

async function shot(email, path, filename, viewport, asserts = []) {
  const token = await login(email);
  if (!token) return { email, path, ok: false, reason: "login" };
  const browser = await puppeteer.launch({
    headless: "new",
    executablePath: "/usr/local/bin/google-chrome",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  try {
    const page = await browser.newPage();
    await page.setViewport(viewport);
    await page.setExtraHTTPHeaders({
      "x-vercel-protection-bypass": BYPASS,
      "x-vercel-set-bypass-cookie": "true",
    });
    await page.goto(
      `${BASE}/?x-vercel-protection-bypass=${encodeURIComponent(BYPASS)}`,
      { waitUntil: "domcontentloaded", timeout: 60000 }
    );
    const cookies = [...jar.entries()].map(([name, value]) => ({
      name,
      value,
      domain: "staging.invistimo.com",
      path: "/",
      secure: true,
    }));
    await page.setCookie(...cookies);
    await page.goto(`${BASE}${path}`, {
      waitUntil: "networkidle2",
      timeout: 90000,
    });
    await new Promise((r) => setTimeout(r, 1500));
    const text = await page.evaluate(() => document.body?.innerText || "");
    const findings = {};
    for (const a of asserts) findings[a.name] = a.fn(text, page.url());
    const file = `${OUT}/${filename}`;
    await page.screenshot({ path: file, fullPage: true });
    return { email, path, ok: true, file, findings, sample: text.slice(0, 160) };
  } finally {
    await browser.close();
  }
}

const lab = JSON.parse(fs.readFileSync(REPORT_IN, "utf8"));
const hallA = lab.venues.A.hallId;
const ownerA = lab.venues.A.ownerEmail;
const receptionA = lab.venues.A.employees.RECEPTION?.email;
const couple =
  lab.venues.A.couples?.[0]?.email ||
  Object.values(lab.venues)
    .flatMap((v) => v.couples || [])
    .map((c) => c.email)[0];
const regular = lab.regularAfter?.[0]?.email || "e2e-regular-host@invistimo.test";

const desktop = { width: 1440, height: 900 };
const mobile = { width: 390, height: 844, isMobile: true, hasTouch: true };

const results = [];
results.push(
  await shot(
    ownerA,
    `/venues/dashboard/halls/${encodeURIComponent(hallA)}`,
    "fslab-owner-desktop.png",
    desktop,
    [
      {
        name: "venue_suite",
        fn: (t) => /Venue Suite|אולם|FS-LAB/i.test(t),
      },
    ]
  )
);
results.push(
  await shot(
    ownerA,
    `/venues/dashboard/halls/${encodeURIComponent(hallA)}/crm`,
    "fslab-owner-crm-mobile.png",
    mobile,
    [{ name: "crm", fn: (t) => /ליד|CRM|לקוח|FS-LAB/i.test(t) }]
  )
);
if (receptionA) {
  results.push(
    await shot(
      receptionA,
      `/venues/dashboard/halls/${encodeURIComponent(hallA)}/day-of`,
      "fslab-reception-dayof-desktop.png",
      desktop,
      [{ name: "dayof", fn: (t) => /יום|הגעה|אירוע|Day/i.test(t) || t.length > 20 }]
    )
  );
}
if (couple) {
  results.push(
    await shot(couple, "/dashboard", "fslab-couple-desktop.png", desktop, [
      {
        name: "no_venue_shell",
        fn: (t) => !/INVISTIMO Venue Suite/i.test(t),
      },
      {
        name: "has_event",
        fn: (t) => /אירוע|Event|ברוכים|ראשי/i.test(t),
      },
    ])
  );
  results.push(
    await shot(couple, "/dashboard", "fslab-couple-mobile.png", mobile, [
      {
        name: "no_venue_shell",
        fn: (t) => !/INVISTIMO Venue Suite/i.test(t),
      },
    ])
  );
}
results.push(
  await shot(regular, "/dashboard", "fslab-regular-desktop.png", desktop, [
    {
      name: "no_venue_shell",
      fn: (t) => !/INVISTIMO Venue Suite/i.test(t),
    },
    {
      name: "regular_event",
      fn: (t) => /Regular|אירוע|FS-LAB/i.test(t),
    },
  ])
);

const out = {
  at: new Date().toISOString(),
  results,
  pass: results.every((r) => r.ok && Object.values(r.findings || {}).every(Boolean)),
};
fs.writeFileSync(`${OUT}/fslab-browser-smoke.json`, JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
process.exit(out.pass ? 0 : 1);
