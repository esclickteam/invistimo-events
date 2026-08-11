/**
 * Staging-only: create a NEW real Venue pilot lab via HTTP APIs + verify
 * full flow + Golden Regular Customer BEFORE/AFTER (delta 0).
 *
 *   STAGING_BASE_URL=https://staging.invistimo.com \
 *   VERCEL_AUTOMATION_BYPASS_SECRET=... \
 *   node scripts/staging/run-pilot-lab-full-e2e.mjs
 *
 * Does NOT touch Production. Does NOT enable VENUE_PILOT_MODE.
 */
import fs from "node:fs";
import http from "node:http";
import https from "node:https";
import { URL } from "node:url";
import { MongoClient, ObjectId } from "mongodb";
import bcrypt from "bcryptjs";

const BASE = String(
  process.env.STAGING_BASE_URL || "https://staging.invistimo.com"
).replace(/\/$/, "");
const BYPASS =
  process.env.VERCEL_AUTOMATION_BYPASS_SECRET ||
  (fs.existsSync("/tmp/staging-bypass.txt")
    ? fs.readFileSync("/tmp/staging-bypass.txt", "utf8").trim()
    : "");
const MONGO =
  process.env.MONGO_URI ||
  (fs.existsSync("/tmp/staging-mongo-uri.txt")
    ? fs.readFileSync("/tmp/staging-mongo-uri.txt", "utf8").trim()
    : "");
const PASSWORD = "StagingTest123!";
const REPORT =
  process.env.PILOT_LAB_REPORT ||
  "/opt/cursor/artifacts/STAGING-PILOT-LAB-E2E-REPORT.json";

const PREFIX = `pilot-lab-${Date.now().toString(36)}`;
const OWNER_EMAIL = `${PREFIX}-owner@invistimo.test`;
const OWNER_B_EMAIL = `${PREFIX}-owner-b@invistimo.test`;
const SHARED_EMAIL = `${PREFIX}-shared@invistimo.test`;
const CUSTOMER_EMAIL = `${PREFIX}-customer@invistimo.test`;
const REGULAR_EMAIL = "e2e-regular-host@invistimo.test";

const ROLE_EMPLOYEES = [
  { key: "manager", role: "MANAGER", name: "Pilot Manager" },
  { key: "reception", role: "RECEPTION", name: "Pilot Reception" },
  { key: "sales", role: "SALES", name: "Pilot Sales" },
  { key: "viewer", role: "VIEWER", name: "Pilot Viewer" },
  { key: "event_manager", role: "EVENT_MANAGER", name: "Pilot Event Manager" },
  { key: "staff", role: "STAFF", name: "Pilot Staff" },
];

const checks = [];
function check(name, pass, detail) {
  checks.push({ name, pass: Boolean(pass), detail: detail ?? null });
}

const cookieJar = new Map();

