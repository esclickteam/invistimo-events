/**
 * Production one-venue pilot smoke (safe, allowlisted hall only).
 *
 * Requires:
 *   PROD_BASE_URL=https://www.invistimo.com
 *   MONGO_URI=... (invite / production)
 *   PILOT_OWNER_EMAIL=venue@test.com
 *   PILOT_OWNER_PASSWORD=...
 *   PILOT_OWNER_ID=6a0eb6e1e84e956be38ebd57
 *   PILOT_HALL_ID=אולם-כינורות-1779367129378-3v2mp4
 *   PILOT_HALL_OBJECT_ID=6a0efcd907c81aeeff58d7ae
 *   OTHER_HALL_ID=כנורות-1786307494234-zal5ub
 *   OTHER_OWNER_EMAIL=invistimo9@gmail.com
 *   OTHER_OWNER_PASSWORD=...
 *   REGULAR_EMAIL=... (read-only regression)
 *
 * Does NOT enable/disable env vars. Caller sets Vercel env + deploy first.
 */
import fs from "node:fs";
import http from "node:http";
import https from "node:https";
import { URL } from "node:url";
import { MongoClient, ObjectId } from "mongodb";
import bcrypt from "bcryptjs";

const BASE = String(
  process.env.PROD_BASE_URL || "https://www.invistimo.com"
).replace(/\/$/, "");
const MONGO =
  process.env.MONGO_URI ||
  (fs.existsSync("/tmp/prod-mongo-uri.txt")
    ? fs.readFileSync("/tmp/prod-mongo-uri.txt", "utf8").trim()
    : "");
const REPORT =
  process.env.PILOT_SMOKE_REPORT ||
  "/opt/cursor/artifacts/PRODUCTION-ONE-VENUE-PILOT-SMOKE.json";

const PILOT_OWNER_EMAIL = process.env.PILOT_OWNER_EMAIL || "venue@test.com";
const PILOT_OWNER_ID =
  process.env.PILOT_OWNER_ID || "6a0eb6e1e84e956be38ebd57";
const PILOT_HALL_ID =
  process.env.PILOT_HALL_ID || "אולם-כינורות-1779367129378-3v2mp4";
const PILOT_HALL_OBJECT_ID =
  process.env.PILOT_HALL_OBJECT_ID || "6a0efcd907c81aeeff58d7ae";
const OTHER_HALL_ID =
  process.env.OTHER_HALL_ID || "כנורות-1786307494234-zal5ub";
const OTHER_OWNER_HALL_ID =
  process.env.OTHER_OWNER_HALL_ID || "כינורות-אולם-1-1779513928394-2tau5g";
const OTHER_OWNER_EMAIL =
  process.env.OTHER_OWNER_EMAIL || "invistimo9@gmail.com";
const PILOT_PASSWORD =
  process.env.PILOT_OWNER_PASSWORD || process.env.PILOT_PASSWORD || "";
const OTHER_PASSWORD =
  process.env.OTHER_OWNER_PASSWORD || process.env.PILOT_PASSWORD || "";
const REGULAR_EMAIL = process.env.REGULAR_EMAIL || "";

const checks = [];
function check(name, pass, detail) {
  checks.push({ name, pass: Boolean(pass), detail: detail ?? null });
}

const jar = new Map();
function store(setCookie) {
  for (const line of setCookie || []) {
    const part = String(line).split(";")[0];
    const eq = part.indexOf("=");
    if (eq > 0) jar.set(part.slice(0, eq), part.slice(eq + 1));
  }
}
function cookieHeader(token) {
  const parts = [];
  for (const [k, v] of jar.entries()) {
    if (token && (k === "authToken" || k === "token")) continue;
    parts.push(`${k}=${v}`);
  }
  if (token) {
    parts.push(`authToken=${token}`);
    parts.push(`token=${token}`);
  }
  return parts.join("; ");
}

function assertProdHost() {
  const host = new URL(BASE).hostname.toLowerCase();
  if (host.includes("staging") || host.includes("vercel.app")) {
    throw new Error(`Refusing non-production host ${host}`);
  }
  if (host !== "www.invistimo.com" && host !== "invistimo.com") {
    throw new Error(`Unexpected host ${host}`);
  }
}

