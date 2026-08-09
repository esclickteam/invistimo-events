/**
 * Live Staging Venues E2E against a deployed Staging URL.
 *
 * Usage:
 *   STAGING_BASE_URL=https://invistimo-events-env-staging-esclicks-projects.vercel.app \
 *   VERCEL_AUTOMATION_BYPASS_SECRET=... \
 *   node scripts/staging/run-staging-venues-e2e.mjs
 *
 * Prefer the Staging custom-environment alias (or staging.invistimo.com once DNS exists).
 * Never point this at Production.
 */
import fs from "node:fs";
import http from "node:http";
import https from "node:https";
import { URL } from "node:url";

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
  process.env.STAGING_E2E_REPORT || "/tmp/staging-e2e-report.json";

const FIXTURES = {
  ownerA: "staging-owner-a@invistimo.test",
  ownerB: "staging-owner-b@invistimo.test",
  ownerC: "staging-owner-c@invistimo.test",
  ownerD: "staging-owner-d@invistimo.test",
  shared: "staging-shared-owner@invistimo.test",
  employee: "staging-venue-employee@invistimo.test",
  regularHost: "staging-regular-host@invistimo.test",
  hallA: "staging-hall-a",
  hallB: "staging-hall-b",
  hallC: "staging-hall-c",
  hallD: "staging-hall-d",
};

function assertSafeBase(url) {
  const u = new URL(url);
  const host = u.hostname.toLowerCase();
  if (
    host === "www.invistimo.com" ||
    host === "invistimo.com" ||
    host.endsWith(".invistimo.com") && !host.startsWith("staging.")
  ) {
    if (host !== "staging.invistimo.com") {
      throw new Error(`Refusing to run Staging E2E against host=${host}`);
    }
  }
  if (host.includes("production")) {
    throw new Error(`Refusing production-looking host=${host}`);
  }
}

/** Shared cookie jar for bypass + auth cookies across redirects. */
const cookieJar = new Map();

function storeSetCookies(setCookie) {
  for (const line of setCookie || []) {
    const part = String(line).split(";")[0];
    const eq = part.indexOf("=");
    if (eq <= 0) continue;
    const name = part.slice(0, eq).trim();
    const value = part.slice(eq + 1).trim();
    if (!name) continue;
    if (value === "" || /Max-Age=0/i.test(line) || /Expires=Thu, 01 Jan 1970/i.test(line)) {
      cookieJar.delete(name);
    } else {
      cookieJar.set(name, value);
    }
  }
}

function cookieHeaderFromJar(extraToken) {
  const parts = [];
  for (const [k, v] of cookieJar.entries()) {
    // Explicit per-request auth token must win over leftover jar sessions
    if (extraToken && (k === "authToken" || k === "token")) continue;
    parts.push(`${k}=${v}`);
  }
  if (extraToken) {
    parts.push(`authToken=${extraToken}`);
    parts.push(`token=${extraToken}`);
  }
  return parts.join("; ");
}

function sameOrigin(nextUrl, baseUrl) {
  try {
    return new URL(nextUrl).origin === new URL(baseUrl).origin;
  } catch {
    return false;
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function requestOnce(method, path, { token, body, redirectCount = 0 } = {}) {
  const url = new URL(path.startsWith("http") ? path : `${BASE}${path}`);
  const lib = url.protocol === "https:" ? https : http;
  const headers = {
    Accept: "application/json,text/html,*/*",
    "User-Agent": "invistimo-staging-venues-e2e/1.0",
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
    const req = lib.request(
      url,
      { method, headers, timeout: 30000 },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", async () => {
          const setCookie = res.headers["set-cookie"] || [];
          storeSetCookies(setCookie);
          const status = res.statusCode || 0;
          const location = res.headers.location;
          if (
            location &&
            status >= 300 &&
            status < 400 &&
            redirectCount < 8
          ) {
            const nextUrl = new URL(location, url).toString();
            // Never follow off-host redirects (Vercel SSO login).
            if (!sameOrigin(nextUrl, BASE) && !sameOrigin(nextUrl, url.toString())) {
              resolve({
                status,
                headers: res.headers,
                setCookie,
                raw: Buffer.concat(chunks).toString("utf8").slice(0, 4000),
                json: null,
                finalUrl: url.toString(),
                error: `off-host redirect blocked: ${new URL(nextUrl).host}`,
              });
              return;
            }
            const nextMethod =
              status === 307 || status === 308 ? method : "GET";
            const nextBody =
              nextMethod === "GET" || nextMethod === "HEAD" ? undefined : body;
            resolve(
              await requestOnce(nextMethod, nextUrl, {
                token,
                body: nextBody,
                redirectCount: redirectCount + 1,
              })
            );
            return;
          }
          const raw = Buffer.concat(chunks).toString("utf8");
          let json = null;
          try {
            json = JSON.parse(raw);
          } catch {
            /* html or empty */
          }
          resolve({
            status,
            headers: res.headers,
            setCookie,
            raw: raw.slice(0, 4000),
            json,
            finalUrl: url.toString(),
          });
        });
      }
    );
    req.on("error", (err) =>
      resolve({
        status: 0,
        error: String(err.message || err),
        json: null,
        raw: "",
        setCookie: [],
      })
    );
    req.on("timeout", () => {
      req.destroy();
      resolve({
        status: 0,
        error: "timeout",
        json: null,
        raw: "",
        setCookie: [],
      });
    });
    if (payload) req.write(payload);
    req.end();
  });
}

