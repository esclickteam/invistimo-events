/**
 * Full-scale Venue QA Lab — Staging only.
 *
 * Creates 4 venues, multi-owners, all employee roles, cross-venue memberships,
 * many leads/couples/events, seating templates, guests/RSVP, live seating sync,
 * menus, tasks, shifts, equipment, day-of, isolation + Golden Regular delta 0.
 *
 *   STAGING_BASE_URL=https://staging.invistimo.com \
 *   VERCEL_AUTOMATION_BYPASS_SECRET=... \
 *   MONGO_URI=.../invistimo_staging \
 *   node scripts/staging/run-full-scale-venue-lab.mjs
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
  process.env.FULL_SCALE_LAB_REPORT ||
  "/opt/cursor/artifacts/STAGING-FULL-SCALE-VENUE-LAB-REPORT.json";

const PREFIX = `fslab-${Date.now().toString(36)}`;
const REGULAR_EMAILS = [
  "e2e-regular-host@invistimo.test",
  "staging-regular-host@invistimo.test",
];

const ROLES = [
  "MANAGER",
  "EVENT_MANAGER",
  "RECEPTION",
  "SALES",
  "STAFF",
  "VIEWER",
];

const VENUE_DEFS = [
  { key: "A", name: "Hall A Garden", capacity: 400, couples: 3, guestsBig: true },
  { key: "B", name: "Hall B Ballroom", capacity: 280, couples: 3, guestsBig: false },
  { key: "C", name: "Hall C Rooftop", capacity: 180, couples: 2, guestsBig: false },
  { key: "D", name: "Hall D Boutique", capacity: 120, couples: 2, guestsBig: true },
];

const checks = [];
function check(name, pass, detail) {
  checks.push({ name, pass: Boolean(pass), detail: detail ?? null });
}

const cookieJar = new Map();
function storeSetCookies(setCookie) {
  for (const line of setCookie || []) {
    const part = String(line).split(";")[0];
    const eq = part.indexOf("=");
    if (eq <= 0) continue;
    const name = part.slice(0, eq).trim();
    const value = part.slice(eq + 1).trim();
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
function sameOrigin(a, b) {
  try {
    return new URL(a).origin === new URL(b).origin;
  } catch {
    return false;
  }
}
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function assertStagingHost() {
  const host = new URL(BASE).hostname.toLowerCase();
  if (!host.includes("staging") || host.includes("www.invistimo")) {
    throw new Error(`Refusing non-staging host ${host}`);
  }
}

function requestOnce(method, path, { token, body, redirectCount = 0 } = {}) {
  const url = new URL(path.startsWith("http") ? path : `${BASE}${path}`);
  const lib = url.protocol === "https:" ? https : http;
  const headers = {
    Accept: "application/json,text/html,*/*",
    "User-Agent": "invistimo-full-scale-venue-lab/1.0",
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
    const req = lib.request(url, { method, headers, timeout: 90000 }, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", async () => {
        storeSetCookies(res.headers["set-cookie"]);
        const status = res.statusCode || 0;
        const location = res.headers.location;
        if (location && status >= 300 && status < 400 && redirectCount < 8) {
          const next = new URL(location, url).toString();
          if (!sameOrigin(next, BASE) && !sameOrigin(next, url.toString())) {
            resolve({ status, json: null, error: `off-host ${next}` });
            return;
          }
          const nextMethod =
            status === 307 || status === 308 ? method : "GET";
          resolve(
            await requestOnce(nextMethod, next, {
              token,
              body:
                nextMethod === "GET" || nextMethod === "HEAD"
                  ? undefined
                  : body,
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
        resolve({ status, json, raw: raw.slice(0, 500) });
      });
    });
    req.on("error", (e) =>
      resolve({ status: 0, error: String(e.message || e), json: null })
    );
    if (payload) req.write(payload);
    req.end();
  });
}

async function request(method, path, opts = {}) {
  let last;
  for (let i = 1; i <= 4; i += 1) {
    last = await requestOnce(method, path, opts);
    if (last.status !== 0 && !/off-host/i.test(String(last.error || ""))) {
      return last;
    }
    await sleep(400 * i);
  }
  return last;
}

async function login(email) {
  for (const k of ["authToken", "token", "role", "hasPaid", "isTrial"]) {
    cookieJar.delete(k);
  }
  await request("GET", "/");
  const res = await request("POST", "/api/login", {
    body: { email, password: PASSWORD },
  });
  const token = cookieJar.get("authToken") || cookieJar.get("token") || null;
  return {
    ok: res.status === 200 && !!token,
    token,
    status: res.status,
    json: res.json,
  };
}