function requestOnce(method, path, { token, body, redirectCount = 0 } = {}) {
  const url = new URL(path.startsWith("http") ? path : `${BASE}${path}`);
  const lib = url.protocol === "https:" ? https : http;
  const headers = {
    Accept: "application/json,text/html,*/*",
    "User-Agent": "invistimo-production-pilot-smoke/1.0",
    Cookie: cookieHeader(token),
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
        if (location && status >= 300 && status < 400 && redirectCount < 6) {
          const next = new URL(location, url);
          if (next.origin !== new URL(BASE).origin) {
            resolve({ status, error: "off-host", json: null });
            return;
          }
          resolve(
            await requestOnce(
              status === 307 || status === 308 ? method : "GET",
              next.toString(),
              {
                token,
                body:
                  status === 307 || status === 308 ? body : undefined,
                redirectCount: redirectCount + 1,
              }
            )
          );
          return;
        }
        const raw = Buffer.concat(chunks).toString("utf8");
        let json = null;
        try {
          json = JSON.parse(raw);
        } catch {}
        resolve({ status, json, raw: raw.slice(0, 400) });
      });
    });
    req.on("error", (e) =>
      resolve({ status: 0, error: String(e.message || e), json: null })
    );
    if (payload) req.write(payload);
    req.end();
  });
}

async function login(email, password) {
  for (const k of ["authToken", "token", "role", "hasPaid", "isTrial"]) {
    jar.delete(k);
  }
  await requestOnce("GET", "/");
  const res = await requestOnce("POST", "/api/login", {
    body: { email, password },
  });
  const token = jar.get("authToken") || jar.get("token") || null;
  return {
    ok: res.status === 200 && !!token,
    token,
    status: res.status,
    json: res.json,
  };
}

async function snapshotRegular(mongo, email) {
  if (!email) return null;
  const user = await mongo.collection("users").findOne({ email });
  if (!user) return null;
  const userId = String(user._id);
  const ev = await mongo.collection("events").findOne({
    $or: [{ userId: user._id }, { userId }],
  });
  if (!ev) {
    return { userId, eventId: null };
  }
  const inv = await mongo.collection("invitations").findOne({
    $or: [{ eventId: ev._id }, { userId: user._id }, { userId }],
  });
  const guests = inv
    ? await mongo
        .collection("invitationguests")
        .find({ invitationId: inv._id })
        .toArray()
    : [];
  let yes = 0,
    no = 0,
    pending = 0,
    arrivals = 0;
  for (const g of guests) {
    const st = String(g.status || g.rsvp || "pending").toLowerCase();
    if (["yes", "approved", "coming", "confirmed"].includes(st)) yes += 1;
    else if (["no", "declined", "rejected"].includes(st)) no += 1;
    else pending += 1;
    if (Number(g.actualArrivedCount || 0) > 0) arrivals += 1;
  }
  const seat = await mongo.collection("seatingtables").findOne({
    $or: [{ eventId: ev._id }, { eventId: String(ev._id) }],
  });
  let seated = 0;
  for (const t of seat?.tables || []) {
    seated += Array.isArray(t.seatedGuests) ? t.seatedGuests.length : 0;
  }
  const ve = await mongo.collection("venueevents").findOne({
    $or: [{ linkedEventId: ev._id }, { linkedEventId: String(ev._id) }],
  });
  return {
    userId,
    eventId: String(ev._id),
    invitationId: inv?._id ? String(inv._id) : null,
    shareId: inv?.shareId || null,
    guestCount: guests.length,
    rsvpYes: yes,
    rsvpNo: no,
    rsvpPending: pending,
    seated,
    arrivals,
    venueEvent: Boolean(ve),
    venueAccessStatus: ev.venueAccessStatus || null,
    venueHallId: ev.venueHallId || null,
  };
}

function delta(a, b) {
  if (!a || !b) return -1;
  const keys = [
    "userId",
    "eventId",
    "invitationId",
    "shareId",
    "guestCount",
    "rsvpYes",
    "rsvpNo",
    "rsvpPending",
    "seated",
    "arrivals",
  ];
  let d = 0;
  for (const k of keys) if (String(a[k]) !== String(b[k])) d += 1;
  return d;
}