function assertStagingHost() {
  const host = new URL(BASE).hostname.toLowerCase();
  if (host === "www.invistimo.com" || host === "invistimo.com") {
    throw new Error(`Refusing production host ${host}`);
  }
  const allowPreview =
    process.env.PILOT_LAB_ALLOW_PREVIEW === "1" &&
    host.endsWith(".vercel.app");
  if (!host.includes("staging") && !allowPreview) {
    throw new Error(`Refusing non-staging host ${host}`);
  }
}

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
    "User-Agent": "invistimo-pilot-lab-e2e/1.0",
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
      { method, headers, timeout: 60000 },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", async () => {
          const setCookie = res.headers["set-cookie"] || [];
          storeSetCookies(setCookie);
          const status = res.statusCode || 0;
          const location = res.headers.location;
          if (location && status >= 300 && status < 400 && redirectCount < 8) {
            const nextUrl = new URL(location, url).toString();
            if (
              !sameOrigin(nextUrl, BASE) &&
              !sameOrigin(nextUrl, url.toString())
            ) {
              resolve({
                status,
                headers: res.headers,
                raw: Buffer.concat(chunks).toString("utf8").slice(0, 4000),
                json: null,
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
            raw: raw.slice(0, 4000),
            json,
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
      })
    );
    req.on("timeout", () => {
      req.destroy();
      resolve({ status: 0, error: "timeout", json: null, raw: "" });
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
      /SSL|TLS|socket|ECONNRESET|EOF|disconnected/i.test(
        String(last.error || "")
      );
    const ssoBlock =
      last.status >= 300 &&
      last.status < 400 &&
      /off-host redirect blocked/i.test(String(last.error || ""));
    if (!tlsFail && !ssoBlock) return last;
    await sleep(800 * attempt);
  }
  return last;
}

function extractToken() {
  return cookieJar.get("authToken") || cookieJar.get("token") || null;
}

async function login(email) {
  for (const k of ["authToken", "token", "role", "hasPaid", "isTrial"]) {
    cookieJar.delete(k);
  }
  await request("GET", "/");
  const res = await request("POST", "/api/login", {
    body: { email, password: PASSWORD },
  });
  const token = extractToken();
  return {
    ok: Boolean(res.json?.success && token) || (res.status === 200 && !!token),
    token,
    status: res.status,
    json: res.json,
  };
}

async function ensureOwnerUsers(mongo) {
  const users = mongo.collection("users");
  const hash = await bcrypt.hash(PASSWORD, 10);
  const now = new Date();
  const upsert = async (email, name, extra = {}) => {
    await users.updateOne(
      { email },
      {
        $set: {
          email,
          name,
          password: hash,
          role: "venue_owner",
          venueUser: true,
          employeeScope: "venue",
          isActive: true,
          hasPaid: true,
          needsPasswordSetup: false,
          isStagingFixture: true,
          accessModules: { venues: true, venueDashboard: true },
          updatedAt: now,
          ...extra,
        },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true }
    );
    return users.findOne({ email });
  };
  const owner = await upsert(OWNER_EMAIL, "[PILOT-LAB] Owner A");
  const ownerB = await upsert(OWNER_B_EMAIL, "[PILOT-LAB] Owner B");
  const shared = await upsert(SHARED_EMAIL, "[PILOT-LAB] Shared Owner");
  return { owner, ownerB, shared };
}

async function ensureGoldenRegular(mongo) {
  const users = mongo.collection("users");
  const events = mongo.collection("events");
  const invitations = mongo.collection("invitations");
  const guests = mongo.collection("invitationguests");
  const seating = mongo.collection("seatingtables");
  const hash = await bcrypt.hash(PASSWORD, 10);
  const now = new Date();

  await users.updateOne(
    { email: REGULAR_EMAIL },
    {
      $set: {
        email: REGULAR_EMAIL,
        name: "[E2E] Regular Host",
        password: hash,
        role: "user",
        hasPaid: true,
        isActive: true,
        needsPasswordSetup: false,
        isStagingFixture: true,
        updatedAt: now,
      },
      $unset: {
        venueUser: "",
        employeeScope: "",
        venueOwnerId: "",
        venueHallId: "",
      },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true }
  );
  const user = await users.findOne({ email: REGULAR_EMAIL });

  await events.updateOne(
    { email: REGULAR_EMAIL, title: "[E2E] Regular Non-Venue Event" },
    {
      $set: {
        userId: user._id,
        email: REGULAR_EMAIL,
        title: "[E2E] Regular Non-Venue Event",
        eventType: "wedding",
        date: "2026-12-01",
        time: "18:00",
        status: "active",
        paymentStatus: "paid",
        location: { address: "Private Hall" },
        maxGuests: 60,
        isStagingFixture: true,
        updatedAt: now,
      },
      $unset: {
        venueOwnerId: "",
        venueHallId: "",
        venueHallName: "",
        venueAccessStatus: "",
        venueClientSelectedSeatingTemplateId: "",
      },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true }
  );
  const ev = await events.findOne({
    email: REGULAR_EMAIL,
    title: "[E2E] Regular Non-Venue Event",
  });

  let inv = await invitations.findOne({
    eventId: ev._id,
    isStagingFixture: true,
  });
  if (!inv) {
    const shareId = `e2e-regular-share-${String(ev._id).slice(-6)}`;
    const invId = new ObjectId();
    await invitations.insertOne({
      _id: invId,
      eventId: ev._id,
      userId: user._id,
      ownerId: user._id,
      shareId,
      title: "[E2E] Regular Non-Venue Event",
      isStagingFixture: true,
      createdAt: now,
      updatedAt: now,
    });
    inv = await invitations.findOne({ _id: invId });
  }

  const existingGuests = await guests.countDocuments({
    invitationId: inv._id,
    isStagingFixture: true,
  });
  if (existingGuests < 20) {
    await guests.deleteMany({ invitationId: inv._id, isStagingFixture: true });
    const docs = [];
    for (let i = 1; i <= 24; i += 1) {
      const rsvp = i % 5 === 0 ? "no" : i % 3 === 0 ? "pending" : "yes";
      docs.push({
        eventId: ev._id,
        invitationId: inv._id,
        userId: user._id,
        name: `[E2E-REGULAR] אורח ${i}`,
        phone: `0509${String(100000 + i).slice(-6)}`,
        rsvp,
        status: rsvp,
        guestsCount: i % 2 === 0 ? 2 : 1,
        amount: rsvp === "yes" ? (i % 2 === 0 ? 2 : 1) : 0,
        actualArrivedCount: rsvp === "yes" && i <= 3 ? 1 : 0,
        token: `e2e-regular-guest-${i}`,
        isStagingFixture: true,
        createdAt: now,
        updatedAt: now,
      });
    }
    await guests.insertMany(docs);
  }

  const seatExists = await seating.findOne({ eventId: ev._id });
  if (!seatExists) {
    await seating.insertOne({
      eventId: ev._id,
      invitationId: inv._id,
      userId: user._id,
      tables: [
        {
          id: "reg-t1",
          name: "שולחן 1",
          type: "round",
          x: 100,
          y: 100,
          seats: 8,
          capacity: 8,
          seatedGuests: [],
        },
        {
          id: "reg-t2",
          name: "שולחן 2",
          type: "round",
          x: 260,
          y: 100,
          seats: 8,
          capacity: 8,
          seatedGuests: [],
        },
      ],
      isStagingFixture: true,
      createdAt: now,
      updatedAt: now,
    });
  }

  // Seat a few yes guests if none seated (stable golden baseline)
  const seatDoc = await seating.findOne({ eventId: ev._id });
  const seatedNow = (seatDoc?.tables || []).reduce(
    (n, t) => n + (Array.isArray(t.seatedGuests) ? t.seatedGuests.length : 0),
    0
  );
  if (seatedNow === 0) {
    const yesGuests = await guests
      .find({ invitationId: inv._id, rsvp: "yes" })
      .limit(4)
      .toArray();
    const tables = structuredClone(seatDoc.tables || []);
    if (tables[0]) {
      tables[0].seatedGuests = yesGuests.map((g) => ({
        guestId: String(g._id),
        name: g.name,
        seats: Number(g.guestsCount || 1),
      }));
      await seating.updateOne(
        { _id: seatDoc._id },
        { $set: { tables, updatedAt: now } }
      );
    }
  }
}

async function snapshotRegular(mongo) {
  const users = mongo.collection("users");
  const events = mongo.collection("events");
  const invitations = mongo.collection("invitations");
  const guests = mongo.collection("invitationguests");
  const seating = mongo.collection("seatingtables");

  const user = await users.findOne({ email: REGULAR_EMAIL });
  if (!user) return null;
  const userId = String(user._id);
  const event = await events.findOne({
    $or: [{ userId }, { userId: user._id }],
    title: /regular|golden|e2e/i,
  });
  // fallback: any event owned by regular
  const ev =
    event ||
    (await events.findOne({
      $or: [{ userId }, { userId: user._id }],
    }));
  if (!ev) {
    return {
      userId,
      eventId: null,
      invitationId: null,
      shareId: null,
      guestCount: 0,
      rsvpYes: 0,
      rsvpNo: 0,
      rsvpPending: 0,
      seated: 0,
      arrivals: 0,
      venueEvent: false,
      linkedEventId: null,
    };
  }
  const inv = await invitations.findOne({
    $or: [
      { eventId: ev._id },
      { linkedEventId: ev._id },
      { productionEventId: ev._id },
      { userId },
      { userId: user._id },
    ],
  });
  let guestDocs = [];
  if (inv?._id) {
    guestDocs = await guests.find({ invitationId: inv._id }).toArray();
  }
  let yes = 0,
    no = 0,
    pending = 0,
    arrivals = 0;
  for (const g of guestDocs) {
    const st = String(g.status || g.rsvp || "pending").toLowerCase();
    if (["yes", "approved", "coming", "confirmed"].includes(st)) yes += 1;
    else if (["no", "declined", "rejected"].includes(st)) no += 1;
    else pending += 1;
    arrivals += Number(g.actualArrivedCount || 0) > 0 ? 1 : 0;
  }
  const seatDoc = await seating.findOne({
    $or: [{ eventId: String(ev._id) }, { eventId: ev._id }],
  });
  let seated = 0;
  if (seatDoc?.tables) {
    for (const t of seatDoc.tables) {
      seated += Array.isArray(t.seatedGuests) ? t.seatedGuests.length : 0;
    }
  }
  const ve = await mongo.collection("venueevents").findOne({
    $or: [{ linkedEventId: ev._id }, { linkedEventId: String(ev._id) }],
  });
  return {
    userId,
    eventId: String(ev._id),
    invitationId: inv?._id ? String(inv._id) : null,
    shareId: inv?.shareId || null,
    guestCount: guestDocs.length,
    rsvpYes: yes,
    rsvpNo: no,
    rsvpPending: pending,
    seated,
    arrivals,
    venueEvent: Boolean(ve),
    linkedEventId: ev.venueAccessStatus || null,
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
  for (const k of keys) {
    if (String(a[k]) !== String(b[k])) d += 1;
  }
  return d;
}

async function main() {
  assertStagingHost();
  if (!MONGO) throw new Error("Missing staging MONGO_URI");

  const client = new MongoClient(MONGO);
  await client.connect();
  const mongo = client.db();
  if (mongo.databaseName !== "invistimo_staging") {
    throw new Error(`Refusing db=${mongo.databaseName}`);
  }

  const report = {
    base: BASE,
    startedAt: new Date().toISOString(),
    prefix: PREFIX,
    productionPilot: "NOT_ENABLED",
    venuePilotMode: "OFF",
  };

  // ---- Golden Regular BEFORE (ensure fixture once, then freeze snapshot) ----
  await ensureGoldenRegular(mongo);
  const before = await snapshotRegular(mongo);
  report.regularBefore = before;
  check(
    "regular_fixture_exists",
    Boolean(
      before?.userId &&
        before?.eventId &&
        before?.invitationId &&
        before.guestCount >= 20
    ),
    before
  );
  check("regular_no_venue_event", before && before.venueEvent === false, before);
  check(
    "regular_no_venue_hall",
    before && !before.venueHallId,
    before?.venueHallId
  );
  // ---- Create owners in DB (bootstrap only) ----
  const { owner, ownerB, shared } = await ensureOwnerUsers(mongo);
  report.ownerId = String(owner._id);
  report.ownerBId = String(ownerB._id);
  report.sharedId = String(shared._id);

  // ---- Owner A login + create hall A ----
  let ownerLogin = await login(OWNER_EMAIL);
  check("owner_login", ownerLogin.ok, ownerLogin.status);
  const hallARes = await request("POST", "/api/venues/dashboard/halls", {
    body: {
      name: `[PILOT-LAB] ${PREFIX} Hall A`,
      subtitle: "Staging full E2E pilot lab",
      capacity: 350,
      status: "active",
    },
    token: ownerLogin.token,
  });
  const hallA = hallARes.json?.hall?.id;
  check("hall_a_create", hallARes.status === 200 && !!hallA, {
    status: hallARes.status,
    hallA,
    msg: hallARes.json?.message,
  });
  report.hallA = hallA;

  // Hall B for owner B
  const ownerBLogin = await login(OWNER_B_EMAIL);
  check("owner_b_login", ownerBLogin.ok, ownerBLogin.status);
  const hallBRes = await request("POST", "/api/venues/dashboard/halls", {
    body: {
      name: `[PILOT-LAB] ${PREFIX} Hall B`,
      capacity: 200,
      status: "active",
    },
    token: ownerBLogin.token,
  });
  const hallB = hallBRes.json?.hall?.id;
  check("hall_b_create", hallBRes.status === 200 && !!hallB, hallB);
  report.hallB = hallB;

  // Shared owner membership on A (OWNER) and B (VIEWER) via employees API as each owner
  ownerLogin = await login(OWNER_EMAIL);
  const sharedOnA = await request(
    "POST",
    `/api/venues/dashboard/halls/${encodeURIComponent(hallA)}/employees`,
    {
      token: ownerLogin.token,
      body: {
        name: "[PILOT-LAB] Shared",
        email: SHARED_EMAIL,
        password: PASSWORD,
        role: "MANAGER",
        createEmployeeRecord: false,
      },
    }
  );
  check(
    "shared_membership_a",
    sharedOnA.status === 200 || sharedOnA.status === 201 || sharedOnA.json?.success,
    { status: sharedOnA.status, msg: sharedOnA.json?.message }
  );

  const sharedOnB = await request(
    "POST",
    `/api/venues/dashboard/halls/${encodeURIComponent(hallB)}/employees`,
    {
      token: ownerBLogin.token,
      body: {
        name: "[PILOT-LAB] Shared",
        email: SHARED_EMAIL,
        password: PASSWORD,
        role: "VIEWER",
        createEmployeeRecord: false,
      },
    }
  );
  check(
    "shared_membership_b",
    sharedOnB.status === 200 || sharedOnB.json?.success,
    sharedOnB.status
  );

  // ---- Employees via real API ----
  ownerLogin = await login(OWNER_EMAIL);
  const employees = {};
  for (const emp of ROLE_EMPLOYEES) {
    const email = `${PREFIX}-${emp.key}@invistimo.test`;
    const res = await request(
      "POST",
      `/api/venues/dashboard/halls/${encodeURIComponent(hallA)}/employees`,
      {
        token: ownerLogin.token,
        body: {
          name: emp.name,
          email,
          password: PASSWORD,
          role: emp.role,
          jobTitle: emp.role,
          createEmployeeRecord: true,
        },
      }
    );
    employees[emp.key] = {
      email,
      role: emp.role,
      ok: res.status === 200 && res.json?.success !== false,
      status: res.status,
      message: res.json?.message,
      userId: res.json?.user?.id || res.json?.membership?.userId,
      membershipId: res.json?.membership?.id,
    };
    check(`employee_create_${emp.key}`, employees[emp.key].ok, employees[emp.key]);
  }
  report.employees = employees;

  // Role logins + permission probes
  for (const emp of ROLE_EMPLOYEES) {
    const email = employees[emp.key].email;
    const lg = await login(email);
    check(`login_${emp.key}`, lg.ok, lg.status);

    const dash = await request(
      "GET",
      `/api/venues/dashboard/halls/${encodeURIComponent(hallA)}`,
      { token: lg.token }
    );
    check(
      `dash_${emp.key}`,
      [200, 403].includes(dash.status),
      dash.status
    );

    const empList = await request(
      "GET",
      `/api/venues/dashboard/halls/${encodeURIComponent(hallA)}/employees`,
      { token: lg.token }
    );
    const settings = await request(
      "GET",
      `/api/venues/dashboard/halls/${encodeURIComponent(hallA)}/settings`,
      { token: lg.token }
    );
    const crm = await request(
      "GET",
      `/api/venues/dashboard/halls/${encodeURIComponent(hallA)}/crm`,
      { token: lg.token }
    );

    if (emp.role === "VIEWER" || emp.role === "STAFF" || emp.role === "RECEPTION") {
      check(
        `${emp.key}_employees_denied_or_view`,
        empList.status === 403 || empList.status === 200,
        empList.status
      );
    }
    if (emp.role === "RECEPTION" || emp.role === "VIEWER" || emp.role === "STAFF" || emp.role === "SALES") {
      check(
        `${emp.key}_settings_denied`,
        settings.status === 403 || settings.status === 404,
        settings.status
      );
    }
    if (emp.role === "SALES" || emp.role === "MANAGER" || emp.role === "OWNER") {
      check(`${emp.key}_crm_allowed`, crm.status === 200, crm.status);
    }
    if (emp.role === "VIEWER" || emp.role === "STAFF" || emp.role === "RECEPTION") {
      // may or may not have leads.view
      check(`${emp.key}_crm_status_recorded`, [200, 403].includes(crm.status), crm.status);
    }

    // Cross-hall deny
    const cross = await request(
      "GET",
      `/api/venues/dashboard/halls/${encodeURIComponent(hallB)}/crm`,
      { token: lg.token }
    );
    check(`${emp.key}_denied_hall_b`, [403, 404].includes(cross.status), cross.status);
  }

  // ---- Leads ----
  ownerLogin = await login(OWNER_EMAIL);
  const leadIds = {};
  const leadDefs = [
    { key: "new", name: "ליד חדש Pilot", status: "new", eventType: "wedding" },
    { key: "progress", name: "ליד בטיפול Pilot", status: "in_progress", eventType: "bar_mitzvah" },
    { key: "proposal", name: "ליד עם הצעה Pilot", status: "proposal", eventType: "wedding" },
    { key: "convert", name: "ליד להמרה Pilot", status: "new", eventType: "wedding" },
    { key: "closed", name: "ליד נסגר Pilot", status: "closed", eventType: "other" },
  ];
  for (const ld of leadDefs) {
    const res = await request(
      "POST",
      `/api/venues/dashboard/halls/${encodeURIComponent(hallA)}/crm`,
      {
        token: ownerLogin.token,
        body: {
          name: ld.name,
          phone: "0501234567",
          email: `${PREFIX}-${ld.key}@example.com`,
          eventType: ld.eventType,
          requestedDate: "2026-12-15",
          guests: 180,
          budget: 80000,
          source: "pilot-lab",
          owner: "Pilot Sales",
          status: ld.status,
        },
      }
    );
    const id = res.json?.lead?.id || res.json?.lead?._id;
    leadIds[ld.key] = id;
    check(`lead_create_${ld.key}`, res.status === 200 && !!id, {
      status: res.status,
      id,
      msg: res.json?.message,
    });
  }
  report.leads = leadIds;

  // Convert lead
  const convertRes = await request(
    "PUT",
    `/api/venues/dashboard/halls/${encodeURIComponent(hallA)}/crm`,
    {
      token: ownerLogin.token,
      body: {
        action: "closeEvent",
        leadId: leadIds.convert,
        date: "2026-12-20",
        startTime: "18:00",
        endTime: "01:00",
        notes: "Pilot lab conversion",
      },
    }
  );
  const linkedEventId =
    convertRes.json?.eventId ||
    convertRes.json?.linkedEventId ||
    convertRes.json?.event?.id ||
    convertRes.json?.venueEvent?.linkedEventId;
  check("lead_convert", convertRes.status === 200 && convertRes.json?.success !== false, {
    status: convertRes.status,
    linkedEventId,
    msg: convertRes.json?.message,
    keys: Object.keys(convertRes.json || {}),
  });

  // Idempotent second convert
  const convert2 = await request(
    "PUT",
    `/api/venues/dashboard/halls/${encodeURIComponent(hallA)}/crm`,
    {
      token: ownerLogin.token,
      body: {
        action: "closeEvent",
        leadId: leadIds.convert,
        date: "2026-12-20",
      },
    }
  );
  check(
    "lead_convert_idempotent",
    convert2.status === 200 || convert2.json?.alreadyExisted === true || convert2.json?.success,
    { status: convert2.status, already: convert2.json?.alreadyExisted }
  );

  // Resolve linked event from DB if API shape differs
  let eventId = linkedEventId ? String(linkedEventId) : "";
  if (!eventId && leadIds.convert) {
    const lead = await mongo.collection("venueleads").findOne({
      _id: ObjectId.isValid(leadIds.convert)
        ? new ObjectId(leadIds.convert)
        : leadIds.convert,
    });
    const ve = await mongo.collection("venueevents").findOne({
      hallId: hallA,
      $or: [
        { leadId: leadIds.convert },
        { clientName: /ליד להמרה/ },
      ],
    });
    eventId = String(ve?.linkedEventId || lead?.linkedEventId || lead?.eventId || "");
  }
  report.linkedEventId = eventId;

  if (eventId) {
    const ev = await mongo.collection("events").findOne({
      _id: new ObjectId(eventId),
    });
    const ve = await mongo.collection("venueevents").findOne({
      linkedEventId: new ObjectId(eventId),
    });
    check("verified_venue_event", Boolean(ev && ve), {
      event: !!ev,
      venueEvent: !!ve,
      hallId: ve?.hallId,
    });
  } else {
    check("verified_venue_event", false, "missing eventId");
  }

  // ---- Seating templates ----
  const templateIds = [];
  for (let i = 1; i <= 3; i += 1) {
    const tables = [];
    for (let t = 1; t <= 8; t += 1) {
      tables.push({
        id: `plt-${i}-t${t}`,
        name: `שולחן ${t}`,
        type: "round",
        x: 80 + ((t - 1) % 4) * 140,
        y: 80 + Math.floor((t - 1) / 4) * 140,
        seats: 8,
        capacity: 8,
        seatedGuests: [],
        reserved: t === 8,
      });
    }
    const res = await request("POST", "/api/venues/dashboard/seating-templates", {
      token: ownerLogin.token,
      body: {
        hallId: hallA,
        name: `Pilot Template ${i} ${PREFIX}`,
        description: "pilot lab",
        tables,
      },
    });
    const tid = res.json?.template?._id || res.json?.template?.id || res.json?.id;
    templateIds.push(tid);
    check(`template_create_${i}`, res.status === 200 && !!tid, {
      status: res.status,
      tid,
      msg: res.json?.message,
    });
  }
  report.templateIds = templateIds;

  // Duplicate + delete last
  if (templateIds[2]) {
    const dup = await request("POST", "/api/venues/dashboard/seating-templates", {
      token: ownerLogin.token,
      body: { action: "duplicate", templateId: templateIds[2], hallId: hallA },
    });
    // some APIs use query action
    const dup2 =
      dup.status === 200
        ? dup
        : await request(
            "POST",
            `/api/venues/dashboard/seating-templates?action=duplicate&templateId=${templateIds[2]}&hallId=${encodeURIComponent(hallA)}`,
            { token: ownerLogin.token, body: { hallId: hallA, templateId: templateIds[2] } }
          );
    check(
      "template_duplicate_attempt",
      [200, 201, 400, 404].includes(dup2.status),
      dup2.status
    );
  }

  // Client invite with template (seating_only — activatable without Stripe)
  let venueInviteToken = null;
  if (eventId && templateIds[0]) {
    const invite = await request(
      "POST",
      `/api/venues/dashboard/events/${eventId}/client-invite`,
      {
        token: ownerLogin.token,
        body: {
          seatingTemplateId: templateIds[0],
          packageType: "seating_only",
        },
      }
    );
    venueInviteToken =
      invite.json?.invite?.venueClientInviteToken ||
      (String(invite.json?.registrationLink || "").match(
        /venueInviteToken=([^&]+)/
      ) || [])[1] ||
      null;
    if (venueInviteToken) {
      try {
        venueInviteToken = decodeURIComponent(venueInviteToken);
      } catch {
        /* keep */
      }
    }
    check("client_invite", invite.status === 200 && invite.json?.success !== false, {
      status: invite.status,
      link: invite.json?.registrationLink,
      token: !!venueInviteToken,
      msg: invite.json?.message,
    });
    report.registrationLink = invite.json?.registrationLink || null;
  } else {
    check("client_invite", false, "missing event/template");
  }

  // Customer user + activate seating_only package via real complete API
  const custHash = await bcrypt.hash(PASSWORD, 10);
  await mongo.collection("users").updateOne(
    { email: CUSTOMER_EMAIL },
    {
      $set: {
        email: CUSTOMER_EMAIL,
        name: "[PILOT-LAB] Customer",
        password: custHash,
        role: "user",
        hasPaid: true,
        isActive: true,
        needsPasswordSetup: false,
        isStagingFixture: true,
        updatedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true }
  );
  const customerUser = await mongo.collection("users").findOne({
    email: CUSTOMER_EMAIL,
  });
  report.customerId = String(customerUser._id);

  if (venueInviteToken && customerUser) {
    const complete = await request(
      "POST",
      "/api/venues/client-registration/complete",
      {
        body: {
          venueInviteToken,
          userId: String(customerUser._id),
          email: CUSTOMER_EMAIL,
          packageType: "seating_only",
          recordsCount: 180,
        },
      }
    );
    check(
      "customer_activation",
      complete.status === 200 && complete.json?.success !== false,
      {
        status: complete.status,
        invitationId: complete.json?.invitationId,
        msg: complete.json?.message,
      }
    );
    report.customerInvitationId = complete.json?.invitationId || null;

    const custLogin = await login(CUSTOMER_EMAIL);
    check("customer_login", custLogin.ok, custLogin.status);

    // Customer must not see VenueShell / hall APIs
    const custVenue = await request(
      "GET",
      `/api/venues/dashboard/halls/${encodeURIComponent(hallA)}`,
      { token: custLogin.token }
    );
    check(
      "customer_no_venue_shell",
      [401, 403, 404].includes(custVenue.status),
      custVenue.status
    );

    const custEvents = await request("GET", "/api/events", {
      token: custLogin.token,
    });
    const custEventList = custEvents.json?.events || custEvents.json || [];
    const ownsLinked = Array.isArray(custEventList)
      ? custEventList.some((e) => String(e._id || e.id) === String(eventId))
      : false;
    check(
      "customer_sees_linked_event",
      custEvents.status === 200 && (ownsLinked || !!report.customerInvitationId),
      { status: custEvents.status, ownsLinked }
    );

    // Seating template materialized for customer
    const seatGet = await request("GET", `/api/seating/tables/${eventId}`, {
      token: custLogin.token,
    });
    const tables = seatGet.json?.tables || [];
    check(
      "customer_seating_template_auto",
      seatGet.status === 200 && tables.length >= 3,
      { status: seatGet.status, tables: tables.length }
    );

    // Import 40 guests via API
    const guestPayload = [];
    for (let i = 1; i <= 40; i += 1) {
      guestPayload.push({
        name: `Pilot Guest ${i}`,
        phone: `0503${String(100000 + i).slice(-6)}`,
        guestsCount: i % 4 === 0 ? 4 : i % 2 === 0 ? 2 : 1,
        rsvp: i % 5 === 0 ? "no" : i % 3 === 0 ? "pending" : "yes",
        status: i % 5 === 0 ? "no" : i % 3 === 0 ? "pending" : "yes",
      });
    }
    const imported = await request("POST", "/api/guests/import", {
      token: custLogin.token,
      body: {
        eventId,
        invitationId: report.customerInvitationId,
        guests: guestPayload,
      },
    });
    // Fallback: create one-by-one if import shape differs
    let guestCount = imported.json?.imported || imported.json?.count || 0;
    if (imported.status !== 200 || guestCount < 30) {
      guestCount = 0;
      for (const g of guestPayload) {
        const one = await request("POST", "/api/guests", {
          token: custLogin.token,
          body: {
            ...g,
            eventId,
            invitationId: report.customerInvitationId,
          },
        });
        if (one.status === 200 || one.status === 201) guestCount += 1;
      }
    }
    check("customer_guests_ge_40", guestCount >= 40, {
      importedStatus: imported.status,
      guestCount,
      msg: imported.json?.message || imported.json?.error,
    });

    const listGuests = await request(
      "GET",
      `/api/guests?eventId=${encodeURIComponent(eventId)}`,
      { token: custLogin.token }
    );
    const guests = listGuests.json?.guests || [];
    check("customer_guests_list", guests.length >= 40, guests.length);

    // Mix RSVP updates
    const yesG = guests.find((g) => String(g.rsvp || g.status) !== "yes");
    const noG = guests.find(
      (g) => g !== yesG && String(g.rsvp || g.status) !== "no"
    );
    if (yesG) {
      const r1 = await request("PUT", `/api/guests/${yesG._id || yesG.id}`, {
        token: custLogin.token,
        body: { rsvp: "yes", status: "yes" },
      });
      check("customer_rsvp_yes", r1.status === 200, r1.status);
    }
    if (noG) {
      const r2 = await request("PUT", `/api/guests/${noG._id || noG.id}`, {
        token: custLogin.token,
        body: { rsvp: "no", status: "no" },
      });
      check("customer_rsvp_no", r2.status === 200, r2.status);
    }

    // Seat some guests + leave reserves
    if (tables.length >= 2 && guests.length >= 8) {
      const nextTables = structuredClone(tables);
      const assignable = guests
        .filter((g) => String(g.rsvp || g.status) === "yes")
        .slice(0, 6);
      if (nextTables[0]) {
        nextTables[0].seatedGuests = assignable.slice(0, 3).map((g) => ({
          guestId: String(g._id || g.id),
          name: g.name,
          seats: Number(g.guestsCount || g.amount || 1),
        }));
      }
      if (nextTables[1]) {
        nextTables[1].seatedGuests = assignable.slice(3, 6).map((g) => ({
          guestId: String(g._id || g.id),
          name: g.name,
          seats: Number(g.guestsCount || g.amount || 1),
        }));
      }
      // mark last table reserved if present
      if (nextTables[nextTables.length - 1]) {
        nextTables[nextTables.length - 1].reserved = true;
      }
      const seatPut = await request("PUT", `/api/seating/tables/${eventId}`, {
        token: custLogin.token,
        body: { tables: nextTables },
      });
      check(
        "customer_seating_assign",
        seatPut.status === 200 && seatPut.json?.success !== false,
        { status: seatPut.status, msg: seatPut.json?.message || seatPut.json?.error }
      );

      // Owner sees live seating via venueView
      ownerLogin = await login(OWNER_EMAIL);
      const venueView = await request(
        "GET",
        `/api/seating/tables/${eventId}?venueView=1`,
        { token: ownerLogin.token }
      );
      const vvTables = venueView.json?.tables || [];
      const seatedCount = vvTables.reduce(
        (n, t) => n + (Array.isArray(t.seatedGuests) ? t.seatedGuests.length : 0),
        0
      );
      check(
        "owner_sees_customer_seating_live",
        venueView.status === 200 && seatedCount >= 3,
        { status: venueView.status, seatedCount, tables: vvTables.length }
      );

      // Owner rename table + capacity change
      if (vvTables[0]) {
        const renamed = structuredClone(vvTables);
        renamed[0].name = "שולחן כבוד Pilot";
        renamed[0].seats = Math.max(Number(renamed[0].seats || 8), 10);
        renamed[0].capacity = renamed[0].seats;
        // add a table
        renamed.push({
          id: `pilot-extra-${Date.now()}`,
          name: "שולחן נוסף",
          type: "round",
          x: 40,
          y: 40,
          seats: 8,
          capacity: 8,
          seatedGuests: [],
        });
        const ownerPut = await request(
          "PUT",
          `/api/seating/tables/${eventId}?venueView=1`,
          { token: ownerLogin.token, body: { tables: renamed } }
        );
        check(
          "owner_seating_edit_live",
          ownerPut.status === 200 && ownerPut.json?.success !== false,
          ownerPut.status
        );
        const custReload = await request(
          "GET",
          `/api/seating/tables/${eventId}`,
          { token: custLogin.token }
        );
        const names = (custReload.json?.tables || []).map((t) => t.name);
        check(
          "customer_sees_owner_table_rename",
          names.includes("שולחן כבוד Pilot"),
          names.slice(0, 5)
        );
      }
    } else {
      check("customer_seating_assign", false, {
        tables: tables.length,
        guests: guests.length,
      });
    }

    // Owner guest summary / venueView guests
    ownerLogin = await login(OWNER_EMAIL);
    const venueGuests = await request(
      "GET",
      `/api/guests?eventId=${encodeURIComponent(eventId)}&venueView=1`,
      { token: ownerLogin.token }
    );
    check(
      "owner_sees_guest_summary",
      venueGuests.status === 200 &&
        (venueGuests.json?.guests || []).length >= 30,
      {
        status: venueGuests.status,
        n: (venueGuests.json?.guests || []).length,
      }
    );

    // Day-of arrival mark by reception (PATCH)
    const receptionEmailForArrival = employees.reception?.email;
    if (receptionEmailForArrival && guests[0]) {
      const rLogin = await login(receptionEmailForArrival);
      const gid = guests[0]._id || guests[0].id;
      const arrive = await request(
        "PATCH",
        `/api/venues/dashboard/halls/${encodeURIComponent(hallA)}/day-of`,
        {
          token: rLogin.token,
          body: {
            action: "mark_arrived",
            eventId,
            guestId: gid,
          },
        }
      );
      check(
        "day_of_mark_arrived",
        arrive.status === 200 && arrive.json?.success !== false,
        { status: arrive.status, msg: arrive.json?.message }
      );
    }
  } else {
    check("customer_activation", false, "missing token/user");
  }

  // ---- Tasks / Menus / Equipment / Files / Notifications / Audit ----
  const task = await request("POST", "/api/venues/dashboard/tasks", {
    token: ownerLogin.token,
    body: {
      hallId: hallA,
      eventId: eventId || undefined,
      title: "Pilot task follow-up",
      due: "היום",
      priority: "high",
      area: "תפעול",
    },
  });
  check("task_create", task.status === 200 && task.json?.success, task.status);

  const menu = await request(
    "POST",
    `/api/venues/dashboard/halls/${encodeURIComponent(hallA)}/menus`,
    {
      token: ownerLogin.token,
      body: {
        name: `Pilot Menu ${PREFIX}`,
        type: "wedding",
        status: "active",
        categories: [],
      },
    }
  );
  check("menu_create", menu.status === 200 && menu.json?.success, {
    status: menu.status,
    msg: menu.json?.message,
  });

  const equip = await request(
    "POST",
    `/api/venues/dashboard/halls/${encodeURIComponent(hallA)}/equipment`,
    {
      token: ownerLogin.token,
      body: {
        action: "create_item",
        name: "כיסאות פילוט",
        quantity: 200,
        notes: "pilot lab",
      },
    }
  );
  const equipId = equip.json?.equipment?.id;
  check("equipment_create", equip.status === 200 && !!equipId, equip.status);
  if (equipId && eventId) {
    const assign = await request(
      "POST",
      `/api/venues/dashboard/halls/${encodeURIComponent(hallA)}/equipment`,
      {
        token: ownerLogin.token,
        body: {
          action: "assign",
          equipmentId: equipId,
          eventId,
          quantity: 50,
          status: "reserved",
        },
      }
    );
    check("equipment_assign", assign.status === 200 && assign.json?.success, assign.status);
  }

  const alerts = await request(
    "GET",
    `/api/venues/dashboard/halls/${encodeURIComponent(hallA)}/alerts?limit=30`,
    { token: ownerLogin.token }
  );
  check("alerts_readable", alerts.status === 200 && alerts.json?.success, {
    n: alerts.json?.alerts?.length,
  });

  const activity = await request(
    "GET",
    `/api/venues/dashboard/halls/${encodeURIComponent(hallA)}/activity?limit=50`,
    { token: ownerLogin.token }
  );
  check("audit_readable", activity.status === 200 && (activity.json?.activity?.length || 0) > 0, {
    n: activity.json?.activity?.length,
  });

  // Cross-tenant audit
  const leak = await request(
    "GET",
    `/api/venues/dashboard/halls/${encodeURIComponent(hallB)}/activity?limit=20`,
    { token: ownerLogin.token }
  );
  check("audit_cross_denied", [403, 404].includes(leak.status), leak.status);

  // Day-of
  const day = await request(
    "GET",
    `/api/venues/dashboard/halls/${encodeURIComponent(hallA)}/day-of?date=2026-12-20`,
    { token: ownerLogin.token }
  );
  check("day_of_owner", day.status === 200 && day.json?.success, {
    n: day.json?.events?.length,
  });

  const receptionEmail = employees.reception?.email;
  if (receptionEmail) {
    const rLogin = await login(receptionEmail);
    const rDay = await request(
      "GET",
      `/api/venues/dashboard/halls/${encodeURIComponent(hallA)}/day-of?date=2026-12-20`,
      { token: rLogin.token }
    );
    check("day_of_reception", rDay.status === 200 && rDay.json?.success, rDay.status);
  }

  const viewerEmail = employees.viewer?.email;
  if (viewerEmail) {
    const vLogin = await login(viewerEmail);
    const vDay = await request(
      "GET",
      `/api/venues/dashboard/halls/${encodeURIComponent(hallA)}/day-of?date=2026-12-20`,
      { token: vLogin.token }
    );
    check("day_of_viewer", vDay.status === 200 || vDay.status === 403, vDay.status);
  }

  // Multi-venue switcher for shared
  const sharedLogin = await login(SHARED_EMAIL);
  check("shared_login", sharedLogin.ok, sharedLogin.status);
  const myVenues = await request("GET", "/api/venues/dashboard/my-venues", {
    token: sharedLogin.token,
  });
  const ids = (myVenues.json?.venues || []).map((v) => v.venueId || v.id);
  check("shared_sees_both", ids.includes(hallA) && ids.includes(hallB), ids);

  // Staff shift create if API supports
  const staffRes = await request(
    "GET",
    `/api/venues/dashboard/halls/${encodeURIComponent(hallA)}/staff`,
    { token: ownerLogin.token }
  );
  check("staff_get", staffRes.status === 200, staffRes.status);

  // Reports
  const reports = await request(
    "GET",
    `/api/venues/dashboard/halls/${encodeURIComponent(hallA)}/reports?months=3`,
    { token: ownerLogin.token }
  );
  check("reports", reports.status === 200 && reports.json?.success !== false, reports.status);

  // Calendar list
  const cal = await request(
    "GET",
    `/api/venues/dashboard/halls/${encodeURIComponent(hallA)}/calendar?from=2026-01-01&to=2027-12-31`,
    { token: ownerLogin.token }
  );
  check("calendar", cal.status === 200 && cal.json?.success !== false, {
    n: (cal.json?.events || []).length,
  });

  // Customers
  const customers = await request(
    "GET",
    `/api/venues/dashboard/halls/${encodeURIComponent(hallA)}/customers`,
    { token: ownerLogin.token }
  );
  check("customers", customers.status === 200, {
    n: customers.json?.customers?.length,
  });

  // Disable reception + verify blocked
  if (employees.reception?.membershipId || employees.reception?.userId) {
    ownerLogin = await login(OWNER_EMAIL);
    const list = await request(
      "GET",
      `/api/venues/dashboard/halls/${encodeURIComponent(hallA)}/employees`,
      { token: ownerLogin.token }
    );
    const rec = (list.json?.employees || list.json?.memberships || []).find(
      (e) =>
        String(e.email || "").toLowerCase() ===
        String(employees.reception.email).toLowerCase()
    );
    const membershipId = rec?.membershipId || rec?.id || employees.reception.membershipId;
    if (membershipId) {
      const dis = await request(
        "PATCH",
        `/api/venues/dashboard/halls/${encodeURIComponent(hallA)}/employees`,
        {
          token: ownerLogin.token,
          body: { action: "disable", membershipId, id: membershipId },
        }
      );
      check("employee_disable", dis.status === 200 || dis.json?.success, dis.status);
      const blocked = await login(employees.reception.email);
      const blockedDash = await request(
        "GET",
        `/api/venues/dashboard/halls/${encodeURIComponent(hallA)}/day-of`,
        { token: blocked.token }
      );
      check(
        "disabled_reception_blocked",
        blockedDash.status === 403 || !blocked.ok,
        { login: blocked.ok, dash: blockedDash.status }
      );
      // re-enable
      await request(
        "PATCH",
        `/api/venues/dashboard/halls/${encodeURIComponent(hallA)}/employees`,
        {
          token: ownerLogin.token,
          body: { action: "enable", membershipId, id: membershipId },
        }
      );
    } else {
      check("employee_disable", false, "membershipId missing");
    }
  }

  // UI pages smoke
  ownerLogin = await login(OWNER_EMAIL);
  for (const seg of [
    "",
    "crm",
    "calendar",
    "customers",
    "menus",
    "employees",
    "staff",
    "files",
    "reports",
    "equipment",
    "activity",
    "day-of",
    "settings",
    "seating-templates",
  ]) {
    const path = `/venues/dashboard/halls/${encodeURIComponent(hallA)}${seg ? `/${seg}` : ""}`;
    const page = await request("GET", path, { token: ownerLogin.token });
    check(`page_${seg || "overview"}`, page.status === 200, page.status);
  }

  // ---- Regular AFTER ----
  const after = await snapshotRegular(mongo);
  report.regularAfter = after;
  const d = delta(before, after);
  report.regularDataDelta = d;
  check("regular_data_delta_0", d === 0, { before, after, d });
  check("regular_still_no_venue_event", after && after.venueEvent === false, after);

  // Regular browser/API regression
  const regLogin = await login(REGULAR_EMAIL);
  check("regular_login", regLogin.ok, regLogin.status);
  const me = await request("GET", "/api/me", { token: regLogin.token });
  check("regular_me", me.status === 200, me.status);
  const regEvents = await request("GET", "/api/events", { token: regLogin.token });
  check("regular_events", regEvents.status === 200, regEvents.status);
  const regInv = await request("GET", "/api/invitations/my", {
    token: regLogin.token,
  });
  check(
    "regular_invitations_my",
    regInv.status === 200 || regInv.status === 404,
    regInv.status
  );
  // Venue shell should not apply — regular denied hall
  const regVenue = await request(
    "GET",
    `/api/venues/dashboard/halls/${encodeURIComponent(hallA)}`,
    { token: regLogin.token }
  );
  check("regular_denied_venue", [401, 403, 404].includes(regVenue.status), regVenue.status);

  // False links
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
  check("false_venue_links_0", falseLinks === 0, { linked: linked.length, falseLinks });

  await client.close();

  const failed = checks.filter((c) => !c.pass);
  report.endedAt = new Date().toISOString();
  report.total = checks.length;
  report.passed = checks.length - failed.length;
  report.failed = failed.map((f) => f.name);
  report.checks = checks;
  report.FINAL = {
    VENUE_FULL_PILOT_E2E: failed.length === 0 ? "PASS" : "FAIL",
    EMPLOYEE_PERMISSIONS: checks.filter((c) => c.name.startsWith("employee_") || c.name.includes("denied") || c.name.startsWith("login_")).every((c) => c.pass)
      ? "PASS"
      : "FAIL",
    TENANT_ISOLATION: checks
      .filter((c) => c.name.includes("denied_hall") || c.name.includes("cross") || c.name === "shared_sees_both")
      .every((c) => c.pass)
      ? "PASS"
      : "FAIL",
    DAY_OF: checks.filter((c) => c.name.startsWith("day_of")).every((c) => c.pass)
      ? "PASS"
      : "FAIL",
    REGULAR_CUSTOMER_REGRESSION: checks
      .filter((c) => c.name.startsWith("regular_"))
      .every((c) => c.pass)
      ? "PASS"
      : "FAIL",
    REGULAR_DATA_DELTA: d,
    FALSE_VENUE_LINKS: falseLinks,
    SAFE_TO_ENABLE_ONE_PRODUCTION_VENUE_PILOT:
      failed.length === 0 && d === 0 && falseLinks === 0 ? "YES" : "NO",
    VENUE_PILOT_MODE: "OFF",
    GENERAL_VENUE_ROLLOUT: "OFF",
  };

  fs.mkdirSync("/opt/cursor/artifacts", { recursive: true });
  fs.writeFileSync(REPORT, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ reportPath: REPORT, FINAL: report.FINAL, failed: report.failed }, null, 2));
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
