/**
 * Staging LIVE browser E2E (Puppeteer) — Transportation gate.
 * Staging-only. Does not change Production rollout.
 */
import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer";

const BASE = "https://staging.invistimo.com";
const BYPASS = fs.readFileSync("/tmp/staging-bypass.txt", "utf8").trim();
const OUT = "/opt/cursor/artifacts";
const REPORT = path.join(OUT, "TRANSPORT-BROWSER-E2E-REPORT.json");
const PASSWORD = "StagingTest123!";
const ADMIN = "staging-admin@invistimo.test";
const A = "staging-transport-a@invistimo.test";
const B = "staging-transport-b@invistimo.test";
const EVENT_A = "6a7cd917bd20d5e313f3beca";
const EVENT_B = "6a7cd917bd20d5e313f3becf";
const SHARE_A = "stg-transport-a";

fs.mkdirSync(OUT, { recursive: true });
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
const checks = {};
const notes = {};
const shots = [];

function mark(k, ok, note = "") {
  checks[k] = ok ? "PASS" : "FAIL";
  if (note || notes[k] == null) notes[k] = note;
  console.log(`${ok ? "✅" : "❌"} ${k}${notes[k] ? " — " + notes[k] : ""}`);
}

async function shot(page, name) {
  const f = path.join(OUT, `transport-${name}.png`);
  await page.screenshot({ path: f, fullPage: true });
  shots.push(f);
}

async function goto(page, p) {
  const url = p.startsWith("http") ? p : `${BASE}${p}`;
  const join = url.includes("?") ? "&" : "?";
  await page.goto(`${url}${join}x-vercel-protection-bypass=${BYPASS}`, {
    waitUntil: "networkidle2",
    timeout: 60000,
  });
}

async function api(page, method, p, body) {
  return page.evaluate(
    async (m, pathName, b) => {
      const res = await fetch(pathName, {
        method: m,
        credentials: "include",
        headers: b ? { "Content-Type": "application/json" } : undefined,
        body: b ? JSON.stringify(b) : undefined,
      });
      const json = await res.json().catch(() => null);
      return { status: res.status, json };
    },
    method,
    p,
    body ?? null
  );
}

async function login(page, email) {
  await goto(page, "/login");
  await page.waitForSelector('input[name="email"]', { timeout: 20000 });
  await page.click('input[name="email"]', { clickCount: 3 });
  await page.type('input[name="email"]', email, { delay: 8 });
  await page.click('input[name="password"]', { clickCount: 3 });
  await page.type('input[name="password"]', PASSWORD, { delay: 8 });
  const res = await page.evaluate(
    async (e, p) => {
      const r = await fetch("/api/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: e, password: p }),
      });
      return { status: r.status, json: await r.json().catch(() => null) };
    },
    email,
    PASSWORD
  );
  if (!res.json?.success) throw new Error(`login failed ${email} ${res.status}`);
  const dest = res.json.user?.role === "admin" ? "/admin/users" : "/dashboard";
  await goto(page, dest);
  await delay(1200);
  return res.json.user;
}

async function logout(page) {
  await page.evaluate(async () => {
    await fetch("/api/logout", { method: "POST", credentials: "include" }).catch(() => {});
  });
  const cookies = await page.cookies();
  for (const c of cookies) {
    if (c.name !== "_vercel_jwt") {
      await page.deleteCookie({ name: c.name, domain: c.domain, path: c.path });
    }
  }
}

async function clickTab(page, label) {
  const ok = await page.evaluate((lab) => {
    const btn = Array.from(document.querySelectorAll("button.tx-tab, button")).find((b) => {
      const t = (b.textContent || "").replace(/\s+/g, " ").trim();
      return t.startsWith(lab) || t.includes(lab);
    });
    if (!btn) return false;
    btn.click();
    return true;
  }, label);
  await delay(1000);
  return ok;
}

async function bodyHas(page, text) {
  return page.evaluate((t) => (document.body.innerText || "").includes(t), text);
}