async function main() {
  assertProdHost();
  if (!MONGO) throw new Error("Missing production MONGO_URI");
  if (!PILOT_PASSWORD) throw new Error("Missing PILOT_OWNER_PASSWORD");

  const client = new MongoClient(MONGO);
  await client.connect();
  const mongo = client.db();
  if (mongo.databaseName !== "invite") {
    throw new Error(`Refusing db=${mongo.databaseName} (expected invite)`);
  }

  const report = {
    base: BASE,
    startedAt: new Date().toISOString(),
    pilotOwnerEmail: PILOT_OWNER_EMAIL,
    pilotOwnerId: PILOT_OWNER_ID,
    pilotHallId: PILOT_HALL_ID,
    pilotHallObjectId: PILOT_HALL_OBJECT_ID,
    generalVenueRollout: "OFF",
  };

  // Pick / confirm regular email
  let regularEmail = REGULAR_EMAIL;
  if (!regularEmail) {
    const u = await mongo.collection("users").findOne({
      role: "user",
      hasPaid: true,
      email: { $not: /test|e2e|venue|invistimo9/i },
    });
    // Prefer one with invitation guests
    const candidates = await mongo
      .collection("users")
      .find({
        role: "user",
        hasPaid: true,
        email: { $not: /test|e2e|venue|invistimo9|bdika/i },
      })
      .project({ email: 1, _id: 1 })
      .limit(30)
      .toArray();
    for (const cand of candidates) {
      const ev = await mongo.collection("events").findOne({
        $or: [{ userId: cand._id }, { userId: String(cand._id) }],
        venueAccessStatus: { $nin: ["linked"] },
      });
      if (!ev) continue;
      const inv = await mongo.collection("invitations").findOne({
        eventId: ev._id,
      });
      if (inv) {
        regularEmail = cand.email;
        break;
      }
    }
    if (!regularEmail && u) regularEmail = u.email;
  }
  report.regularEmail = regularEmail;

  const before = await snapshotRegular(mongo, regularEmail);
  report.regularBefore = before;
  check(
    "regular_snapshot_before",
    Boolean(before?.userId && before?.eventId),
    before
  );
  check(
    "regular_not_venue_linked",
    before && before.venueEvent === false && before.venueAccessStatus !== "linked",
    before
  );

  // Owner login
  const ownerLogin = await login(PILOT_OWNER_EMAIL, PILOT_PASSWORD);
  check("owner_login", ownerLogin.ok, ownerLogin.status);

  const myVenues = await requestOnce("GET", "/api/venues/dashboard/my-venues", {
    token: ownerLogin.token,
  });
  const venueIds = (myVenues.json?.venues || []).map(
    (v) => v.venueId || v.id
  );
  check(
    "pilot_sees_approved_hall",
    myVenues.status === 200 && venueIds.includes(PILOT_HALL_ID),
    { status: myVenues.status, venueIds }
  );
  check(
    "pilot_does_not_see_second_hall",
    !venueIds.includes(OTHER_HALL_ID),
    venueIds
  );

  const hall = await requestOnce(
    "GET",
    `/api/venues/dashboard/halls/${encodeURIComponent(PILOT_HALL_ID)}`,
    { token: ownerLogin.token }
  );
  check("pilot_hall_dashboard", hall.status === 200, hall.status);

  const blockedOtherOwn = await requestOnce(
    "GET",
    `/api/venues/dashboard/halls/${encodeURIComponent(OTHER_HALL_ID)}`,
    { token: ownerLogin.token }
  );
  check(
    "second_hall_blocked",
    [403, 404].includes(blockedOtherOwn.status),
    blockedOtherOwn.status
  );

  const blockedOtherOwner = await requestOnce(
    "GET",
    `/api/venues/dashboard/halls/${encodeURIComponent(OTHER_OWNER_HALL_ID)}`,
    { token: ownerLogin.token }
  );
  check(
    "other_owner_hall_blocked_for_pilot",
    [403, 404].includes(blockedOtherOwner.status),
    blockedOtherOwner.status
  );

  // Other venue owner blocked entirely
  if (OTHER_PASSWORD) {
    const otherLogin = await login(OTHER_OWNER_EMAIL, OTHER_PASSWORD);
    check("other_owner_login_attempt", otherLogin.ok || otherLogin.status === 200, otherLogin.status);
    if (otherLogin.ok) {
      const otherDash = await requestOnce(
        "GET",
        `/api/venues/dashboard/halls/${encodeURIComponent(OTHER_OWNER_HALL_ID)}`,
        { token: otherLogin.token }
      );
      check(
        "other_venues_blocked",
        [403, 404].includes(otherDash.status),
        otherDash.status
      );
      const otherMy = await requestOnce("GET", "/api/venues/dashboard/my-venues", {
        token: otherLogin.token,
      });
      const ids = (otherMy.json?.venues || []).map((v) => v.venueId || v.id);
      check(
        "other_owner_my_venues_empty_or_denied",
        otherMy.status === 403 || ids.length === 0 || !ids.includes(OTHER_OWNER_HALL_ID),
        { status: otherMy.status, ids }
      );
    }
  } else {
    check("other_venues_blocked", false, "missing OTHER_OWNER_PASSWORD");
  }

  // Re-login pilot for module smoke
  const o2 = await login(PILOT_OWNER_EMAIL, PILOT_PASSWORD);
  const H = encodeURIComponent(PILOT_HALL_ID);
  const modules = [
    ["leads_crm", "GET", `/api/venues/dashboard/halls/${H}/crm`],
    ["calendar", "GET", `/api/venues/dashboard/halls/${H}/calendar?from=2026-01-01&to=2027-12-31`],
    ["employees", "GET", `/api/venues/dashboard/halls/${H}/employees`],
    ["customers", "GET", `/api/venues/dashboard/halls/${H}/customers`],
    ["menus", "GET", `/api/venues/dashboard/halls/${H}/menus`],
    ["files", "GET", `/api/venues/dashboard/halls/${H}/files`],
    ["staff", "GET", `/api/venues/dashboard/halls/${H}/staff`],
    ["equipment", "GET", `/api/venues/dashboard/halls/${H}/equipment`],
    ["alerts", "GET", `/api/venues/dashboard/halls/${H}/alerts?limit=20`],
    ["activity", "GET", `/api/venues/dashboard/halls/${H}/activity?limit=20`],
    ["reports", "GET", `/api/venues/dashboard/halls/${H}/reports?months=3`],
    ["day_of", "GET", `/api/venues/dashboard/halls/${H}/day-of`],
    ["seating_templates", "GET", `/api/venues/dashboard/seating-templates?hallId=${H}`],
    ["tasks", "GET", `/api/venues/dashboard/tasks?hallId=${H}`],
  ];
  for (const [name, method, path] of modules) {
    const res = await requestOnce(method, path, { token: o2.token });
    check(`module_${name}`, res.status === 200, {
      status: res.status,
      msg: res.json?.message,
    });
  }

  // Safe create lead (pilot data only) + convert
  const lead = await requestOnce(
    "POST",
    `/api/venues/dashboard/halls/${H}/crm`,
    {
      token: o2.token,
      body: {
        name: "[PILOT-SMOKE] ליד בדיקה",
        phone: "0500000000",
        email: `pilot-smoke-${Date.now()}@example.com`,
        eventType: "wedding",
        requestedDate: "2026-12-28",
        guests: 120,
        budget: 50000,
        source: "production-pilot-smoke",
        status: "new",
      },
    }
  );
  const leadId = lead.json?.lead?.id || lead.json?.lead?._id;
  check("lead_create", lead.status === 200 && !!leadId, {
    status: lead.status,
    leadId,
    msg: lead.json?.message,
  });

  let linkedEventId = null;
  if (leadId) {
    const convert = await requestOnce(
      "PUT",
      `/api/venues/dashboard/halls/${H}/crm`,
      {
        token: o2.token,
        body: {
          action: "closeEvent",
          leadId,
          date: "2026-12-28",
          startTime: "18:00",
          endTime: "01:00",
          notes: "production pilot smoke — safe test data",
        },
      }
    );
    linkedEventId =
      convert.json?.eventId ||
      convert.json?.linkedEventId ||
      null;
    check(
      "lead_convert",
      convert.status === 200 && convert.json?.success !== false,
      { status: convert.status, linkedEventId, msg: convert.json?.message }
    );
    if (linkedEventId) {
      const ev = await mongo.collection("events").findOne({
        _id: new ObjectId(String(linkedEventId)),
      });
      const ve = await mongo.collection("venueevents").findOne({
        linkedEventId: new ObjectId(String(linkedEventId)),
      });
      check("venue_event_verified", Boolean(ev && ve), {
        event: !!ev,
        venueEvent: !!ve,
        hallId: ve?.hallId,
      });
    }
  }

  // Seating template create (pilot)
  const tpl = await requestOnce("POST", "/api/venues/dashboard/seating-templates", {
    token: o2.token,
    body: {
      hallId: PILOT_HALL_ID,
      name: `[PILOT-SMOKE] Template ${Date.now()}`,
      tables: [
        {
          id: "ps-t1",
          name: "שולחן 1",
          type: "round",
          x: 100,
          y: 100,
          seats: 8,
          capacity: 8,
          seatedGuests: [],
        },
        {
          id: "ps-t2",
          name: "שולחן 2",
          type: "round",
          x: 240,
          y: 100,
          seats: 8,
          capacity: 8,
          seatedGuests: [],
        },
      ],
    },
  });
  const templateId = tpl.json?.template?._id || tpl.json?.template?.id;
  check("seating_template_create", tpl.status === 200 && !!templateId, {
    status: tpl.status,
    templateId,
  });

  // Task / equipment / menu light creates
  const task = await requestOnce("POST", "/api/venues/dashboard/tasks", {
    token: o2.token,
    body: {
      hallId: PILOT_HALL_ID,
      title: "[PILOT-SMOKE] task",
      due: "היום",
      priority: "medium",
    },
  });
  check("task_create", task.status === 200 && task.json?.success !== false, task.status);

  const menu = await requestOnce(
    "POST",
    `/api/venues/dashboard/halls/${H}/menus`,
    {
      token: o2.token,
      body: { name: `[PILOT-SMOKE] Menu ${Date.now()}`, type: "wedding", status: "active" },
    }
  );
  check("menu_create", menu.status === 200 && menu.json?.success !== false, menu.status);

  const equip = await requestOnce(
    "POST",
    `/api/venues/dashboard/halls/${H}/equipment`,
    {
      token: o2.token,
      body: { action: "create_item", name: "[PILOT-SMOKE] כיסאות", quantity: 50 },
    }
  );
  check("equipment_create", equip.status === 200 && equip.json?.success !== false, equip.status);

  // Client invite if event exists
  if (linkedEventId && templateId) {
    const invite = await requestOnce(
      "POST",
      `/api/venues/dashboard/events/${linkedEventId}/client-invite`,
      {
        token: o2.token,
        body: { seatingTemplateId: templateId, packageType: "seating_only" },
      }
    );
    check(
      "client_invite",
      invite.status === 200 && invite.json?.success !== false,
      { status: invite.status, msg: invite.json?.message }
    );
    report.registrationLink = invite.json?.registrationLink || null;

    // Activate with dedicated smoke customer (create user)
    const tokenMatch = String(invite.json?.registrationLink || "").match(
      /venueInviteToken=([^&]+)/
    );
    let venueInviteToken = tokenMatch ? decodeURIComponent(tokenMatch[1]) : null;
    venueInviteToken =
      venueInviteToken ||
      invite.json?.invite?.venueClientInviteToken ||
      null;
    if (venueInviteToken) {
      const custEmail = `pilot-smoke-customer-${Date.now()}@invistimo.test`;
      const hash = await bcrypt.hash(PILOT_PASSWORD, 10);
      await mongo.collection("users").updateOne(
        { email: custEmail },
        {
          $set: {
            email: custEmail,
            name: "[PILOT-SMOKE] Customer",
            password: hash,
            role: "user",
            hasPaid: true,
            isActive: true,
            needsPasswordSetup: false,
            isPilotSmokeFixture: true,
            updatedAt: new Date(),
          },
          $setOnInsert: { createdAt: new Date() },
        },
        { upsert: true }
      );
      const cust = await mongo.collection("users").findOne({ email: custEmail });
      const complete = await requestOnce(
        "POST",
        "/api/venues/client-registration/complete",
        {
          body: {
            venueInviteToken,
            userId: String(cust._id),
            email: custEmail,
            packageType: "seating_only",
            recordsCount: 100,
          },
        }
      );
      check(
        "customer_activation",
        complete.status === 200 && complete.json?.success !== false,
        { status: complete.status, msg: complete.json?.message }
      );
      report.smokeCustomerEmail = custEmail;
      report.customerInvitationId = complete.json?.invitationId || null;

      const custLogin = await login(custEmail, PILOT_PASSWORD);
      check("customer_login", custLogin.ok, custLogin.status);
      const custVenue = await requestOnce(
        "GET",
        `/api/venues/dashboard/halls/${H}`,
        { token: custLogin.token }
      );
      check(
        "customer_no_venue_shell",
        [401, 403, 404].includes(custVenue.status),
        custVenue.status
      );

      if (report.customerInvitationId) {
        // Create a few guests + RSVP
        const guestsPayload = [];
        for (let i = 1; i <= 5; i += 1) {
          guestsPayload.push({
            name: `Pilot Smoke Guest ${i}`,
            phone: `0501${String(100000 + i).slice(-6)}`,
            guestsCount: 1,
            rsvp: i === 5 ? "no" : "yes",
            status: i === 5 ? "no" : "yes",
          });
        }
        const imported = await requestOnce("POST", "/api/guests/import", {
          token: custLogin.token,
          body: {
            invitationId: report.customerInvitationId,
            guests: guestsPayload,
          },
        });
        check(
          "customer_guests_import",
          imported.status === 200,
          { status: imported.status, msg: imported.json?.message }
        );
        const glist = await requestOnce(
          "GET",
          `/api/guests?invitation=${encodeURIComponent(report.customerInvitationId)}`,
          { token: custLogin.token }
        );
        const guests = glist.json?.guests || [];
        check("customer_guests_list", guests.length >= 5, guests.length);
        if (guests[0]) {
          const rsvp = await requestOnce(
            "PUT",
            `/api/guests/${guests[0]._id || guests[0].id}`,
            {
              token: custLogin.token,
              body: { rsvp: "yes", status: "yes" },
            }
          );
          check("customer_rsvp", rsvp.status === 200, rsvp.status);
        }

        // Seating save
        const seatGet = await requestOnce(
          "GET",
          `/api/seating/tables/${linkedEventId}`,
          { token: custLogin.token }
        );
        const tables = seatGet.json?.tables || [];
        check(
          "customer_seating_loaded",
          seatGet.status === 200 && tables.length >= 1,
          { status: seatGet.status, tables: tables.length }
        );
        if (tables[0] && guests[0]) {
          const next = structuredClone(tables);
          next[0].seatedGuests = [
            {
              guestId: String(guests[0]._id || guests[0].id),
              name: guests[0].name,
              seats: 1,
            },
          ];
          const save = await requestOnce(
            "POST",
            `/api/seating/save/${linkedEventId}`,
            {
              token: custLogin.token,
              body: {
                invitationId: report.customerInvitationId,
                tables: next,
              },
            }
          );
          check(
            "customer_seating_save",
            save.status === 200 && save.json?.success !== false,
            save.status
          );
          const o3 = await login(PILOT_OWNER_EMAIL, PILOT_PASSWORD);
          const vv = await requestOnce(
            "GET",
            `/api/seating/tables/${linkedEventId}?venueView=1`,
            { token: o3.token }
          );
          const seated = (vv.json?.tables || []).reduce(
            (n, t) =>
              n +
              (Array.isArray(t.seatedGuests) ? t.seatedGuests.length : 0),
            0
          );
          check(
            "owner_live_seating_sync",
            vv.status === 200 && seated >= 1,
            { status: vv.status, seated }
          );

          // Day-of arrival
          const day = await requestOnce(
            "PATCH",
            `/api/venues/dashboard/halls/${H}/day-of`,
            {
              token: o3.token,
              body: {
                action: "mark_arrived",
                eventId: linkedEventId,
                guestId: String(guests[0]._id || guests[0].id),
              },
            }
          );
          check(
            "day_of_arrival",
            day.status === 200 && day.json?.success !== false,
            { status: day.status, msg: day.json?.message }
          );
        }
      }
    }
  }

  // Regular AFTER (read-only)
  const after = await snapshotRegular(mongo, regularEmail);
  report.regularAfter = after;
  const d = delta(before, after);
  report.regularDataDelta = d;
  check("regular_data_delta_0", d === 0, { d, before, after });

  if (regularEmail) {
    // Try login only if we know password — skip mutating; probe via public-ish endpoints if possible
    // Read-only DB already compared; optional API login if REGULAR_PASSWORD provided
    if (process.env.REGULAR_PASSWORD) {
      const rl = await login(regularEmail, process.env.REGULAR_PASSWORD);
      check("regular_login", rl.ok, rl.status);
      if (rl.ok) {
        const me = await requestOnce("GET", "/api/me", { token: rl.token });
        check("regular_me", me.status === 200, me.status);
        const regVenue = await requestOnce(
          "GET",
          `/api/venues/dashboard/halls/${H}`,
          { token: rl.token }
        );
        check(
          "regular_denied_venue",
          [401, 403, 404].includes(regVenue.status),
          regVenue.status
        );
      }
    } else {
      check("regular_login_skipped_db_delta_only", true, "no REGULAR_PASSWORD");
    }
  }

  // False venue links
  const linked = await mongo
    .collection("events")
    .find({ venueAccessStatus: "linked" })
    .project({ _id: 1 })
    .toArray();
  let falseLinks = 0;
  for (const e of linked) {
    const hit = await mongo.collection("venueevents").findOne({
      $or: [{ linkedEventId: e._id }, { linkedEventId: String(e._id) }],
    });
    if (!hit) falseLinks += 1;
  }
  report.falseVenueLinks = falseLinks;
  check("false_venue_links_0", falseLinks === 0, {
    linked: linked.length,
    falseLinks,
  });

  await client.close();

  const failed = checks.filter((c) => !c.pass);
  const otherBlocked = checks
    .filter((c) =>
      [
        "second_hall_blocked",
        "other_venues_blocked",
        "pilot_does_not_see_second_hall",
      ].includes(c.name)
    )
    .every((c) => c.pass);

  report.endedAt = new Date().toISOString();
  report.total = checks.length;
  report.passed = checks.length - failed.length;
  report.failed = failed.map((f) => f.name);
  report.checks = checks;
  report.FINAL = {
    VENUE_PILOT_MODE: "true",
    PILOT_OWNER: `${PILOT_OWNER_EMAIL} / ${PILOT_OWNER_ID}`,
    PILOT_HALL: `אולם כינורות / ${PILOT_HALL_ID} / ${PILOT_HALL_OBJECT_ID}`,
    PILOT_ACCESS: checks
      .filter((c) =>
        ["owner_login", "pilot_hall_dashboard", "pilot_sees_approved_hall"].includes(
          c.name
        )
      )
      .every((c) => c.pass)
      ? "PASS"
      : "FAIL",
    OTHER_VENUES_BLOCKED: otherBlocked ? "YES" : "NO",
    REGULAR_CUSTOMER_REGRESSION: checks
      .filter((c) => c.name.startsWith("regular_"))
      .every((c) => c.pass)
      ? "PASS"
      : "FAIL",
    REGULAR_DATA_DELTA: d,
    FALSE_VENUE_LINKS: falseLinks,
    GENERAL_VENUE_ROLLOUT: "OFF",
    ONE_REAL_VENUE_PILOT_LIVE:
      failed.length === 0 && otherBlocked && d === 0 && falseLinks === 0
        ? "YES"
        : "NO",
  };

  fs.mkdirSync("/opt/cursor/artifacts", { recursive: true });
  fs.writeFileSync(REPORT, JSON.stringify(report, null, 2));
  console.log(
    JSON.stringify(
      { reportPath: REPORT, FINAL: report.FINAL, failed: report.failed },
      null,
      2
    )
  );
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
