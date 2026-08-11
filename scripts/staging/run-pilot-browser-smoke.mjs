import fs from "node:fs";
import puppeteer from "puppeteer";
import http from "node:http";
import https from "node:https";
import { URL } from "node:url";

const BASE = "https://staging.invistimo.com";
const BYPASS = fs.readFileSync("/tmp/staging-bypass.txt", "utf8").trim();
const PASS = "StagingTest123!";
const report = JSON.parse(
  fs.readFileSync("/opt/cursor/artifacts/STAGING-PILOT-LAB-E2E-REPORT.json", "utf8")
);
const OWNER = `${report.prefix}-owner@invistimo.test`;
const REGULAR = "e2e-regular-host@invistimo.test";
const CUSTOMER = "e2e-customer-a@invistimo.test";
const OUT = "/opt/cursor/artifacts";
const jar = new Map();

function store(setCookie) {
  for (const line of setCookie || []) {
    const part = String(line).split(";")[0];
    const eq = part.indexOf("=");
    if (eq > 0) jar.set(part.slice(0, eq), part.slice(eq + 1));
  }
}
function cookieHeader() {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

function requestOnce(method, path, { body, redirectCount = 0 } = {}) {
  const url = new URL(path.startsWith("http") ? path : `${BASE}${path}`);
  const lib = url.protocol === "https:" ? https : http;
  const headers = {
    Accept: "application/json,text/html,*/*",
    "x-vercel-protection-bypass": BYPASS,
    "x-vercel-set-bypass-cookie": "true",
    Cookie: cookieHeader(),
  };
  let payload;
  if (body !== undefined) {
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
        const status = res.statusCode || 0;
        const location = res.headers.location;
        if (location && status >= 300 && status < 400 && redirectCount < 8) {
          const next = new URL(location, url);
          if (next.origin !== url.origin && next.origin !== new URL(BASE).origin) {
            resolve({ status, error: "off-host" });
            return;
          }
          resolve(
            await requestOnce(status === 307 || status === 308 ? method : "GET", next.toString(), {
              body: status === 307 || status === 308 ? body : undefined,
              redirectCount: redirectCount + 1,
            })
          );
          return;
        }
        const raw = Buffer.concat(chunks).toString("utf8");
        let json = null;
        try {
          json = JSON.parse(raw);
        } catch {}
        resolve({ status, json, raw: raw.slice(0, 200) });
      });
    });
    req.on("error", (e) => resolve({ status: 0, error: String(e) }));
    if (payload) req.write(payload);
    req.end();
  });
}

async function login(email) {
  for (const k of ["authToken", "token", "role", "hasPaid", "isTrial"]) jar.delete(k);
  await requestOnce("GET", "/");
  const res = await requestOnce("POST", "/api/login", {
    body: { email, password: PASS },
  });
  const token = jar.get("authToken") || jar.get("token") || null;
  return { ok: res.status === 200 && !!token, token, status: res.status, json: res.json };
}

async function withSession(email, path, filename, asserts = []) {
  const lg = await login(email);
  if (!lg.ok) {
    return { email, path, ok: false, reason: `login ${lg.status} token=${!!lg.token}` };
  }
  const browser = await puppeteer.launch({
    headless: "new",
    executablePath: "/usr/local/bin/google-chrome",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--window-size=1440,900"],
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });
    await page.setExtraHTTPHeaders({
      "x-vercel-protection-bypass": BYPASS,
      "x-vercel-set-bypass-cookie": "true",
    });
    // Establish bypass first
    await page.goto(`${BASE}/?x-vercel-protection-bypass=${encodeURIComponent(BYPASS)}`, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    const cookies = [];
    for (const [name, value] of jar.entries()) {
      cookies.push({
        name,
        value,
        domain: "staging.invistimo.com",
        path: "/",
        secure: true,
      });
    }
    if (!cookies.find((c) => c.name === "authToken") && lg.token) {
      cookies.push({
        name: "authToken",
        value: lg.token,
        domain: "staging.invistimo.com",
        path: "/",
        secure: true,
      });
      cookies.push({
        name: "token",
        value: lg.token,
        domain: "staging.invistimo.com",
        path: "/",
        secure: true,
      });
    }
    await page.setCookie(...cookies);
    await page.goto(`${BASE}${path}`, { waitUntil: "networkidle2", timeout: 90000 });
    await new Promise((r) => setTimeout(r, 2000));
    const html = await page.content();
    const text = await page.evaluate(() => document.body?.innerText || "");
    const findings = {};
    for (const a of asserts) findings[a.name] = a.fn({ html, text, url: page.url() });
    const file = `${OUT}/${filename}`;
    await page.screenshot({ path: file, fullPage: true });
    return { email, path, ok: true, file, url: page.url(), findings, textSample: text.slice(0, 180) };
  } finally {
    await browser.close();
  }
}

const results = [];
results.push(
  await withSession(
    OWNER,
    `/venues/dashboard/halls/${encodeURIComponent(report.hallA)}`,
    "staging-pilot-owner-hall-overview.png",
    [
      {
        name: "venue_suite",
        fn: ({ text, html }) => /Venue Suite|אולם|dashboard/i.test(text + html),
      },
    ]
  )
);
results.push(
  await withSession(
    OWNER,
    `/venues/dashboard/halls/${encodeURIComponent(report.hallA)}/crm`,
    "staging-pilot-owner-crm.png",
    [{ name: "crm", fn: ({ text }) => /ליד|CRM|לקוח|חדש|הצעה/i.test(text) }]
  )
);
results.push(
  await withSession(REGULAR, "/dashboard", "staging-regular-dashboard.png", [
    {
      name: "no_venue_shell",
      fn: ({ text }) => !/INVISTIMO Venue Suite/i.test(text),
    },
    {
      name: "has_regular_content",
      fn: ({ text }) => /אירוע|הזמנה|אורח|Dashboard|ראשי|Regular/i.test(text),
    },
  ])
);
results.push(
  await withSession(CUSTOMER, "/dashboard", "staging-customer-dashboard.png", [
    {
      name: "no_venue_shell",
      fn: ({ text }) => !/INVISTIMO Venue Suite/i.test(text),
    },
  ])
);

fs.writeFileSync(`${OUT}/staging-browser-smoke.json`, JSON.stringify({ at: new Date().toISOString(), results }, null, 2));
console.log(JSON.stringify({ results }, null, 2));