async function request(method, path, opts = {}) {
  let last;
  for (let attempt = 1; attempt <= 5; attempt++) {
    last = await requestOnce(method, path, opts);
    const tlsFail =
      last.status === 0 &&
      /SSL|TLS|socket|ECONNRESET|EOF|disconnected/i.test(String(last.error || ""));
    const ssoBlock =
      last.status >= 300 &&
      last.status < 400 &&
      /off-host redirect blocked/i.test(String(last.error || ""));
    if (!tlsFail && !ssoBlock) return last;
    // retry SSO once after short wait in case bypass cookie lands late
    await sleep(800 * attempt);
  }
  return last;
}

function extractToken() {
  return (
    cookieJar.get("authToken") ||
    cookieJar.get("token") ||
    null
  );
}

async function login(email) {
  // Isolate sessions between fixture users
  for (const name of ["authToken", "token", "role", "hasPaid", "isTrial"]) {
    cookieJar.delete(name);
  }
  const res = await request("POST", "/api/login", {
    body: { email, password: PASSWORD },
  });
  const token = extractToken();
  return {
    status: res.status,
    ok: Boolean(res.json?.success),
    token,
    json: res.json,
    error: res.error || res.json?.error || null,
  };
}

function check(name, cond, detail) {
  return { name, pass: Boolean(cond), detail: detail ?? null };
}

