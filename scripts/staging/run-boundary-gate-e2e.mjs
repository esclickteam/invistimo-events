/**
 * Staging Regular ↔ Venues boundary gate.
 *
 * Orchestrates:
 *  - false-link dry-run (Staging DB)
 *  - venues HTTP E2E (tenant + regular host)
 *  - full venue↔customer E2E (invite/RSVP/seating)
 *  - RBAC smoke for menus/tasks (owner allow, regular deny)
 *
 *   STAGING_BASE_URL=https://staging.invistimo.com \
 *   node scripts/staging/run-boundary-gate-e2e.mjs
 */
import fs from "node:fs";
import http from "node:http";
import https from "node:https";
import { URL } from "node:url";
import { spawnSync } from "node:child_process";

const BASE = String(
  process.env.STAGING_BASE_URL || "https://staging.invistimo.com"
).replace(/\/$/, "");
const BYPASS =
  process.env.VERCEL_AUTOMATION_BYPASS_SECRET ||
  (fs.existsSync("/tmp/staging-bypass.txt")
    ? fs.readFileSync("/tmp/staging-bypass.txt", "utf8").trim()
    : "");
const PASSWORD = process.env.STAGING_FIXTURE_PASSWORD || "StagingTest123!";
const REPORT_PATH =
  process.env.BOUNDARY_GATE_REPORT ||
  "/opt/cursor/artifacts/boundary-gate-report.json";
const MD_PATH =
  process.env.BOUNDARY_GATE_MD ||
  "/opt/cursor/artifacts/BOUNDARY-GATE-STAGING.md";

const FIXTURES = {
  owner: "staging-owner-a@invistimo.test",
  hallId: "staging-hall-a",
  regularHost: "staging-regular-host@invistimo.test",
};

function assertSafeBase(url) {
  const host = new URL(url).hostname.toLowerCase();
  if (host === "www.invistimo.com" || host === "invistimo.com") {
    throw new Error(`Refusing production host=${host}`);
  }
}

const cookieJar = new Map();

function storeSetCookies(setCookie) {
  for (const line of setCookie || []) {
    const part = String(line).split(";")[0];
    const eq = part.indexOf("=");
    if (eq <= 0) continue;
    const name = part.slice(0, eq).trim();
    const value = part.slice(eq + 1).trim();
    if (!name) continue;
    if (
      value === "" ||
      /Max-Age=0/i.test(line) ||
      /Expires=Thu, 01 Jan 1970/i.test(line)
    ) {
      cookieJar.delete(name);
    } else {
      cookieJar.set(name, value);
    }
  }
}

function cookieHeaderFromJar(extraToken) {
  const parts = [];
  for (const [k, v] of cookieJar.entries()) {
    if (extraToken && (k === "authToken" || k === "token")) continue;
    parts.push(`${k}=${v}`);
  }
  if (extraToken) {
    parts.push(`authToken=${extraToken}`);
    parts.push(`token=${extraToken}`);
  }
  return parts.join("; ");
}

function request(method, path, { body, token } = {}) {
  const url = new URL(path.startsWith("http") ? path : `${BASE}${path}`);
  const lib = url.protocol === "https:" ? https : http;
  const headers = {
    Accept: "application/json,text/html,*/*",
    "User-Agent": "invistimo-boundary-gate/1.0",
  };
  if (BYPASS) {
    headers["x-vercel-protection-bypass"] = BYPASS;
    headers["x-vercel-set-bypass-cookie"] = "true";
  }
  const cookie = cookieHeaderFromJar(token);
  if (cookie) headers.Cookie = cookie;

  let payload;
  if (body !== undefined) {
    payload = Buffer.from(JSON.stringify(body));
    headers["Content-Type"] = "application/json";
    headers["Content-Length"] = String(payload.length);
  }

  return new Promise((resolve) => {
    const req = lib.request(url, { method, headers, timeout: 30000 }, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => {
        storeSetCookies(res.headers["set-cookie"] || []);
        const raw = Buffer.concat(chunks).toString("utf8");
        let json = null;
        try {
          json = JSON.parse(raw);
        } catch {
          /* ignore */
        }
        resolve({ status: res.statusCode || 0, json, raw: raw.slice(0, 2000) });
      });
    });
    req.on("error", (err) =>
      resolve({ status: 0, json: null, raw: "", error: String(err) })
    );
    if (payload) req.write(payload);
    req.end();
  });
}

function extractToken() {
  return cookieJar.get("authToken") || cookieJar.get("token") || null;
}