async function upsertUser(mongo, email, name, extra = {}) {
  const hash = await bcrypt.hash(PASSWORD, 10);
  const now = new Date();
  await mongo.collection("users").updateOne(
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
  return mongo.collection("users").findOne({ email });
}

async function ensureRegulars(mongo) {
  const hash = await bcrypt.hash(PASSWORD, 10);
  const now = new Date();
  const snaps = [];
  // Ensure a third regular if missing
  const third = `${PREFIX}-regular-extra@invistimo.test`;
  const emails = [...REGULAR_EMAILS];
  if (!(await mongo.collection("users").findOne({ email: third }))) {
    emails.push(third);
  } else {
    emails.push(third);
  }

  for (let i = 0; i < emails.length; i += 1) {
    const email = emails[i];
    await mongo.collection("users").updateOne(
      { email },
      {
        $set: {
          email,
          name: `[FS-LAB] Regular ${i + 1}`,
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
    const user = await mongo.collection("users").findOne({ email });
    const title = `[FS-LAB] Regular Event ${i + 1}`;
    await mongo.collection("events").updateOne(
      { email, title },
      {
        $set: {
          userId: user._id,
          email,
          title,
          eventType: "wedding",
          date: `2026-1${i + 1}-15`,
          time: "18:00",
          status: "active",
          paymentStatus: "paid",
          maxGuests: 80,
          isStagingFixture: true,
          updatedAt: now,
        },
        $unset: {
          venueOwnerId: "",
          venueHallId: "",
          venueHallName: "",
          venueAccessStatus: "",
        },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true }
    );
    const ev = await mongo.collection("events").findOne({ email, title });
    let inv = await mongo.collection("invitations").findOne({
      eventId: ev._id,
      isStagingFixture: true,
    });
    if (!inv) {
      const invId = new ObjectId();
      await mongo.collection("invitations").insertOne({
        _id: invId,
        eventId: ev._id,
        userId: user._id,
        ownerId: user._id,
        shareId: `fslab-reg-${String(ev._id).slice(-6)}`,
        title,
        isStagingFixture: true,
        createdAt: now,
        updatedAt: now,
      });
      inv = await mongo.collection("invitations").findOne({ _id: invId });
    }
    const gCount = await mongo
      .collection("invitationguests")
      .countDocuments({ invitationId: inv._id });
    if (gCount < 15) {
      // Only remove prior FS-LAB regular fixtures — never wipe real Regular guests.
      await mongo.collection("invitationguests").deleteMany({
        invitationId: inv._id,
        $or: [
          { isStagingFixture: true },
          { name: { $regex: "^\\[FS-LAB-REG\\]" } },
          { token: { $regex: `^(fslab-reg-${i}-|${PREFIX}-reg-${i}-)` } },
        ],
      });
      const docs = [];
      for (let g = 1; g <= 20; g += 1) {
        const rsvp = g % 5 === 0 ? "no" : g % 3 === 0 ? "pending" : "yes";
        docs.push({
          eventId: ev._id,
          invitationId: inv._id,
          userId: user._id,
          name: `[FS-LAB-REG] Guest ${g}`,
          phone: `0508${String(100000 + g + i * 100).slice(-6)}`,
          rsvp,
          status: rsvp,
          guestsCount: g % 2 === 0 ? 2 : 1,
          actualArrivedCount: rsvp === "yes" && g <= 2 ? 1 : 0,
          token: `${PREFIX}-reg-${i}-${g}-${String(inv._id).slice(-4)}`,
          isStagingFixture: true,
          createdAt: now,
          updatedAt: now,
        });
      }
      await mongo.collection("invitationguests").insertMany(docs);
    }
    snaps.push(await snapshotRegular(mongo, email));
  }
  return snaps;
}

async function snapshotRegular(mongo, email) {
  const user = await mongo.collection("users").findOne({ email });
  if (!user) return null;
  const ev = await mongo.collection("events").findOne({
    $or: [{ userId: user._id }, { userId: String(user._id) }],
    title: /Regular|FS-LAB/i,
  });
  if (!ev) {
    return { email, userId: String(user._id), eventId: null };
  }
  const inv = await mongo.collection("invitations").findOne({
    $or: [{ eventId: ev._id }, { userId: user._id }],
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
    email,
    userId: String(user._id),
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

function makeTables(label, n = 10, reserveLast = true) {
  const tables = [];
  for (let t = 1; t <= n; t += 1) {
    tables.push({
      id: `${label}-t${t}`,
      name: `שולחן ${t}`,
      type: t % 3 === 0 ? "rect" : "round",
      x: 60 + ((t - 1) % 5) * 130,
      y: 60 + Math.floor((t - 1) / 5) * 130,
      seats: t % 2 === 0 ? 10 : 8,
      capacity: t % 2 === 0 ? 10 : 8,
      seatedGuests: [],
      reserved: reserveLast && t === n,
    });
  }
  return tables;
}

function guestPayload(n, tag) {
  const guests = [];
  for (let i = 1; i <= n; i += 1) {
    const rsvp = i % 7 === 0 ? "no" : i % 4 === 0 ? "pending" : "yes";
    guests.push({
      name: `${tag} Guest ${i}`,
      phone: `050${String(2000000 + i).slice(-7)}`,
      guestsCount: i % 5 === 0 ? 4 : i % 2 === 0 ? 2 : 1,
      rsvp,
      status: rsvp,
      relation: i % 2 === 0 ? "bride" : "groom",
      notes: i % 11 === 0 ? "family" : "",
    });
  }
  return guests;
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
    productionPilot: "NOT_TOUCHED",
    venuePilotMode: "OFF",
    generalVenueRollout: "OFF",
    venues: {},
    stats: {
      leadsCreated: 0,
      leadsConverted: 0,
      leadsLost: 0,
      couplesActivated: 0,
      couplesLoggedIn: 0,
      events: 0,
      venueEvents: 0,
      templates: 0,
      guests: 0,
      rsvpYes: 0,
      rsvpNo: 0,
      rsvpPending: 0,
      menus: 0,
      tasks: 0,
      equipment: 0,
      dayOfEvents: 0,
      arrivals: 0,
    },
    employeesByRole: Object.fromEntries(
      ["OWNER", ...ROLES].map((r) => [r, 0])
    ),
    coupleFlows: [],
    bugs: [],
  };

  // ---- Regular BEFORE ----
  const regularBefore = await ensureRegulars(mongo);
  report.regularBefore = regularBefore;
  check(
    "regulars_ready",
    regularBefore.length >= 3 &&
      regularBefore.every((r) => r?.eventId && r.guestCount >= 15),
    regularBefore.map((r) => ({
      email: r.email,
      guests: r.guestCount,
      venue: r.venueEvent,
    }))
  );
  check(
    "regulars_not_venue_linked",
    regularBefore.every(
      (r) => !r.venueEvent && r.venueAccessStatus !== "linked"
    ),
    regularBefore.map((r) => r.venueAccessStatus)
  );

  // ---- Owners ----
  const owners = {};
  for (const v of VENUE_DEFS) {
    const email = `${PREFIX}-owner-${v.key.toLowerCase()}@invistimo.test`;
    owners[v.key] = {
      email,
      user: await upsertUser(mongo, email, `[FS-LAB] Owner ${v.key}`),
    };
    report.employeesByRole.OWNER += 1;
  }
  // Owner A also gets a second hall later (multi-hall owner)
  const sharedEmail = `${PREFIX}-shared@invistimo.test`;
  const sharedUser = await upsertUser(
    mongo,
    sharedEmail,
    "[FS-LAB] Shared Owner"
  );
  // Cross-venue employees
  const crossXEmail = `${PREFIX}-cross-x@invistimo.test`;
  const crossYEmail = `${PREFIX}-cross-y@invistimo.test`;

  // ---- Create halls ----
  for (const v of VENUE_DEFS) {
    const lg = await login(owners[v.key].email);
    check(`owner_${v.key}_login`, lg.ok, lg.status);
    const hallRes = await request("POST", "/api/venues/dashboard/halls", {
      token: lg.token,
      body: {
        name: `[FS-LAB] ${PREFIX} ${v.name}`,
        subtitle: `${v.name} · Staging full-scale lab`,
        capacity: v.capacity,
        status: "active",
        address: `Staging Street ${v.key} 1, Tel Aviv`,
      },
    });
    const hallId = hallRes.json?.hall?.id;
    check(`hall_${v.key}_create`, hallRes.status === 200 && !!hallId, {
      status: hallRes.status,
      hallId,
      msg: hallRes.json?.message,
    });
    report.venues[v.key] = {
      hallId,
      ownerEmail: owners[v.key].email,
      ownerId: String(owners[v.key].user._id),
      employees: {},
      leads: {},
      templates: [],
      menus: [],
      couples: [],
      events: [],
    };
  }

  // Second hall for Owner A (multi-hall)
  {
    const lg = await login(owners.A.email);
    const hall2 = await request("POST", "/api/venues/dashboard/halls", {
      token: lg.token,
      body: {
        name: `[FS-LAB] ${PREFIX} Hall A2 Annex`,
        capacity: 90,
        status: "active",
      },
    });
    const hallA2 = hall2.json?.hall?.id;
    check("owner_A_second_hall", hall2.status === 200 && !!hallA2, hallA2);
    report.venues.A2 = {
      hallId: hallA2,
      ownerEmail: owners.A.email,
      ownerId: String(owners.A.user._id),
      employees: {},
      leads: {},
      templates: [],
      menus: [],
      couples: [],
      events: [],
    };
  }

  // Shared memberships: A=MANAGER, B=VIEWER, C=SALES
  async function addEmployee(ownerEmail, hallId, body) {
    const lg = await login(ownerEmail);
    return request(
      "POST",
      `/api/venues/dashboard/halls/${encodeURIComponent(hallId)}/employees`,
      { token: lg.token, body }
    );
  }

  for (const [hallKey, role] of [
    ["A", "MANAGER"],
    ["B", "VIEWER"],
    ["C", "SALES"],
  ]) {
    const res = await addEmployee(owners[hallKey].email, report.venues[hallKey].hallId, {
      name: "[FS-LAB] Shared",
      email: sharedEmail,
      password: PASSWORD,
      role,
      createEmployeeRecord: false,
    });
    check(
      `shared_on_${hallKey}_${role}`,
      res.status === 200 || res.json?.success,
      { status: res.status, msg: res.json?.message }
    );
  }

  // Per-venue employees all roles
  for (const v of VENUE_DEFS) {
    const hallId = report.venues[v.key].hallId;
    for (const role of ROLES) {
      const email = `${PREFIX}-${v.key.toLowerCase()}-${role.toLowerCase()}@invistimo.test`;
      const res = await addEmployee(owners[v.key].email, hallId, {
        name: `[FS-LAB] ${v.key} ${role}`,
        email,
        password: PASSWORD,
        role,
        jobTitle: role,
        createEmployeeRecord: true,
      });
      const ok = res.status === 200 && res.json?.success !== false;
      report.venues[v.key].employees[role] = {
        email,
        ok,
        status: res.status,
        membershipId: res.json?.membership?.id,
        userId: res.json?.user?.id,
      };
      if (ok) report.employeesByRole[role] += 1;
      check(`emp_${v.key}_${role}`, ok, {
        status: res.status,
        msg: res.json?.message,
      });
    }
  }

  // Cross user X: A=MANAGER (already have manager) → use dedicated: A MANAGER override as separate? Use X as EVENT_MANAGER on A and VIEWER on B
  {
    const r1 = await addEmployee(owners.A.email, report.venues.A.hallId, {
      name: "[FS-LAB] Cross X",
      email: crossXEmail,
      password: PASSWORD,
      role: "MANAGER",
      createEmployeeRecord: true,
    });
    const r2 = await addEmployee(owners.B.email, report.venues.B.hallId, {
      name: "[FS-LAB] Cross X",
      email: crossXEmail,
      password: PASSWORD,
      role: "VIEWER",
      createEmployeeRecord: false,
    });
    check("cross_x_A_manager", r1.status === 200, r1.status);
    check("cross_x_B_viewer", r2.status === 200, r2.status);
    const r3 = await addEmployee(owners.B.email, report.venues.B.hallId, {
      name: "[FS-LAB] Cross Y",
      email: crossYEmail,
      password: PASSWORD,
      role: "EVENT_MANAGER",
      createEmployeeRecord: true,
    });
    const r4 = await addEmployee(owners.C.email, report.venues.C.hallId, {
      name: "[FS-LAB] Cross Y",
      email: crossYEmail,
      password: PASSWORD,
      role: "STAFF",
      createEmployeeRecord: false,
    });
    check("cross_y_B_event_manager", r3.status === 200, r3.status);
    check("cross_y_C_staff", r4.status === 200, r4.status);
  }

  // Role permission probes (venue A)
  {
    const hallA = report.venues.A.hallId;
    const hallB = report.venues.B.hallId;
    for (const role of ["MANAGER", "VIEWER", "RECEPTION", "SALES", "STAFF"]) {
      const email = report.venues.A.employees[role]?.email;
      if (!email) continue;
      const lg = await login(email);
      check(`login_A_${role}`, lg.ok, lg.status);
      const crm = await request(
        "GET",
        `/api/venues/dashboard/halls/${encodeURIComponent(hallA)}/crm`,
        { token: lg.token }
      );
      const emp = await request(
        "GET",
        `/api/venues/dashboard/halls/${encodeURIComponent(hallA)}/employees`,
        { token: lg.token }
      );
      const cross = await request(
        "GET",
        `/api/venues/dashboard/halls/${encodeURIComponent(hallB)}/crm`,
        { token: lg.token }
      );
      check(
        `perm_A_${role}_crm`,
        [200, 403].includes(crm.status),
        crm.status
      );
      check(
        `perm_A_${role}_cross_B_denied`,
        [403, 404].includes(cross.status),
        cross.status
      );
      if (role === "VIEWER" || role === "STAFF" || role === "RECEPTION") {
        check(
          `perm_A_${role}_employees_denied_or_limited`,
          [200, 403].includes(emp.status),
          emp.status
        );
      }
    }
    // Cross X role difference
    const xLogin = await login(crossXEmail);
    const xMy = await request("GET", "/api/venues/dashboard/my-venues", {
      token: xLogin.token,
    });
    const xIds = (xMy.json?.venues || []).map((v) => v.venueId || v.id);
    check(
      "cross_x_sees_A_and_B",
      xIds.includes(hallA) && xIds.includes(hallB),
      xIds
    );
  }

  // Disable/enable + reset password on Staff A
  {
    const hallA = report.venues.A.hallId;
    const owner = await login(owners.A.email);
    const list = await request(
      "GET",
      `/api/venues/dashboard/halls/${encodeURIComponent(hallA)}/employees`,
      { token: owner.token }
    );
    const staff = (list.json?.employees || list.json?.memberships || []).find(
      (e) =>
        String(e.email || "").toLowerCase() ===
        String(report.venues.A.employees.STAFF?.email || "").toLowerCase()
    );
    const membershipId = staff?.membershipId || staff?.id;
    if (membershipId) {
      const dis = await request(
        "PATCH",
        `/api/venues/dashboard/halls/${encodeURIComponent(hallA)}/employees`,
        {
          token: owner.token,
          body: { action: "disable", membershipId, id: membershipId },
        }
      );
      // some APIs use PUT
      const dis2 =
        dis.status === 200
          ? dis
          : await request(
              "PUT",
              `/api/venues/dashboard/halls/${encodeURIComponent(hallA)}/employees`,
              {
                token: owner.token,
                body: { action: "disable", membershipId, id: membershipId },
              }
            );
      check("employee_disable", dis2.status === 200, dis2.status);
      const blocked = await login(report.venues.A.employees.STAFF.email);
      const blockedDash = await request(
        "GET",
        `/api/venues/dashboard/halls/${encodeURIComponent(hallA)}/day-of`,
        { token: blocked.token }
      );
      check(
        "disabled_staff_blocked",
        blockedDash.status === 403 || !blocked.ok,
        { login: blocked.ok, dash: blockedDash.status }
      );
      await request(
        "PUT",
        `/api/venues/dashboard/halls/${encodeURIComponent(hallA)}/employees`,
        {
          token: owner.token,
          body: { action: "enable", membershipId, id: membershipId },
        }
      );
      const reset = await request(
        "PUT",
        `/api/venues/dashboard/halls/${encodeURIComponent(hallA)}/employees`,
        {
          token: owner.token,
          body: {
            action: "resetPassword",
            membershipId,
            id: membershipId,
            password: PASSWORD,
          },
        }
      );
      check(
        "employee_reset_password",
        [200, 400].includes(reset.status) || reset.json?.success,
        reset.status
      );
    } else {
      check("employee_disable", false, "no membershipId");
    }
  }

  // ---- Per venue: templates, menus, leads, convert, activate couples ----
  for (const v of VENUE_DEFS) {
    const hallId = report.venues[v.key].hallId;
    const ownerLogin = await login(owners[v.key].email);
    const H = encodeURIComponent(hallId);

    // 3 seating templates
    for (const size of [
      { k: "small", n: 6 },
      { k: "medium", n: 10 },
      { k: "large", n: 16 },
    ]) {
      const res = await request("POST", "/api/venues/dashboard/seating-templates", {
        token: ownerLogin.token,
        body: {
          hallId,
          name: `[FS-LAB] ${v.key} ${size.k} ${PREFIX}`,
          description: `${size.k} layout`,
          tables: makeTables(`${v.key}-${size.k}`, size.n),
        },
      });
      const tid = res.json?.template?._id || res.json?.template?.id;
      check(`tpl_${v.key}_${size.k}`, res.status === 200 && !!tid, {
        status: res.status,
        tid,
      });
      if (tid) {
        report.venues[v.key].templates.push(String(tid));
        report.stats.templates += 1;
      }
    }
    // duplicate + edit first
    if (report.venues[v.key].templates[0]) {
      const dup = await request("POST", "/api/venues/dashboard/seating-templates", {
        token: ownerLogin.token,
        body: {
          action: "duplicate",
          hallId,
          templateId: report.venues[v.key].templates[0],
        },
      });
      check(
        `tpl_${v.key}_duplicate_attempt`,
        [200, 201, 400, 404].includes(dup.status),
        dup.status
      );
      const edit = await request("PUT", "/api/venues/dashboard/seating-templates", {
        token: ownerLogin.token,
        body: {
          hallId,
          templateId: report.venues[v.key].templates[0],
          name: `[FS-LAB] ${v.key} small edited ${PREFIX}`,
          tables: makeTables(`${v.key}-small-e`, 6),
        },
      });
      check(`tpl_${v.key}_edit`, edit.status === 200, edit.status);
    }

    // Menus
    for (const m of ["Standard", "Premium", "Vegetarian"]) {
      const menu = await request("POST", `/api/venues/dashboard/halls/${H}/menus`, {
        token: ownerLogin.token,
        body: {
          name: `[FS-LAB] ${v.key} ${m} ${PREFIX}`,
          type: m.toLowerCase(),
          status: "active",
          categories: [
            {
              name: "מנות ראשונות",
              dishes: [
                { name: `${m} Salad`, description: "lab", price: 0 },
                { name: `${m} Soup`, description: "lab", price: 0 },
              ],
            },
            {
              name: "עיקריות",
              dishes: [{ name: `${m} Main`, description: "lab", price: 0 }],
            },
          ],
        },
      });
      const mid = menu.json?.menu?._id || menu.json?.menu?.id;
      check(`menu_${v.key}_${m}`, menu.status === 200 && !!mid, menu.status);
      if (mid) {
        report.venues[v.key].menus.push(String(mid));
        report.stats.menus += 1;
      }
    }

    // Equipment + task + staff schedule
    const equip = await request(
      "POST",
      `/api/venues/dashboard/halls/${H}/equipment`,
      {
        token: ownerLogin.token,
        body: {
          action: "create_item",
          name: `[FS-LAB] ${v.key} Chairs`,
          quantity: 200,
        },
      }
    );
    check(`equip_${v.key}`, equip.status === 200, equip.status);
    if (equip.status === 200) report.stats.equipment += 1;

    const task = await request("POST", "/api/venues/dashboard/tasks", {
      token: ownerLogin.token,
      body: {
        hallId,
        title: `[FS-LAB] ${v.key} follow-up`,
        due: "השבוע",
        priority: "high",
        area: "מכירות",
      },
    });
    check(`task_${v.key}`, task.status === 200, task.status);
    if (task.status === 200) report.stats.tasks += 1;

    const weekStart = "2026-11-02";
    const sched = await request(
      "PUT",
      `/api/venues/dashboard/halls/${H}/staff`,
      {
        token: ownerLogin.token,
        body: {
          action: "saveSchedule",
          weekStart,
          shifts: [
            {
              id: `sh-${v.key}-1`,
              date: "2026-11-05",
              startTime: "16:00",
              endTime: "23:00",
              role: "RECEPTION",
              employeeEmail: report.venues[v.key].employees.RECEPTION?.email,
            },
          ],
          absences: [],
        },
      }
    );
    check(`shifts_${v.key}`, sched.status === 200, sched.status);

    // Leads: pipeline statuses + one dedicated convert lead per couple
    const leadStatuses = [
      { key: "new", status: "new" },
      { key: "contacted", status: "contacted" },
      { key: "proposal", status: "proposal" },
      { key: "lost", status: "lost" },
    ];
    for (let ci = 1; ci <= v.couples; ci += 1) {
      leadStatuses.push({
        key: `convert${ci}`,
        status: ci % 2 === 0 ? "meeting" : "negotiation",
      });
    }
    // Fresh owner session before CRM mutations (avoid stale cookie jar)
    let venueOwner = await login(owners[v.key].email);
    check(`owner_relogin_${v.key}`, venueOwner.ok, venueOwner.status);
    for (const ld of leadStatuses) {
      const res = await request("POST", `/api/venues/dashboard/halls/${H}/crm`, {
        token: venueOwner.token,
        body: {
          name: `[FS-LAB] ${v.key} Lead ${ld.key}`,
          phone: "0501234567",
          email: `${PREFIX}-${v.key.toLowerCase()}-${ld.key}@example.com`,
          eventType: "wedding",
          requestedDate: "2026-11-20",
          guests: v.guestsBig ? 220 : 90,
          budget: 70000,
          source: "full-scale-lab",
          owner: "FS Sales",
          status: ld.status,
        },
      });
      const id = res.json?.lead?.id || res.json?.lead?._id;
      check(`lead_${v.key}_${ld.key}`, res.status === 200 && !!id, {
        status: res.status,
        msg: res.json?.message,
      });
      if (id) {
        report.venues[v.key].leads[ld.key] = String(id);
        report.stats.leadsCreated += 1;
        if (ld.key === "lost") report.stats.leadsLost += 1;
      }
    }

    // Convert N unique leads → couples (one fresh lead per couple; never reuse)
    const templates = report.venues[v.key].templates;
    const menuIds = report.venues[v.key].menus;
    const coupleTarget = Number(v.couples) || 0;
    check(`couple_target_${v.key}`, coupleTarget >= 2, coupleTarget);
    for (let ci = 1; ci <= coupleTarget; ci += 1) {
      try {
      venueOwner = await login(owners[v.key].email);
      const leadId = report.venues[v.key].leads[`convert${ci}`] || null;
      check(`convert_${v.key}_${ci}_lead`, !!leadId, {
        leadKey: `convert${ci}`,
        leads: Object.keys(report.venues[v.key].leads),
      });
      if (!leadId) continue;
      const date = `2026-11-${String(10 + ci + (v.key.charCodeAt(0) % 5)).padStart(2, "0")}`;
      const convert = await request(
        "PUT",
        `/api/venues/dashboard/halls/${H}/crm`,
        {
          token: venueOwner.token,
          body: {
            action: "closeEvent",
            leadId,
            date,
            startTime: "18:00",
            endTime: "01:00",
            notes: `FS-LAB convert ${v.key}-${ci}`,
          },
        }
      );
      const eventId =
        convert.json?.eventId ||
        convert.json?.linkedEventId ||
        convert.json?.event?._id ||
        convert.json?.event?.id ||
        null;
      check(
        `convert_${v.key}_${ci}`,
        convert.status === 200 && !!eventId,
        {
          status: convert.status,
          eventId,
          msg: convert.json?.message,
          keys: convert.json ? Object.keys(convert.json) : [],
        }
      );
      if (!eventId) continue;
      report.stats.leadsConverted += 1;
      report.stats.events += 1;
      report.stats.venueEvents += 1;

      // idempotent second convert
      const again = await request(
        "PUT",
        `/api/venues/dashboard/halls/${H}/crm`,
        {
          token: venueOwner.token,
          body: { action: "closeEvent", leadId, date },
        }
      );
      check(
        `convert_idempotent_${v.key}_${ci}`,
        again.status === 200 &&
          (again.json?.alreadyExisted === true ||
            String(again.json?.eventId || eventId) === String(eventId)),
        { status: again.status, already: again.json?.alreadyExisted }
      );

      const tplId = templates[(ci - 1) % templates.length];
      const menuId = menuIds[(ci - 1) % menuIds.length];

      // assign menu
      if (menuId) {
        const am = await request(
          "POST",
          `/api/venues/dashboard/events/${eventId}/menu`,
          {
            token: venueOwner.token,
            body: { templateId: menuId, hallId },
          }
        );
        check(
          `menu_assign_${v.key}_${ci}`,
          am.status === 200 || am.status === 201,
          am.status
        );
      }

      // client invite + activate
      const invite = await request(
        "POST",
        `/api/venues/dashboard/events/${eventId}/client-invite`,
        {
          token: venueOwner.token,
          body: { seatingTemplateId: tplId, packageType: "seating_only" },
        }
      );
      let token =
        invite.json?.invite?.venueClientInviteToken ||
        (String(invite.json?.registrationLink || "").match(
          /venueInviteToken=([^&]+)/
        ) || [])[1];
      if (token) {
        try {
          token = decodeURIComponent(token);
        } catch {}
      }
      check(`invite_${v.key}_${ci}`, invite.status === 200 && !!token, {
        status: invite.status,
      });

      const custEmail = `${PREFIX}-couple-${v.key.toLowerCase()}-${ci}@invistimo.test`;
      const hash = await bcrypt.hash(PASSWORD, 10);
      await mongo.collection("users").updateOne(
        { email: custEmail },
        {
          $set: {
            email: custEmail,
            name: `[FS-LAB] Couple ${v.key}${ci}`,
            password: hash,
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
      const cust = await mongo.collection("users").findOne({ email: custEmail });
      const complete = await request(
        "POST",
        "/api/venues/client-registration/complete",
        {
          body: {
            venueInviteToken: token,
            userId: String(cust._id),
            email: custEmail,
            packageType: "seating_only",
            recordsCount: v.guestsBig ? 220 : 120,
          },
        }
      );
      check(
        `activate_${v.key}_${ci}`,
        complete.status === 200 && complete.json?.success !== false,
        { status: complete.status, msg: complete.json?.message }
      );
      const invitationId = complete.json?.invitationId || null;
      if (complete.status === 200) report.stats.couplesActivated += 1;

      const custLogin = await login(custEmail);
      check(`couple_login_${v.key}_${ci}`, custLogin.ok, custLogin.status);
      if (custLogin.ok) report.stats.couplesLoggedIn += 1;

      // no venue shell
      const leak = await request(
        "GET",
        `/api/venues/dashboard/halls/${H}`,
        { token: custLogin.token }
      );
      check(
        `couple_no_venue_${v.key}_${ci}`,
        [401, 403, 404].includes(leak.status),
        leak.status
      );

      // guests
      const guestN = v.guestsBig && ci === 1 ? 110 : 40;
      const imported = await request("POST", "/api/guests/import", {
        token: custLogin.token,
        body: {
          invitationId,
          guests: guestPayload(guestN, `${v.key}${ci}`),
        },
      });
      const importedN =
        imported.json?.imported || imported.json?.count || 0;
      check(
        `guests_${v.key}_${ci}`,
        imported.status === 200 && importedN >= guestN * 0.9,
        { status: imported.status, importedN, msg: imported.json?.message }
      );
      report.stats.guests += importedN || guestN;

      const glist = await request(
        "GET",
        `/api/guests?invitation=${encodeURIComponent(invitationId || "")}`,
        { token: custLogin.token }
      );
      const guests = glist.json?.guests || [];
      // RSVP flips
      let yes = 0,
        no = 0,
        pending = 0;
      for (const g of guests) {
        const st = String(g.rsvp || g.status || "pending").toLowerCase();
        if (st === "yes") yes += 1;
        else if (st === "no") no += 1;
        else pending += 1;
      }
      if (guests[0]) {
        await request("PUT", `/api/guests/${guests[0]._id || guests[0].id}`, {
          token: custLogin.token,
          body: { rsvp: "no", status: "no" },
        });
        await request("PUT", `/api/guests/${guests[0]._id || guests[0].id}`, {
          token: custLogin.token,
          body: { rsvp: "yes", status: "yes", guestsCount: 2 },
        });
      }
      report.stats.rsvpYes += yes;
      report.stats.rsvpNo += no;
      report.stats.rsvpPending += pending;

      // seating by customer
      const seatGet = await request(
        "GET",
        `/api/seating/tables/${eventId}`,
        { token: custLogin.token }
      );
      const tables = seatGet.json?.tables || [];
      check(
        `seating_auto_${v.key}_${ci}`,
        seatGet.status === 200 && tables.length >= 3,
        { status: seatGet.status, tables: tables.length }
      );
      if (tables.length && guests.length) {
        const next = structuredClone(tables);
        const yesGuests = guests
          .filter((g) => String(g.rsvp || g.status) === "yes")
          .slice(0, Math.min(12, tables.length * 2));
        let gi = 0;
        for (let ti = 0; ti < next.length - 1 && gi < yesGuests.length; ti += 1) {
          const chunk = yesGuests.slice(gi, gi + 2);
          gi += chunk.length;
          next[ti].seatedGuests = chunk.map((g) => ({
            guestId: String(g._id || g.id),
            name: g.name,
            seats: Number(g.guestsCount || 1),
          }));
        }
        if (next[next.length - 1]) next[next.length - 1].reserved = true;
        const save = await request(
          "POST",
          `/api/seating/save/${eventId}`,
          {
            token: custLogin.token,
            body: { invitationId, tables: next },
          }
        );
        check(
          `seating_save_${v.key}_${ci}`,
          save.status === 200 && save.json?.success !== false,
          save.status
        );

        // owner live sync rename
        const o2 = await login(owners[v.key].email);
        const vv = await request(
          "GET",
          `/api/seating/tables/${eventId}?venueView=1`,
          { token: o2.token }
        );
        const seated = (vv.json?.tables || []).reduce(
          (n, t) =>
            n + (Array.isArray(t.seatedGuests) ? t.seatedGuests.length : 0),
          0
        );
        check(
          `live_sync_owner_${v.key}_${ci}`,
          vv.status === 200 && seated >= 1,
          { status: vv.status, seated }
        );
        // template rename sync
        if (tplId) {
          const baseTables = structuredClone(vv.json?.tables || tables);
          if (baseTables[0]) baseTables[0].name = `כבוד ${v.key}${ci}`;
          const put = await request(
            "PUT",
            "/api/venues/dashboard/seating-templates",
            {
              token: o2.token,
              body: {
                hallId,
                templateId: tplId,
                name: `[FS-LAB] ${v.key} live ${ci}`,
                tables: baseTables,
                confirmDestructive: true,
              },
            }
          );
          check(
            `venue_to_client_tpl_${v.key}_${ci}`,
            put.status === 200,
            put.status
          );
        }
      }

      // Day-of for first couple of A, B, and C
      if ((v.key === "A" || v.key === "B" || v.key === "C") && ci === 1 && guests[0]) {
        const reception = report.venues[v.key].employees.RECEPTION?.email;
        const rLogin = reception
          ? await login(reception)
          : await login(owners[v.key].email);
        const dayGet = await request(
          "GET",
          `/api/venues/dashboard/halls/${H}/day-of?date=${date}`,
          { token: rLogin.token }
        );
        check(`dayof_get_${v.key}`, dayGet.status === 200, dayGet.status);
        const arrive = await request(
          "PATCH",
          `/api/venues/dashboard/halls/${H}/day-of`,
          {
            token: rLogin.token,
            body: {
              action: "mark_arrived",
              eventId,
              guestId: String(guests[0]._id || guests[0].id),
            },
          }
        );
        check(
          `dayof_arrive_${v.key}`,
          arrive.status === 200 && arrive.json?.success !== false,
          { status: arrive.status, msg: arrive.json?.message }
        );
        if (arrive.status === 200) {
          report.stats.dayOfEvents += 1;
          report.stats.arrivals += 1;
        }
        // viewer read-only / staff blocked if no permission
        const viewer = report.venues[v.key].employees.VIEWER?.email;
        if (viewer) {
          const vLogin = await login(viewer);
          const vDay = await request(
            "GET",
            `/api/venues/dashboard/halls/${H}/day-of?date=${date}`,
            { token: vLogin.token }
          );
          check(
            `dayof_viewer_${v.key}`,
            [200, 403].includes(vDay.status),
            vDay.status
          );
        }
      }

      const coupleRec = {
        venue: v.key,
        index: ci,
        email: custEmail,
        eventId: String(eventId),
        invitationId,
        templateId: tplId,
        menuId,
        guests: guests.length || guestN,
        date,
      };
      report.venues[v.key].couples.push(coupleRec);
      report.venues[v.key].events.push(String(eventId));
      if (report.coupleFlows.length < 3) {
        report.coupleFlows.push({
          ...coupleRec,
          flow:
            "Lead → Client → Event → VenueEvent → activation → guests → RSVP → seating → sync → day-of",
          pass: true,
        });
      }
      } catch (coupleErr) {
        check(`couple_exception_${v.key}_${ci}`, false, {
          error: String(coupleErr?.message || coupleErr),
          stack: String(coupleErr?.stack || "").slice(0, 400),
        });
      }
    }
    check(
      `venue_${v.key}_couples_count`,
      report.venues[v.key].couples.length >= coupleTarget,
      {
        got: report.venues[v.key].couples.length,
        want: coupleTarget,
      }
    );

    // Reports / activity / alerts / calendar / customers
    for (const [name, path] of [
      ["reports", `/api/venues/dashboard/halls/${H}/reports?months=6`],
      ["activity", `/api/venues/dashboard/halls/${H}/activity?limit=50`],
      ["alerts", `/api/venues/dashboard/halls/${H}/alerts?limit=30`],
      [
        "calendar",
        `/api/venues/dashboard/halls/${H}/calendar?from=2026-01-01&to=2027-12-31`,
      ],
      ["customers", `/api/venues/dashboard/halls/${H}/customers`],
      ["files", `/api/venues/dashboard/halls/${H}/files`],
    ]) {
      const o = await login(owners[v.key].email);
      const res = await request("GET", path, { token: o.token });
      check(`mod_${v.key}_${name}`, res.status === 200, res.status);
    }
  }

  // Cross-tenant attack: Venue A owner → Venue B resources
  {
    const a = await login(owners.A.email);
    const bHall = report.venues.B.hallId;
    const bEvent = report.venues.B.events[0];
    const attacks = [
      `/api/venues/dashboard/halls/${encodeURIComponent(bHall)}/crm`,
      `/api/venues/dashboard/halls/${encodeURIComponent(bHall)}/menus`,
      `/api/venues/dashboard/halls/${encodeURIComponent(bHall)}/employees`,
      `/api/venues/dashboard/halls/${encodeURIComponent(bHall)}/equipment`,
      `/api/venues/dashboard/halls/${encodeURIComponent(bHall)}/files`,
      `/api/venues/dashboard/halls/${encodeURIComponent(bHall)}/reports?months=3`,
      `/api/venues/dashboard/halls/${encodeURIComponent(bHall)}/activity?limit=10`,
    ];
    if (bEvent) {
      attacks.push(`/api/venues/dashboard/events/${bEvent}`);
      attacks.push(`/api/seating/tables/${bEvent}?venueView=1`);
    }
    let denied = 0;
    for (const path of attacks) {
      const res = await request("GET", path, { token: a.token });
      if ([401, 403, 404].includes(res.status)) denied += 1;
      else check(`attack_unexpected_${path}`, false, res.status);
    }
    check(
      "cross_tenant_denied",
      denied === attacks.length,
      { denied, total: attacks.length }
    );
  }

  // Template isolation: couple A1 seating table count != couple B1 if different templates
  {
    const a1 = report.venues.A.couples[0];
    const b1 = report.venues.B.couples[0];
    if (a1 && b1) {
      check(
        "template_assignment_different",
        String(a1.templateId) !== String(b1.templateId) ||
          a1.venue !== b1.venue,
        { a: a1.templateId, b: b1.templateId }
      );
    }
  }

  // Shared switcher
  {
    const s = await login(sharedEmail);
    const my = await request("GET", "/api/venues/dashboard/my-venues", {
      token: s.token,
    });
    const ids = (my.json?.venues || []).map((v) => v.venueId || v.id);
    check(
      "shared_switcher_ABC",
      ids.includes(report.venues.A.hallId) &&
        ids.includes(report.venues.B.hallId) &&
        ids.includes(report.venues.C.hallId),
      ids
    );
    // access A ok, D denied
    const aOk = await request(
      "GET",
      `/api/venues/dashboard/halls/${encodeURIComponent(report.venues.A.hallId)}/crm`,
      { token: s.token }
    );
    const dNo = await request(
      "GET",
      `/api/venues/dashboard/halls/${encodeURIComponent(report.venues.D.hallId)}/crm`,
      { token: s.token }
    );
    check("shared_A_allowed", aOk.status === 200, aOk.status);
    check("shared_D_denied", [403, 404].includes(dNo.status), dNo.status);
  }

  // Multi-hall owner A sees A + A2
  {
    const o = await login(owners.A.email);
    const my = await request("GET", "/api/venues/dashboard/my-venues", {
      token: o.token,
    });
    const ids = (my.json?.venues || []).map((v) => v.venueId || v.id);
    check(
      "owner_A_two_halls",
      ids.includes(report.venues.A.hallId) &&
        ids.includes(report.venues.A2?.hallId),
      ids
    );
  }

  // ---- Regular AFTER ----
  const regularAfter = [];
  for (const r of regularBefore) {
    regularAfter.push(await snapshotRegular(mongo, r.email));
  }
  report.regularAfter = regularAfter;
  let totalDelta = 0;
  for (let i = 0; i < regularBefore.length; i += 1) {
    const d = delta(regularBefore[i], regularAfter[i]);
    totalDelta += d;
    check(`regular_delta_${i}`, d === 0, {
      email: regularBefore[i].email,
      d,
    });
  }
  report.regularDataDelta = totalDelta;

  // Regular browser/API regression
  for (const r of regularAfter) {
    const lg = await login(r.email);
    check(`regular_login_${r.email}`, lg.ok, lg.status);
    const me = await request("GET", "/api/me", { token: lg.token });
    check(`regular_me_${r.email}`, me.status === 200, me.status);
    const venue = await request(
      "GET",
      `/api/venues/dashboard/halls/${encodeURIComponent(report.venues.A.hallId)}`,
      { token: lg.token }
    );
    check(
      `regular_denied_venue_${r.email}`,
      [401, 403, 404].includes(venue.status),
      venue.status
    );
    if (r.invitationId) {
      const g = await request(
        "GET",
        `/api/guests?invitation=${encodeURIComponent(r.invitationId)}`,
        { token: lg.token }
      );
      check(
        `regular_guests_${r.email}`,
        g.status === 200 && (g.json?.guests || []).length >= 10,
        { status: g.status, n: (g.json?.guests || []).length }
      );
    }
  }

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
  check("false_venue_links_0", falseLinks === 0, {
    linked: linked.length,
    falseLinks,
  });

  // Scale sanity — list CRM/calendar with data
  {
    const o = await login(owners.A.email);
    const t0 = Date.now();
    await request(
      "GET",
      `/api/venues/dashboard/halls/${encodeURIComponent(report.venues.A.hallId)}/crm`,
      { token: o.token }
    );
    await request(
      "GET",
      `/api/venues/dashboard/halls/${encodeURIComponent(report.venues.A.hallId)}/reports?months=6`,
      { token: o.token }
    );
    const ms = Date.now() - t0;
    check("scale_sanity_under_15s", ms < 15000, { ms });
  }

  await client.close();

  const failed = checks.filter((c) => !c.pass);
  report.endedAt = new Date().toISOString();
  report.total = checks.length;
  report.passed = checks.length - failed.length;
  report.failed = failed.map((f) => f.name);
  report.checks = checks;

  const coupleFlowPass =
    report.coupleFlows.length >= 3 &&
    report.coupleFlows.every((c) => c.pass) &&
    checks
      .filter((c) => c.name.startsWith("activate_") || c.name.startsWith("seating_save_"))
      .every((c) => c.pass);

  report.FINAL = {
    MULTI_VENUE_FULL_LAB: failed.length === 0 ? "PASS" : "FAIL",
    ALL_EMPLOYEE_ROLES: checks
      .filter((c) => c.name.startsWith("emp_") || c.name.startsWith("login_A_"))
      .every((c) => c.pass)
      ? "PASS"
      : "FAIL",
    MULTIPLE_COUPLES:
      report.stats.couplesActivated >= 8 ? "PASS" : "FAIL",
    VENUE_CREATED_CUSTOMER_FLOW: coupleFlowPass ? "PASS" : "FAIL",
    SEATING_TEMPLATES:
      report.stats.templates >= 12 &&
      checks.filter((c) => c.name.startsWith("tpl_")).every((c) => c.pass)
        ? "PASS"
        : "FAIL",
    RSVP: checks
      .filter((c) => c.name.startsWith("guests_"))
      .every((c) => c.pass)
      ? "PASS"
      : "FAIL",
    LIVE_SYNC: checks
      .filter((c) => c.name.startsWith("live_sync_"))
      .every((c) => c.pass)
      ? "PASS"
      : "FAIL",
    MENUS:
      report.stats.menus >= 12 &&
      checks.filter((c) => c.name.startsWith("menu_")).every((c) => c.pass)
        ? "PASS"
        : "FAIL",
    DAY_OF: checks
      .filter((c) => c.name.startsWith("dayof_"))
      .every((c) => c.pass)
      ? "PASS"
      : "FAIL",
    TENANT_ISOLATION: checks
      .filter(
        (c) =>
          c.name.includes("cross") ||
          c.name.includes("denied") ||
          c.name === "cross_tenant_denied"
      )
      .every((c) => c.pass)
      ? "PASS"
      : "FAIL",
    REGULAR_CUSTOMER_REGRESSION: checks
      .filter((c) => c.name.startsWith("regular_"))
      .every((c) => c.pass)
      ? "PASS"
      : "FAIL",
    REGULAR_DATA_DELTA: totalDelta,
    FALSE_VENUE_LINKS: falseLinks,
    GENERAL_VENUE_ROLLOUT: "OFF",
    VENUE_SUITE_LARGE_SCALE_STAGING_VALIDATION:
      failed.length === 0 &&
      totalDelta === 0 &&
      falseLinks === 0 &&
      report.stats.couplesActivated >= 8
        ? "PASS"
        : "FAIL",
  };

  fs.mkdirSync("/opt/cursor/artifacts", { recursive: true });
  fs.writeFileSync(REPORT, JSON.stringify(report, null, 2));
  console.log(
    JSON.stringify(
      {
        reportPath: REPORT,
        FINAL: report.FINAL,
        stats: report.stats,
        failed: report.failed.slice(0, 40),
        failedCount: report.failed.length,
        passed: report.passed,
        total: report.total,
      },
      null,
      2
    )
  );
  const validationFailed =
    failed.length > 0 ||
    report.FINAL.VENUE_SUITE_LARGE_SCALE_STAGING_VALIDATION !== "PASS";
  process.exit(validationFailed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
