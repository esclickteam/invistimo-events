/**
 * Simulate shift-start exposure for Bat Sheva on 2026-09-23 (read-only).
 * Pass --at-10 to simulate 10:00 Israel. Pass --open to POST auto-open.
 */
import fs from "fs";
import mongoose from "mongoose";

const DATE_KEY = "2026-09-23";
const EMAIL = "batshevaeliasov@gmail.com";
const SHOULD_OPEN = process.argv.includes("--open");
const SIMULATE_AT_10 = process.argv.includes("--at-10");
const TZ = "Asia/Jerusalem";

function loadEnv(path) {
  if (!fs.existsSync(path)) return;
  const raw = fs.readFileSync(path, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (!process.env[k] || path.includes("production")) process.env[k] = v;
  }
}

function toDirect(input) {
  const m = String(input).match(
    /^mongodb\+srv:\/\/([^@]+)@([^/]+)\/([^?]*)(\?.*)?$/i
  );
  if (!m) return input;
  const [, creds, , dbName, qs = ""] = m;
  const hosts = [
    "cluster0-shard-00-00.iit5n.mongodb.net:27017",
    "cluster0-shard-00-01.iit5n.mongodb.net:27017",
    "cluster0-shard-00-02.iit5n.mongodb.net:27017",
  ].join(",");
  const params = new URLSearchParams(qs.startsWith("?") ? qs.slice(1) : qs);
  params.set("ssl", "true");
  params.set("authSource", "admin");
  params.set("replicaSet", "atlas-3i3h0q-shard-0");
  params.delete("appName");
  return `mongodb://${creds}@${hosts}/${dbName}?${params.toString()}`;
}

function tzParts(date) {
  return Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: TZ,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
      .formatToParts(date)
      .filter((x) => x.type !== "literal")
      .map((x) => [x.type, x.value])
  );
}

function dateKey(date) {
  const p = tzParts(date);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

function parseClock(v) {
  const m = String(v || "").trim().match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

function israelMinutes(date) {
  const p = tzParts(date);
  return Number(p.hour) * 60 + Number(p.minute);
}

function extractRounds(container) {
  const arrays = [
    container?.callRoundsSchedule?.rounds,
    container?.callRounds,
  ].filter(Array.isArray);
  const out = [];
  for (const arr of arrays) for (const r of arr) out.push(r);
  return out;
}

loadEnv(".env.local");
loadEnv(".env.production.local");

const now = SIMULATE_AT_10
  ? new Date("2026-09-23T07:00:00.000Z")
  : new Date();

console.log("NOW", now.toISOString(), "israel", dateKey(now), israelMinutes(now));

await mongoose.connect(toDirect(process.env.MONGO_URI));
const db = mongoose.connection.db;

const emp = await db.collection("users").findOne({ email: EMAIL });
const empId = String(emp._id);
const shift = await db.collection("employeeshifts").findOne({
  employeeIdString: empId,
  date: DATE_KEY,
});

const startMinutes = parseClock(shift.startTime);
const endMinutes = parseClock(shift.endTime);
const todayKey = dateKey(now);
const started =
  todayKey > DATE_KEY
    ? true
    : todayKey < DATE_KEY
      ? false
      : israelMinutes(now) >= startMinutes;

console.log("SHIFT", {
  startTime: shift.startTime,
  endTime: shift.endTime,
  startMinutes,
  endMinutes,
  started,
});

const users = await db
  .collection("users")
  .find({
    email: {
      $in: [
        "mali.paz1983@gmail.com",
        "mmaalluull@gmail.com",
        "milananigov29@gmail.com",
      ],
    },
  })
  .toArray();

const exposed = [];
for (const u of users) {
  for (const r of extractRounds(u)) {
    const at = r.scheduledAt ? new Date(r.scheduledAt) : null;
    if (!at) continue;
    const sameDay = dateKey(at) === DATE_KEY;
    const covers =
      sameDay &&
      israelMinutes(at) >= startMinutes &&
      israelMinutes(at) <= endMinutes;
    const due = at.getTime() <= now.getTime();
    const expose = (started && covers) || due;
    exposed.push({
      email: u.email,
      name: u.name,
      round: r.round ?? r.roundNumber,
      scheduledAt: at.toISOString(),
      covers,
      due,
      expose,
    });
  }
}

console.log(JSON.stringify(exposed.filter((x) => x.expose || x.covers), null, 2));
console.log("shouldSee", exposed.filter((x) => x.expose).length, "of", exposed.filter((x) => x.covers).length, "covering");

const wos = await db
  .collection("callworkorders")
  .find({
    assignedEmployeeIds: new mongoose.Types.ObjectId(empId),
  })
  .sort({ _id: -1 })
  .limit(10)
  .toArray();

console.log(
  "recent WOs for her",
  wos.map((w) => ({
    id: String(w._id),
    client: w.clientName,
    round: w.round,
    workDate: w.workDate,
    configuredRoundAt: w.configuredRoundAt,
    status: w.status,
  }))
);

await mongoose.disconnect();

if (SHOULD_OPEN) {
  const secret =
    process.env.CRON_SECRET ||
    process.env.AUTO_OPEN_SECRET ||
    process.env.CALL_WORK_ORDERS_CRON_SECRET ||
    "";
  const base =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.APP_URL ||
    "";
  if (!secret || !base) {
    console.error("Missing CRON_SECRET or APP_URL");
    process.exit(1);
  }
  const url = `${String(base).replace(/\/$/, "")}/api/admin/call-work-orders/auto-open?date=${DATE_KEY}`;
  console.log("POST", url);
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ date: DATE_KEY }),
  });
  console.log("STATUS", res.status);
  console.log((await res.text()).slice(0, 5000));
}