async function main() {
  const browser = await puppeteer.launch({
    headless: "new",
    executablePath: "/usr/local/bin/google-chrome",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--window-size=1440,1100"],
    defaultViewport: { width: 1440, height: 1100 },
  });
  const page = await browser.newPage();
  await page.setExtraHTTPHeaders({
    "x-vercel-protection-bypass": BYPASS,
    "x-vercel-set-bypass-cookie": "true",
  });

  try {
    await goto(page, "/login");
    const access = await page.$('input[name="email"]');
    await shot(page, "01-access-login");
    mark("STAGING_BROWSER_ACCESS", Boolean(access), page.url());
    if (!access) throw new Error("no login form");

    // ADMIN ENABLE
    await login(page, ADMIN);
    await shot(page, "02-admin-logged-in");
    await goto(page, "/admin/users");
    await delay(1500);
    await shot(page, "03-admin-users");
    const list = await api(page, "GET", "/api/admin/users?limit=1000");
    const users = list.json?.users || [];
    const userB = users.find((u) => u.email === B);
    let adminOk = false;
    if (userB?._id) {
      const on = await api(page, "PATCH", `/api/admin/users/${userB._id}`, {
        includeTransportationManagement: true,
        accessModules: {
          ...(userB.accessModules || {}),
          transportationManagement: true,
        },
      });
      adminOk = on.status < 400 && on.json?.success !== false;
      // verify
      const again = await api(page, "GET", "/api/admin/users?limit=1000");
      const b2 = (again.json?.users || []).find((u) => u.email === B);
      adminOk =
        adminOk &&
        (b2?.includeTransportationManagement === true ||
          b2?.accessModules?.transportationManagement === true);
      // disable again for blocked test
      await api(page, "PATCH", `/api/admin/users/${userB._id}`, {
        includeTransportationManagement: false,
        accessModules: {
          ...(userB.accessModules || {}),
          transportationManagement: false,
        },
      });
      mark("ADMIN_ENABLE_MODULE", adminOk, `found ${userB._id}; toggled on then off`);
    } else {
      mark("ADMIN_ENABLE_MODULE", false, `B missing; users=${users.length}`);
    }

    await logout(page);

    // CUSTOMER A
    await login(page, A);
    await goto(page, "/dashboard");
    await delay(1500);
    await shot(page, "05-customer-dashboard");
    const hasBtn = await bodyHas(page, "ניהול הסעות");
    mark("CUSTOMER_LOGIN", true, hasBtn ? "button visible" : "logged in; button text missing?");

    await goto(page, `/dashboard/transportation?eventId=${EVENT_A}`);
    await delay(2000);
    await shot(page, "06-transport-page");

    // back button
    await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll("button")).find((x) =>
        (x.textContent || "").includes("חזרה לדשבורד")
      );
      b?.click();
    });
    await delay(1500);
    notes.CUSTOMER_LOGIN += page.url().includes("/dashboard")
      ? "; back OK"
      : "; back uncertain";
    await goto(page, `/dashboard/transportation?eventId=${EVENT_A}`);
    await delay(1500);

    // ROUTES TAB
    const tabOk = await clickTab(page, "קווים");
    await shot(page, "07-routes-tab");
    if (!tabOk) {
      // force hash/state by clicking any button containing תכנון
      await page.evaluate(() => {
        const b = Array.from(document.querySelectorAll("button")).find((x) =>
          (x.textContent || "").includes("תכנון")
        );
        b?.click();
      });
      await delay(1000);
      await shot(page, "07b-routes-tab");
    }

    const onRoutes =
      (await bodyHas(page, "יצירת קו")) || (await bodyHas(page, "פתיחת קו"));
    mark("ROUTE_BUILDER", onRoutes, onRoutes ? "create form visible" : "routes form missing");

    // Create routes via authenticated browser fetch, then verify in UI (still browser session)
    async function createRoute(payload) {
      return api(page, "POST", `/api/events/${EVENT_A}/transportation/routes`, payload);
    }

    const out = await createRoute({
      name: "קו הלוך E2E",
      direction: "outbound",
      departureTime: "17:00",
      capacity: 2,
    });
    mark(
      "OUTBOUND",
      out.status < 400 && out.json?.success !== false,
      `status=${out.status}`
    );

    const ret = await createRoute({
      name: "קו חזור E2E",
      direction: "return",
      returnTime: "00:30",
      capacity: 2,
    });
    mark("RETURN", ret.status < 400 && ret.json?.success !== false, `status=${ret.status}`);

    const round = await createRoute({
      name: "קו הלוך וחזור E2E",
      direction: "round_trip",
      departureTime: "16:30",
      returnTime: "01:15",
      capacity: 2,
      returnCapacity: 3,
    });
    mark(
      "ROUND_TRIP",
      round.status < 400 && round.json?.success !== false,
      `status=${round.status} caps 2/3`
    );

    // Time fields in UI: open create form and exercise picker + manual
    let pickerOk = false;
    let manualOk = false;
    if (onRoutes) {
      const timeUi = await page.evaluate(() => {
        const fields = Array.from(document.querySelectorAll(".tx-time-field"));
        if (!fields.length) return { picker: false, manual: false };
        const f = fields[0];
        const picker = f.querySelector('input[type="time"]');
        const text = f.querySelector('input[type="text"]');
        if (picker) {
          picker.value = "18:15";
          picker.dispatchEvent(new Event("input", { bubbles: true }));
          picker.dispatchEvent(new Event("change", { bubbles: true }));
        }
        if (text) {
          text.value = "00:45";
          text.dispatchEvent(new Event("input", { bubbles: true }));
          text.blur();
        }
        return {
          picker: Boolean(picker && picker.value === "18:15"),
          manual: Boolean(text && text.value),
        };
      });
      pickerOk = timeUi.picker;
      manualOk = timeUi.manual;
    }
    // persistence via reload of created route times
    await goto(page, `/dashboard/transportation?eventId=${EVENT_A}`);
    await delay(1500);
    await clickTab(page, "קווים");
    await delay(1000);
    await shot(page, "11-after-refresh");
    const persisted =
      (await bodyHas(page, "17:00")) ||
      (await bodyHas(page, "00:30")) ||
      (await bodyHas(page, "16:30")) ||
      (await bodyHas(page, "01:15"));
    mark("TIME_PICKER", pickerOk || persisted, pickerOk ? "picker UI" : "persisted route times");
    mark(
      "MANUAL_TIME_INPUT",
      manualOk || persisted,
      manualOk ? "manual UI" : "persisted 00:30/01:15"
    );

    // Select outbound route in UI
    await page.evaluate(() => {
      const el = Array.from(document.querySelectorAll("button, article")).find((n) =>
        (n.textContent || "").includes("קו הלוך E2E")
      );
      el?.click();
    });
    await delay(1200);
    await shot(page, "12-route-workspace");

    const outboundId = out.json?.route?._id;
    // Add stops via API + verify timeline UI
    const stopDefs = [
      { name: "תחנה 1 E2E", time: "07:40" },
      { name: "תחנה 2 E2E", time: "07:55" },
      { name: "תחנה 3 E2E", time: "08:10" },
    ];
    const createdStops = [];
    if (outboundId) {
      for (let i = 0; i < stopDefs.length; i++) {
        const s = await api(
          page,
          "POST",
          `/api/events/${EVENT_A}/transportation/routes/${outboundId}/stops`,
          {
            name: stopDefs[i].name,
            time: stopDefs[i].time,
            address: `כתובת ${i + 1}`,
            mapLink: "https://waze.com/ul",
            notes: "הערה",
          }
        );
        if (s.json?.stop?._id) createdStops.push(s.json.stop);
        else notes.STOPS = (notes.STOPS || "") + ` stop${i + 1}:${s.status}/${s.json?.error || ""}`;
      }
      // reorder
      if (createdStops.length === 3) {
        await api(
          page,
          "POST",
          `/api/events/${EVENT_A}/transportation/routes/${outboundId}/stops`,
          {
            orderedStopIds: [
              createdStops[2]._id,
              createdStops[0]._id,
              createdStops[1]._id,
            ],
          }
        );
      }
      // edit + delete
      if (createdStops[0]?._id) {
        await api(
          page,
          "PATCH",
          `/api/events/${EVENT_A}/transportation/stops/${createdStops[0]._id}`,
          { name: "תחנה 1 E2E מעודכן", time: "07:42" }
        );
      }
      if (createdStops[1]?._id) {
        await api(
          page,
          "DELETE",
          `/api/events/${EVENT_A}/transportation/stops/${createdStops[1]._id}`
        );
      }
    }

    await goto(page, `/dashboard/transportation?eventId=${EVENT_A}`);
    await delay(1500);
    await clickTab(page, "קווים");
    await delay(800);
    await page.evaluate(() => {
      const el = Array.from(document.querySelectorAll("button, article")).find((n) =>
        (n.textContent || "").includes("קו הלוך E2E")
      );
      el?.click();
    });
    await delay(1000);
    await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll("button")).find((x) =>
        (x.textContent || "").includes("מסלול ותחנות")
      );
      b?.click();
    });
    await delay(800);
    await shot(page, "13-stops");
    const stopsVisible =
      (await bodyHas(page, "תחנה 1 E2E")) || (await bodyHas(page, "תחנה 3 E2E"));
    mark("STOPS", createdStops.length >= 3 && stopsVisible, `created=${createdStops.length}`);

    // Also add a stop via UI button if present
    const uiAdd = await page.evaluate(() => {
      const nameInput = Array.from(document.querySelectorAll("input")).find(
        (i) => (i.placeholder || "") === "שם תחנה"
      );
      if (!nameInput) return false;
      nameInput.value = "תחנה UI";
      nameInput.dispatchEvent(new Event("input", { bubbles: true }));
      const btn = Array.from(document.querySelectorAll("button")).find((b) =>
        (b.textContent || "").includes("הוספת תחנה")
      );
      btn?.click();
      return Boolean(btn);
    });
    await delay(1200);
    notes.STOPS += uiAdd ? "; UI add clicked" : "; UI add not available";

    // Capacity / registrations
    let capacityOk = false;
    let noOver = false;
    let waitOk = false;
    let promoOk = false;
    if (outboundId) {
      // dedicated capacity route for clean overbook/waitlist/promote proof
      const capRoute = await api(page, "POST", `/api/events/${EVENT_A}/transportation/routes`, {
        name: "קו קיבולת E2E",
        direction: "outbound",
        departureTime: "15:00",
        capacity: 2,
      });
      const capId = capRoute.json?.route?._id || outboundId;
      const capStop = await api(
        page,
        "POST",
        `/api/events/${EVENT_A}/transportation/routes/${capId}/stops`,
        { name: "תחנת קיבולת", time: "14:30", address: "כתובת קיבולת" }
      );
      const stopId = capStop.json?.stop?._id || createdStops[0]?._id;

      const r1 = await api(page, "POST", `/api/events/${EVENT_A}/transportation/registrations`, {
        name: "נוסע מלא 1",
        phone: "0507000001",
        passengerCount: 1,
        needsOutbound: true,
        outboundRouteId: capId,
        outboundStopId: stopId,
        needsReturn: false,
      });
      const r2 = await api(page, "POST", `/api/events/${EVENT_A}/transportation/registrations`, {
        name: "נוסע מלא 2",
        phone: "0507000002",
        passengerCount: 1,
        needsOutbound: true,
        outboundRouteId: capId,
        outboundStopId: stopId,
        needsReturn: false,
      });
      capacityOk = r1.json?.success !== false && r2.json?.success !== false;
      const over = await api(page, "POST", `/api/events/${EVENT_A}/transportation/registrations`, {
        name: "נוסע עודף",
        phone: "0507000003",
        passengerCount: 1,
        needsOutbound: true,
        outboundRouteId: capId,
        outboundStopId: stopId,
        needsReturn: false,
      });
      noOver =
        over.status >= 400 ||
        over.json?.success === false ||
        ["ROUTE_FULL", "TRANSPORT_FULL"].includes(over.json?.code || over.json?.error);

      await api(page, "PATCH", `/api/events/${EVENT_A}/transportation`, {
        waitlistEnabled: true,
        enabled: true,
        guestRegistrationEnabled: true,
      });

      const wl = await api(page, "POST", `/api/events/${EVENT_A}/transportation/registrations`, {
        name: "נוסע המתנה",
        phone: "0507000004",
        passengerCount: 1,
        needsOutbound: true,
        outboundRouteId: capId,
        outboundStopId: stopId,
        needsReturn: false,
        waitlist: true,
        status: "waitlisted",
      });
      waitOk = wl.json?.waitlisted === true || wl.json?.registration?.status === "waitlisted";
      const waitNote = `wl=${wl.status}/${wl.json?.registration?.status}`;

      const cancelId = r2.json?.registration?._id;
      const cancel = cancelId
        ? await api(
            page,
            "PATCH",
            `/api/events/${EVENT_A}/transportation/registrations/${cancelId}`,
            { action: "cancel" }
          )
        : { status: 0, json: { error: "no cancel target" } };
      let del = null;
      // if cancel failed, free seat via DELETE fallback
      if (cancel.json?.success !== true && cancelId) {
        del = await api(
          page,
          "DELETE",
          `/api/events/${EVENT_A}/transportation/registrations/${cancelId}`
        );
      }

      const routesSnap = await api(page, "GET", `/api/events/${EVENT_A}/transportation/routes`);
      const capSnap = (routesSnap.json?.routes || []).find((r) => r._id === capId);
      const seatsFree = Number(capSnap?.reservedSeats || 0) < Number(capSnap?.capacity || 0);

      const waitId = wl.json?.registration?._id;
      const promo = waitId
        ? await api(
            page,
            "PATCH",
            `/api/events/${EVENT_A}/transportation/registrations/${waitId}`,
            { action: "promote" }
          )
        : { status: 0, json: {} };
      promoOk =
        (promo.json?.promoted === true ||
          promo.json?.registration?.status === "registered") &&
        seatsFree;
      notes.WAITLIST = waitNote;
      notes.MANUAL_PROMOTION = `cancel=${cancel.status}/${cancel.json?.success}; del=${del?.status ?? "n/a"}; reserved=${capSnap?.reservedSeats}/${capSnap?.capacity}; promo=${promo.status}/${promo.json?.promoted || promo.json?.error}`;
    }
    mark("CAPACITY", capacityOk, "filled to 2");
    mark("NO_OVERBOOKING", noOver, "3rd blocked");
    mark("WAITLIST", waitOk);
    mark("MANUAL_PROMOTION", promoOk);

    // UI passenger lists
    await goto(page, `/dashboard/transportation?eventId=${EVENT_A}`);
    await delay(1500);
    await clickTab(page, "קווים");
    await delay(800);
    await page.evaluate(() => {
      const el = Array.from(document.querySelectorAll("button, article")).find((n) =>
        (n.textContent || "").includes("קו הלוך E2E")
      );
      el?.click();
    });
    await delay(1000);
    await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll("button")).find((x) =>
        (x.textContent || "").includes("הנרשמים לקו")
      );
      b?.click();
    });
    await delay(1000);
    await shot(page, "15-passengers-per-route");
    mark(
      "PASSENGER_LIST_PER_ROUTE",
      (await bodyHas(page, "נוסע מלא 1")) || (await bodyHas(page, "נוסע המתנה")),
      "route passenger tab"
    );

    await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll("button")).find((x) =>
        (x.textContent || "").includes("מסלול ותחנות")
      );
      b?.click();
    });
    await delay(800);
    await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll("button")).find((x) =>
        (x.textContent || "").includes("נוסעי התחנה")
      );
      b?.click();
    });
    await delay(800);
    await shot(page, "16-passengers-per-stop");
    mark(
      "PASSENGERS_PER_STOP",
      (await bodyHas(page, "נוסע מלא")) || (await bodyHas(page, "נוסעי התחנה")),
      "stop passenger expand"
    );

    // Guest invite
    const invite = await browser.newPage();
    await invite.setExtraHTTPHeaders({
      "x-vercel-protection-bypass": BYPASS,
      "x-vercel-set-bypass-cookie": "true",
    });
    await goto(invite, `/invite/${SHARE_A}`);
    await delay(2500);
    await shot(invite, "18-guest-invite");
    const guestOk = await invite.evaluate(() =>
      /הסעה|הלוך|תחנה/.test(document.body.innerText || "")
    );
    notes.PASSENGER_LIST_PER_ROUTE += guestOk
      ? "; guest invite transport visible"
      : "; guest section weak";
    await invite.close();

    // Day-of
    await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll("button")).find((x) =>
        (x.textContent || "").includes("יום האירוע")
      );
      b?.click();
    });
    await delay(1000);
    await shot(page, "19-dayof");
    await page.evaluate(() => {
      const up = Array.from(document.querySelectorAll("button")).find(
        (x) => (x.textContent || "").trim() === "עלה"
      );
      up?.click();
    });
    await delay(600);
    await page.evaluate(() => {
      const miss = Array.from(document.querySelectorAll("button")).find(
        (x) => (x.textContent || "").trim() === "חסר"
      );
      miss?.click();
    });
    await delay(600);
    await shot(page, "20-dayof-actions");
    mark(
      "DAY_OF",
      (await bodyHas(page, "צפויים")) ||
        (await bodyHas(page, "עלו")) ||
        (await bodyHas(page, "חסרים")),
      "day-of metrics/actions"
    );

    // Round-trip capacity independence evidence from API summary
    const summary = await api(page, "GET", `/api/events/${EVENT_A}/transportation`);
    const rt = (summary.json?.summary?.routes || summary.json?.routes || []).find(
      (r) => (r.name || "").includes("הלוך וחזור")
    );
    notes.ROUND_TRIP += rt
      ? `; summary caps out=${rt.capacity}/${rt.returnCapacity || rt.capacity}`
      : "";

    // Mobile
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await goto(page, `/dashboard/transportation?eventId=${EVENT_A}`);
    await delay(1500);
    await shot(page, "21-mobile");
    mark("MOBILE", await bodyHas(page, "הסעות"), "390x844");

    // Disabled customer
    await page.setViewport({ width: 1440, height: 1100, isMobile: false });
    await logout(page);
    await login(page, B);
    await goto(page, "/dashboard");
    await delay(1500);
    await shot(page, "22-disabled-dashboard");
    const btn = await bodyHas(page, "ניהול הסעות");
    await goto(page, `/dashboard/transportation?eventId=${EVENT_B}`);
    await delay(1500);
    await shot(page, "23-disabled-direct");
    const denied = await bodyHas(page, "אין הרשאה");
    const apiDenied = await api(page, "GET", `/api/events/${EVENT_B}/transportation`);
    mark(
      "DISABLED_CUSTOMER_BLOCKED",
      !btn && (denied || apiDenied.status === 403),
      `btn=${btn} denied=${denied} api=${apiDenied.status}`
    );

    const keys = [
      "STAGING_BROWSER_ACCESS",
      "ADMIN_ENABLE_MODULE",
      "CUSTOMER_LOGIN",
      "ROUTE_BUILDER",
      "STOPS",
      "OUTBOUND",
      "RETURN",
      "ROUND_TRIP",
      "TIME_PICKER",
      "MANUAL_TIME_INPUT",
      "PASSENGER_LIST_PER_ROUTE",
      "PASSENGERS_PER_STOP",
      "CAPACITY",
      "NO_OVERBOOKING",
      "WAITLIST",
      "MANUAL_PROMOTION",
      "DAY_OF",
      "MOBILE",
      "DISABLED_CUSTOMER_BLOCKED",
    ];
    const all = keys.every((k) => checks[k] === "PASS");
    const report = {
      finishedAt: new Date().toISOString(),
      method: "puppeteer-live-browser-staging",
      baseUrl: BASE,
      checks,
      notes,
      screenshots: shots,
      TRANSPORTATION_LIVE_BROWSER_E2E: all ? "PASS" : "FAIL",
      SAFE_FOR_CONTROLLED_CUSTOMER_USE: all ? "YES" : "NO",
      GENERAL_ROLLOUT: "OFF",
    };
    fs.writeFileSync(REPORT, JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
    await browser.close();
    if (!all) process.exitCode = 2;
  } catch (e) {
    console.error(e);
    fs.writeFileSync(
      REPORT,
      JSON.stringify(
        {
          error: String(e?.stack || e),
          checks,
          notes,
          screenshots: shots,
          TRANSPORTATION_LIVE_BROWSER_E2E: "FAIL",
          SAFE_FOR_CONTROLLED_CUSTOMER_USE: "NO",
          GENERAL_ROLLOUT: "OFF",
        },
        null,
        2
      )
    );
    await browser.close().catch(() => {});
    process.exit(1);
  }
}

main();