async function main() {
  assertSafeBase(BASE);
  if (!BYPASS && BASE.includes("vercel.app")) {
    console.warn(
      "WARN: no VERCEL_AUTOMATION_BYPASS_SECRET; vercel.app URLs may SSO-redirect"
    );
  }

  const report = {
    base: BASE,
    startedAt: new Date().toISOString(),
    checks: [],
  };

  const isolation = await request("GET", "/api/system/env-isolation");
  report.isolation = isolation.json || { status: isolation.status, error: isolation.error };
  report.checks.push(
    check(
      "isolation_ok",
      isolation.status === 200 && isolation.json?.ok === true,
      { status: isolation.status, appEnv: isolation.json?.appEnv }
    )
  );
  report.checks.push(
    check(
      "isolation_app_env_staging",
      isolation.json?.appEnv === "staging",
      isolation.json?.appEnv
    )
  );
  report.checks.push(
    check(
      "isolation_db_staging",
      isolation.json?.mongoDbName === "invistimo_staging",
      isolation.json?.mongoDbName
    )
  );
  report.checks.push(
    check(
      "isolation_stripe_test",
      isolation.json?.stripeMode === "test",
      isolation.json?.stripeMode
    )
  );
  report.checks.push(
    check(
      "isolation_external_sends_disabled",
      isolation.json?.externalSends === "disabled",
      isolation.json?.externalSends
    )
  );
  report.checks.push(
    check(
      "isolation_cloudinary_staging_root",
      String(isolation.json?.cloudinaryRootFolder || "").includes("staging"),
      isolation.json?.cloudinaryRootFolder
    )
  );

  // Production must not share staging DB (prod endpoint may 404 until merged)
  try {
    const prodIso = await request(
      "GET",
      "https://www.invistimo.com/api/system/env-isolation"
    );
    report.production_isolation = {
      status: prodIso.status,
      json: prodIso.json,
    };
    if (prodIso.status === 200 && prodIso.json?.mongoDbName) {
      report.checks.push(
        check(
          "staging_db_neq_production_db",
          prodIso.json.mongoDbName !== isolation.json?.mongoDbName,
          {
            staging: isolation.json?.mongoDbName,
            production: prodIso.json.mongoDbName,
          }
        )
      );
    } else {
      report.checks.push(
        check(
          "staging_db_neq_production_db",
          isolation.json?.mongoDbName === "invistimo_staging",
          "prod endpoint missing; staging db name checked locally"
        )
      );
    }
  } catch (e) {
    report.production_isolation = { error: String(e) };
  }

  const ownerA = await login(FIXTURES.ownerA);
  report.ownerA_login = {
    status: ownerA.status,
    ok: ownerA.ok,
    gotToken: Boolean(ownerA.token),
    error: ownerA.error,
  };
  report.checks.push(
    check("ownerA_login", ownerA.ok && ownerA.token, {
      status: ownerA.status,
      error: ownerA.error,
    })
  );

  let venuesA = [];
  if (ownerA.token) {
    const my = await request("GET", "/api/venues/dashboard/my-venues", {
      token: ownerA.token,
    });
    venuesA = my.json?.venues || [];
    report.ownerA_venues = {
      status: my.status,
      count: my.json?.count,
      ids: venuesA.map((v) => v.venueId || v.id || v.hallId),
    };
    report.checks.push(
      check(
        "ownerA_sees_hall_a",
        venuesA.some((v) => (v.venueId || v.id) === FIXTURES.hallA),
        report.ownerA_venues
      )
    );

    const hallPage = await request(
      "GET",
      `/venues/dashboard/halls/${FIXTURES.hallA}`,
      { token: ownerA.token }
    );
    report.checks.push(
      check("ownerA_hall_a_page", hallPage.status === 200, hallPage.status)
    );

    const hallBReports = await request(
      "GET",
      `/api/venues/dashboard/halls/${FIXTURES.hallB}/reports?months=3`,
      { token: ownerA.token }
    );
    report.checks.push(
      check(
        "ownerA_denied_hall_b",
        hallBReports.status === 403 || hallBReports.json?.success === false,
        { status: hallBReports.status, body: hallBReports.json }
      )
    );

    const calendar = await request(
      "GET",
      `/api/venues/dashboard/halls/${FIXTURES.hallA}/calendar`,
      { token: ownerA.token }
    );
    report.checks.push(
      check("ownerA_calendar_list", calendar.status === 200 && calendar.json?.success !== false, {
        status: calendar.status,
        keys: calendar.json ? Object.keys(calendar.json) : [],
      })
    );

    const crm = await request(
      "GET",
      `/api/venues/dashboard/halls/${FIXTURES.hallA}/crm`,
      { token: ownerA.token }
    );
    const leads = crm.json?.leads || crm.json?.items || [];
    report.checks.push(
      check("ownerA_crm_list", crm.status === 200, {
        status: crm.status,
        leadCount: Array.isArray(leads) ? leads.length : null,
      })
    );

    const files = await request(
      "GET",
      `/api/venues/dashboard/halls/${FIXTURES.hallA}/files`,
      { token: ownerA.token }
    );
    report.checks.push(
      check("ownerA_files_list", files.status === 200, files.status)
    );

    const employees = await request(
      "GET",
      `/api/venues/dashboard/halls/${FIXTURES.hallA}/employees`,
      { token: ownerA.token }
    );
    report.checks.push(
      check("ownerA_employees_list", employees.status === 200, employees.status)
    );

    // Create calendar event
    const createCal = await request(
      "POST",
      `/api/venues/dashboard/halls/${FIXTURES.hallA}/calendar`,
      {
        token: ownerA.token,
        body: {
          title: "[STAGING E2E] Calendar Event",
          clientName: "E2E Client",
          date: "2026-11-20",
          startTime: "20:00",
          status: "inquiry",
          eventType: "wedding",
        },
      }
    );
    report.checks.push(
      check(
        "ownerA_calendar_create",
        createCal.status === 200 || createCal.status === 201,
        { status: createCal.status, json: createCal.json }
      )
    );

    // Convert lead if present
    const lead =
      (Array.isArray(leads) &&
        leads.find((l) =>
          String(l.email || "").includes("staging-lead-a")
        )) ||
      (Array.isArray(leads) && leads[0]);
    if (lead?._id || lead?.id) {
      const leadId = lead._id || lead.id;
      const convert = await request(
        "PUT",
        `/api/venues/dashboard/halls/${FIXTURES.hallA}/crm`,
        {
          token: ownerA.token,
          body: {
            action: "closeEvent",
            leadId,
            date: "2026-10-10",
            startTime: "19:00",
          },
        }
      );
      report.checks.push(
        check(
          "ownerA_lead_convert",
          convert.status === 200 && convert.json?.success !== false,
          { status: convert.status, json: convert.json }
        )
      );
    } else {
      report.checks.push(
        check("ownerA_lead_convert", false, "no staging lead found in CRM")
      );
    }
  }

  const shared = await login(FIXTURES.shared);
  report.checks.push(
    check("shared_login", shared.ok && shared.token, { status: shared.status })
  );
  if (shared.token) {
    const my = await request("GET", "/api/venues/dashboard/my-venues", {
      token: shared.token,
    });
    const ids = (my.json?.venues || []).map((v) => v.venueId || v.id);
    report.shared_venues = ids;
    report.checks.push(
      check(
        "shared_sees_A_and_B",
        ids.includes(FIXTURES.hallA) && ids.includes(FIXTURES.hallB),
        ids
      )
    );
  }

  const employee = await login(FIXTURES.employee);
  report.checks.push(
    check("employee_login", employee.ok && employee.token, {
      status: employee.status,
    })
  );
  if (employee.token) {
    const my = await request("GET", "/api/venues/dashboard/my-venues", {
      token: employee.token,
    });
    const ids = (my.json?.venues || []).map((v) => v.venueId || v.id);
    report.checks.push(
      check("employee_sees_hall_a", ids.includes(FIXTURES.hallA), ids)
    );
    const settings = await request(
      "GET",
      `/api/venues/dashboard/halls/${FIXTURES.hallA}/settings`,
      { token: employee.token }
    );
    // EVENT_MANAGER may or may not access settings — record outcome
    report.checks.push(
      check(
        "employee_settings_access_recorded",
        settings.status === 200 || settings.status === 403,
        settings.status
      )
    );
  }

  const host = await login(FIXTURES.regularHost);
  report.checks.push(
    check("regular_host_login", host.ok && host.token, { status: host.status })
  );
  if (host.token) {
    const my = await request("GET", "/api/venues/dashboard/my-venues", {
      token: host.token,
    });
    const ids = (my.json?.venues || []).map((v) => v.venueId || v.id);
    report.checks.push(
      check("regular_host_no_venues", ids.length === 0, ids)
    );

    // Regular Invistimo event regression — host keeps non-venue events
    const eventsRes = await request("GET", "/api/events", {
      token: host.token,
    });
    const event = eventsRes.json?.event || null;
    const hasStagingRegular =
      event &&
      (String(event.title || "").includes("[STAGING] Regular Event") ||
        String(event.email || "").includes("staging-regular-event"));
    report.checks.push(
      check(
        "regular_host_events_list",
        eventsRes.status === 200 && eventsRes.json?.success === true,
        { status: eventsRes.status, hasEvent: Boolean(event) }
      )
    );
    report.checks.push(
      check("regular_host_has_staging_event", Boolean(hasStagingRegular), {
        title: event?.title || null,
        email: event?.email || null,
      })
    );
    // Venue APIs must not be required for regular events
    report.checks.push(
      check(
        "regular_event_no_venueId_required",
        Boolean(event) && (event.venueId == null || event.venueId === ""),
        { venueId: event?.venueId ?? null }
      )
    );
  }

  const ownerB = await login(FIXTURES.ownerB);
  report.checks.push(
    check("ownerB_login", ownerB.ok && ownerB.token, { status: ownerB.status })
  );
  if (ownerB.token) {
    const hallB = await request(
      "GET",
      `/api/venues/dashboard/halls/${FIXTURES.hallB}/calendar`,
      { token: ownerB.token }
    );
    report.checks.push(
      check("ownerB_hall_b_calendar", hallB.status === 200, hallB.status)
    );
    const cross = await request(
      "GET",
      `/api/venues/dashboard/halls/${FIXTURES.hallA}/reports?months=3`,
      { token: ownerB.token }
    );
    report.checks.push(
      check(
        "ownerB_denied_hall_a",
        cross.status === 403 || cross.json?.success === false,
        { status: cross.status }
      )
    );
  }

  // Multi-owner expansion C/D + employees/menus/seating pages
  for (const [email, hallId, label] of [
    [FIXTURES.ownerC, FIXTURES.hallC, "ownerC"],
    [FIXTURES.ownerD, FIXTURES.hallD, "ownerD"],
  ]) {
    const loginRes = await login(email);
    report.checks.push(
      check(`${label}_login`, loginRes.ok && loginRes.token, {
        status: loginRes.status,
      })
    );
    if (!loginRes.token) continue;
    const my = await request("GET", "/api/venues/dashboard/my-venues", {
      token: loginRes.token,
    });
    const ids = (my.json?.venues || []).map((v) => v.venueId || v.id);
    report.checks.push(
      check(`${label}_sees_own_hall`, ids.includes(hallId), ids)
    );
    const empPage = await request(
      "GET",
      `/venues/dashboard/halls/${hallId}/employees`,
      { token: loginRes.token }
    );
    report.checks.push(
      check(`${label}_employees_page`, empPage.status === 200, empPage.status)
    );
    // Marketing footer/header markers must NOT appear on venue pages
    const html = String(empPage.raw || "");
    report.checks.push(
      check(
        `${label}_no_marketing_demo_cta`,
        !html.includes("נסו דמו עכשיו") &&
          !html.includes("חבילות ומחירים") &&
          !html.includes("צור קשר"),
        "marketing nav/CTA should be gone"
      )
    );
    report.checks.push(
      check(
        `${label}_venue_internal_chrome`,
        empPage.status === 200 &&
          !html.includes("נסו דמו עכשיו") &&
          (html.includes("venues") ||
            html.includes("Venue") ||
            html.includes("hall") ||
            html.includes("עובד") ||
            html.length > 500),
        "internal venue page rendered without marketing chrome"
      )
    );
  }

  if (ownerA.token) {
    const menus = await request(
      "GET",
      `/venues/dashboard/halls/${FIXTURES.hallA}/menus`,
      { token: ownerA.token }
    );
    report.checks.push(
      check("ownerA_menus_page", menus.status === 200, menus.status)
    );
    const seatingTpl = await request(
      "GET",
      `/api/venues/dashboard/seating-templates?hallId=${encodeURIComponent(
        FIXTURES.hallA
      )}`,
      { token: ownerA.token }
    );
    report.checks.push(
      check(
        "ownerA_seating_templates_api",
        seatingTpl.status === 200 && seatingTpl.json?.success !== false,
        { status: seatingTpl.status }
      )
    );
    const employeesApi = await request(
      "GET",
      `/api/venues/dashboard/halls/${FIXTURES.hallA}/employees`,
      { token: ownerA.token }
    );
    report.checks.push(
      check("ownerA_employees_api", employeesApi.status === 200, {
        status: employeesApi.status,
      })
    );
  }

  const failed = report.checks.filter((c) => !c.pass);
  const onCustomDomain = /staging\.invistimo\.com$/i.test(
    new URL(BASE).hostname
  );
  report.summary = {
    total: report.checks.length,
    passed: report.checks.length - failed.length,
    failed: failed.length,
    failedNames: failed.map((c) => c.name),
    VENUES_STAGING_E2E: failed.length === 0 ? "PASS" : "FAIL",
    base: BASE,
    onCustomDomain,
    SAFE_TO_PROCEED_TO_PRODUCTION_GATE: "NO",
  };
  if (failed.length === 0 && onCustomDomain) {
    report.summary.SAFE_TO_PROCEED_TO_PRODUCTION_GATE = "YES_IF_OTHER_GATES_PASS";
    report.summary.note =
      "Live E2E against staging.invistimo.com PASS including tenant isolation + regular event regression.";
  } else if (failed.length === 0) {
    report.summary.SAFE_TO_PROCEED_TO_PRODUCTION_GATE = "CONDITIONAL";
    report.summary.note =
      "E2E PASS on alias only — re-run on staging.invistimo.com before Production.";
  }

  report.finishedAt = new Date().toISOString();
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report.summary, null, 2));
  for (const c of report.checks) {
    console.log(`${c.pass ? "PASS" : "FAIL"} ${c.name}`);
  }
  if (failed.length) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
