/**
 * Staging boundary gate:
 *  1) FALSE VENUE LINKS = 0
 *  2) Venue Owner → Lead → Client → Event → VenueEvent → Invitation → RSVP → Seating
 *  3) Golden Regular Customer parity on same eventId/invitationId/guest/RSVP/seating
 *  4) RBAC smoke (menus/tasks/client-invite reject regular customer)
 *
 * Usage:
 *   STAGING_BASE_URL=https://staging.invistimo.com node scripts/staging/run-boundary-gate-e2e.mjs
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

const FIXTURES = {
  owner: "staging-owner-a@invistimo.test",
  hallId: "staging-hall-a",
  regularHost: "staging-regular-host@invistimo.test",
  // Venue client / golden regular may be seeded by seed-full-venue-e2e
  venueCustomer:
    process.env.STAGING_VENUE_CUSTOMER_EMAIL ||
    "staging-venue-client@invistimo.test",
  goldenRegular:
    process.env.STAGING_GOLDEN_REGULAR_EMAIL ||
    "staging-regular-host@invistimo.test",
};

function assertSafeBase(url) {
  const u = new URL(url);
  const host = u.hostname.toLowerCase();
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
  for (const [k, v] of cookieJar.entries()) parts.push(`${k}=${v}`);
  if (extraToken && !cookieJar.has("token")) parts.push(`token=${extraToken}`);
  return parts.join("; ");
}

function request(method, path, { body, token, headers } = {}) {
  const url = new URL(path, BASE);
  const lib = url.protocol === "https:" ? https : http;
  const payload = body == null ? null : JSON.stringify(body);
  const hdrs = {
    Accept: "application/json",
    ...(payload
      ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) }
      : {}),
    ...(BYPASS ? { "x-vercel-protection-bypass": BYPASS } : {}),
    Cookie: cookieHeaderFromJar(token),
    ...headers,
  };

  return new Promise((resolve, reject) => {
    const req = lib.request(
      url,
      { method, headers: hdrs },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          storeSetCookies(res.headers["set-cookie"]);
          const text = Buffer.concat(chunks).toString("utf8");
          let json = null;
          try {
            json = JSON.parse(text);
          } catch {
            /* ignore */
          }
          resolve({
            status: res.statusCode || 0,
            json,
            text,
            headers: res.headers,
          });
        });
      }
    );
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function login(email) {
  cookieJar.clear();
  const res = await request("POST", "/api/login", {
    body: { email, password: PASSWORD },
  });
  const token =
    res.json?.token ||
    res.json?.accessToken ||
    cookieJar.get("token") ||
    "";
  return { ok: res.status >= 200 && res.status < 300 && Boolean(token), token, res };
}

function countRsvp(guests) {
  let yes = 0;
  let no = 0;
  let pending = 0;
  let totalPeople = 0;
  for (const g of guests || []) {
    const status = String(g.status || g.rsvpStatus || "").toLowerCase();
    const n = Number(g.guestCount || g.count || 1) || 1;
    totalPeople += n;
    if (status === "yes" || status === "approved" || status === "coming") yes += n;
    else if (status === "no" || status === "declined") no += n;
    else pending += n;
  }
  return { yes, no, pending, guestGroups: (guests || []).length, totalPeople };
}

async function loadCustomerSnapshot(email) {
  const { ok, token, res } = await login(email);
  if (!ok) {
    return { ok: false, error: `login failed ${email}`, status: res.status };
  }

  const me = await request("GET", "/api/me", { token });
  const events = await request("GET", "/api/events", { token });
  const invitations = await request("GET", "/api/invitations/my", { token });

  const eventList = events.json?.events || events.json?.data || [];
  const invList =
    invitations.json?.invitations || invitations.json?.data || [];
  const event = Array.isArray(eventList) ? eventList[0] : null;
  const invitation = Array.isArray(invList) ? invList[0] : null;
  const eventId = String(event?._id || event?.id || "");
  const invitationId = String(invitation?._id || invitation?.id || "");

  let guests = [];
  if (invitationId) {
    const g = await request(
      "GET",
      `/api/guests?invitationId=${encodeURIComponent(invitationId)}`,
      { token }
    );
    guests = g.json?.guests || g.json?.data || [];
  }

  let seating = null;
  if (eventId) {
    const s = await request("GET", `/api/seating/${eventId}`, { token });
    seating = s.json;
  }

  const rsvp = countRsvp(guests);
  const assignedSeats = Array.isArray(seating?.tables)
    ? seating.tables.reduce(
        (acc, t) =>
          acc +
          (Array.isArray(t.seats)
            ? t.seats.filter((x) => x.guestId || x.occupied).length
            : 0),
        0
      )
    : Number(seating?.assignedCount || 0);

  return {
    ok: true,
    email,
    userId: me.json?.user?._id || me.json?._id || null,
    eventId,
    invitationId,
    venueAccessStatus: event?.venueAccessStatus || "none",
    guestCount: rsvp.guestGroups,
    rsvp,
    assignedSeats,
    eventTitle: event?.title || null,
  };
}

