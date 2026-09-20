/**
 * Seed 50 DEMO guests + call-round history for Aviad & Daniela ONLY.
 *
 * Usage:
 *   node scripts/seed-aviad-daniela-demo-call-rounds.mjs
 *
 * Safety:
 * - Production invite DB only when explicitly pointed via bak env
 * - Only touches invitation 6a915d3f7a40515f2ecf0b40 / owner 69c28821c23e445242f29273
 * - Never deletes existing guests
 * - Idempotent via notes marker [DEMO_CALL_ROUNDS_2026]
 */
import fs from "fs";
import crypto from "crypto";
import mongoose from "mongoose";

const INVITATION_ID = "6a915d3f7a40515f2ecf0b40";
const OWNER_ID = "69c28821c23e445242f29273";
const DEMO_MARKER = "[DEMO_CALL_ROUNDS_2026]";
const DEMO_GROUP_NAME = "דמו בדיקות שיחות";

function getRsvp(guest) {
  const raw = String(guest?.rsvp || guest?.status || "")
    .trim()
    .toLowerCase();
  if (raw === "yes" || raw === "no" || raw === "maybe" || raw === "pending") {
    return raw;
  }
  return "pending";
}

function hasPhone(guest) {
  return String(guest?.phone || "").replace(/\D/g, "").length >= 8;
}

function roundAnswer(guest, round) {
  const match = (guest?.callRounds || []).find(
    (r) => Number(r.roundNumber || r.round || 0) === round
  );
  if (!match) return null;
  if (match.answerStatus === "no_answer" || match.resultStatus === "no_answer") {
    return "no_answer";
  }
  if (match.answerStatus === "answered") return "answered";
  return null;
}

function filterForRound(guests, round) {
  const seen = new Set();
  const out = [];
  for (const guest of guests) {
    if (!hasPhone(guest)) continue;
    const rsvp = getRsvp(guest);
    let ok = false;
    if (round === 1) ok = rsvp === "pending";
    else if (round === 2) {
      ok = rsvp === "pending" && roundAnswer(guest, 1) === "no_answer";
    } else {
      ok =
        rsvp === "maybe" ||
        (rsvp === "pending" &&
          roundAnswer(guest, 1) === "no_answer" &&
          roundAnswer(guest, 2) === "no_answer");
    }
    if (!ok) continue;
    const id = String(guest._id || guest.phone);
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(guest);
  }
  return out;
}

function summarizeRound(guests, round) {
  let answered = 0;
  let noAnswer = 0;
  let remaining = 0;
  for (const guest of guests) {
    const a = roundAnswer(guest, round);
    if (a === "answered") answered += 1;
    else if (a === "no_answer") noAnswer += 1;
    else remaining += 1;
  }
  return { total: guests.length, answered, noAnswer, remaining };
}

function loadEnv(path) {
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
    process.env[k] = v;
  }
}