async function login(email) {
  for (const name of ["authToken", "token", "role", "hasPaid", "isTrial"]) {
    cookieJar.delete(name);
  }
  const res = await request("POST", "/api/login", {
    body: { email, password: PASSWORD },
  });
  const token = extractToken();
  return {
    ok: Boolean(res.json?.success) && Boolean(token),
    token,
    status: res.status,
    json: res.json,
  };
}

function run(cmd, args, env = {}) {
  return spawnSync(cmd, args, {
    encoding: "utf8",
    env: { ...process.env, STAGING_BASE_URL: BASE, ...env },
    timeout: 240000,
  });
}

function readJson(path) {
  try {
    return JSON.parse(fs.readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

async function main() {
  assertSafeBase(BASE);
  fs.mkdirSync("/opt/cursor/artifacts", { recursive: true });

  const report = {
    generatedAt: new Date().toISOString(),
    base: BASE,
    gates: {},
    details: {},
    recommendation: null,
    allPass: false,
  };

  // --- 1) False links dry-run ---
  const scan = run("npx", ["tsx", "scripts/staging/cleanup-false-venue-links.ts"]);
  const dryPath =
    "/opt/cursor/artifacts/false-venue-links-invistimo_staging-dry-run.json";
  const dry = readJson(dryPath);
  const falseLinks = dry?.totals?.falseLinks;
  report.details.falseLinkScan = dry?.totals || {
    stdoutTail: (scan.stdout || "").slice(-1500),
    status: scan.status,
  };
  report.gates.FALSE_VENUE_LINKS =
    falseLinks === 0 ? "PASS" : `FAIL(${falseLinks})`;

  // --- 2) Venues staging HTTP E2E ---
  const venuesE2e = run("node", ["scripts/staging/run-staging-venues-e2e.mjs"]);
  const venuesReport = readJson("/tmp/staging-e2e-report.json");
  const venuesPass =
    venuesE2e.status === 0 &&
    venuesReport?.summary?.VENUES_STAGING_E2E === "PASS";
  report.details.venuesE2e = {
    exitCode: venuesE2e.status,
    summary: venuesReport?.summary || null,
  };

  const venueChecks = Array.isArray(venuesReport?.checks)
    ? venuesReport.checks
    : [];
  const venueByName = Object.fromEntries(venueChecks.map((c) => [c.name, c]));
  const regularChecks = [
    "regular_host_login",
    "regular_host_events_list",
    "regular_host_has_staging_event",
    "regular_event_no_venueId_required",
    "regular_host_no_venues",
  ];
  const regularPassFromVenues = regularChecks.every(
    (n) => venueByName[n]?.pass
  );

  // --- 3) Full venue↔customer E2E (RSVP/seating/day-of) ---
  const fullE2e = run("node", ["scripts/staging/run-full-venue-browser-e2e.mjs"]);
  const fullReport = readJson("/tmp/full-venue-e2e-report.json");
  const fullPass =
    fullE2e.status === 0 && fullReport?.summary?.FULL_HTTP_E2E === "PASS";
  report.details.fullVenueE2e = {
    exitCode: fullE2e.status,
    summary: fullReport?.summary || null,
  };

  const fullChecks = Array.isArray(fullReport?.checks) ? fullReport.checks : [];
  const fullByName = Object.fromEntries(fullChecks.map((c) => [c.name, c]));
  const regularPassFromFull = [
    "regular_event_exists",
    "regular_event_no_venueId",
    "regular_guests_endpoint",
    "regular_seating_no_venue_source",
  ].every((n) => fullByName[n]?.pass);

  const venueCustomerPass = [
    "customerA_has_linked_event",
    "customerA_seating_from_venue_template",
    "customer_rsvp_update",
    "customer_arrival_update",
    "venue_sees_customer_guests",
  ].every((n) => fullByName[n]?.pass);

  report.gates.VENUE_FLOW =
    venuesPass && fullPass && venueCustomerPass ? "PASS" : "FAIL";
  report.gates.REGULAR_FLOW =
    regularPassFromVenues && regularPassFromFull ? "PASS" : "FAIL";

  report.details.regularEvidence = {
    venuesChecks: Object.fromEntries(
      regularChecks.map((n) => [n, Boolean(venueByName[n]?.pass)])
    ),
    fullChecks: {
      regular_event_exists: Boolean(fullByName.regular_event_exists?.pass),
      regular_event_no_venueId: Boolean(fullByName.regular_event_no_venueId?.pass),
      regular_guests_endpoint: Boolean(fullByName.regular_guests_endpoint?.pass),
      regular_seating_no_venue_source: Boolean(
        fullByName.regular_seating_no_venue_source?.pass
      ),
    },
  };
  report.details.venueCustomerEvidence = {
    customerA_has_linked_event: Boolean(
      fullByName.customerA_has_linked_event?.pass
    ),
    customer_rsvp_update: Boolean(fullByName.customer_rsvp_update?.pass),
    customer_arrival_update: Boolean(fullByName.customer_arrival_update?.pass),
    customerA_seating_from_venue_template: Boolean(
      fullByName.customerA_seating_from_venue_template?.pass
    ),
  };

  // --- 4) RBAC live smoke ---
  let rbacPass = true;
  const ownerLogin = await login(FIXTURES.owner);
  const regularLogin = await login(FIXTURES.regularHost);
  report.details.ownerLogin = {
    ok: ownerLogin.ok,
    status: ownerLogin.status,
  };
  report.details.regularLogin = {
    ok: regularLogin.ok,
    status: regularLogin.status,
  };

  if (!ownerLogin.ok || !regularLogin.ok) {
    rbacPass = false;
  } else {
    const ownerMenus = await request(
      "GET",
      `/api/venues/dashboard/halls/${encodeURIComponent(FIXTURES.hallId)}/menus`,
      { token: ownerLogin.token }
    );
    const ownerTasks = await request("GET", "/api/venues/dashboard/tasks", {
      token: ownerLogin.token,
    });
    const deniedMenus = await request(
      "GET",
      `/api/venues/dashboard/halls/${encodeURIComponent(FIXTURES.hallId)}/menus`,
      { token: regularLogin.token }
    );
    const deniedTasks = await request("GET", "/api/venues/dashboard/tasks", {
      token: regularLogin.token,
    });

    report.details.rbac = {
      ownerMenus: ownerMenus.status,
      ownerTasks: ownerTasks.status,
      regularMenus: deniedMenus.status,
      regularTasks: deniedTasks.status,
    };

    if (!(ownerMenus.status >= 200 && ownerMenus.status < 300)) rbacPass = false;
    if (!(ownerTasks.status >= 200 && ownerTasks.status < 300)) rbacPass = false;
    if (!(deniedMenus.status >= 400)) rbacPass = false;
    if (!(deniedTasks.status >= 400)) rbacPass = false;
  }
  report.gates.RBAC = rbacPass ? "PASS" : "FAIL";

  const allPass =
    report.gates.VENUE_FLOW === "PASS" &&
    report.gates.REGULAR_FLOW === "PASS" &&
    report.gates.FALSE_VENUE_LINKS === "PASS" &&
    report.gates.RBAC === "PASS";

  report.allPass = allPass;
  report.recommendation = allPass
    ? [
        "STAGING GATE = PASS",
        "VENUE FLOW = PASS",
        "REGULAR FLOW = PASS",
        "FALSE VENUE LINKS = 0",
        "RBAC = PASS",
        "",
        "Recommendation: After this PR is deployed to Staging and this gate is re-confirmed green,",
        "Venue Suite may be opened to real customers ONLY after:",
        "1) Production code deploy of this boundary fix",
        "2) Production READ-ONLY false-link audit (no bulk cleanup)",
        "3) Explicit product go-ahead",
        "",
        "Do NOT run Production data cleanup as part of opening the suite.",
      ].join("\n")
    : [
        "STAGING GATE = NOT PASS",
        `VENUE FLOW = ${report.gates.VENUE_FLOW}`,
        `REGULAR FLOW = ${report.gates.REGULAR_FLOW}`,
        `FALSE VENUE LINKS = ${report.gates.FALSE_VENUE_LINKS}`,
        `RBAC = ${report.gates.RBAC}`,
        "",
        "Recommendation: Do NOT open Venue Suite to real customers.",
        "Do NOT run Production cleanup.",
      ].join("\n");

  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
  fs.writeFileSync(
    MD_PATH,
    `# Staging Boundary Gate\n\nGenerated: ${report.generatedAt}\nBase: ${BASE}\n\n` +
      Object.entries(report.gates)
        .map(([k, v]) => `- **${k}**: ${v}`)
        .join("\n") +
      `\n\n## Recommendation\n\n${report.recommendation}\n`
  );

  console.log(
    JSON.stringify(
      {
        reportPath: REPORT_PATH,
        mdPath: MD_PATH,
        gates: report.gates,
        allPass,
        recommendation: report.recommendation,
      },
      null,
      2
    )
  );
  process.exit(allPass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