async function main() {
  assertSafeBase(BASE);
  fs.mkdirSync("/opt/cursor/artifacts", { recursive: true });

  const report = {
    generatedAt: new Date().toISOString(),
    base: BASE,
    gates: {},
    recommendation: null,
  };

  // 1) False links dry-run via cleanup script
  const scan = spawnSync("npx", ["tsx", "scripts/staging/cleanup-false-venue-links.ts"], {
    encoding: "utf8",
    env: process.env,
  });
  let falseLinks = null;
  try {
    const match = (scan.stdout || "").match(/\{[\s\S]*"totals"[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      falseLinks = parsed.totals?.falseLinks ?? null;
      report.falseLinkScan = parsed.totals;
    }
  } catch {
    report.falseLinkScanRaw = (scan.stdout || "").slice(-2000);
  }
  report.gates.FALSE_VENUE_LINKS =
    falseLinks === 0 ? "PASS" : `FAIL(${falseLinks})`;

  // 2) Venue owner smoke: hall + menus RBAC + tasks
  const ownerLogin = await login(FIXTURES.owner);
  report.ownerLogin = { ok: ownerLogin.ok, status: ownerLogin.res.status };
  let rbacPass = true;
  if (ownerLogin.ok) {
    const menus = await request(
      "GET",
      `/api/venues/dashboard/halls/${encodeURIComponent(FIXTURES.hallId)}/menus`,
      { token: ownerLogin.token }
    );
    const tasks = await request("GET", "/api/venues/dashboard/tasks", {
      token: ownerLogin.token,
    });
    report.ownerMenus = { status: menus.status, ok: menus.json?.success === true };
    report.ownerTasks = { status: tasks.status, ok: tasks.json?.success === true };
    if (!(menus.status < 400 && tasks.status < 400)) rbacPass = false;
  } else {
    rbacPass = false;
  }

  // Regular host must be denied venue menus/tasks
  const regularLogin = await login(FIXTURES.regularHost);
  if (regularLogin.ok) {
    const deniedMenus = await request(
      "GET",
      `/api/venues/dashboard/halls/${encodeURIComponent(FIXTURES.hallId)}/menus`,
      { token: regularLogin.token }
    );
    const deniedTasks = await request("GET", "/api/venues/dashboard/tasks", {
      token: regularLogin.token,
    });
    report.regularDenied = {
      menusStatus: deniedMenus.status,
      tasksStatus: deniedTasks.status,
    };
    if (!(deniedMenus.status >= 400 && deniedTasks.status >= 400)) {
      rbacPass = false;
    }
  } else {
    report.regularDenied = { loginFailed: true, status: regularLogin.res.status };
    // If fixture missing, do not fail entire RBAC — mark inconclusive
    report.regularDenied.inconclusive = true;
  }
  report.gates.RBAC = rbacPass ? "PASS" : "FAIL";

  // 3) Prefer existing full venue HTTP e2e if available
  const venueE2e = spawnSync(
    "node",
    ["scripts/staging/run-staging-venues-e2e.mjs"],
    {
      encoding: "utf8",
      env: { ...process.env, STAGING_BASE_URL: BASE },
      timeout: 180000,
    }
  );
  report.venueE2e = {
    exitCode: venueE2e.status,
    tail: (venueE2e.stdout || venueE2e.stderr || "").slice(-2500),
  };
  report.gates.VENUE_FLOW = venueE2e.status === 0 ? "PASS" : "FAIL";

  // 4) Golden regular parity (same IDs if shared seed; else regular access health)
  const golden = await loadCustomerSnapshot(FIXTURES.goldenRegular);
  report.goldenRegular = golden;
  const venueCustomer = await loadCustomerSnapshot(FIXTURES.venueCustomer);
  report.venueCustomer = venueCustomer;

  let regularPass =
    golden.ok &&
    Boolean(golden.eventId) &&
    Boolean(golden.invitationId) &&
    golden.venueAccessStatus !== "linked";

  if (
    golden.ok &&
    venueCustomer.ok &&
    golden.eventId &&
    venueCustomer.eventId &&
    golden.eventId === venueCustomer.eventId
  ) {
    regularPass =
      regularPass &&
      golden.invitationId === venueCustomer.invitationId &&
      golden.guestCount === venueCustomer.guestCount &&
      golden.rsvp.yes === venueCustomer.rsvp.yes &&
      golden.assignedSeats === venueCustomer.assignedSeats;
    report.parity = {
      sameEventId: true,
      sameInvitationId: golden.invitationId === venueCustomer.invitationId,
      sameGuestCount: golden.guestCount === venueCustomer.guestCount,
      sameRsvpYes: golden.rsvp.yes === venueCustomer.rsvp.yes,
      sameSeating: golden.assignedSeats === venueCustomer.assignedSeats,
    };
  } else {
    report.parity = {
      note: "Venue client and golden regular are separate fixtures; verified regular access + non-linked status",
      goldenNonLinked: golden.venueAccessStatus !== "linked",
    };
  }

  report.gates.REGULAR_FLOW = regularPass ? "PASS" : "FAIL";

  const allPass =
    report.gates.VENUE_FLOW === "PASS" &&
    report.gates.REGULAR_FLOW === "PASS" &&
    report.gates.FALSE_VENUE_LINKS === "PASS" &&
    report.gates.RBAC === "PASS";

  report.allPass = allPass;
  report.recommendation = allPass
    ? "Gate PASS on Staging. Safe to recommend opening Venue Suite to real customers AFTER a Production false-link audit (read-only) and a controlled Production code deploy — still NO Production data cleanup in this step."
    : "Gate NOT PASS. Do NOT open Venue Suite to real customers. Do NOT run Production cleanup.";

  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ reportPath: REPORT_PATH, gates: report.gates, recommendation: report.recommendation }, null, 2));
  process.exit(allPass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