function toDirectMongoUri(input) {
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

const FIRST_NAMES = [
  "נועה", "יואב", "מאיה", "איתי", "שירה", "עומר", "תמר", "ליאור", "הילה", "רועי",
  "מיכל", "אביב", "יעל", "דניאל", "ענבל", "עידן", "קרן", "אלון", "רחל", "גיא",
  "ספיר", "נתן", "אורי", "דנה", "עדי", "יונתן", "ליהי", "אמיר", "מור", "טל",
  "שקד", "בר", "ניר", "הדר", "עופרי", "יובל", "נועם", "ליב", "אריאל", "סתיו",
  "גלי", "רוני", "עמית", "שי", "ליאם", "נויה", "אייל", "הדרה", "בן", "אגם",
];

const LAST_NAMES = [
  "כהן", "לוי", "מזרחי", "פרץ", "ביטון", "אברהם", "דוד", "חדד", "אוחיון", "מלכה",
  "שמש", "עמר", "גרין", "שמעון", "רוזן", "ברק", "אזולאי", "סויסה", "נחום", "פלד",
  "גיל", "שחר", "דנן", "טובול", "יפרח", "אלבז", "חיים", "בן דוד", "קדוש", "סבג",
  "אשכנזי", "ממן", "צור", "רז", "נצר", "סלע", "דרור", "יוסף", "חן", "עזרא",
  "ברוך", "שטרן", "גבע", "לביא", "קרן", "זהבי", "אלון", "מור", "דביר", "ראם",
];

function phoneForIndex(i) {
  // Match existing format on this event: 9 digits without leading 0
  const n = 500000000 + 17000 + i;
  return String(n);
}

function makeCallRound(roundNumber, answerStatus, resultStatus, at) {
  return {
    roundNumber,
    answerStatus,
    resultStatus,
    amount: answerStatus === "answered" && resultStatus === "yes" ? 2 : 1,
    notes: [
      {
        text: `${DEMO_MARKER} תוצאת סבב ${roundNumber}: ${resultStatus}`,
        createdAt: at,
        createdBy: "דמו מערכת",
      },
    ],
    calledAt: at,
    updatedAt: at,
  };
}

function buildGuestDocs({ invitationId, groupId, now }) {
  /**
   * Final RSVP mix: 18 yes, 10 no, 8 maybe, 14 pending
   *
   * Call history designed so current eligibility is:
   * Round1 = all 14 pending
   * Round2 = 5 pending with r1 no_answer (also have r2 no_answer)
   * Round3 = those 5 + all 8 maybe
   */
  const plans = [];

  // 5: r1 answered → yes
  for (let i = 0; i < 5; i++) {
    plans.push({
      finalRsvp: "yes",
      arrivedCount: 2,
      guestsCount: 2,
      callRounds: [makeCallRound(1, "answered", "yes", new Date(now.getTime() - 9 * 86400000))],
      table: true,
    });
  }

  // 3: r1 answered → no
  for (let i = 0; i < 3; i++) {
    plans.push({
      finalRsvp: "no",
      arrivedCount: 0,
      guestsCount: 1,
      callRounds: [makeCallRound(1, "answered", "no", new Date(now.getTime() - 9 * 86400000))],
      table: false,
    });
  }

  // 2: r1 answered → maybe
  for (let i = 0; i < 2; i++) {
    plans.push({
      finalRsvp: "maybe",
      arrivedCount: 0,
      guestsCount: 1,
      callRounds: [
        makeCallRound(1, "answered", "undecided", new Date(now.getTime() - 9 * 86400000)),
      ],
      table: false,
    });
  }

  // 4: r1 no_answer, r2 answered → yes
  for (let i = 0; i < 4; i++) {
    plans.push({
      finalRsvp: "yes",
      arrivedCount: 1,
      guestsCount: 1,
      callRounds: [
        makeCallRound(1, "no_answer", "no_answer", new Date(now.getTime() - 9 * 86400000)),
        makeCallRound(2, "answered", "yes", new Date(now.getTime() - 5 * 86400000)),
      ],
      table: true,
    });
  }

  // 2: r1 no_answer, r2 answered → no
  for (let i = 0; i < 2; i++) {
    plans.push({
      finalRsvp: "no",
      arrivedCount: 0,
      guestsCount: 2,
      callRounds: [
        makeCallRound(1, "no_answer", "no_answer", new Date(now.getTime() - 9 * 86400000)),
        makeCallRound(2, "answered", "no", new Date(now.getTime() - 5 * 86400000)),
      ],
      table: false,
    });
  }

  // 2: r1 no_answer, r2 answered → maybe
  for (let i = 0; i < 2; i++) {
    plans.push({
      finalRsvp: "maybe",
      arrivedCount: 0,
      guestsCount: 1,
      callRounds: [
        makeCallRound(1, "no_answer", "no_answer", new Date(now.getTime() - 9 * 86400000)),
        makeCallRound(2, "answered", "undecided", new Date(now.getTime() - 5 * 86400000)),
      ],
      table: true,
    });
  }

  // 5: r1+r2 no_answer, still pending (round 3 group A)
  for (let i = 0; i < 5; i++) {
    plans.push({
      finalRsvp: "pending",
      arrivedCount: 0,
      guestsCount: 1,
      callRounds: [
        makeCallRound(1, "no_answer", "no_answer", new Date(now.getTime() - 9 * 86400000)),
        makeCallRound(2, "no_answer", "no_answer", new Date(now.getTime() - 5 * 86400000)),
      ],
      table: i % 2 === 0,
    });
  }

  // 4 more maybe without prior no-answer path (round 3 group B)
  for (let i = 0; i < 4; i++) {
    plans.push({
      finalRsvp: "maybe",
      arrivedCount: 0,
      guestsCount: 1,
      callRounds: [],
      table: false,
    });
  }

  // 9 pure yes (message RSVP, never in call rounds)
  for (let i = 0; i < 9; i++) {
    plans.push({
      finalRsvp: "yes",
      arrivedCount: 2,
      guestsCount: 2,
      callRounds: [],
      table: true,
    });
  }

  // 5 pure no
  for (let i = 0; i < 5; i++) {
    plans.push({
      finalRsvp: "no",
      arrivedCount: 0,
      guestsCount: 1,
      callRounds: [],
      table: false,
    });
  }

  // 9 pure pending (never called — still in round 1 eligibility)
  for (let i = 0; i < 9; i++) {
    plans.push({
      finalRsvp: "pending",
      arrivedCount: 0,
      guestsCount: 1,
      callRounds: [],
      table: i % 3 === 0,
    });
  }

  if (plans.length !== 50) {
    throw new Error(`Expected 50 plans, got ${plans.length}`);
  }

  return plans.map((plan, index) => {
    const name = `${FIRST_NAMES[index]} ${LAST_NAMES[index]}`;
    const rsvp = plan.finalRsvp;

    return {
      invitationId,
      name,
      phone: phoneForIndex(index),
      relation: index % 4 === 0 ? "משפחה" : index % 4 === 1 ? "חברים" : "",
      notes: `${DEMO_MARKER} מוזמן דמו לבדיקת סבבי שיחות`,
      groupId,
      rsvp,
      status: rsvp,
      guestsCount: plan.guestsCount,
      arrivedCount: plan.arrivedCount,
      amount: plan.arrivedCount,
      actualArrivedCount: 0,
      callRounds: plan.callRounds,
      token: crypto.randomUUID(),
      tableName: plan.table ? `שולחן דמו ${(index % 8) + 1}` : null,
      tableNumber: plan.table ? (index % 8) + 1 : null,
      tableId: null,
      isAdult: true,
      firstOpenedAt: null,
      lastOpenedAt: null,
      openCount: 0,
      createdAt: now,
      updatedAt: now,
    };
  });
}

async function main() {
  const envFile = process.argv[2] || ".env.local.bak-agent-20260805102145";
  loadEnv(envFile);

  const uri = toDirectMongoUri(process.env.MONGO_URI || process.env.MONGODB_URI);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 25000 });
  const db = mongoose.connection.db;

  console.log("DB", db.databaseName);

  if (db.databaseName !== "invite") {
    throw new Error(`Refusing to seed unexpected db=${db.databaseName}`);
  }

  const invitationId = new mongoose.Types.ObjectId(INVITATION_ID);
  const ownerId = new mongoose.Types.ObjectId(OWNER_ID);

  const invitation = await db.collection("invitations").findOne({ _id: invitationId });
  if (!invitation) throw new Error("Invitation not found");

  const owner = await db.collection("users").findOne({ _id: ownerId });
  if (!owner) throw new Error("Owner not found");

  const ownerOnInvite = String(invitation.ownerId || invitation.userId || "");
  if (ownerOnInvite !== OWNER_ID) {
    throw new Error(`Invitation owner mismatch: ${ownerOnInvite}`);
  }

  const existingDemo = await db.collection("invitationguests").countDocuments({
    invitationId,
    notes: { $regex: DEMO_MARKER.replace(/[[\]]/g, "\\$&") },
  });

  if (existingDemo > 0) {
    console.log(
      `Found ${existingDemo} existing demo guests with marker — removing ONLY those demo docs to re-seed cleanly.`
    );
    await db.collection("invitationguests").deleteMany({
      invitationId,
      notes: { $regex: DEMO_MARKER.replace(/[[\]]/g, "\\$&") },
    });
  }

  let group = await db.collection("groups").findOne({
    invitationId,
    name: DEMO_GROUP_NAME,
  });

  if (!group) {
    const insert = await db.collection("groups").insertOne({
      invitationId,
      name: DEMO_GROUP_NAME,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    group = { _id: insert.insertedId, name: DEMO_GROUP_NAME };
  }

  const now = new Date();
  const docs = buildGuestDocs({
    invitationId,
    groupId: group._id,
    now,
  });

  const beforeCount = await db.collection("invitationguests").countDocuments({
    invitationId,
  });

  await db.collection("invitationguests").insertMany(docs);

  const neededQuota = beforeCount + docs.length + 20;
  if (Number(owner.guests || 0) < neededQuota) {
    await db.collection("users").updateOne(
      { _id: ownerId },
      {
        $set: {
          guests: neededQuota,
          updatedAt: now,
        },
      }
    );
    console.log(`Updated owner guests quota to ${neededQuota}`);
  }

  const after = await db
    .collection("invitationguests")
    .find({ invitationId })
    .project({
      _id: 1,
      name: 1,
      phone: 1,
      rsvp: 1,
      status: 1,
      callRounds: 1,
      notes: 1,
    })
    .toArray();

  const demoGuests = after.filter((g) => String(g.notes || "").includes(DEMO_MARKER));
  const rsvpCounts = { yes: 0, no: 0, maybe: 0, pending: 0 };
  for (const g of demoGuests) {
    rsvpCounts[g.rsvp] = (rsvpCounts[g.rsvp] || 0) + 1;
  }

  const r1 = filterForRound(after, 1);
  const r2 = filterForRound(after, 2);
  const r3 = filterForRound(after, 3);

  const r1Ids = new Set(r1.map((g) => String(g._id)));
  const r2Ids = new Set(r2.map((g) => String(g._id)));
  const r3Ids = new Set(r3.map((g) => String(g._id)));

  console.log(
    JSON.stringify(
      {
        invitation: invitation.title || invitation.eventName,
        ownerEmail: owner.email,
        beforeCount,
        afterCount: after.length,
        demoInserted: demoGuests.length,
        demoRsvpCounts: rsvpCounts,
        round1: {
          total: r1.length,
          allPending: r1.every((g) => getRsvp(g) === "pending"),
          stats: summarizeRound(r1, 1),
        },
        round2: {
          total: r2.length,
          allPending: r2.every((g) => getRsvp(g) === "pending"),
          allHadR1NoAnswer: r2.every(
            (g) => roundAnswer(g, 1) === "no_answer"
          ),
          stats: summarizeRound(r2, 2),
        },
        round3: {
          total: r3.length,
          pendingCount: r3.filter((g) => getRsvp(g) === "pending").length,
          maybeCount: r3.filter((g) => getRsvp(g) === "maybe").length,
          noDupes: r3Ids.size === r3.length,
          stats: summarizeRound(r3, 3),
        },
        overlaps: {
          r1r2: [...r1Ids].filter((id) => r2Ids.has(id)).length,
        },
      },
      null,
      2
    )
  );

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
